"use server";

import { revalidatePath } from "next/cache";
import { isCaptionStyle } from "~/lib/ai/album-assistant";
import { createClient } from "~/lib/supabase/server";

export async function updateProfile({
  fullName,
  avatarUrl,
}: {
  fullName: string;
  avatarUrl?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update your profile.");
  }

  const trimmedName = fullName.trim();
  if (trimmedName.length > 120) {
    throw new Error("Name is too long.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: trimmedName || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}

export async function updateAiPreferences({
  defaultCaptionStyle,
  challengeMe,
}: {
  defaultCaptionStyle: string;
  challengeMe: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update your AI preferences.");
  }

  if (!isCaptionStyle(defaultCaptionStyle)) {
    throw new Error("Invalid caption style.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      default_caption_style: defaultCaptionStyle,
      challenge_me: challengeMe,
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/create");
  revalidatePath("/app/settings");
}

export async function updateFaceGroupingEnabled(enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update this setting.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ face_grouping_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/people");
}

/**
 * Replaces the full list of muted people — names excluded from Memories
 * resurfacing (never from explicit Album Assistant searches, which only
 * ever include a named person when the user asks for them by name).
 */
export async function updateMutedPeople(names: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update this setting.");
  }

  const trimmed = [
    ...new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean)),
  ];

  const { error } = await supabase
    .from("profiles")
    .update({ muted_people: trimmed })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/create");
}
