"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

export function FloatingCta() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-4 z-50 flex justify-center transition-all duration-500 ease-out sm:inset-x-auto sm:right-6 sm:justify-end",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-black/15 transition-all duration-300 ease-out hover:scale-105 active:scale-95"
      >
        Fix your photos
      </Link>
    </div>
  );
}
