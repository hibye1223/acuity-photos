"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

/**
 * Permanently deletes the signed-in user's account: their uploaded photo
 * files, then the auth.users row (which cascades to profiles/photos/
 * albums/album_photos via FK constraints — see the create_* migrations).
 */
export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete your account.");
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage.from("photos").list(user.id);
  if (files && files.length > 0) {
    await admin.storage
      .from("photos")
      .remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(error.message);
  }

  await supabase.auth.signOut();
  redirect("/");
}
