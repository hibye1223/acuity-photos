import Link from "next/link";
import { AlbumAssistant } from "~/components/albums/album-assistant";
import { Button } from "~/components/ui/button";

export default function NewAlbumPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Album Assistant
          </h1>
          <p className="text-muted-foreground">
            Describe the album you want. It'll pull together a draft — you make
            it yours before saving anything.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/albums">Your albums</Link>
        </Button>
      </div>
      <AlbumAssistant />
    </main>
  );
}
