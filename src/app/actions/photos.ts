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
  after(() => tagPhotoContent(supabase, user.id, photo.id, storagePath));
  if (!trimmedLocation && gps) {
    after(() => geocodePhotoLocation(supabase, photo.id, gps));
  }
}

/** Moves photos to the trash. Storage objects are untouched until purged. */
export async function deletePhotos(photoIds: string[]) {
  if (photoIds.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete photos.");
  }

  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", photoIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");
  revalidatePath("/app/albums");
  revalidatePath("/app/trash");
}

/** Brings trashed photos back into the main gallery. */
export async function restorePhotos(photoIds: string[]) {
  if (photoIds.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to restore photos.");
  }

  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: null })
    .in("id", photoIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");
  revalidatePath("/app/albums");
  revalidatePath("/app/trash");
}

/**
 * Permanently deletes trashed photos: removes the Storage objects and the
 * rows. Only ever called from the trash page — this is the real,
 * unrecoverable delete.
 */
export async function permanentlyDeletePhotos(photoIds: string[]) {
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
  // which storage objects to remove, and that they're actually in the trash.
  const { data: photos, error: selectError } = await supabase
    .from("photos")
    .select("id, storage_path")
    .in("id", photoIds)
    .not("deleted_at", "is", null);

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

  revalidatePath("/app/trash");
}

export async function toggleFavorite(photoId: string, favorite: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to favorite photos.");
  }

  const { error } = await supabase
    .from("photos")
    .update({ is_favorite: favorite })
    .eq("id", photoId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");
}

/**
 * Saves an edited version of a photo: uploads the edited bytes as a new
 * Storage object, repoints the row at it, and removes the old object. The
 * row id (and therefore album membership, tags, etc.) is preserved.
 */
export async function savePhotoEdit({
  photoId,
  storagePath,
  contentType,
  sizeBytes,
}: {
  photoId: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to edit photos.");
  }

  if (!storagePath.startsWith(`${user.id}/`)) {
    throw new Error("Invalid storage path.");
  }

  const { data: existing, error: selectError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }
  if (!existing) {
    throw new Error("That photo no longer exists.");
  }

  const { error: updateError } = await supabase
    .from("photos")
    .update({
      storage_path: storagePath,
      content_type: contentType,
      size_bytes: sizeBytes,
    })
    .eq("id", photoId);

  if (updateError) {
    // Clean up the new object we just uploaded, since the row still points
    // at the old one.
    await supabase.storage.from("photos").remove([storagePath]);
    throw new Error(updateError.message);
  }

  await supabase.storage.from("photos").remove([existing.storage_path]);

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
  userId: string,
  photoId: string,
  storagePath: string,
) {
  try {
    const [{ data: signed, error: signError }, { data: profile }] =
      await Promise.all([
        supabase.storage
          .from("photos")
          .createSignedUrl(storagePath, TAGGING_SIGNED_URL_TTL_SECONDS),
        supabase
          .from("profiles")
          .select("face_grouping_enabled")
          .eq("id", userId)
          .single(),
      ]);

    if (signError || !signed) {
      throw signError ?? new Error("No signed URL returned");
    }

    const { tags, personDescription } = await generatePhotoTags(
      signed.signedUrl,
    );
    if (tags.length === 0 && !profile?.face_grouping_enabled) return;

    const { error: updateError } = await supabase
      .from("photos")
      .update({
        ...(tags.length > 0 ? { tags } : {}),
        ...(profile?.face_grouping_enabled
          ? { person_description: personDescription }
          : {}),
      })
      .eq("id", photoId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error(`Failed to tag photo ${photoId}:`, error);
  }
}
