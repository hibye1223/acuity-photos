"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

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

  const { error } = await supabase.from("photos").insert({
    user_id: user.id,
    storage_path: storagePath,
    file_name: fileName,
    content_type: contentType,
    taken_at: takenAt,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/photos");
}
