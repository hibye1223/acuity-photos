import Link from "next/link";
import type { TrashedPhoto } from "~/components/photos/trash-grid";
import { TrashGrid } from "~/components/photos/trash-grid";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export default async function TrashPage() {
  const supabase = await createClient();

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, file_name")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

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

  const trashedPhotos = (photos ?? [])
    .map((photo) => ({
      id: photo.id,
      url: urlByPath.get(photo.storage_path),
      fileName: photo.file_name,
    }))
    .filter((photo): photo is TrashedPhoto => photo.url !== undefined);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
          <p className="text-muted-foreground">
            {trashedPhotos.length} photo
            {trashedPhotos.length === 1 ? "" : "s"} — restore or delete them for
            good.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/photos">Back to photos</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-destructive">
          Couldn't load your trash: {error.message}
        </p>
      ) : trashedPhotos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">Trash is empty.</p>
        </div>
      ) : (
        <TrashGrid photos={trashedPhotos} />
      )}
    </main>
  );
}
