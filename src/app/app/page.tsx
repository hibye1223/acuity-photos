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
      <p className="text-muted-foreground">
        Signed in as {user?.email}. This is the foundation the Album Assistant
        and Cleanup features will build on next.
      </p>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
