import Link from "next/link";
import { SupportContact } from "~/components/support-contact";
import { Button } from "~/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">
        That sign-in link didn't work
      </h1>
      <p className="text-sm text-muted-foreground">
        It may have expired or already been used. Request a new one to try
        again.
      </p>
      <Button asChild>
        <Link href="/login">Back to sign in</Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Still stuck? <SupportContact />.
      </p>
    </main>
  );
}
