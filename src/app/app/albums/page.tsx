import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { toOne } from "~/lib/utils";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function AlbumsPage() {
  const supabase = await createClient();

  const { data: albums, error } = await supabase
    .from("albums")
    .select(
      "id, title, created_at, album_photos(photo_id, position, photos(storage_path, deleted_at))",
    )
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "album_photos", ascending: true });

  // A trashed photo disappears from its albums right away, without waiting
  // for it to be purged.
  const visiblePhotosByAlbum = new Map(
    (albums ?? []).map((album) => [
      album.id,
      album.album_photos.filter((entry) => !toOne(entry.photos)?.deleted_at),
    ]),
  );

  const coverPaths = (albums ?? [])
    .map(
      (album) =>
        toOne(visiblePhotosByAlbum.get(album.id)?.[0]?.photos)?.storage_path,
    )
    .filter((path): path is string => !!path);

  const { data: signedUrls } = coverPaths.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(coverPaths, SIGNED_URL_TTL_SECONDS)
    : { data: null };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your albums</h1>
          <p className="text-muted-foreground">
            {albums?.length ?? 0} album{albums?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/create">Build an album</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-destructive">
          Couldn't load your albums: {error.message}
        </p>
      ) : !albums || albums.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">No albums yet.</p>
          <Button asChild variant="outline">
            <Link href="/app/create">Build your first album</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {albums.map((album) => {
            const visiblePhotos = visiblePhotosByAlbum.get(album.id) ?? [];
            const coverPath = toOne(visiblePhotos[0]?.photos)?.storage_path;
            const coverUrl = coverPath ? urlByPath.get(coverPath) : undefined;

            return (
              <Link
                key={album.id}
                href={`/app/albums/${album.id}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="truncate text-sm font-medium">{album.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {visiblePhotos.length} photo
                    {visiblePhotos.length === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
