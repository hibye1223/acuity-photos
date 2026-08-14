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

const updateAlbumSchema = z.object({
  albumId: z.string().uuid(),
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

export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

/**
 * Replaces a saved album's title and photos wholesale, per the schema's
 * design (see 20260803000200_create_albums.sql: "album photo rows are
 * replaced wholesale on save rather than edited in place").
 */
export async function updateAlbumAction(input: UpdateAlbumInput) {
  const parsed = updateAlbumSchema.parse(input);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to edit an album.");
  }

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("id")
    .eq("id", parsed.albumId)
    .maybeSingle();

  if (albumError) throw new Error(albumError.message);
  if (!album) throw new Error("That album no longer exists.");

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

  const { error: titleError } = await supabase
    .from("albums")
    .update({ title: parsed.title })
    .eq("id", parsed.albumId);

  if (titleError) throw new Error(titleError.message);

  const { error: clearError } = await supabase
    .from("album_photos")
    .delete()
    .eq("album_id", parsed.albumId);

  if (clearError) throw new Error(clearError.message);

  const { error: insertError } = await supabase.from("album_photos").insert(
    parsed.photos.map((photo, index) => ({
      album_id: parsed.albumId,
      photo_id: photo.photoId,
      position: index,
      caption: photo.caption || null,
    })),
  );

  if (insertError) throw new Error(insertError.message);

  revalidatePath("/app/albums");
  revalidatePath(`/app/albums/${parsed.albumId}`);
  redirect(`/app/albums/${parsed.albumId}`);
}

export async function deleteAlbumAction(albumId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to delete an album.");
  }

  const { error } = await supabase.from("albums").delete().eq("id", albumId);

  if (error) throw new Error(error.message);

  revalidatePath("/app/albums");
  redirect("/app/albums");
}
