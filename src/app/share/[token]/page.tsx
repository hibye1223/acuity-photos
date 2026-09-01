import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedAlbumView } from "~/components/share/shared-album-view";
import { env } from "~/env";
import { getSharedAlbum } from "~/lib/albums/public-share";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const album = await getSharedAlbum(token);

  if (!album) {
    return { robots: { index: false, follow: false } };
  }

  const description = `${album.photos.length} photo${album.photos.length === 1 ? "" : "s"} — shared via Acuity Photos`;
  const previewImage = album.photos.find((photo) => photo.url)?.url;
  const url = `${env.NEXT_PUBLIC_SITE_URL}/share/${token}`;

  return {
    title: album.title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title: album.title,
      description,
      url,
      type: "website",
      images: previewImage ? [{ url: previewImage }] : undefined,
    },
    twitter: {
      card: previewImage ? "summary_large_image" : "summary",
      title: album.title,
      description,
      images: previewImage ? [previewImage] : undefined,
    },
  };
}

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
