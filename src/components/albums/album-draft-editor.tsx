"use client";

import { ArrowDown, ArrowUp, ImageOff, Loader2, Repeat, X } from "lucide-react";
import { useState, useTransition } from "react";
import type {
  AlbumDraftPhoto,
  PickerPhoto,
} from "~/app/actions/album-assistant";
import { listPhotosForPickerAction } from "~/app/actions/album-assistant";
import { saveAlbumAction } from "~/app/actions/albums";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export function AlbumDraftEditor({
  initialTitle,
  initialPhotos,
  onDiscard,
}: {
  initialTitle: string;
  initialPhotos: AlbumDraftPhoto[];
  onDiscard: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [photos, setPhotos] = useState(initialPhotos);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [pickerPhotos, setPickerPhotos] = useState<PickerPhoto[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const usedPhotoIds = new Set(photos.map((photo) => photo.photoId));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      return next;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    if (swapIndex === index) setSwapIndex(null);
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos((prev) =>
      prev.map((photo, i) => (i === index ? { ...photo, caption } : photo)),
    );
  };

  const openSwap = async (index: number) => {
    setSwapIndex(index);
    if (pickerPhotos) return;
    setPickerLoading(true);
    setPickerError(null);
    try {
      const result = await listPhotosForPickerAction();
      setPickerPhotos(result);
    } catch (error) {
      setPickerError(
        error instanceof Error ? error.message : "Couldn't load your photos.",
      );
    } finally {
      setPickerLoading(false);
    }
  };

  const selectSwapPhoto = (picked: PickerPhoto) => {
    if (swapIndex === null) return;
    setPhotos((prev) =>
      prev.map((photo, i) =>
        i === swapIndex
          ? {
              photoId: picked.photoId,
              fileName: picked.fileName,
              url: picked.url,
              caption: photo.caption,
            }
          : photo,
      ),
    );
    setSwapIndex(null);
  };

  const handleSave = () => {
    setSaveError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError("Give the album a title.");
      return;
    }
    if (photos.length === 0) {
      setSaveError("Add at least one photo.");
      return;
    }
    startSaving(async () => {
      try {
        await saveAlbumAction({
          title: trimmedTitle,
          photos: photos.map((photo) => ({
            photoId: photo.photoId,
            caption: photo.caption,
          })),
        });
      } catch (error) {
        // A successful save redirects (which throws internally) and never
        // reaches here — only real failures do.
        setSaveError(
          error instanceof Error ? error.message : "Couldn't save the album.",
        );
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-title">Album title</Label>
        <Input
          id="album-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="Name this album"
        />
      </div>

      <ul className="flex flex-col gap-3">
        {photos.map((photo, index) => (
          <li
            key={photo.photoId}
            className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row"
          >
            <div className="flex shrink-0 flex-col items-center gap-1">
              {photo.url ? (
                // biome-ignore lint/performance/noImgElement: short-lived signed preview URL
                <img
                  src={photo.url}
                  alt=""
                  className="size-20 rounded-md object-cover"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <ImageOff className="size-5" aria-hidden="true" />
                </div>
              )}
              <span className="max-w-20 truncate text-center text-xs text-muted-foreground">
                {photo.fileName}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={`caption-${photo.photoId}`} className="sr-only">
                Caption
              </Label>
              <Textarea
                id={`caption-${photo.photoId}`}
                value={photo.caption}
                onChange={(event) => updateCaption(index, event.target.value)}
                maxLength={240}
                rows={2}
                placeholder="Add a caption"
                className="min-h-0"
              />

              {swapIndex === index ? (
                <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Pick a replacement photo
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setSwapIndex(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {pickerLoading ? (
                    <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading your photos…
                    </div>
                  ) : pickerError ? (
                    <p className="text-sm text-destructive">{pickerError}</p>
                  ) : (
                    <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                      {(pickerPhotos ?? [])
                        .filter((p) => !usedPhotoIds.has(p.photoId))
                        .map((p) => (
                          <button
                            key={p.photoId}
                            type="button"
                            onClick={() => selectSwapPhoto(p)}
                            className="group relative aspect-square overflow-hidden rounded-md border border-border"
                            aria-label={`Use ${p.fileName}`}
                          >
                            {p.url ? (
                              // biome-ignore lint/performance/noImgElement: short-lived signed preview URL
                              <img
                                src={p.url}
                                alt=""
                                className="size-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
                                <ImageOff className="size-4" />
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Move down"
                disabled={index === photos.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Swap photo"
                onClick={() => openSwap(index)}
              >
                <Repeat className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Remove photo"
                onClick={() => removePhoto(index)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
          No photos left in this draft.
        </p>
      ) : null}

      {saveError ? (
        <p className={cn("text-sm text-destructive")}>{saveError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save album"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDiscard}
          disabled={isSaving}
        >
          Discard draft
        </Button>
      </div>
    </div>
  );
}
