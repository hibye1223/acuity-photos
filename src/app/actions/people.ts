"use server";

import { generateObject } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAlbumAssistantModel } from "~/lib/ai/model";
import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 30;
const MAX_CANDIDATES = 60;

export type PeopleGroupSuggestion = {
  photoIds: string[];
  sharedDescription: string;
  thumbnails: { photoId: string; url: string | null }[];
};

const groupsSchema = z.object({
  groups: z
    .array(
      z.object({
        photoIds: z
          .array(z.string())
          .min(2)
          .describe("IDs of photos that likely show the same person"),
        sharedDescription: z
          .string()
          .describe(
            "The shared physical description tying this group together",
          ),
      }),
    )
    .describe(
      "Only group photos you're reasonably confident share the same person. Leave out any photo that doesn't clearly match a group — a missed match is better than a wrong one.",
    ),
});

/**
 * Suggests groups of photos that likely show the same person, based on the
 * non-identifying `person_description` text generated at upload time (see
 * generatePhotoTags). This is a suggestion only — nothing is written to
 * `photos.people` until the user confirms a group with a name via
 * confirmPeopleGroup.
 */
export async function suggestPeopleGroups(): Promise<PeopleGroupSuggestion[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to view people suggestions.");
  }

  const { data: photos, error } = await supabase
    .from("photos")
    .select("id, storage_path, person_description")
    .eq("user_id", user.id)
    .eq("is_locked", false)
    .not("person_description", "is", null)
    .or("people.is.null,people.eq.{}")
    .order("taken_at", { ascending: false, nullsFirst: false })
    .limit(MAX_CANDIDATES);

  if (error) throw new Error(error.message);
  if (!photos || photos.length < 2) return [];

  const { object } = await generateObject({
    model: getAlbumAssistantModel(),
    schema: groupsSchema,
    prompt: `Here are photos with a short physical description of their main person. Group the ones that likely show the same person:\n\n${photos
      .map((p) => `- ${p.id}: ${p.person_description}`)
      .join("\n")}`,
  });

  const knownIds = new Set(photos.map((p) => p.id));
  const pathById = new Map(photos.map((p) => [p.id, p.storage_path]));

  const validGroups = object.groups
    .map((group) => ({
      ...group,
      photoIds: group.photoIds.filter((id) => knownIds.has(id)),
    }))
    .filter((group) => group.photoIds.length >= 2);

  const allPaths = validGroups.flatMap((group) =>
    group.photoIds
      .map((id) => pathById.get(id))
      .filter((p): p is string => !!p),
  );
  const { data: signedUrls } = allPaths.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS)
    : { data: null };
  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  return validGroups.map((group) => ({
    photoIds: group.photoIds,
    sharedDescription: group.sharedDescription,
    thumbnails: group.photoIds.map((photoId) => {
      const path = pathById.get(photoId);
      return { photoId, url: path ? (urlByPath.get(path) ?? null) : null };
    }),
  }));
}

/** Confirms a suggested group is the named person, writing it into `people`. */
export async function confirmPeopleGroup(photoIds: string[], name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to label people.");
  }

  const trimmedName = name.trim().toLowerCase();
  if (!trimmedName) {
    throw new Error("Enter a name first.");
  }
  if (photoIds.length === 0) return;

  const { data: photos, error: selectError } = await supabase
    .from("photos")
    .select("id, people")
    .eq("user_id", user.id)
    .in("id", photoIds);

  if (selectError) throw new Error(selectError.message);

  await Promise.all(
    (photos ?? []).map((photo) => {
      const people = [...new Set([...(photo.people ?? []), trimmedName])];
      return supabase
        .from("photos")
        .update({ people, person_description: null })
        .eq("id", photo.id);
    }),
  );

  revalidatePath("/app/people");
}

/** Dismisses a suggested group without naming it, so it stops being suggested. */
export async function dismissPeopleGroup(photoIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to do this.");
  }
  if (photoIds.length === 0) return;

  const { error } = await supabase
    .from("photos")
    .update({ person_description: null })
    .eq("user_id", user.id)
    .in("id", photoIds);

  if (error) throw new Error(error.message);

  revalidatePath("/app/people");
}
