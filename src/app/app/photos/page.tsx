import Link from "next/link";
import type { GalleryPhoto, SortOption } from "~/components/photos/photo-grid";
import { PhotoGrid } from "~/components/photos/photo-grid";
import { PhotoUploader } from "~/components/photos/photo-uploader";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  formatBytes,
  getStorageLimitBytes,
  getUsedStorageBytes,
} from "~/lib/storage-quota";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PAGE_SIZE = 48;

function parseSort(value: string | undefined): SortOption {
  return value === "oldest" || value === "name" ? value : "newest";
}

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string; favorites?: string }>;
}) {
  const params = await searchParams;
  const sort = parseSort(params.sort);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const favoritesOnly = params.favorites === "1";

  const supabase = await createClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("photos")
    .select(
      "id, storage_path, file_name, taken_at, created_at, is_favorite, original_storage_path",
      { count: "exact" },
    )
    .eq("is_locked", false)
    .is("deleted_at", null);

  if (favoritesOnly) {
    query = query.eq("is_favorite", true);
  }

  if (sort === "oldest") {
    query = query
      .order("taken_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true });
  } else if (sort === "name") {
    query = query.order("file_name", { ascending: true });
  } else {
    query = query
      .order("taken_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
  }

  const [usedBytes, limitBytes] = await Promise.all([
    getUsedStorageBytes(supabase),
    getStorageLimitBytes(supabase),
  ]);

  const { data: photos, error, count } = await query.range(from, to);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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

  const galleryPhotos = (photos ?? [])
    .map((photo) => ({
      id: photo.id,
      url: urlByPath.get(photo.storage_path),
      fileName: photo.file_name,
      date: photo.taken_at ?? photo.created_at,
      isFavorite: photo.is_favorite,
      isEdited:
        !!photo.original_storage_path &&
        photo.original_storage_path !== photo.storage_path,
    }))
    .filter((photo): photo is GalleryPhoto => photo.url !== undefined);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your photos</h1>
          <p className="text-muted-foreground">
            {totalCount} photo{totalCount === 1 ? "" : "s"}
            {favoritesOnly ? " favorited" : " uploaded"}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/trash">Trash</Link>
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
        </p>
        <PhotoUploader />
      </section>

      <Separator />

      {error ? (
        <p className="text-destructive">
          Couldn't load your photos: {error.message}
        </p>
      ) : totalCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
          <p className="text-muted-foreground">
            {favoritesOnly
              ? "No favorites yet — star a photo to see it here."
              : "No photos yet."}
          </p>
        </div>
      ) : (
        <PhotoGrid
          photos={galleryPhotos}
          sort={sort}
          page={page}
          totalPages={totalPages}
          favoritesOnly={favoritesOnly}
        />
      )}
    </main>
  );
}
