"use client";

import { useRouter } from "next/navigation";
import { AlbumDraftEditor } from "~/components/albums/album-draft-editor";

export function BlankAlbumEditor({ onDiscard }: { onDiscard: () => void }) {
  const router = useRouter();

  return (
    <AlbumDraftEditor
      initialTitle=""
      initialPhotos={[]}
      onDiscard={() => {
        onDiscard();
        router.refresh();
      }}
      discardLabel="Cancel"
      saveLabel="Save album"
    />
  );
}
