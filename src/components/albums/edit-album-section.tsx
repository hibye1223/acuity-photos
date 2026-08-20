"use client";

import { useState } from "react";
import type { AlbumDraftPhoto } from "~/app/actions/album-assistant";
import { AlbumAssistant } from "~/components/albums/album-assistant";
import { EditAlbumForm } from "~/components/albums/edit-album-form";
import type { CaptionStyle } from "~/lib/ai/album-assistant";

export function EditAlbumSection({
  albumId,
  initialTitle,
  initialPhotos,
  initialCaptionStyle,
  initialChallengeMe,
}: {
  albumId: string;
  initialTitle: string;
  initialPhotos: AlbumDraftPhoto[];
  initialCaptionStyle: CaptionStyle;
  initialChallengeMe: boolean;
}) {
  const [mode, setMode] = useState<"manual" | "ai">("manual");

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => setMode(mode === "manual" ? "ai" : "manual")}
        className="self-start text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        {mode === "manual"
          ? "Ask AI to help instead"
          : "Edit it yourself instead"}
      </button>

      {mode === "manual" ? (
        <EditAlbumForm
          albumId={albumId}
          initialTitle={initialTitle}
          initialPhotos={initialPhotos}
        />
      ) : (
        <AlbumAssistant
          initialCaptionStyle={initialCaptionStyle}
          initialChallengeMe={initialChallengeMe}
          existingAlbum={{
            albumId,
            title: initialTitle,
            photos: initialPhotos,
          }}
        />
      )}
    </div>
  );
}
