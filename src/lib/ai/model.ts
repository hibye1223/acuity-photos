import { createGateway } from "@ai-sdk/gateway";
import { env } from "~/env";

/**
 * The model backing the Album Assistant. Swapping providers/models later is
 * a one-line env var change (ALBUM_ASSISTANT_MODEL) — application code never
 * references a model name directly.
 */
export function getAlbumAssistantModel() {
  if (!env.AI_GATEWAY_API_KEY) {
    throw new Error(
      "AI_GATEWAY_API_KEY is not set. Add it to your environment to use the Album Assistant.",
    );
  }

  const gateway = createGateway({ apiKey: env.AI_GATEWAY_API_KEY });
  return gateway(env.ALBUM_ASSISTANT_MODEL);
}
