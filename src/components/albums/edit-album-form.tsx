"use client";

import { useRouter } from "next/navigation";
import type { AlbumDraftPhoto } from "~/app/actions/album-assistant";
import { AlbumDraftEditor } from "~/components/albums/album-draft-editor";

export function EditAlbumForm({
  albumId,
  initialTitle,
  initialPhotos,
}: {
  albumId: string;
  initialTitle: string;
  initialPhotos: AlbumDraftPhoto[];
}) {
  const router = useRouter();

  return (
    <AlbumDraftEditor
      albumId={albumId}
      initialTitle={initialTitle}
      initialPhotos={initialPhotos}
      onDiscard={() => router.push(`/app/albums/${albumId}`)}
      discardLabel="Cancel"
      saveLabel="Save changes"
    />
  );
}
