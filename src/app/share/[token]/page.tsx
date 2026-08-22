import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedAlbumView } from "~/components/share/shared-album-view";
import { getSharedAlbum } from "~/lib/albums/public-share";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function SharedAlbumPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const album = await getSharedAlbum(token);

  if (!album) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Shared album</p>
        <h1 className="text-2xl font-semibold tracking-tight">{album.title}</h1>
      </div>

      <SharedAlbumView photos={album.photos} />
    </main>
  );
}
