"use client";

import { Check, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { permanentlyDeletePhotos, restorePhotos } from "~/app/actions/photos";
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
import { cn } from "~/lib/utils";

export type TrashedPhoto = {
  id: string;
  url: string;
  fileName: string;
};

export function TrashGrid({ photos }: { photos: TrashedPhoto[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleRestore(ids: string[]) {
    setIsBusy(true);
    try {
      await restorePhotos(ids);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePermanentlyDelete(ids: string[]) {
    setIsBusy(true);
    try {
      await permanentlyDeletePhotos(ids);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => handleRestore([...selectedIds])}
            >
              <RotateCcw className="size-4" />
              Restore
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isBusy}>
                  <Trash2 className="size-4" />
                  Delete forever
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Permanently delete {selectedIds.size} photo
                    {selectedIds.size === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This can't be undone — they'll be gone for good.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBusy}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isBusy}
                    onClick={(event) => {
                      event.preventDefault();
                      handlePermanentlyDelete([...selectedIds]);
                    }}
                  >
                    {isBusy ? "Deleting..." : "Delete forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) => {
          const selected = selectedIds.has(photo.id);

          return (
            // biome-ignore lint/a11y/useSemanticElements: contains a nested real <button> for restore, which a <button> wrapper can't contain
            <div
              key={photo.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleSelected(photo.id)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleSelected(photo.id);
              }}
              className={cn(
                "group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-muted text-left",
                selected
                  ? "border-primary ring-2 ring-primary"
                  : "border-border",
              )}
            >
              <Image
                src={photo.url}
                alt={photo.fileName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover opacity-70"
              />
              <span
                className={cn(
                  "absolute right-2 top-2 flex size-5 items-center justify-center rounded-full border",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/80 bg-black/30 text-transparent",
                )}
              >
                <Check className="size-3.5" />
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRestore([photo.id]);
                }}
                disabled={isBusy}
                aria-label="Restore photo"
                title="Restore photo"
                className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
