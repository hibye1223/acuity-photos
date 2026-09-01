"use client";

import { RotateCcw, RotateCw, X } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { savePhotoEdit } from "~/app/actions/photos";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/client";
import { uploadPhotoWithProgress } from "~/lib/upload-with-progress";
import { cn } from "~/lib/utils";

type Crop = { x: number; y: number; width: number; height: number };
type Corner = "tl" | "tr" | "bl" | "br";

const HANDLE_SIZE = 14;
const MIN_CROP_SIZE = 40;
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/**
 * The corner opposite `corner` on a rect acts as the fixed anchor while
 * resizing; the dragged corner moves freely.
 */
function anchorPoint(origin: Crop, corner: Corner): { x: number; y: number } {
  return {
    x: corner === "tl" || corner === "bl" ? origin.x + origin.width : origin.x,
    y: corner === "tl" || corner === "tr" ? origin.y + origin.height : origin.y,
  };
}

function draggedPoint(origin: Crop, corner: Corner): { x: number; y: number } {
  return {
    x: corner === "tl" || corner === "bl" ? origin.x : origin.x + origin.width,
    y: corner === "tl" || corner === "tr" ? origin.y : origin.y + origin.height,
  };
}

/** Draws the source image rotated/flipped onto a canvas sized to match. */
function buildWorkingCanvas(
  image: HTMLImageElement,
  rotation: number,
  flipH: boolean,
): HTMLCanvasElement {
  const swapped = rotation === 90 || rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swapped ? image.naturalHeight : image.naturalWidth;
  canvas.height = swapped ? image.naturalWidth : image.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, 1);
  ctx.drawImage(
    image,
    -image.naturalWidth / 2,
    -image.naturalHeight / 2,
    image.naturalWidth,
    image.naturalHeight,
  );

  return canvas;
}

function fullCrop(canvas: HTMLCanvasElement): Crop {
  return { x: 0, y: 0, width: canvas.width, height: canvas.height };
}

