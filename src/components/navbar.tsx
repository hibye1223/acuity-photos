import Link from "next/link";
import { signOut } from "~/app/actions/auth";
import { ThemeToggle } from "~/components/theme-toggle";
import { Button } from "~/components/ui/button";
import { ADMIN_EMAIL } from "~/lib/admin";
import { createClient } from "~/lib/supabase/server";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Acuity Photos
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/create">Create</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" data-tour="gallery">
                <Link href="/app/photos">Gallery</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" data-tour="albums">
                <Link href="/app/albums">Albums</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/app/admin">Admin</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/settings">Settings</Link>
              </Button>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
