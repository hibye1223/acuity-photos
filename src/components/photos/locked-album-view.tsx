"use client";

import { Lock, LockOpen } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { LockedPhoto } from "~/app/actions/locked-album";
import { setPhotoLocked, unlockLockedAlbum } from "~/app/actions/locked-album";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function LockedAlbumView() {
  const [password, setPassword] = useState("");
  const [photos, setPhotos] = useState<LockedPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const result = await unlockLockedAlbum(password);
      setPhotos(result);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlockPhoto(photoId: string) {
    setUnlockingId(photoId);
    try {
      await setPhotoLocked(photoId, false);
      setPhotos((prev) => prev?.filter((p) => p.id !== photoId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUnlockingId(null);
    }
  }

  if (!photos) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
        <Lock className="size-8 text-muted-foreground" />
        <p className="text-muted-foreground">
          Enter your account password to view this album.
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleUnlock();
            }}
            placeholder="Password"
            className="w-48"
            autoFocus
          />
          <Button
            type="button"
            onClick={handleUnlock}
            disabled={loading || !password}
          >
            Unlock
          </Button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <p className="text-muted-foreground">
        Nothing locked yet — lock a photo from its viewer in the Gallery.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo) =>
          photo.url ? (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <Image
                src={photo.url}
                alt={photo.fileName}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => handleUnlockPhoto(photo.id)}
                disabled={unlockingId === photo.id}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Move back to main gallery"
                title="Move back to main gallery"
              >
                <LockOpen className="size-4" />
              </button>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
