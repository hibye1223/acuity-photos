import { createGateway } from "@ai-sdk/gateway";
import { env } from "~/env";

function getGateway() {
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not set. Add it to your environment to use AI features.",
    );
  }

  return createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
}

/**
 * The model backing the Album Assistant. Swapping providers/models later is
 * a one-line env var change (ALBUM_ASSISTANT_MODEL) — application code never
 * references a model name directly.
 */
export function getAlbumAssistantModel() {
  return getGateway()(env.ALBUM_ASSISTANT_MODEL);
}

/**
 * The vision-capable model used to tag photo content (subjects, animals,
 * setting) at upload time, so requests like "dog photos" can be answered
 * without relying on filenames or dates. Swappable via PHOTO_TAGGING_MODEL.
 */
export function getPhotoTaggingModel() {
  return getGateway()(env.PHOTO_TAGGING_MODEL);
}
