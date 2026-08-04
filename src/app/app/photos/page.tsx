import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function PhotosPage() {
  const supabase = await createClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, file_name, taken_at, created_at")
    .order("taken_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

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

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your photos</h1>
          <p className="text-muted-foreground">
            {photos?.length ?? 0} photo{photos?.length === 1 ? "" : "s"}{" "}
            uploaded
          </p>
        </div>
        <Button asChild>
          <Link href="/app/upload">Upload photos</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-destructive">
          Couldn't load your photos: {error.message}
        </p>
      ) : !photos || photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">No photos yet.</p>
          <Button asChild variant="outline">
            <Link href="/app/upload">Upload your first photo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => {
            const url = urlByPath.get(photo.storage_path);
            const date = photo.taken_at ?? photo.created_at;

            return (
              <figure
                key={photo.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
              >
                {url ? (
                  <Image
                    src={url}
                    alt={photo.file_name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {new Date(date).toLocaleDateString()}
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
    </main>
  );
}
