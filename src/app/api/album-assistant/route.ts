import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  hasToolCall,
  stepCountIs,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import type {
  AlbumDraftPhoto,
  AlbumDraftResult,
} from "~/app/actions/album-assistant";
import {
  albumDraftSchema,
  askForClarificationSchema,
  buildAlbumAssistantSystemPrompt,
  confirmPlanSchema,
  DEFAULT_CAPTION_STYLE,
  isCaptionStyle,
} from "~/lib/ai/album-assistant";
import { buildDateReferenceContext } from "~/lib/ai/date-ranges";
import {
  getAlbumAssistantFallbackModels,
  getAlbumAssistantModel,
} from "~/lib/ai/model";
import { createPhotoRetrievalTools } from "~/lib/ai/photo-tools";
import { createClient } from "~/lib/supabase/server";

export const maxDuration = 60;

const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_REQUEST_LENGTH = 500;

function extractText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

const RETRIEVAL_TOOL_TYPES = new Set([
  "tool-listRecentPhotos",
  "tool-listPhotosByDateRange",
  "tool-searchPhotosByTag",
  "tool-searchPhotosByLocation",
  "tool-searchPhotosByPerson",
  "tool-searchPhotosVisually",
]);

/**
 * In a follow-up turn, the model often reuses photo IDs from earlier tool
 * results (from its own conversation history) without calling a retrieval
 * tool again. The "only photos this call actually retrieved" check below
 * would otherwise reject those as invented — so seed it with every photo ID
 * surfaced anywhere earlier in the conversation, from both retrieval tool
 * results and prior proposeAlbum drafts.
 */
function collectPriorPhotoIds(messages: UIMessage[]): Set<string> {
  const ids = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    for (const part of message.parts) {
      const p = part as {
        type: string;
        state?: string;
        output?: unknown;
      };
      if (p.state !== "output-available") continue;

      if (RETRIEVAL_TOOL_TYPES.has(p.type)) {
        const output = p.output as { photos?: Array<{ id: string }> };
        for (const photo of output.photos ?? []) ids.add(photo.id);
      }

      if (p.type === "tool-proposeAlbum") {
        const output = p.output as { photos?: Array<{ photoId: string }> };
        for (const photo of output.photos ?? []) ids.add(photo.photoId);
      }
    }
  }
  return ids;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("You must be signed in to use the Album Assistant.", {
      status: 401,
    });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    captionStyle?: unknown;
    challengeMode?: unknown;
  };
  const latestUserMessage = [...body.messages]
    .reverse()
    .find((message) => message.role === "user");
  const requestText = extractText(latestUserMessage);
  const captionStyle = isCaptionStyle(body.captionStyle)
    ? body.captionStyle
    : DEFAULT_CAPTION_STYLE;
  const challengeMode = body.challengeMode === true;

  if (!requestText) {
    return new Response("Describe the album you want first.", {
      status: 400,
    });
  }
  if (requestText.length > MAX_REQUEST_LENGTH) {
    return new Response(
      `Keep the request under ${MAX_REQUEST_LENGTH} characters.`,
      { status: 400 },
    );
  }

  const retrievedPhotoIds = collectPriorPhotoIds(body.messages);
  const retrievalTools = createPhotoRetrievalTools(
    supabase,
    user.id,
    (photos) => {
      for (const photo of photos) retrievedPhotoIds.add(photo.id);
    },
  );

  const proposeAlbum = tool({
    description:
      "Submit the final album draft for the user to review. Call this exactly once, after retrieving candidate photos with the other tools.",
    inputSchema: albumDraftSchema,
    execute: async (input): Promise<AlbumDraftResult> => {
      // Defense in depth: only keep photos the model actually retrieved via
      // a tool call, even though the schema above already validates shape.
      const verifiedPhotos = input.photos.filter((photo) =>
        retrievedPhotoIds.has(photo.photoId),
      );
      if (verifiedPhotos.length === 0) {
        throw new Error(
          "The assistant proposed photos it never retrieved. Try again.",
        );
      }

      const photoIds = verifiedPhotos.map((photo) => photo.photoId);
      const { data: photoRows, error } = await supabase
        .from("photos")
        .select("id, storage_path, file_name")
        .eq("user_id", user.id)
        .in("id", photoIds);
      if (error) throw new Error(error.message);

      const rowById = new Map((photoRows ?? []).map((row) => [row.id, row]));
      const storagePaths = (photoRows ?? []).map((row) => row.storage_path);
      const { data: signedUrls } = storagePaths.length
        ? await supabase.storage
            .from("photos")
            .createSignedUrls(storagePaths, SIGNED_URL_TTL_SECONDS)
        : { data: null };

      const urlByPath = new Map(
        (signedUrls ?? [])
          .filter((entry) => entry.path && entry.signedUrl)
          .map((entry) => [entry.path as string, entry.signedUrl]),
      );

      const photos: AlbumDraftPhoto[] = [];
      for (const photo of verifiedPhotos) {
        const row = rowById.get(photo.photoId);
        if (!row) continue;
        photos.push({
          photoId: photo.photoId,
          fileName: row.file_name,
          caption: photo.caption,
          url: urlByPath.get(row.storage_path) ?? null,
        });
      }

      if (photos.length === 0) {
        throw new Error(
          "None of the proposed photos could be loaded. Try again.",
        );
      }

      return { title: input.title, note: input.note, photos };
    },
  });

  const confirmPlan = tool({
    description:
      "Summarize what you're about to build and pause for the user's go-ahead. Call this once after retrieval, before proposeAlbum — never call proposeAlbum in the same turn as confirmPlan.",
    inputSchema: confirmPlanSchema,
    execute: async (input) => input,
  });

  const askForClarification = tool({
    description:
      "Call this instead of proposeAlbum when the request has no usable signal at all to build a meaningful photo set, even after considering likely typos. Ends the turn without a draft.",
    inputSchema: askForClarificationSchema,
    execute: async (input) => input,
  });

  const today = new Date().toISOString().slice(0, 10);

  const result = streamText({
    model: getAlbumAssistantModel(),
    // If the primary model errors out mid-conversation (e.g. a free-tier
    // rate limit), the gateway automatically retries the same request with
    // the next model in this list before giving up.
    providerOptions: {
      gateway: { models: getAlbumAssistantFallbackModels() },
    },
    system: `${buildAlbumAssistantSystemPrompt(captionStyle, challengeMode)}\n\n${buildDateReferenceContext(today)}`,
    messages: await convertToModelMessages(body.messages),
    tools: {
      ...retrievalTools,
      confirmPlan,
      proposeAlbum,
      askForClarification,
    },
    // Every step must call a tool — this endpoint's only job is retrieval,
    // confirmPlan, proposeAlbum, and askForClarification, so a plain-text
    // reply here is always a model mistake (e.g. writing out a fake "draft"
    // instead of calling proposeAlbum).
    toolChoice: "required",
    // Stop the instant any terminal tool is called — without this, a
    // required-tool-choice loop just keeps calling something (often the same
    // tool again) until the step count runs out.
    stopWhen: [
      hasToolCall("confirmPlan"),
      hasToolCall("proposeAlbum"),
      hasToolCall("askForClarification"),
      // The system prompt caps retrieval at 3 attempts before a terminal
      // call, so this only needs to cover that plus one terminal call —
      // kept a bit higher as a safety net for a model that overshoots.
      stepCountIs(6),
    ],
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : "Something went wrong.",
    }),
  });
}
