"use client";

import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pause,
  Play,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import type { SharedAlbumPhoto } from "~/lib/albums/public-share";
import { cn } from "~/lib/utils";

const SLIDE_DURATION_MS = 5000;

export function SharedAlbumView({ photos }: { photos: SharedAlbumPhoto[] }) {
  const [mode, setMode] = useState<"grid" | "slideshow">("grid");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 self-center rounded-full border border-border bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          variant={mode === "grid" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setMode("grid")}
        >
          <LayoutGrid /> Grid
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "slideshow" ? "default" : "ghost"}
          className="rounded-full"
          onClick={() => setMode("slideshow")}
        >
          <Play /> Slideshow
        </Button>
      </div>

      {mode === "grid" ? (
        <GridView photos={photos} />
      ) : (
        <Slideshow photos={photos} />
      )}
    </div>
  );
}

function GridView({ photos }: { photos: SharedAlbumPhoto[] }) {
  return (
    <div className="flex flex-col gap-6">
      {photos.map((photo) => (
        <figure
          key={photo.photoId}
          className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="relative aspect-[4/3] w-full bg-muted">
            {photo.url ? (
              <Image
                src={photo.url}
                alt={photo.caption ?? photo.fileName}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            ) : null}
          </div>
          {photo.caption ? (
            <figcaption className="px-4 pb-4 text-sm text-muted-foreground">
              {photo.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function Slideshow({ photos }: { photos: SharedAlbumPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || photos.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [playing, photos.length]);

  function goNext() {
    setIndex((current) => (current + 1) % photos.length);
  }
  function goPrev() {
    setIndex((current) => (current - 1 + photos.length) % photos.length);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight")
        setIndex((current) => (current + 1) % photos.length);
      if (event.key === "ArrowLeft")
        setIndex((current) => (current - 1 + photos.length) % photos.length);
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photos.length]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        {photo.url ? (
          <Image
            key={photo.photoId}
            src={photo.url}
            alt={photo.caption ?? photo.fileName}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="animate-in fade-in object-contain duration-500"
          />
        ) : null}

        {photo.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
            <p className="text-sm text-white">{photo.caption}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goPrev}
          aria-label="Previous photo"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={goNext}
          aria-label="Next photo"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="flex justify-center gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.photoId}
            type="button"
            aria-label={`Go to photo ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 w-4 rounded-full transition-colors",
              i === index ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
