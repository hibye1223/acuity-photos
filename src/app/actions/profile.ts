"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

export async function updateProfile({
  fullName,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update your profile.");
  }

  const trimmedName = fullName.trim();
  if (trimmedName.length > 120) {
    throw new Error("Name is too long.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: trimmedName || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
