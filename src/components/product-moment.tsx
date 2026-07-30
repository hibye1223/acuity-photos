"use client";

import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

type Stage = 0 | 1 | 2;

const STAGES: { label: string; caption: string }[] = [
  { label: "Before", caption: "A camera roll nobody wants to scroll through" },
  {
    label: "Together",
    caption: "Acuity proposes the album, you confirm the details",
  },
  { label: "After", caption: "Ready to share, exactly the way you want it" },
];

const TILES = [
  { id: 1, kind: "photo" as const, rotate: -3, caption: "Day 1, arrival" },
  { id: 2, kind: "duplicate" as const, rotate: 2, caption: "" },
  { id: 3, kind: "photo" as const, rotate: 1, caption: "Team lunch" },
  { id: 4, kind: "screenshot" as const, rotate: -2, caption: "" },
  {
    id: 5,
    kind: "photo" as const,
    rotate: 3,
    caption: "Sunset walk",
    askFace: true,
  },
  { id: 6, kind: "blurry" as const, rotate: -1, caption: "" },
];

const TAGS: Record<string, string> = {
  duplicate: "1 of 2",
  screenshot: "screenshot",
  blurry: "blurry",
};

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
  const fading = stage === 1 && flagged;
  const rotate = stage === 0 ? tile.rotate : 0;

  return (
    <div
      className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted transition-all duration-700 ease-out"
      style={{
        transform: `rotate(${rotate}deg) scale(${fading ? 0.92 : 1})`,
        opacity: fading ? 0.35 : 1,
      }}
    >
      <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
        <PhotoIcon
          className={cn(
            "size-6 transition-all duration-700",
            tile.kind === "blurry" && stage !== 2 && "blur-[2px]",
          )}
        />
      </div>

      {stage === 1 && flagged && (
        <span className="absolute bottom-1 left-1 rounded-full bg-foreground/80 px-1.5 py-0.5 text-[9px] font-medium text-background transition-opacity duration-500">
          {TAGS[tile.kind]}
        </span>
      )}

      {stage === 1 && tile.askFace && (
        <div className="absolute inset-x-1 bottom-1 rounded-md bg-card/95 px-1.5 py-1 text-[9px] leading-tight shadow-sm ring-1 ring-border">
          <span className="font-medium text-card-foreground">Who's this?</span>
          <div className="mt-0.5 flex gap-1">
            <span className="rounded bg-primary px-1 py-0.5 text-primary-foreground">
              Mia
            </span>
            <span className="rounded bg-secondary px-1 py-0.5 text-secondary-foreground">
              Someone else
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductMoment({ className }: { className?: string }) {
  const [stage, setStage] = useState<Stage>(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoplay(false);
    }
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const id = setInterval(() => {
      setStage((s) => ((s + 1) % 3) as Stage);
    }, 3600);
    return () => clearInterval(id);
  }, [autoplay]);

  const keepers = TILES.filter((t) => t.kind === "photo");

  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 grid min-h-[9rem] grid-cols-3 gap-2 sm:gap-3">
          {stage < 2
            ? TILES.map((tile) => (
                <Tile key={tile.id} tile={tile} stage={stage} />
              ))
            : keepers.map((tile) => (
                <div key={tile.id} className="flex flex-col gap-1.5">
                  <Tile tile={tile} stage={stage} />
                  <span className="truncate text-[11px] text-muted-foreground">
                    {tile.caption}
                  </span>
                </div>
              ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {STAGES[stage].caption}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {STAGES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => {
              setAutoplay(false);
              setStage(i as Stage);
            }}
            aria-current={stage === i}
            aria-label={s.label}
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
