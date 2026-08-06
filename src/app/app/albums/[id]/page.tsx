import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

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
      "id, title, created_at, album_photos(photo_id, position, caption, photos(storage_path, file_name))",
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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
        <Button asChild variant="outline">
          <Link href="/app/albums">Your albums</Link>
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {album.album_photos.map((entry) => {
          const photo = entry.photos?.[0];
          const url = photo?.storage_path
            ? urlByPath.get(photo.storage_path)
            : undefined;

          return (
            <figure
              key={entry.photo_id}
              className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="relative aspect-[4/3] w-full bg-muted">
                {url ? (
                  <Image
                    src={url}
                    alt={entry.caption ?? photo?.file_name ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              {entry.caption ? (
                <figcaption className="px-4 pb-4 text-sm text-muted-foreground">
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
