import Link from "next/link";
import { signOut } from "~/app/actions/auth";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

export default async function AppHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        You're signed in
      </h1>
      <p className="text-muted-foreground">Signed in as {user?.email}.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild data-tour="ai-assistant">
          <Link href="/app/albums/new">Build an album with AI</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/upload">Upload photos</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/photos">View gallery</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/app/albums">Your albums</Link>
        </Button>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
