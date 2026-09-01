import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteAlbumButton } from "~/components/albums/delete-album-button";
import { ShareAlbumDialog } from "~/components/albums/share-album-dialog";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { toOne } from "~/lib/utils";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: album, error } = await supabase
    .from("albums")
    .select(
      "id, title, created_at, share_enabled, share_token, album_photos(photo_id, position, caption, photos(storage_path, file_name, deleted_at))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "album_photos", ascending: true })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!album) notFound();

  // A trashed photo disappears from albums right away, without waiting for
  // it to be purged.
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/app/albums">Your albums</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/app/albums/${album.id}/edit`}>Edit</Link>
          </Button>
          <ShareAlbumDialog
            albumId={album.id}
            title={album.title}
            initialShareEnabled={album.share_enabled}
            initialShareToken={album.share_token}
          />
          <DeleteAlbumButton albumId={album.id} />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {visiblePhotos.map((entry) => {
          const photo = toOne(entry.photos);
          const url = photo?.storage_path
            ? urlByPath.get(photo.storage_path)
            : undefined;

          return (
            <figure key={entry.photo_id} className="flex flex-col gap-1.5">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                {url ? (
                  <Image
                    src={url}
                    alt={entry.caption ?? photo?.file_name ?? ""}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              {entry.caption ? (
                <figcaption className="truncate text-xs text-muted-foreground">
                  {entry.caption}
                </figcaption>
              ) : null}
            </figure>
          );
        })}
      </div>
    </main>
  );
}
