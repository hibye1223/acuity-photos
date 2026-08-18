import { createAdminClient } from "~/lib/supabase/admin";
import { toOne } from "~/lib/utils";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type SharedAlbumPhoto = {
  photoId: string;
  fileName: string;
  caption: string | null;
  url: string | null;
};

export type SharedAlbum = {
  title: string;
  photos: SharedAlbumPhoto[];
};

/**
 * Reads an album by its public share token, bypassing RLS via the
 * service-role client. This is the one legitimate unauthenticated read path
 * for album data — it only ever returns something when share_enabled is
 * true, and only the fields a visitor should see (no owner info).
 */
export async function getSharedAlbum(
  shareToken: string,
): Promise<SharedAlbum | null> {
  const admin = createAdminClient();

  const { data: album, error } = await admin
    .from("albums")
    .select(
      "title, album_photos(photo_id, position, caption, photos(storage_path, file_name))",
    )
    .eq("share_token", shareToken)
    .eq("share_enabled", true)
    .order("position", { referencedTable: "album_photos", ascending: true })
    .maybeSingle();

  if (error || !album) return null;

  const paths = album.album_photos
    .map((entry) => toOne(entry.photos)?.storage_path)
    .filter((path): path is string => !!path);

  const { data: signedUrls } = paths.length
    ? await admin.storage
        .from("photos")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: null };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  return {
    title: album.title,
    photos: album.album_photos.map((entry) => {
      const photo = toOne(entry.photos);
      return {
        photoId: entry.photo_id,
        fileName: photo?.file_name ?? "",
        caption: entry.caption,
        url: photo?.storage_path
          ? (urlByPath.get(photo.storage_path) ?? null)
          : null,
      };
    }),
  };
}
