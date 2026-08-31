"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { setPhotoLocked } from "~/app/actions/locked-album";
import { deletePhotos, toggleFavorite } from "~/app/actions/photos";
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
import { PhotoEditor } from "./photo-editor";

export type GalleryPhoto = {
  id: string;
  url: string;
  fileName: string;
  date: string;
  isFavorite: boolean;
};

export type SortOption = "newest" | "oldest" | "name";

export function PhotoGrid({
  photos,
  sort,
  page,
  totalPages,
  favoritesOnly,
}: {
  photos: GalleryPhoto[];
  sort: SortOption;
  page: number;
  totalPages: number;
  favoritesOnly: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [isFavoriting, setIsFavoriting] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  function navigate(next: {
    sort?: SortOption;
    page?: number;
    favorites?: boolean;
  }) {
    const params = new URLSearchParams(searchParams);
    if (next.sort) params.set("sort", next.sort);
    if (next.page) params.set("page", String(next.page));
    if (next.favorites !== undefined) {
      if (next.favorites) {
        params.set("favorites", "1");
      } else {
        params.delete("favorites");
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

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

  async function handleLockActive() {
    if (!active) return;
    setIsLocking(true);
    setLockError(null);
    try {
      await setPhotoLocked(active.id, true);
      close();
      router.refresh();
    } catch (err) {
      setLockError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setIsLocking(false);
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

  async function handleToggleFavoriteActive() {
    if (!active) return;
    setIsFavoriting(true);
    try {
      await toggleFavorite(active.id, !active.isFavorite);
      router.refresh();
    } finally {
      setIsFavoriting(false);
    }
  }

  async function handleQuickFavorite(photo: GalleryPhoto) {
    await toggleFavorite(photo.id, !photo.isFavorite);
    router.refresh();
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
                    Move {selectedIds.size} photo
                    {selectedIds.size === 1 ? "" : "s"} to trash?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    They'll disappear from your gallery and albums right away.
                    You can restore them from Trash, or delete them permanently
                    there.
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

          <Button
            variant={favoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => navigate({ favorites: !favoritesOnly, page: 1 })}
          >
            <Star className={cn("size-4", favoritesOnly && "fill-current")} />
            Favorites
          </Button>

          <Select
            value={sort}
            onValueChange={(value) =>
              navigate({ sort: value as SortOption, page: 1 })
            }
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
            // biome-ignore lint/a11y/useSemanticElements: needs a nested real <button> for the favorite toggle, which a <button> wrapper can't contain
            <div
              key={photo.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                selectMode ? toggleSelected(photo.id) : setOpenIndex(index)
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                selectMode ? toggleSelected(photo.id) : setOpenIndex(index);
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
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleQuickFavorite(photo);
                    }}
                    aria-label={
                      photo.isFavorite
                        ? "Remove from favorites"
                        : "Add to favorites"
                    }
                    className={cn(
                      "absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white transition-opacity",
                      photo.isFavorite
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100",
                    )}
                  >
                    <Star
                      className={cn(
                        "size-4",
                        photo.isFavorite && "fill-current text-yellow-400",
                      )}
                    />
                  </button>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {new Date(photo.date).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      ) : null}

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

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleFavoriteActive();
            }}
            disabled={isFavoriting}
            className="absolute right-52 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label={
              active.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            title={
              active.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <Star
              className={cn(
                "size-6",
                active.isFavorite && "fill-current text-yellow-400",
              )}
            />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsEditing(true);
            }}
            className="absolute right-40 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Edit photo"
            title="Edit photo"
          >
            <Pencil className="size-6" />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleLockActive();
            }}
            disabled={isLocking}
            className="absolute right-28 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Move to locked album"
            title="Move to locked album"
          >
            <Lock className="size-6" />
          </button>

          {lockError ? (
            <p
              role="alert"
              className="absolute right-4 top-16 max-w-xs rounded-md bg-destructive/90 px-3 py-2 text-xs text-white"
            >
              {lockError}
            </p>
          ) : null}

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
                <AlertDialogTitle>Move this photo to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  It'll disappear from your gallery and albums right away. You
                  can restore it from Trash, or it stays there until you delete
                  it permanently.
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

      {active && isEditing ? (
        <PhotoEditor
          photo={active}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
