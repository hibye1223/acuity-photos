import Link from "next/link";
import { getMemories } from "~/app/actions/memories";
import { AlbumBuilderSection } from "~/components/albums/album-builder-section";
import { MemoriesSection } from "~/components/memories/memories-section";
import { PhotoUploader } from "~/components/photos/photo-uploader";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  DEFAULT_CAPTION_STYLE,
  isCaptionStyle,
} from "~/lib/ai/album-assistant";
import { getExamplePrompts } from "~/lib/ai/example-prompts";
import {
  formatBytes,
  getStorageLimitBytes,
  getUsedStorageBytes,
} from "~/lib/storage-quota";
import { createClient } from "~/lib/supabase/server";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  const { prompt: initialPrompt } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [usedBytes, limitBytes, examplePrompts, profile, memories] =
    await Promise.all([
      getUsedStorageBytes(supabase),
      getStorageLimitBytes(supabase),
      getExamplePrompts(supabase),
      user
        ? supabase
            .from("profiles")
            .select("default_caption_style, challenge_me")
            .eq("id", user.id)
            .single()
            .then((result) => result.data)
        : Promise.resolve(null),
      user ? getMemories() : Promise.resolve(null),
    ]);
  const initialCaptionStyle = isCaptionStyle(profile?.default_caption_style)
    ? profile.default_caption_style
    : DEFAULT_CAPTION_STYLE;

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

      {memories ? <MemoriesSection memories={memories} /> : null}

      <AlbumBuilderSection
        examplePrompts={examplePrompts}
        initialCaptionStyle={initialCaptionStyle}
        initialChallengeMe={profile?.challenge_me ?? false}
        initialPrompt={initialPrompt}
      />

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
          <p className="text-xs text-muted-foreground">
            {formatBytes(usedBytes)} of {formatBytes(limitBytes)} used
          </p>
        </div>
        <PhotoUploader />
      </section>
    </main>
  );
}
