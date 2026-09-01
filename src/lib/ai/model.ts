import { createGateway } from "@ai-sdk/gateway";
import { env } from "~/env";

function getGateway() {
  // No apiKey means @ai-sdk/gateway falls back to the OIDC token Vercel
  // provisions automatically (VERCEL_OIDC_TOKEN) when AI_GATEWAY_API_KEY
  // isn't set — matches Vercel's default, zero-config AI Gateway auth.
  return createGateway(
    env.AI_GATEWAY_API_KEY ? { apiKey: env.AI_GATEWAY_API_KEY } : undefined,
  );
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
 * Backup model IDs tried, in order, if the primary Album Assistant model
 * errors out (e.g. a free-tier rate limit) — passed as
 * providerOptions.gateway.models on the streamText call. Configurable via
 * ALBUM_ASSISTANT_FALLBACK_MODELS (comma-separated).
 */
export function getAlbumAssistantFallbackModels(): string[] {
  return env.ALBUM_ASSISTANT_FALLBACK_MODELS.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

/**
 * The vision-capable model used to tag photo content (subjects, animals,
 * setting) at upload time, so requests like "dog photos" can be answered
 * without relying on filenames or dates. Swappable via PHOTO_TAGGING_MODEL.
 */
export function getPhotoTaggingModel() {
  return getGateway()(env.PHOTO_TAGGING_MODEL);
}
