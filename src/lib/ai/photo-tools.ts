import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

export type RetrievedPhoto = {
  id: string;
  fileName: string;
  takenAt: string | null;
  createdAt: string;
  tags: string[];
  location: string | null;
  people: string[];
};

const PHOTO_COLUMNS =
  "id, file_name, taken_at, created_at, tags, location, people";

type PhotoRow = {
  id: string;
  file_name: string;
  taken_at: string | null;
  created_at: string;
  tags: string[] | null;
  location: string | null;
  people: string[] | null;
};

function toRetrievedPhoto(row: PhotoRow): RetrievedPhoto {
  return {
    id: row.id,
    fileName: row.file_name,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    tags: row.tags ?? [],
    location: row.location,
    people: row.people ?? [],
  };
}

/**
 * Photo retrieval tools for the Album Assistant: date-based (upload
 * recency, calendar ranges), content-based (AI-generated tags from
 * photo-tagging.ts, e.g. "dog", "beach", "person"), location-based (GPS
 * EXIF reverse-geocoded at upload, or typed in manually), and person-based
 * (names the uploader explicitly typed in — never inferred from face data).
 * All of these are best-effort — not every photo has tags, a location, or
 * people set — so the model reasons over whatever combination of tools fits
 * the request.
 *
 * `supabase` must be a request-scoped, authenticated client, and `userId`
 * must be that same user's id. Every query below filters on `user_id`
 * explicitly rather than relying solely on RLS: the `photos` table's RLS
 * also grants admins blanket SELECT access (for the admin dashboard), so an
 * admin account using the Album Assistant would otherwise retrieve every
 * user's photos, not just their own.
 */
export function createPhotoRetrievalTools(
  supabase: SupabaseClient,
  userId: string,
  onPhotosRetrieved?: (photos: RetrievedPhoto[]) => void,
) {
  return {
    listRecentPhotos: tool({
      description:
        "List the user's most recently uploaded photos, newest first. Use this for requests like 'recent uploads' or 'last weekend' or when no specific date range is given.",
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(40)
          .describe("Maximum number of photos to return"),
      }),
      execute: async ({ limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .order("taken_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        const photos = (data ?? []).map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
    listPhotosByDateRange: tool({
      description:
        "List the user's photos taken within an inclusive date range. Use this when the request implies specific calendar dates (e.g. a named trip, holiday, or 'this past weekend') that you can translate into a start and end date.",
      inputSchema: z.object({
        startDate: z
          .string()
          .describe("Inclusive start date, ISO 8601 (YYYY-MM-DD)"),
        endDate: z
          .string()
          .describe("Inclusive end date, ISO 8601 (YYYY-MM-DD)"),
        limit: z.number().int().min(1).max(200).default(100),
      }),
      execute: async ({ startDate, endDate, limit }) => {
        const start = new Date(`${startDate}T00:00:00.000Z`).toISOString();
        const end = new Date(`${endDate}T23:59:59.999Z`).toISOString();

        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .gte("taken_at", start)
          .lte("taken_at", end)
          .order("taken_at", { ascending: true })
          .limit(limit);

        if (error) throw new Error(error.message);
        const photos = (data ?? []).map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
    searchPhotosByTag: tool({
      description:
        "Find photos whose AI-generated content tags overlap with the given list (e.g. ['dog'] or ['beach', 'sunset']). Use this for requests about subject or content rather than dates. Tags are short, best-effort visual labels — not every photo has been tagged yet, so a miss here doesn't mean the photo doesn't exist.",
      inputSchema: z.object({
        tags: z
          .array(z.string().trim().toLowerCase().min(1))
          .min(1)
          .max(10)
          .describe("Lowercase content tags to match, e.g. ['dog']"),
        limit: z.number().int().min(1).max(100).default(60),
      }),
      execute: async ({ tags, limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .overlaps("tags", tags)
          .order("taken_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        const photos = (data ?? []).map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
    searchPhotosByLocation: tool({
      description:
        "Find photos taken at or near a named place (e.g. 'Yosemite', 'New York'). Matches loosely, so a partial or approximate name still works. Not every photo has a location — only ones with GPS data or one typed in manually at upload — so a miss here doesn't mean the photo doesn't exist.",
      inputSchema: z.object({
        location: z
          .string()
          .trim()
          .min(1)
          .describe("Place name or partial place name, e.g. 'Yosemite'"),
        limit: z.number().int().min(1).max(100).default(60),
      }),
      execute: async ({ location, limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .ilike("location", `%${location}%`)
          .order("taken_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        const photos = (data ?? []).map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
    searchPhotosByPerson: tool({
      description:
        "Find photos that include specific named people, using only the exact labels the user has typed in for their own photos — never inferred from face data or guessed relationships. Provide one or more names as the user referred to them. Not every photo has been labeled, so a miss here doesn't mean the person isn't in the library.",
      inputSchema: z.object({
        people: z
          .array(z.string().trim().toLowerCase().min(1))
          .min(1)
          .max(10)
          .describe("Names to match, e.g. ['sam']"),
        limit: z.number().int().min(1).max(100).default(60),
      }),
      execute: async ({ people, limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .overlaps("people", people)
          .order("taken_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        const photos = (data ?? []).map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
  };
}
