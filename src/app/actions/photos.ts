"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { generatePhotoTags } from "~/lib/ai/photo-tagging";
import { reverseGeocode } from "~/lib/geocode";
import {
  formatBytes,
  getStorageLimitBytes,
  getUsedStorageBytes,
} from "~/lib/storage-quota";
import { createClient } from "~/lib/supabase/server";

const TAGGING_SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function createPhotoRecord({
  storagePath,
  fileName,
  contentType,
  takenAt,
  sizeBytes,
  location,
  people,
  gps,
}: {
  storagePath: string;
  fileName: string;
  contentType: string;
  takenAt: string | null;
  sizeBytes: number;
  /** Manually typed in at upload time. Takes priority over GPS-based geocoding. */
  location: string | null;
  /** Names the uploader explicitly typed in — never inferred from face data. */
  people: string[];
  gps: { latitude: number; longitude: number } | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to upload photos.");
  }

  if (!storagePath.startsWith(`${user.id}/`)) {
    throw new Error("Invalid storage path.");
  }

  const [usedBytes, limitBytes] = await Promise.all([
    getUsedStorageBytes(supabase),
    getStorageLimitBytes(supabase),
  ]);
  if (usedBytes + sizeBytes > limitBytes) {
    // The file is already uploaded by the time this action runs (the
    // client uploads to Storage first, then records the row) — remove it
    // rather than leaving an orphaned object that counts toward nothing.
    await supabase.storage.from("photos").remove([storagePath]);
    throw new Error(
      `That would put you over your ${formatBytes(limitBytes)} storage limit. Delete some photos first, or upload something smaller.`,
    );
  }

  const trimmedLocation = location?.trim() || null;
  const normalizedPeople = [
    ...new Set(
      people
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0),
    ),
  ];

  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      taken_at: takenAt,
      size_bytes: sizeBytes,
      location: trimmedLocation,
      people: normalizedPeople.length > 0 ? normalizedPeople : null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");

  // Runs after the response is sent, so tagging/geocoding latency never
  // delays the upload. Best-effort: a failure just leaves the field unset.
  after(() => tagPhotoContent(supabase, photo.id, storagePath));
  if (!trimmedLocation && gps) {
    after(() => geocodePhotoLocation(supabase, photo.id, gps));
  }
}

export async function deletePhotos(photoIds: string[]) {
  if (photoIds.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete photos.");
  }

  // RLS already scopes this to the signed-in user's own rows, but selecting
  // first (rather than trusting the client-supplied ids) confirms exactly
  // which storage objects to remove.
  const { data: photos, error: selectError } = await supabase
    .from("photos")
    .select("id, storage_path")
    .in("id", photoIds);

  if (selectError) {
    throw new Error(selectError.message);
  }

  if (!photos || photos.length === 0) return;

  const { error: storageError } = await supabase.storage
    .from("photos")
    .remove(photos.map((photo) => photo.storage_path));

  if (storageError) {
    throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .in(
      "id",
      photos.map((photo) => photo.id),
    );

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/app/photos");
  revalidatePath("/app/albums");
}

async function geocodePhotoLocation(
  supabase: SupabaseClient,
  photoId: string,
  gps: { latitude: number; longitude: number },
) {
  try {
    const location = await reverseGeocode(gps.latitude, gps.longitude);
    if (!location) return;

    const { error } = await supabase
      .from("photos")
      .update({ location })
      .eq("id", photoId);

    if (error) throw error;
  } catch (error) {
    console.error(`Failed to geocode photo ${photoId}:`, error);
  }
}

async function tagPhotoContent(
  supabase: SupabaseClient,
  photoId: string,
  storagePath: string,
) {
  try {
    const { data: signed, error: signError } = await supabase.storage
      .from("photos")
      .createSignedUrl(storagePath, TAGGING_SIGNED_URL_TTL_SECONDS);

    if (signError || !signed) {
      throw signError ?? new Error("No signed URL returned");
    }

    const tags = await generatePhotoTags(signed.signedUrl);
    if (tags.length === 0) return;

    const { error: updateError } = await supabase
      .from("photos")
      .update({ tags })
      .eq("id", photoId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error(`Failed to tag photo ${photoId}:`, error);
  }
}
