"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { generatePhotoTags } from "~/lib/ai/photo-tagging";
import {
  formatBytes,
  getUsedStorageBytes,
  MAX_STORAGE_BYTES,
} from "~/lib/storage-quota";
import { createClient } from "~/lib/supabase/server";

const TAGGING_SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function createPhotoRecord({
  storagePath,
  fileName,
  contentType,
  takenAt,
  sizeBytes,
}: {
  storagePath: string;
  fileName: string;
  contentType: string;
  takenAt: string | null;
  sizeBytes: number;
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

  const usedBytes = await getUsedStorageBytes(supabase);
  if (usedBytes + sizeBytes > MAX_STORAGE_BYTES) {
    // The file is already uploaded by the time this action runs (the
    // client uploads to Storage first, then records the row) — remove it
    // rather than leaving an orphaned object that counts toward nothing.
    await supabase.storage.from("photos").remove([storagePath]);
    throw new Error(
      `That would put you over your ${formatBytes(MAX_STORAGE_BYTES)} storage limit. Delete some photos first, or upload something smaller.`,
    );
  }

  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      taken_at: takenAt,
      size_bytes: sizeBytes,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");

  // Runs after the response is sent, so tagging latency never delays the
  // upload. Best-effort: a tagging failure just leaves the photo untagged.
  after(() => tagPhotoContent(supabase, photo.id, storagePath));
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
