"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { generatePhotoTags } from "~/lib/ai/photo-tagging";
import { createClient } from "~/lib/supabase/server";

const TAGGING_SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function createPhotoRecord({
  storagePath,
  fileName,
  contentType,
  takenAt,
}: {
  storagePath: string;
  fileName: string;
  contentType: string;
  takenAt: string | null;
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

  const { data: photo, error } = await supabase
    .from("photos")
    .insert({
      user_id: user.id,
      storage_path: storagePath,
      file_name: fileName,
      content_type: contentType,
      taken_at: takenAt,
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
