import Image from "next/image";
import Link from "next/link";
import type { Memories } from "~/app/actions/memories";

function yearsAgoLabel(yearsAgo: number): string {
  return yearsAgo === 1 ? "1 year ago today" : `${yearsAgo} years ago today`;
}

function Thumbnails({
  photos,
}: {
  photos: { id: string; fileName: string; url: string | null }[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {photos
        .filter(
          (photo): photo is { id: string; fileName: string; url: string } =>
            !!photo.url,
        )
        .slice(0, 8)
        .map((photo) => (
          <div
            key={photo.id}
            className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
          >
            <Image
              src={photo.url}
              alt={photo.fileName}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        ))}
    </div>
  );
}

/**
 * Proactively resurfaces photos without the user asking — "on this day" in
 * past years, and a recent burst of uploads that looks trip-shaped. Each
 * group links into the Album Assistant with a pre-filled prompt so building
 * an album from it is one click, not a fresh search.
 */
export function MemoriesSection({ memories }: { memories: Memories }) {
  if (memories.onThisDay.length === 0 && !memories.recentTrip) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">Memories</h2>

      {memories.recentTrip ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              From the last little while
            </p>
            <Link
              href="/app/create?prompt=Build+an+album+from+the+last+week+or+so."
              className="text-xs text-primary underline underline-offset-2"
            >
              Build an album from these
            </Link>
          </div>
          <Thumbnails photos={memories.recentTrip} />
        </div>
      ) : null}

      {memories.onThisDay.map((memory) => (
        <div key={memory.yearsAgo} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {yearsAgoLabel(memory.yearsAgo)}
            </p>
            <Link
              href={`/app/create?prompt=${encodeURIComponent(`Build an album from ${yearsAgoLabel(memory.yearsAgo)}.`)}`}
              className="text-xs text-primary underline underline-offset-2"
            >
              Build an album from these
            </Link>
          </div>
          <Thumbnails photos={memory.photos} />
        </div>
      ))}
    </section>
  );
}
