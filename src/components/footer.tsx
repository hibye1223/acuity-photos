import Link from "next/link";
import { SupportContact } from "~/components/support-contact";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <span>Acuity Photos</span>
        <nav className="flex items-center gap-4">
          <Link
            href="/help"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Help
          </Link>
          <SupportContact />
        </nav>
        <span>&copy; 2026</span>
      </div>
    </footer>
  );
}
