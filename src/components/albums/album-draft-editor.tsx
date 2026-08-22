"use client";

import {
  ArrowDown,
  ArrowUp,
  ImageOff,
  ImagePlus,
  Info,
  Loader2,
  Repeat,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type {
  AlbumDraftPhoto,
  PickerPhoto,
} from "~/app/actions/album-assistant";
import { listPhotosForPickerAction } from "~/app/actions/album-assistant";
import { saveAlbumAction, updateAlbumAction } from "~/app/actions/albums";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

export function AlbumDraftEditor({
  albumId,
  initialTitle,
  initialPhotos,
  note,
  isStreaming = false,
  onDiscard,
  discardLabel = "Discard draft",
  saveLabel = "Save album",
}: {
  /** When set, edits and replaces an existing album instead of creating one. */
  albumId?: string;
  initialTitle: string;
  initialPhotos: AlbumDraftPhoto[];
  /** Set when the assistant couldn't confidently match the request — shown as a heads-up, not hidden. */
  note?: string;
  /**
   * While true, the editor keeps syncing from `initialTitle`/`initialPhotos`
   * as they change — letting you watch the assistant build the draft live —
   * while preserving any field you've already edited yourself. Once this
   * flips (or false) to begin with, one final sync happens and the editor
   * becomes fully self-contained, exactly like a normal edit.
   */
  isStreaming?: boolean;
  onDiscard: () => void;
  discardLabel?: string;
  saveLabel?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [photos, setPhotos] = useState(initialPhotos);
  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [pickerPhotos, setPickerPhotos] = useState<PickerPhoto[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const finalizedRef = useRef(!isStreaming);
  const titleTouchedRef = useRef(false);
  const touchedCaptionsRef = useRef<Set<string>>(new Set());
  const captionOverridesRef = useRef<Record<string, string>>({});
  const removedIdsRef = useRef<Set<string>>(new Set());

  // While streaming, keep pulling in the assistant's latest title — unless
  // the user has already typed their own.
  useEffect(() => {
    if (finalizedRef.current) return;
    if (!titleTouchedRef.current) setTitle(initialTitle);
  }, [initialTitle]);

  // While streaming, merge in newly-arrived/updated photos, preserving any
  // caption the user already edited and dropping anything they removed.
  // Once streaming ends, one last sync happens (picking up resolved
  // thumbnails/filenames) and further prop changes are ignored — from then
  // on this behaves like a normal, fully local editor.
  useEffect(() => {
    if (finalizedRef.current) return;
    setPhotos(
      initialPhotos
        .filter((photo) => !removedIdsRef.current.has(photo.photoId))
        .map((photo) =>
          touchedCaptionsRef.current.has(photo.photoId)
            ? {
                ...photo,
                caption:
                  captionOverridesRef.current[photo.photoId] ?? photo.caption,
              }
            : photo,
        ),
    );
    if (!isStreaming) finalizedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhotos, isStreaming]);

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
    setPhotos((prev) => {
      const target = prev[index];
      if (target) removedIdsRef.current.add(target.photoId);
      return prev.filter((_, i) => i !== index);
    });
    if (swapIndex === index) setSwapIndex(null);
  };

  const updateCaption = (index: number, caption: string) => {
    setPhotos((prev) => {
      const target = prev[index];
      if (target) {
        touchedCaptionsRef.current.add(target.photoId);
        captionOverridesRef.current[target.photoId] = caption;
      }
      return prev.map((photo, i) =>
        i === index ? { ...photo, caption } : photo,
      );
    });
  };

  // swapIndex === -1 is a sentinel for "adding a new photo" rather than
  // replacing the one at that index — reuses the same picker UI/loading.
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
    if (swapIndex === -1) {
      setPhotos((prev) => [
        ...prev,
        {
          photoId: picked.photoId,
          fileName: picked.fileName,
          url: picked.url,
          caption: "",
        },
      ]);
      return;
    }
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
        const photosInput = photos.map((photo) => ({
          photoId: photo.photoId,
          caption: photo.caption,
        }));

        if (albumId) {
          await updateAlbumAction({
            albumId,
            title: trimmedTitle,
            photos: photosInput,
          });
        } else {
          await saveAlbumAction({ title: trimmedTitle, photos: photosInput });
        }
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
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2 border-b border-dashed border-border pb-3">
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          album · {photos.length} photo{photos.length === 1 ? "" : "s"}
        </span>
        <span className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          {isStreaming ? "building…" : albumId ? "editing" : "draft"}
        </span>
      </div>

      {note ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{note}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="album-title">Album title</Label>
        <Input
          id="album-title"
          value={title}
          onChange={(event) => {
            titleTouchedRef.current = true;
            setTitle(event.target.value);
          }}
          maxLength={120}
          placeholder={isStreaming ? "title streaming in…" : "Name this album"}
        />
      </div>

      <ul className="flex flex-col gap-3">
        {photos.map((photo, index) => (
          <li
            key={photo.photoId}
            className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row"
          >
            <span className="hidden shrink-0 pt-1 font-mono text-xs text-muted-foreground sm:block">
              {String(index + 1).padStart(2, "0")}
            </span>
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
              <span className="max-w-20 truncate text-center font-mono text-[11px] text-muted-foreground">
                {photo.fileName || "…"}
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
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                      swap — pick a replacement
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
                disabled={isStreaming || index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Move down"
                disabled={isStreaming || index === photos.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Swap photo"
                disabled={isStreaming}
                onClick={() => openSwap(index)}
              >
                <Repeat className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Remove photo"
                disabled={isStreaming}
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
          {isStreaming
            ? "Waiting for the first photo…"
            : "No photos yet — add some from your library below."}
        </p>
      ) : null}

      {!isStreaming ? (
        swapIndex === -1 ? (
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
                add photos from your library
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSwapIndex(null)}
              >
                Done
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
              <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                {(pickerPhotos ?? [])
                  .filter((p) => !usedPhotoIds.has(p.photoId))
                  .map((p) => (
                    <button
                      key={p.photoId}
                      type="button"
                      onClick={() => selectSwapPhoto(p)}
                      className="group relative aspect-square overflow-hidden rounded-md border border-border"
                      aria-label={`Add ${p.fileName}`}
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
                {pickerPhotos &&
                pickerPhotos.filter((p) => !usedPhotoIds.has(p.photoId))
                  .length === 0 ? (
                  <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
                    Every photo in your library is already in this album.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => openSwap(-1)}
          >
            <ImagePlus className="size-4" />
            Add photos
          </Button>
        )
      ) : null}

      {saveError ? (
        <p className={cn("text-sm text-destructive")}>{saveError}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving || isStreaming}
        >
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              {discardLabel}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard this draft?</AlertDialogTitle>
              <AlertDialogDescription>
                Any photos, captions, or edits you've made here will be lost.
                This doesn't delete any photos from your library.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep editing</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onDiscard}>
                {discardLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
