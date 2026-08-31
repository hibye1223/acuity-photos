import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { getPhotoTaggingModel } from "~/lib/ai/model";

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
          .eq("is_locked", false)
          .is("deleted_at", null)
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
          .eq("is_locked", false)
          .is("deleted_at", null)
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
        "Find photos whose AI-generated tags overlap with the given list. Tags cover subject/content (e.g. ['dog'], ['beach', 'sunset']), dominant colors (e.g. ['red']), and legible text visible in the photo (e.g. ['welcome']) — all in one flat list, so use this for any request about what's visibly in a photo, not just its subject. Tags are short, best-effort visual labels — not every photo has been tagged yet, so a miss here doesn't mean the photo doesn't exist.",
      inputSchema: z.object({
        tags: z
          .array(z.string().trim().toLowerCase().min(1))
          .min(1)
          .max(10)
          .describe(
            "Lowercase tags to match — subject, color, or text, e.g. ['dog'] or ['red']",
          ),
        limit: z.number().int().min(1).max(100).default(60),
      }),
      execute: async ({ tags, limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(PHOTO_COLUMNS)
          .eq("user_id", userId)
          .eq("is_locked", false)
          .is("deleted_at", null)
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
          .eq("is_locked", false)
          .is("deleted_at", null)
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
          .eq("is_locked", false)
          .is("deleted_at", null)
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
    searchPhotosVisually: tool({
      description:
        "Last-resort fallback: actually looks at recent photos with a vision model to check for something the tag/location/person tools didn't find (e.g. the exact tag wording wasn't a match, or nothing's been tagged yet). Slower and more expensive than the other tools, so only use this after a tag-based search on the same subject has already come back empty — never as a first attempt.",
      inputSchema: z.object({
        description: z
          .string()
          .trim()
          .min(1)
          .describe(
            "What to visually look for, in plain words, e.g. 'a computer terminal or command-line screen'",
          ),
        limit: z.number().int().min(1).max(30).default(20),
      }),
      execute: async ({ description, limit }) => {
        const { data, error } = await supabase
          .from("photos")
          .select(`${PHOTO_COLUMNS}, storage_path`)
          .eq("user_id", userId)
          .eq("is_locked", false)
          .is("deleted_at", null)
          .order("taken_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(limit);

        if (error) throw new Error(error.message);
        const candidates = data ?? [];
        if (candidates.length === 0) return { photos: [] };

        const { data: signedUrls } = await supabase.storage
          .from("photos")
          .createSignedUrls(
            candidates.map((c) => c.storage_path),
            60 * 5,
          );
        const urlByPath = new Map(
          (signedUrls ?? [])
            .filter((entry) => entry.path && entry.signedUrl)
            .map((entry) => [entry.path as string, entry.signedUrl as string]),
        );
        const withUrls = candidates
          .map((c) => ({ row: c, url: urlByPath.get(c.storage_path) }))
          .filter(
            (
              c,
            ): c is { row: PhotoRow & { storage_path: string }; url: string } =>
              !!c.url,
          );
        if (withUrls.length === 0) return { photos: [] };

        const { object } = await generateObject({
          model: getPhotoTaggingModel(),
          schema: z.object({
            matchIndices: z
              .array(z.number().int().min(0))
              .describe(
                "0-based indices (in the order the photos were given) of photos that actually show the described thing. Empty array if none match.",
              ),
          }),
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Here are ${withUrls.length} photos, numbered in order starting at 0. Which of them show: ${description}?`,
                },
                ...withUrls.map(
                  (c, index) =>
                    ({
                      type: "file" as const,
                      mediaType: "image",
                      data: { type: "url" as const, url: new URL(c.url) },
                      filename: `photo-${index}`,
                    }) as const,
                ),
              ],
            },
          ],
        });

        const matched = object.matchIndices
          .map((i) => withUrls[i]?.row)
          .filter((row): row is PhotoRow & { storage_path: string } => !!row);
        const photos = matched.map(toRetrievedPhoto);
        onPhotosRetrieved?.(photos);
        return { photos };
      },
    }),
  };
}
