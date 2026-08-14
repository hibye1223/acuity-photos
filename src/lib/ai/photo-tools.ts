import type { SupabaseClient } from "@supabase/supabase-js";
import { tool } from "ai";
import { z } from "zod";

export type RetrievedPhoto = {
  id: string;
  fileName: string;
  takenAt: string | null;
  createdAt: string;
  tags: string[];
};

const PHOTO_COLUMNS = "id, file_name, taken_at, created_at, tags";

type PhotoRow = {
  id: string;
  file_name: string;
  taken_at: string | null;
  created_at: string;
  tags: string[] | null;
};

function toRetrievedPhoto(row: PhotoRow): RetrievedPhoto {
  return {
    id: row.id,
    fileName: row.file_name,
    takenAt: row.taken_at,
    createdAt: row.created_at,
    tags: row.tags ?? [],
  };
}

/**
 * Photo retrieval tools for the Album Assistant: date-based (upload
 * recency, calendar ranges) and content-based (AI-generated tags from
 * photo-tagging.ts, e.g. "dog", "beach", "person"). Tags are best-effort —
 * not every photo has been tagged yet — so the model reasons over whatever
 * combination of tools fits the request.
 *
 * `supabase` must be a request-scoped, authenticated client: every query
 * here relies on the `photos` table's row-level security to scope results
 * to the signed-in user, so this never needs (or should) filter by user_id
 * itself.
 */
export function createPhotoRetrievalTools(
  supabase: SupabaseClient,
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
  };
}
