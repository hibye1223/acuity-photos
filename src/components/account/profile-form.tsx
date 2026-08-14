"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProfile } from "~/app/actions/profile";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

type Status = "idle" | "saving" | "error";

export function ProfileForm({
  userId,
  initialFullName,
  initialAvatarUrl,
}: {
  userId: string;
  initialFullName: string | null;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError(null);

    try {
      let avatarUrl: string | undefined;

      if (avatarFile) {
        const supabase = createClient();
        const extension = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${userId}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(path);
        // Cache-bust: the path is stable across replacements, so without
        // this the browser (and other users' cached copies) would keep
        // showing the old image after an upsert.
        avatarUrl = `${publicUrl}?updated=${Date.now()}`;
      }

      await updateProfile({ fullName, avatarUrl });
      setAvatarFile(null);
      router.refresh();
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {previewUrl ? (
          // biome-ignore lint/performance/noImgElement: avatar preview only, not worth next/image config for a user-supplied external-ish URL
          <img
            src={previewUrl}
            alt=""
            className="size-14 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
            No photo
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            disabled={status === "saving"}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="full-name">Name</Label>
        <Input
          id="full-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your name"
          maxLength={120}
          disabled={status === "saving"}
        />
      </div>

      <Button type="submit" disabled={status === "saving"} className="w-fit">
        {status === "saving" ? "Saving..." : "Save"}
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
