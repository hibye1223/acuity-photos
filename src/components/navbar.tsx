import Link from "next/link";

export function Navbar() {
  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Acuity Photos
        </Link>
      </div>
    </nav>
  );
}
