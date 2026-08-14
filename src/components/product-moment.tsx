"use client";

import { Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

type Phase = 0 | 1 | 2 | 3;

type Exchange = {
  askedBy: "acuity" | "you";
  question: string;
  options: readonly [string, string];
  reply: string;
};

const EXCHANGES: readonly Exchange[] = [
  {
    askedBy: "acuity",
    question: "Found 18 photos from the lake trip. Want me to start the album?",
    options: ["Yes, let's see it", "Not now"],
    reply: "On it. Sorting by time and place now.",
  },
  {
    askedBy: "acuity",
    question: "This one's blurry. Keep it anyway, or cut it?",
    options: ["Cut it", "Keep it"],
    reply: "Cut. One less photo to scroll past.",
  },
  {
    askedBy: "acuity",
    question:
      "Two near-identical shots here. The wide one has better light, but the close-up has everyone smiling. Which one?",
    options: ["The close-up", "The wide shot"],
    reply: "Good call. Smiling wins.",
  },
  {
    askedBy: "you",
    question: "Can you write a caption for the campfire one?",
    options: ["Nights like this don't need a filter", "Campfire, day two"],
    reply: "Added. You can always rewrite it yourself.",
  },
  {
    askedBy: "acuity",
    question: "I don't recognize this face yet. Who's this?",
    options: ["That's Mia", "Skip for now"],
    reply: "Got it, tagging Mia from here on.",
  },
  {
    askedBy: "acuity",
    question:
      "Album's ready. 14 photos, captions drafted. Publish, or keep tweaking?",
    options: ["Keep tweaking", "Publish it"],
    reply: "Whenever you're ready. I'll wait.",
  },
] as const;

const PHASE_DELAYS = [550, 1100, 750, 2200] as const;

export function ProductMoment({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(0);
  const [autoplay, setAutoplay] = useState(true);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAutoplay(false);
      setPhase(3);
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
    const delay = PHASE_DELAYS[phase];
    const id = setTimeout(() => {
      if (phase === 3) {
        setIndex((i) => (i + 1) % EXCHANGES.length);
        setPhase(0);
      } else {
        setPhase((p) => (p + 1) as Phase);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [autoplay, inView, phase]);

  const exchange = EXCHANGES[index] ?? EXCHANGES[0];
  const fromYou = exchange.askedBy === "you";

  return (
    <div ref={containerRef} className={className}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex min-h-[9.5rem] flex-col gap-3">
          <div
            className={cn(
              "flex items-start gap-2",
              fromYou && "flex-row-reverse text-right",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                fromYou
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground",
              )}
            >
              {fromYou ? (
                <User className="size-3.5" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
            </span>
            <p
              className={cn(
                "rounded-2xl px-3 py-2 text-sm text-foreground",
                fromYou
                  ? "rounded-tr-sm bg-primary/10"
                  : "rounded-tl-sm bg-muted text-left",
              )}
            >
              {exchange.question}
            </p>
          </div>

          <div
            className={cn(
              "flex flex-wrap gap-2 transition-opacity duration-500",
              fromYou ? "mr-8 justify-end" : "ml-8",
              phase >= 1 ? "opacity-100" : "opacity-0",
            )}
          >
            {exchange.options.map((option, i) => (
              <span
                key={option}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-500",
                  phase >= 2 && i === 0
                    ? "border-primary bg-primary text-primary-foreground"
                    : phase >= 2 && i !== 0
                      ? "border-border text-muted-foreground opacity-40"
                      : "border-border text-foreground",
                )}
              >
                {phase >= 2 && i === 0 && <User className="size-3" />}
                {option}
              </span>
            ))}
          </div>

          <p
            className={cn(
              "text-xs text-muted-foreground transition-opacity duration-500",
              fromYou ? "mr-8 text-right" : "ml-8",
              phase >= 3 ? "opacity-100" : "opacity-0",
            )}
          >
            {exchange.reply}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {EXCHANGES.map((item, i) => (
          <button
            key={item.question}
            type="button"
            onClick={() => {
              setAutoplay(false);
              setIndex(i);
              setPhase(3);
            }}
            aria-current={index === i}
            aria-label={`Exchange ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              index === i
                ? "w-6 bg-primary"
                : "w-1.5 bg-border hover:bg-muted-foreground/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
