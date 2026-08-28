"use server";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 30;
const SCRYPT_KEY_LENGTH = 32;

export type LockedPhoto = {
  id: string;
  fileName: string;
  url: string | null;
};

function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, SCRYPT_KEY_LENGTH).toString("hex");
}

function isValidPin(pin: string): boolean {
  return /^\d{4,10}$/.test(pin);
}

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

/** Whether the user has already set up a locked-album PIN. */
export async function hasLockPin(): Promise<boolean> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("lock_pin_hash")
    .eq("id", user.id)
    .single();
  return !!data?.lock_pin_hash;
}

/** Sets or changes the PIN that gates the locked album. A 4-10 digit code. */
export async function setLockPin(pin: string) {
  const { supabase, user } = await requireUser();

  if (!isValidPin(pin)) {
    throw new Error("PIN must be 4-10 digits.");
  }

  const salt = randomBytes(16).toString("hex");
  const hash = `${salt}:${hashPin(pin, salt)}`;

  const { error } = await supabase
    .from("profiles")
    .update({ lock_pin_hash: hash })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  const { data: verifyRow, error: verifyError } = await supabase
    .from("profiles")
    .select("lock_pin_hash")
    .eq("id", user.id)
    .single();

  console.error("[setLockPin debug]", {
    userId: user.id,
    hashPreview: hash.slice(0, 12),
    verifyRow,
    verifyError,
  });

  if (verifyError || verifyRow?.lock_pin_hash !== hash) {
    throw new Error("Couldn't save the PIN — the write didn't take.");
  }
  revalidatePath("/app/settings");
}

/**
 * Removes the PIN and unlocks every photo, since there'd otherwise be no way
 * back into a locked album with no PIN set.
 */
export async function removeLockPin() {
  const { supabase, user } = await requireUser();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ lock_pin_hash: null })
    .eq("id", user.id);
  if (profileError) throw new Error(profileError.message);

  const { error: photosError } = await supabase
    .from("photos")
    .update({ is_locked: false })
    .eq("user_id", user.id)
    .eq("is_locked", true);
  if (photosError) throw new Error(photosError.message);

  revalidatePath("/app/settings");
  revalidatePath("/app/photos");
  revalidatePath("/app/locked");
}

/** Locks or unlocks a single photo. Locking requires a PIN to already be set. */
export async function setPhotoLocked(photoId: string, locked: boolean) {
  const { supabase, user } = await requireUser();

  if (locked) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("lock_pin_hash")
      .eq("id", user.id)
      .single();
    if (!profile?.lock_pin_hash) {
      throw new Error(
        "Set a PIN in Settings first, under Locked Album, before locking a photo.",
      );
    }
  }

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
 * Verifies the PIN and, if correct, returns every locked photo. Deliberately
 * combines verification and listing in one call so there's no separate
 * "unlocked" session to track — the locked album re-gates on every visit.
 */
export async function unlockLockedAlbum(pin: string): Promise<LockedPhoto[]> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("lock_pin_hash")
    .eq("id", user.id)
    .single();

  const storedHash = profile?.lock_pin_hash;
  if (!storedHash) {
    throw new Error("Set a PIN in Settings first, under Locked Album.");
  }

  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) {
    throw new Error("Incorrect PIN.");
  }
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(hashPin(pin, salt), "hex");
  const matches =
    expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    throw new Error("Incorrect PIN.");
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
