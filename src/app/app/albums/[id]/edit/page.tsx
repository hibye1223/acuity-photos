import { notFound } from "next/navigation";
import type { AlbumDraftPhoto } from "~/app/actions/album-assistant";
import { EditAlbumForm } from "~/components/albums/edit-album-form";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function EditAlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: album, error } = await supabase
    .from("albums")
    .select(
      "id, title, album_photos(photo_id, position, caption, photos(storage_path, file_name))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "album_photos", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!album) notFound();

  const paths = album.album_photos
    .map((entry) => entry.photos?.[0]?.storage_path)
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

  const initialPhotos: AlbumDraftPhoto[] = album.album_photos.map((entry) => {
    const photo = entry.photos?.[0];
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

      <EditAlbumForm
        albumId={album.id}
        initialTitle={album.title}
        initialPhotos={initialPhotos}
      />
    </main>
  );
}
