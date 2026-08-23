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
  personDescription: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .nullable()
    .describe(
      "If exactly one person is clearly the photo's main subject, a short, non-identifying description of their appearance (hair color/style, approximate age range, glasses, clothing) — enough to recognize the same person in another photo, but never a guess at who they are. Null if there's no single clear main person (nobody, a crowd, or a person too small/obscured to describe).",
    ),
});

export type PhotoTaggingResult = {
  tags: string[];
  personDescription: string | null;
};

/**
 * Tags a photo's visible content using a vision-capable model, so requests
 * like "dog photos", "photos with red in them", or "the sign that said
 * welcome" can be answered by subject/color/text rather than just upload
 * date. Colors and legible text are folded into the same flat tag list the
 * app already searches on, rather than living in separate columns.
 *
 * `personDescription` is a separate, opt-in field (see `face_grouping_enabled`
 * on profiles) — a physical description, never an identity guess, used only
 * to suggest "these might be the same person" groupings for the user to
 * confirm and name themselves. Callers should ignore it entirely unless the
 * user has opted in.
 *
 * Best-effort: callers should treat a thrown error as "no tags yet", not a
 * fatal failure — this runs after the upload has already succeeded.
 */
export async function generatePhotoTags(
  imageUrl: string,
): Promise<PhotoTaggingResult> {
  const { object } = await generateObject({
    model: getPhotoTaggingModel(),
    schema: tagsSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'List short, concrete tags for what\'s visibly in this photo (use "person", singular, never "people", if one or more people appear), its dominant colors, and any legible text. Also, if there\'s exactly one clear main person, describe their physical appearance (not who they are).',
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

  return {
    tags: [...object.tags, ...object.colors, ...object.text],
    personDescription: object.personDescription,
  };
}
