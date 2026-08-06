"use server";

import { generateAlbumDraft } from "~/lib/ai/album-assistant";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_REQUEST_LENGTH = 500;

export type AlbumDraftPhoto = {
  photoId: string;
  fileName: string;
  caption: string;
  url: string | null;
};

export type AlbumDraftResult = {
  title: string;
  photos: AlbumDraftPhoto[];
};

/**
 * Server Action for the Album Assistant: validates the signed-in user, calls
 * the LLM (via tool-calling, see ~/lib/ai/album-assistant) to retrieve that
 * user's own photos and propose a draft, then resolves signed preview URLs.
 *
 * Returns an editable draft only — nothing is persisted here.
 */
export async function generateAlbumDraftAction(
  requestText: string,
): Promise<AlbumDraftResult> {
  const trimmed = requestText.trim();
  if (!trimmed) {
    throw new Error("Describe the album you want first.");
  }
  if (trimmed.length > MAX_REQUEST_LENGTH) {
    throw new Error(`Keep the request under ${MAX_REQUEST_LENGTH} characters.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to use the Album Assistant.");
  }

  const draft = await generateAlbumDraft({
    supabase,
    requestText: trimmed,
    today: new Date().toISOString().slice(0, 10),
  });

  const photoIds = draft.photos.map((photo) => photo.photoId);
  const { data: photoRows, error } = await supabase
    .from("photos")
    .select("id, storage_path, file_name")
    .in("id", photoIds);

  if (error) throw new Error(error.message);

  const rowById = new Map((photoRows ?? []).map((row) => [row.id, row]));
  const storagePaths = (photoRows ?? []).map((row) => row.storage_path);
  const { data: signedUrls } = storagePaths.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS)
    : { data: null };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  const photos: AlbumDraftPhoto[] = [];
  for (const photo of draft.photos) {
    // Rows are fetched through the same RLS-scoped client, so anything
    // missing here either doesn't exist or isn't this user's — either way,
    // skip it rather than surfacing a broken entry.
    const row = rowById.get(photo.photoId);
    if (!row) continue;
    photos.push({
      photoId: photo.photoId,
      fileName: row.file_name,
      caption: photo.caption,
      url: urlByPath.get(row.storage_path) ?? null,
    });
  }

  if (photos.length === 0) {
    throw new Error("None of the proposed photos could be loaded. Try again.");
  }

  return { title: draft.title, photos };
}

export type PickerPhoto = {
  photoId: string;
  fileName: string;
  url: string | null;
};

/**
 * Lists the signed-in user's photos for the "swap photo" picker in the
 * draft editor. RLS scopes this to the current user.
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
