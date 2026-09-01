import { notFound } from "next/navigation";
import type { AlbumDraftPhoto } from "~/app/actions/album-assistant";
import { EditAlbumSection } from "~/components/albums/edit-album-section";
import {
  DEFAULT_CAPTION_STYLE,
  isCaptionStyle,
} from "~/lib/ai/album-assistant";
import { createClient } from "~/lib/supabase/server";
import { toOne } from "~/lib/utils";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("default_caption_style, challenge_me")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: album, error } = await supabase
    .from("albums")
    .select(
      "id, title, album_photos(photo_id, position, caption, photos(storage_path, file_name, deleted_at))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "album_photos", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!album) notFound();

  // A trashed photo disappears from the album right away, without waiting
  // for it to be purged.
  const visiblePhotos = album.album_photos.filter(
    (entry) => !toOne(entry.photos)?.deleted_at,
  );

  const paths = visiblePhotos
    .map((entry) => toOne(entry.photos)?.storage_path)
    .filter((path): path is string => !!path);

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

  const initialPhotos: AlbumDraftPhoto[] = visiblePhotos.map((entry) => {
    const photo = toOne(entry.photos);
    return {
      photoId: entry.photo_id,
      fileName: photo?.file_name ?? "",
      caption: entry.caption ?? "",
      url: photo?.storage_path
        ? (urlByPath.get(photo.storage_path) ?? null)
        : null,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit album</h1>
        <p className="text-muted-foreground">
          Reorder, swap, or caption photos, then save.
        </p>
      </div>

      <EditAlbumSection
        albumId={album.id}
        initialTitle={album.title}
        initialPhotos={initialPhotos}
        initialCaptionStyle={
          isCaptionStyle(profile?.default_caption_style)
            ? profile.default_caption_style
            : DEFAULT_CAPTION_STYLE
        }
        initialChallengeMe={profile?.challenge_me ?? false}
      />
    </main>
  );
}
