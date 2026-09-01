"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type Stage = 0 | 1 | 2;

const TILES = [
  { id: 1, kind: "photo" as const, rotate: -3 },
  { id: 2, kind: "duplicate" as const, rotate: 2 },
  { id: 3, kind: "photo" as const, rotate: 1 },
  { id: 4, kind: "screenshot" as const, rotate: -2 },
  { id: 5, kind: "photo" as const, rotate: 3 },
  { id: 6, kind: "blurry" as const, rotate: -1 },
] as const;

const TAGS: Record<string, string> = {
  duplicate: "1 of 2",
  screenshot: "screenshot",
  blurry: "blurry",
};

const CAPTIONS = [
  "Your camera roll, unsorted",
  "Acuity flags the clutter and tells you why",
  "Clean, with nothing risked",
] as const;

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="9" r="1.75" fill="currentColor" />
      <path
        d="M4 17.5 9 12l3.5 3.5L16 12l4 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Tile({ tile, stage }: { tile: (typeof TILES)[number]; stage: Stage }) {
  const flagged = tile.kind !== "photo";
  const removed = stage === 2 && flagged;
  const fading = stage === 1 && flagged;
  const rotate = stage === 0 ? tile.rotate : 0;

  if (removed) return null;

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-all duration-700 ease-out"
      style={{
        transform: `rotate(${rotate}deg) scale(${fading ? 0.92 : 1})`,
        opacity: fading ? 0.4 : 1,
      }}
    >
      <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
        <PhotoIcon
          className={cn(
            "size-6 transition-all duration-700",
            tile.kind === "blurry" && "blur-[2px]",
          )}
        />
      </div>

      {stage === 1 && flagged && (
        <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[9px] font-medium text-background">
          {TAGS[tile.kind]}
        </span>
      )}
    </div>
  );
}

export function DeclutterMoment({ className }: { className?: string }) {
  const [stage, setStage] = useState<Stage>(0);
  const [autoplay, setAutoplay] = useState(true);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoplay(false);
    }
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!autoplay || !inView) return;
    const id = setInterval(() => {
      setStage((s) => ((s + 1) % 3) as Stage);
    }, 2600);
    return () => clearInterval(id);
  }, [autoplay, inView]);

  return (
    <div ref={containerRef} className={className}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {TILES.map((tile) => (
            <Tile key={tile.id} tile={tile} stage={stage} />
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {CAPTIONS[stage]}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {CAPTIONS.map((caption, i) => (
          <button
            key={caption}
            type="button"
            onClick={() => {
              setAutoplay(false);
              setStage(i as Stage);
            }}
            aria-current={stage === i}
            aria-label={caption}
            className={cn(
              "h-1.5 rounded-full transition-all",
              stage === i
                ? "w-6 bg-primary"
                : "w-1.5 bg-border hover:bg-muted-foreground/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
