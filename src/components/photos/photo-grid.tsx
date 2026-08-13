"use client";

import { Check, ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { deletePhotos } from "~/app/actions/photos";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

export type GalleryPhoto = {
  id: string;
  url: string;
  fileName: string;
  date: string;
};

type SortOption = "newest" | "oldest" | "name";

const SORTERS: Record<
  SortOption,
  (a: GalleryPhoto, b: GalleryPhoto) => number
> = {
  newest: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  oldest: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  name: (a, b) => a.fileName.localeCompare(b.fileName),
};

export function PhotoGrid({
  photos: unsortedPhotos,
}: {
  photos: GalleryPhoto[];
}) {
  const router = useRouter();
  const [sort, setSort] = useState<SortOption>("newest");
  const photos = useMemo(
    () => [...unsortedPhotos].sort(SORTERS[sort]),
    [unsortedPhotos, sort],
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const close = () => setOpenIndex(null);
  const showPrev = () =>
    setOpenIndex((i) =>
      i === null ? null : (i - 1 + photos.length) % photos.length,
    );
  const showNext = () =>
    setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));

  useEffect(() => {
    if (openIndex === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowLeft") {
        setOpenIndex((i) =>
          i === null ? null : (i - 1 + photos.length) % photos.length,
        );
      }
      if (event.key === "ArrowRight") {
        setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openIndex, photos.length]);

  const active = openIndex !== null ? photos[openIndex] : null;

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

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleDeleteSelected() {
    setIsDeleting(true);
    try {
      await deletePhotos([...selectedIds]);
      exitSelectMode();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteActive() {
    if (!active) return;
    setIsDeleting(true);
    try {
      await deletePhotos([active.id]);
      close();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        {selectMode ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={exitSelectMode}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectMode(true)}
          >
            Select
          </Button>
        )}

        <div className="flex items-center gap-2">
          {selectMode && selectedIds.size > 0 ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  Delete {selectedIds.size}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedIds.size} photo
                    {selectedIds.size === 1 ? "" : "s"}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This can't be undone. Deleted photos are also removed from
                    any albums they're in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={(event) => {
                      event.preventDefault();
                      handleDeleteSelected();
                    }}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}

          <Select
            value={sort}
            onValueChange={(value) => setSort(value as SortOption)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => {
          const selected = selectedIds.has(photo.id);

          return (
            <button
              key={photo.id}
              type="button"
              onClick={() =>
                selectMode ? toggleSelected(photo.id) : setOpenIndex(index)
              }
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border bg-muted text-left",
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
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {selectMode ? (
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
              ) : (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {new Date(photo.date).toLocaleDateString()}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="size-6" />
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                onClick={(event) => event.stopPropagation()}
                className="absolute right-16 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Delete photo"
              >
                <Trash2 className="size-6" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
                <AlertDialogDescription>
                  This can't be undone. It'll also be removed from any albums
                  it's in.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={(event) => {
                    event.preventDefault();
                    handleDeleteActive();
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showPrev();
            }}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:left-4",
              photos.length < 2 && "hidden",
            )}
            aria-label="Previous photo"
          >
            <ChevronLeft className="size-8" />
          </button>

          <div className="relative h-full max-h-[85vh] w-full max-w-4xl">
            <Image
              src={active.url}
              alt={active.fileName}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              showNext();
            }}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:right-4",
              photos.length < 2 && "hidden",
            )}
            aria-label="Next photo"
          >
            <ChevronRight className="size-8" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
