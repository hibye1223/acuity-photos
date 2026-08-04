"use client";

import imageCompression from "browser-image-compression";
import { AlertCircle, CheckCircle2, ImageUp, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { createPhotoRecord } from "~/app/actions/photos";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { extractCapturedAt } from "~/lib/exif";
import { createClient } from "~/lib/supabase/client";
import { uploadPhotoWithProgress } from "~/lib/upload-with-progress";
import { cn } from "~/lib/utils";

type UploadStatus = "compressing" | "uploading" | "saving" | "done" | "error";

type UploadItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  error?: string;
};

const MAX_CONCURRENT_UPLOADS = 3;

const STATUS_LABEL: Record<UploadStatus, string> = {
  compressing: "Compressing",
  uploading: "Uploading",
  saving: "Saving",
  done: "Done",
  error: "Failed",
};

export function PhotoUploader() {
  const router = useRouter();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          updateItem(item.id, {
            status: "error",
            error: "You're signed out. Please sign in again.",
          });
          return;
        }

        updateItem(item.id, { status: "compressing", progress: 0 });
        const [capturedAt, compressedFile] = await Promise.all([
          extractCapturedAt(item.file),
          imageCompression(item.file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2560,
            useWebWorker: true,
            onProgress: (percent: number) =>
              updateItem(item.id, { progress: percent }),
          }),
        ]);

        const extension =
          item.file.name.split(".").pop() ??
          compressedFile.type.split("/").pop() ??
          "jpg";
        const storagePath = `${session.user.id}/${crypto.randomUUID()}.${extension}`;

        updateItem(item.id, { status: "uploading", progress: 0 });
        await uploadPhotoWithProgress({
          path: storagePath,
          file: compressedFile,
          accessToken: session.access_token,
          onProgress: (percent) => updateItem(item.id, { progress: percent }),
        });

        updateItem(item.id, { status: "saving", progress: 100 });
        await createPhotoRecord({
          storagePath,
          fileName: item.file.name,
          contentType: compressedFile.type || item.file.type,
          takenAt: capturedAt ? capturedAt.toISOString() : null,
        });

        updateItem(item.id, { status: "done", progress: 100 });
        router.refresh();
      } catch (error) {
        updateItem(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    },
    [router, updateItem],
  );

  const runPool = useCallback(
    async (queue: UploadItem[]) => {
      let index = 0;
      const workers = Array.from(
        { length: Math.min(MAX_CONCURRENT_UPLOADS, queue.length) },
        async () => {
          while (index < queue.length) {
            const item = queue[index];
            index += 1;
            if (item) await uploadOne(item);
          }
        },
      );
      await Promise.all(workers);
    },
    [uploadOne],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;

      const newItems: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "compressing",
        progress: 0,
      }));

      setItems((prev) => [...prev, ...newItems]);
      void runPool(newItems);
    },
    [runPool],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingOver(false);
          addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6 py-16 text-center transition-colors",
          isDraggingOver && "border-primary bg-accent",
        )}
      >
        <ImageUp className="size-8 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="font-medium">Drag and drop photos here</p>
          <p className="text-sm text-muted-foreground">
            or click to browse from your device
          </p>
        </div>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Choose photos to upload"
        onChange={(event) => {
          if (event.target.files) addFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              {/* biome-ignore lint/performance/noImgElement: local blob preview, not a remote/optimizable image */}
              <img
                src={item.previewUrl}
                alt=""
                className="size-12 shrink-0 rounded-md object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {item.status === "done" ? (
                      <CheckCircle2 className="size-3.5 text-success" />
                    ) : item.status === "error" ? (
                      <AlertCircle className="size-3.5 text-destructive" />
                    ) : (
                      <Loader2 className="size-3.5 animate-spin" />
                    )}
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                {item.status === "error" ? (
                  <p className="text-xs text-destructive">{item.error}</p>
                ) : (
                  <Progress
                    value={item.status === "done" ? 100 : item.progress}
                  />
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${item.file.name}`}
                onClick={() => removeItem(item.id)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
