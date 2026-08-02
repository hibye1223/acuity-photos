import Link from "next/link";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Acuity Photos
        </Link>
      </div>
    </nav>
  );
}
