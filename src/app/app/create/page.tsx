import Link from "next/link";
import { AlbumAssistant } from "~/components/albums/album-assistant";
import { PhotoUploader } from "~/components/photos/photo-uploader";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

export default function CreatePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
          <p className="text-muted-foreground">
            Build an album with AI, or upload photos to add to your library.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/photos">Gallery</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/app/albums">Albums</Link>
          </Button>
        </div>
      </div>

      <section className="flex flex-col gap-4" data-tour="ai-assistant">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Album Assistant
          </h2>
          <p className="text-sm text-muted-foreground">
            Describe the album you want. It'll pull together a draft — you make
            it yours before saving anything.
          </p>
        </div>
        <AlbumAssistant />
      </section>

      <Separator />

      <section className="flex flex-col gap-4" data-tour="upload">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Upload photos
          </h2>
          <p className="text-sm text-muted-foreground">
            Drag and drop or browse to add photos. They're compressed and stored
            securely in your own private library.
          </p>
        </div>
        <PhotoUploader />
      </section>
    </main>
  );
}
