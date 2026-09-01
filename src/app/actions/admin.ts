"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_EMAIL } from "~/lib/admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email !== ADMIN_EMAIL) {
    throw new Error("Not authorized.");
  }

  return user;
}

/** Sets a per-user storage quota override in GB, or clears it back to the default. */
export async function updateUserQuotaAction({
  userId,
  quotaGb,
}: {
  userId: string;
  quotaGb: number | null;
}) {
  await requireAdmin();

  if (quotaGb !== null && (!Number.isFinite(quotaGb) || quotaGb <= 0)) {
    throw new Error("Enter a quota greater than 0, or clear it.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      storage_quota_bytes:
        quotaGb === null ? null : Math.round(quotaGb * 1024 * 1024 * 1024),
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/app/admin");
}

/** Permanently deletes another user's account: their storage files, then the auth row. */
export async function adminDeleteUserAction(userId: string) {
  const admin_user = await requireAdmin();

  if (userId === admin_user.id) {
    throw new Error("You can't delete your own account from here.");
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage.from("photos").list(userId);
  if (files && files.length > 0) {
    await admin.storage
      .from("photos")
      .remove(files.map((file) => `${userId}/${file.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/app/admin");
}
