import { env } from "~/env";

/**
 * Uploads a file directly to the Supabase Storage REST endpoint via XHR
 * instead of the supabase-js client, since supabase-js's fetch-based upload
 * doesn't expose upload progress events.
 */
export function uploadPhotoWithProgress({
  path,
  file,
  accessToken,
  onProgress,
}: {
  path: string;
  file: Blob;
  accessToken: string;
  onProgress: (percent: number) => void;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/photos/${path}`,
    );
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection."));

    xhr.send(file);
  });
}
