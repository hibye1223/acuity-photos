"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { cn } from "~/lib/utils";

export type GalleryPhoto = {
  id: string;
  url: string;
  fileName: string;
  date: string;
};

type PhotoGroup = { label: string; photos: GalleryPhoto[] };

function groupByMonth(photos: GalleryPhoto[]): PhotoGroup[] {
  const groups: PhotoGroup[] = [];

  for (const photo of photos) {
    const label = new Date(photo.date).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    const lastGroup = groups.at(-1);
    if (lastGroup?.label === label) {
      lastGroup.photos.push(photo);
    } else {
      groups.push({ label, photos: [photo] });
    }
  }

  return groups;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const groups = useMemo(() => groupByMonth(photos), [photos]);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = () => setOpenIndex(null);
  const showPrev = () =>
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + photos.length) % photos.length,
    );
  const showNext = () =>
    setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));

  useEffect(() => {
    if (openIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowLeft") {
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + photos.length) % photos.length,
        );
      }
      if (event.key === "ArrowRight") {
        setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openIndex, photos.length]);

  const active = openIndex !== null ? photos[openIndex] : null;

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.label} className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {group.label}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.photos.map((photo) => {
              const index = photos.indexOf(photo);

              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted text-left"
                >
                  <Image
                    src={photo.url}
                    alt={photo.fileName}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {new Date(photo.date).toLocaleDateString()}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-6" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
            }}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:left-4",
              photos.length < 2 && "hidden",
            )}
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-8" />
          </button>

          <div className="relative h-full max-h-[85vh] w-full max-w-4xl">
            <Image
              src={active.url}
              alt={active.fileName}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:right-4",
              photos.length < 2 && "hidden",
            )}
            aria-label="Next photo"
          >
            <ChevronRight className="size-8" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
