import { generateObject } from "ai";
import { z } from "zod";
import type { CaptionStyle } from "~/lib/ai/album-assistant";
import { buildCaptionStyleGuide } from "~/lib/ai/album-assistant";
import { getPhotoTaggingModel } from "~/lib/ai/model";

// generateObject caps how many images are worth sending in one request —
// batch larger albums instead of sending all of them at once.
const BATCH_SIZE = 15;

export type CaptionCandidate = {
  photoId: string;
  url: string;
  draftCaption: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function captionBatch(
  batch: CaptionCandidate[],
  captionStyle: CaptionStyle,
): Promise<Map<string, string>> {
  const { object } = await generateObject({
    model: getPhotoTaggingModel(),
    schema: z.object({
      captions: z
        .array(
          z.object({
            index: z
              .number()
              .int()
              .min(0)
              .describe("The 0-based index of the photo this caption is for"),
            caption: z
              .string()
              .trim()
              .max(240)
              .describe(
                "The caption for this photo, following the style guide. Empty string if there's no specific signal worth captioning.",
              ),
          }),
        )
        .describe("One entry per photo, in any order"),
    }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Look at each of these ${batch.length} photos (numbered in order starting at 0) and write a caption for each, grounded in what the photo actually shows.

${buildCaptionStyleGuide(captionStyle)}

Here's a draft caption for each photo, written blind (from tags/date alone, without seeing the image) — use it as context for what the photo might be about, but trust your own eyes over it, and rewrite or blank it out if it doesn't match what the photo actually shows:
${batch.map((c, i) => `${i}: "${c.draftCaption}"`).join("\n")}`,
          },
          ...batch.map(
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

  const captions = new Map<string, string>();
  for (const entry of object.captions) {
    const candidate = batch[entry.index];
    if (candidate) captions.set(candidate.photoId, entry.caption);
  }
  return captions;
}

/**
 * Overwrites each proposed photo's blind, tags-only draft caption with one
 * grounded in the photo's actual pixels, using the same vision model that
 * tags photos at upload time. Runs after proposeAlbum, right before the
 * draft is returned to the client — so caption quality no longer depends on
 * whether searchPhotosVisually happened to run during retrieval.
 *
 * Best-effort: a batch that fails (e.g. a signed URL expired) just falls
 * back to its draft captions rather than failing the whole album.
 */
export async function groundCaptionsInPhotos(
  candidates: CaptionCandidate[],
  captionStyle: CaptionStyle,
): Promise<Map<string, string>> {
  const batches = chunk(candidates, BATCH_SIZE);
  const results = await Promise.all(
    batches.map(async (batch) => {
      try {
        return await captionBatch(batch, captionStyle);
      } catch {
        return new Map<string, string>();
      }
    }),
  );

  const merged = new Map<string, string>();
  for (const result of results) {
    for (const [photoId, caption] of result) merged.set(photoId, caption);
  }
  return merged;
}