export function PhotoEditor({
  photo,
  onClose,
  onSaved,
}: {
  photo: { id: string; url: string; fileName: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cropRef = useRef<Crop | null>(null);

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [displayScale, setDisplayScale] = useState(1);
  const [displaySize, setDisplaySize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterCss = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  // Rebuild the rotated/flipped working canvas whenever those change, and
  // reset the crop to match its new dimensions.
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = photo.url;
    image.onload = () => {
      const working = buildWorkingCanvas(image, rotation, flipH);
      workingCanvasRef.current = working;
      const nextCrop = fullCrop(working);
      cropRef.current = nextCrop;
      setCrop(nextCrop);

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const scale = Math.min(
        container.clientWidth / working.width,
        container.clientHeight / working.height,
        1,
      );
      setDisplayScale(scale);
      setDisplaySize({
        width: working.width * scale,
        height: working.height * scale,
      });
      canvas.width = working.width;
      canvas.height = working.height;
      canvas.style.width = `${working.width * scale}px`;
      canvas.style.height = `${working.height * scale}px`;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(working, 0, 0);
    };
    image.onerror = () => setError("Couldn't load this photo for editing.");
  }, [photo.url, rotation, flipH]);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  function clampCrop(next: Crop, bounds: { width: number; height: number }) {
    const width = Math.min(Math.max(next.width, MIN_CROP_SIZE), bounds.width);
    const height = Math.min(
      Math.max(next.height, MIN_CROP_SIZE),
      bounds.height,
    );
    const x = Math.min(Math.max(next.x, 0), bounds.width - width);
    const y = Math.min(Math.max(next.y, 0), bounds.height - height);
    return { x, y, width, height };
  }

  function startDrag(
    event: ReactPointerEvent<HTMLDivElement>,
    mode: "move" | "resize",
    corner?: Corner,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const working = workingCanvasRef.current;
    const startCrop = cropRef.current;
    if (!working || !startCrop) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...startCrop };

    function handleMove(moveEvent: PointerEvent) {
      if (!working) return;
      const dx = (moveEvent.clientX - startX) / displayScale;
      const dy = (moveEvent.clientY - startY) / displayScale;

      let next: Crop;
      if (mode === "move") {
        next = { ...origin, x: origin.x + dx, y: origin.y + dy };
      } else {
        const activeCorner = corner ?? "br";
        const anchor = anchorPoint(origin, activeCorner);
        const dragged = draggedPoint(origin, activeCorner);
        const movedX = dragged.x + dx;
        const movedY = dragged.y + dy;
        next = {
          x: Math.min(anchor.x, movedX),
          y: Math.min(anchor.y, movedY),
          width: Math.abs(movedX - anchor.x),
          height: Math.abs(movedY - anchor.y),
        };
      }

      setCrop(clampCrop(next, working));
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  async function handleSave() {
    const working = workingCanvasRef.current;
    const finalCrop = cropRef.current;
    if (!working || !finalCrop) return;

    setIsSaving(true);
    setError(null);
    try {
      const output = document.createElement("canvas");
      output.width = Math.round(finalCrop.width);
      output.height = Math.round(finalCrop.height);
      const ctx = output.getContext("2d");
      if (!ctx) throw new Error("Couldn't render the edited photo.");
      ctx.filter = filterCss;
      ctx.drawImage(
        working,
        finalCrop.x,
        finalCrop.y,
        finalCrop.width,
        finalCrop.height,
        0,
        0,
        output.width,
        output.height,
      );

      const blob = await new Promise<Blob | null>((resolve) =>
        output.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error("Couldn't render the edited photo.");

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("You're signed out. Please sign in again.");
      }

      const storagePath = `${session.user.id}/${crypto.randomUUID()}.jpg`;
      await uploadPhotoWithProgress({
        path: storagePath,
        file: blob,
        accessToken: session.access_token,
        onProgress: () => {},
      });

      await savePhotoEdit({
        photoId: photo.id,
        storagePath,
        contentType: "image/jpeg",
        sizeBytes: blob.size,
      });

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  const displayCrop = crop
    ? {
        left: crop.x * displayScale,
        top: crop.y * displayScale,
        width: crop.width * displayScale,
        height: crop.height * displayScale,
      }
    : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit photo"
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 p-4"
    >
      <div className="flex items-center justify-between text-white">
        <h2 className="text-sm font-medium">Edit photo</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Close editor"
        >
          <X className="size-5" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden py-4"
      >
        <div
          className="relative"
          style={
            displaySize
              ? { width: displaySize.width, height: displaySize.height }
              : undefined
          }
        >
          <canvas
            ref={canvasRef}
            style={{ filter: filterCss }}
            className="touch-none"
          />
          {displayCrop ? (
            <div
              className="absolute cursor-move border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
              style={{
                left: displayCrop.left,
                top: displayCrop.top,
                width: displayCrop.width,
                height: displayCrop.height,
              }}
              onPointerDown={(event) => startDrag(event, "move")}
            >
              {CORNERS.map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(event) => startDrag(event, "resize", corner)}
                  className={cn(
                    "absolute rounded-full border-2 border-white bg-black/60",
                    corner === "tl" && "-left-2 -top-2 cursor-nwse-resize",
                    corner === "tr" && "-right-2 -top-2 cursor-nesw-resize",
                    corner === "bl" && "-bottom-2 -left-2 cursor-nesw-resize",
                    corner === "br" && "-bottom-2 -right-2 cursor-nwse-resize",
                  )}
                  style={{ width: HANDLE_SIZE, height: HANDLE_SIZE }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 270) % 360)}
          >
            <RotateCcw className="size-4" />
            Rotate left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
          >
            <RotateCw className="size-4" />
            Rotate right
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFlipH((f) => !f)}
          >
            Flip
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const working = workingCanvasRef.current;
              if (working) setCrop(fullCrop(working));
            }}
          >
            Reset crop
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs text-white sm:grid-cols-3">
          <label className="flex items-center gap-2">
            Brightness
            <input
              type="range"
              min={50}
              max={150}
              value={brightness}
              onChange={(event) => setBrightness(Number(event.target.value))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2">
            Contrast
            <input
              type="range"
              min={50}
              max={150}
              value={contrast}
              onChange={(event) => setContrast(Number(event.target.value))}
              className="flex-1"
            />
          </label>
          <label className="flex items-center gap-2">
            Saturation
            <input
              type="range"
              min={0}
              max={200}
              value={saturation}
              onChange={(event) => setSaturation(Number(event.target.value))}
              className="flex-1"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
