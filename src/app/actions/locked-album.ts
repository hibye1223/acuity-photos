"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { env } from "~/env";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 30;

export type LockedPhoto = {
  id: string;
  fileName: string;
  url: string | null;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be signed in to do this.");
  }
  return { supabase, user };
}

/**
 * Checks a password against the signed-in user's own account credentials,
 * via a throwaway, cookie-less client — this never touches or rotates the
 * caller's real session, it just asks Supabase Auth "does this password
 * match this email".
 */
async function verifyOwnPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const verifier = createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const { error } = await verifier.auth.signInWithPassword({
    email,
    password,
  });
  return !error;
}

/** Locks or unlocks a single photo. */
export async function setPhotoLocked(photoId: string, locked: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("photos")
    .update({ is_locked: locked })
    .eq("id", photoId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/app/photos");
  revalidatePath("/app/locked");
}

/**
 * Verifies the user's account password and, if correct, returns every
 * locked photo. Re-checks the password on every visit rather than keeping
 * a separate "unlocked" session.
 */
export async function unlockLockedAlbum(
  password: string,
): Promise<LockedPhoto[]> {
  const { supabase, user } = await requireUser();

  if (!user.email) {
    throw new Error("Your account has no email on file.");
  }

  const matches = await verifyOwnPassword(user.email, password);
  if (!matches) {
    throw new Error("Incorrect password.");
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, file_name")
    .eq("user_id", user.id)
    .eq("is_locked", true)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const paths = (photos ?? []).map((photo) => photo.storage_path);
  const { data: signedUrls } = paths.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: null };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  return (photos ?? []).map((photo) => ({
    id: photo.id,
    fileName: photo.file_name,
    url: urlByPath.get(photo.storage_path) ?? null,
  }));
}
