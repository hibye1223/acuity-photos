import { Mail } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground">
        <span>Acuity Photos</span>
        <nav className="flex items-center gap-4">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
          >
            <Mail className="size-3.5" />
            Help
          </Link>
        </nav>
        <span>&copy; 2026</span>
      </div>
    </footer>
  );
}
