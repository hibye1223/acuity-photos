"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

const saveAlbumSchema = z.object({
  title: z.string().trim().min(1, "Give the album a title.").max(120),
  photos: z
    .array(
      z.object({
        photoId: z.string().uuid(),
        caption: z.string().trim().max(240),
      }),
    )
    .min(1, "Add at least one photo."),
});

export type SaveAlbumInput = z.infer<typeof saveAlbumSchema>;

/**
 * Persists a user-approved album draft as a real album. Only ever called
 * after the user has reviewed/edited the AI's draft — never invoked
 * automatically from the AI layer.
 */
export async function saveAlbumAction(input: SaveAlbumInput) {
  const parsed = saveAlbumSchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to save an album.");
  }

  const photoIds = parsed.photos.map((photo) => photo.photoId);
  const { data: ownedPhotos, error: ownedError } = await supabase
    .from("photos")
    .select("id")
    .in("id", photoIds);

  if (ownedError) throw new Error(ownedError.message);

  const ownedIds = new Set((ownedPhotos ?? []).map((photo) => photo.id));
  const missing = photoIds.filter((id) => !ownedIds.has(id));
  if (missing.length > 0) {
    throw new Error("One or more photos are no longer available.");
  }

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .insert({ user_id: user.id, title: parsed.title })
    .select("id")
    .single();

  if (albumError || !album) {
    throw new Error(albumError?.message ?? "Couldn't create the album.");
  }

  const { error: photosError } = await supabase.from("album_photos").insert(
    parsed.photos.map((photo, index) => ({
      album_id: album.id,
      photo_id: photo.photoId,
      position: index,
      caption: photo.caption || null,
    })),
  );

  if (photosError) {
    await supabase.from("albums").delete().eq("id", album.id);
    throw new Error(photosError.message);
  }

  revalidatePath("/app/albums");
  redirect(`/app/albums/${album.id}`);
}
