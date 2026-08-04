"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import type { AlbumDraftResult } from "~/app/actions/album-assistant";
import { generateAlbumDraftAction } from "~/app/actions/album-assistant";
import { AlbumDraftEditor } from "~/components/albums/album-draft-editor";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

const EXAMPLE_PROMPTS = [
  "Make an album of our trip to the beach.",
  "Create an album from our vacation in Florida.",
  "Build an album from last weekend.",
];

export function AlbumAssistant() {
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<AlbumDraftResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  const handleGenerate = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Describe the album you want first.");
      return;
    }
    setError(null);
    startGenerating(async () => {
      try {
        const result = await generateAlbumDraftAction(trimmed);
        setDraft(result);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong. Try again.",
        );
      }
    });
  };

  if (draft) {
    return (
      <AlbumDraftEditor
        initialTitle={draft.title}
        initialPhotos={draft.photos}
        onDiscard={() => {
          setDraft(null);
          setPrompt("");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={EXAMPLE_PROMPTS[0]}
          rows={3}
          maxLength={500}
          aria-label="Describe the album you want"
          disabled={isGenerating}
        />
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              disabled={isGenerating}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div>
        <Button type="button" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Building your draft…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate album
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
