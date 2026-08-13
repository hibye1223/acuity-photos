import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getAlbumAssistantModel } from "~/lib/ai/model";
import { createPhotoRetrievalTools } from "~/lib/ai/photo-tools";

export const albumDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe(
      "A short, natural-sounding album title — the kind a person would actually write, not a generic label",
    ),
  photos: z
    .array(
      z.object({
        photoId: z
          .string()
          .uuid()
          .describe("A photo ID returned by a retrieval tool call"),
        caption: z
          .string()
          .trim()
          .max(240)
          .describe(
            "A short, natural one-sentence caption. Avoid robotic phrasing like 'Image of...' or 'Photo showing...'",
          ),
      }),
    )
    .min(1)
    .max(60)
    .describe("Photos in the order they should appear in the album"),
});

export type AlbumDraft = z.infer<typeof albumDraftSchema>;

const SYSTEM_PROMPT = `You are a collaborative photo album assistant. A user will describe, in natural language, an album they want built from their own photo library.

Your job:
1. Retrieve candidate photos with the available tools: listRecentPhotos and/or listPhotosByDateRange for date/recency-based requests, and searchPhotosByTag for requests about subject or content (e.g. "dog photos", "photos at the beach"). Combine tools when a request mixes both (e.g. "dog photos from last weekend"). Never invent a photo ID — only use IDs a tool call actually returned.
2. Each retrieved photo may include AI-generated content tags (short, best-effort visual labels like "dog", "beach", "person"). Use them to refine your selection — e.g. for "solo dog photos", prefer photos tagged "dog" that aren't also tagged "person". Tags are imperfect and not every photo has them yet, so don't discard an otherwise-good match just because it has no tags.
3. Decide which retrieved photos best match the request, and a sensible display order.
4. Write a short, human-sounding title and a brief caption per photo. This should read like something a thoughtful person wrote, not an automated label — avoid generic or robotic phrasing.
5. Call the proposeAlbum tool exactly once with your final draft.

This is a draft, not a final decision: the user will review, edit, reorder, and can remove or swap anything before saving. It's fine — expected, even — to make a reasonable judgment call rather than asking clarifying questions, since the user gets a full editing pass afterward.

If the request references a time period (a trip name, "last weekend", a season, a month), translate it into a concrete date range using today's date for reference. If it's vague ("make an album", "recent photos"), fall back to the user's most recent uploads.`;

/**
 * Runs the Album Assistant for one user request: retrieves candidate photos
 * via tool calls, then asks the model to propose a structured draft via the
 * proposeAlbum tool. Returns a validated draft — never writes to the
 * database itself.
 *
 * `supabase` must be the request-scoped, authenticated client so photo
 * retrieval stays scoped to the signed-in user via RLS.
 */
export async function generateAlbumDraft({
  supabase,
  requestText,
  today,
}: {
  supabase: SupabaseClient;
  requestText: string;
  today: string;
}): Promise<AlbumDraft> {
  const retrievedPhotoIds = new Set<string>();
  const retrievalTools = createPhotoRetrievalTools(supabase, (photos) => {
    for (const photo of photos) retrievedPhotoIds.add(photo.id);
  });

  let draft: AlbumDraft | null = null;

  const proposeAlbum = tool({
    description:
      "Submit the final album draft for the user to review. Call this exactly once, after retrieving candidate photos with the other tools.",
    inputSchema: albumDraftSchema,
    execute: async (input) => {
      draft = input;
      return { received: true };
    },
  });

  await generateText({
    model: getAlbumAssistantModel(),
    system: SYSTEM_PROMPT,
    prompt: `Today's date is ${today}. The user's request: "${requestText}"`,
    tools: { ...retrievalTools, proposeAlbum },
    stopWhen: stepCountIs(6),
  });

  if (!draft) {
    throw new Error(
      "The assistant couldn't put together a draft for that request. Try rephrasing it.",
    );
  }

  // Defense in depth: only keep photos the model actually retrieved via a
  // tool call, even though the schema above already validates shape/types.
  const verifiedDraft: AlbumDraft = draft;
  const verifiedPhotos = verifiedDraft.photos.filter((photo) =>
    retrievedPhotoIds.has(photo.photoId),
  );

  if (verifiedPhotos.length === 0) {
    throw new Error(
      "The assistant proposed photos it never retrieved. Try again.",
    );
  }

  return { title: verifiedDraft.title, photos: verifiedPhotos };
}
