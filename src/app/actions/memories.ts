"use server";

import { createClient } from "~/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 30;
const RECENT_TRIP_WINDOW_DAYS = 10;
const RECENT_TRIP_MIN_PHOTOS = 3;
const ON_THIS_DAY_YEARS_BACK = 8;

export type MemoryPhoto = {
  id: string;
  fileName: string;
  url: string | null;
};

export type OnThisDayMemory = {
  yearsAgo: number;
  photos: MemoryPhoto[];
};

export type Memories = {
  onThisDay: OnThisDayMemory[];
  recentTrip: MemoryPhoto[] | null;
};

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function dayRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

type PhotoRow = {
  id: string;
  file_name: string;
  storage_path: string;
  taken_at: string | null;
};

async function toMemoryPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PhotoRow[],
): Promise<MemoryPhoto[]> {
  const paths = rows.map((row) => row.storage_path);
  const { data: signedUrls } = paths.length
    ? await supabase.storage
        .from("photos")
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
    : { data: null };

  const urlByPath = new Map(
    (signedUrls ?? [])
      .filter((entry) => entry.path && entry.signedUrl)
      .map((entry) => [entry.path as string, entry.signedUrl]),
  );

  return rows.map((row) => ({
    id: row.id,
    fileName: row.file_name,
    url: urlByPath.get(row.storage_path) ?? null,
  }));
}

/**
 * Surfaces photos without the user having to ask: "on this day" in past
 * years, and a recent cluster of uploads (a "trip"-shaped burst in the last
 * ~10 days). Excludes locked photos, and excludes any photo whose people
 * overlap the user's muted list — muting only affects this passive
 * resurfacing, never an explicit Album Assistant search by name.
 */
export async function getMemories(): Promise<Memories> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to view memories.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("muted_people")
    .eq("id", user.id)
    .single();
  const mutedPeople = profile?.muted_people ?? [];

  const today = new Date();
  const onThisDay: OnThisDayMemory[] = [];

  for (let yearsAgo = 1; yearsAgo <= ON_THIS_DAY_YEARS_BACK; yearsAgo++) {
    const target = new Date(today);
    target.setUTCFullYear(target.getUTCFullYear() - yearsAgo);
    const { start, end } = dayRange(target);

    // Falls back to created_at for photos with no EXIF-derived taken_at
    // (screenshots, most non-camera uploads) — otherwise they'd never
    // surface here at all, same fallback the gallery's default sort uses.
    const query = supabase
      .from("photos")
      .select("id, file_name, storage_path, taken_at, people")
      .eq("user_id", user.id)
      .eq("is_locked", false)
      .is("deleted_at", null)
      .or(
        `and(taken_at.gte.${start},taken_at.lte.${end}),and(taken_at.is.null,created_at.gte.${start},created_at.lte.${end})`,
      )
      .order("taken_at", { ascending: false, nullsFirst: false })
      .limit(12);

    const { data: rows } = await query;
    const filtered = (rows ?? []).filter(
      (row) => !(row.people ?? []).some((p: string) => mutedPeople.includes(p)),
    );
    if (filtered.length > 0) {
      onThisDay.push({
        yearsAgo,
        photos: await toMemoryPhotos(supabase, filtered),
      });
    }
  }

  const windowStart = addDays(today, -RECENT_TRIP_WINDOW_DAYS).toISOString();
  const { data: recentRows } = await supabase
    .from("photos")
    .select("id, file_name, storage_path, taken_at, people")
    .eq("user_id", user.id)
    .eq("is_locked", false)
    .is("deleted_at", null)
    .or(
      `taken_at.gte.${windowStart},and(taken_at.is.null,created_at.gte.${windowStart})`,
    )
    .order("taken_at", { ascending: false, nullsFirst: false })
    .limit(30);

  const filteredRecent = (recentRows ?? []).filter(
    (row) => !(row.people ?? []).some((p: string) => mutedPeople.includes(p)),
  );

  const recentTrip =
    filteredRecent.length >= RECENT_TRIP_MIN_PHOTOS
      ? await toMemoryPhotos(supabase, filteredRecent)
      : null;

  return { onThisDay, recentTrip };
}
