import { redirect } from "next/navigation";
import { LockedAlbumView } from "~/components/photos/locked-album-view";
import { createClient } from "~/lib/supabase/server";

export default async function LockedAlbumPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/app/locked");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locked album</h1>
        <p className="text-muted-foreground">
          PIN-gated photos, kept out of the main gallery and Album Assistant.
        </p>
      </div>
      <LockedAlbumView />
    </main>
  );
}
