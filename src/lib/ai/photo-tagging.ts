import { generateObject } from "ai";
import { z } from "zod";
import { getPhotoTaggingModel } from "~/lib/ai/model";

const tagsSchema = z.object({
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(30))
    .max(12)
    .describe(
      'Short, concrete lowercase nouns for what\'s visibly in the photo: subjects, animals, objects, setting. Use the singular "person" (never "people") if one or more people appear. Name an animal\'s species when identifiable (e.g. "dog", "cat").',
    ),
  colors: z
    .array(z.string().trim().toLowerCase().min(1).max(20))
    .max(5)
    .describe(
      'The 1-5 most visually dominant colors in the photo, as plain lowercase color names (e.g. "blue", "orange", "white") — not hex codes.',
    ),
  text: z
    .array(z.string().trim().toLowerCase().min(1).max(30))
    .max(8)
    .describe(
      "Any legible words or short phrases visibly printed or written in the photo (signs, shirts, banners, screens). Omit if there's no legible text.",
    ),
});

/**
 * Tags a photo's visible content using a vision-capable model, so requests
 * like "dog photos", "photos with red in them", or "the sign that said
 * welcome" can be answered by subject/color/text rather than just upload
 * date. Colors and legible text are folded into the same flat tag list the
 * app already searches on, rather than living in separate columns. Best-
 * effort: callers should treat a thrown error as "no tags yet", not a fatal
 * failure — this runs after the upload has already succeeded.
 */
export async function generatePhotoTags(imageUrl: string): Promise<string[]> {
  const { object } = await generateObject({
    model: getPhotoTaggingModel(),
    schema: tagsSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'List short, concrete tags for what\'s visibly in this photo (use "person", singular, never "people", if one or more people appear), its dominant colors, and any legible text.',
          },
          {
            type: "file",
            mediaType: "image",
            data: { type: "url", url: new URL(imageUrl) },
          },
        ],
      },
    ],
  });

  return [...object.tags, ...object.colors, ...object.text];
}
