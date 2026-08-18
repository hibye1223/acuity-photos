"use client";

import { useState } from "react";
import { AlbumAssistant } from "~/components/albums/album-assistant";
import { BlankAlbumEditor } from "~/components/albums/blank-album-editor";
import type { CaptionStyle } from "~/lib/ai/album-assistant";

export function AlbumBuilderSection({
  examplePrompts,
  initialCaptionStyle,
  initialChallengeMe,
}: {
  examplePrompts: string[];
  initialCaptionStyle: CaptionStyle;
  initialChallengeMe: boolean;
}) {
  const [mode, setMode] = useState<"ai" | "blank">("ai");

  return (
    <section className="flex flex-col gap-4" data-tour="ai-assistant">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {mode === "ai" ? "Album Assistant" : "Build your own album"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mode === "ai"
              ? "Describe the album you want. It'll pull together a draft — you make it yours before saving anything."
              : "Pick photos from your library yourself, in whatever order you like."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMode(mode === "ai" ? "blank" : "ai")}
          className="shrink-0 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {mode === "ai" ? "Build one yourself instead" : "Use the AI instead"}
        </button>
      </div>

      {mode === "ai" ? (
        <AlbumAssistant
          examplePrompts={examplePrompts}
          initialCaptionStyle={initialCaptionStyle}
          initialChallengeMe={initialChallengeMe}
        />
      ) : (
        <BlankAlbumEditor onDiscard={() => setMode("ai")} />
      )}
    </section>
  );
}
