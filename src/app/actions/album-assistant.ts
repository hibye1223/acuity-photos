"use server";

import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type AlbumDraftPhoto = {
  photoId: string;
  fileName: string;
  caption: string;
  url: string | null;
};

export type AlbumDraftResult = {
  title: string;
  note?: string;
  photos: AlbumDraftPhoto[];
};

export type PickerPhoto = {
  photoId: string;
  fileName: string;
  url: string | null;
};

/**
 * Lists the signed-in user's photos for the "swap photo" picker in the
 * draft editor. Filters by user_id explicitly rather than relying solely on
 * RLS, since admin accounts have blanket SELECT access to every user's
 * photos (for the admin dashboard) — without this, an admin using this
 * picker would see everyone's photos, not just their own.
 */
export async function listPhotosForPickerAction(): Promise<PickerPhoto[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to use the Album Assistant.");
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, file_name")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

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
    photoId: photo.id,
    fileName: photo.file_name,
    url: urlByPath.get(photo.storage_path) ?? null,
  }));
}
