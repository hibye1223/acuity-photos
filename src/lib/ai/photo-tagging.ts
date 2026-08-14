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
});

/**
 * Tags a photo's visible content using a vision-capable model, so requests
 * like "dog photos" can be answered by subject rather than just upload
 * date. Best-effort: callers should treat a thrown error as "no tags yet",
 * not a fatal failure — this runs after the upload has already succeeded.
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
            text: 'List short, concrete tags for what\'s visibly in this photo. Use "person" (singular, never "people") if one or more people appear.',
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

  return object.tags;
}
