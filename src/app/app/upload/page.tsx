import Link from "next/link";
import { PhotoUploader } from "~/components/photos/photo-uploader";
import { Button } from "~/components/ui/button";

export default function UploadPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Upload photos
          </h1>
          <p className="text-muted-foreground">
            Drag and drop or browse to add photos. They're compressed and stored
            securely in your own private library.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/photos">View gallery</Link>
        </Button>
      </div>
      <PhotoUploader />
    </main>
  );
}
