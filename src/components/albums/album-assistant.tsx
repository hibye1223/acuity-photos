"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Calendar,
  CheckCircle2,
  Eye,
  HelpCircle,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Tags,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type {
  AlbumDraftPhoto,
  AlbumDraftResult,
} from "~/app/actions/album-assistant";
import { AlbumDraftEditor } from "~/components/albums/album-draft-editor";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

function isRateLimitError(message: string): boolean {
  return /rate.?limit/i.test(message);
}

const FALLBACK_EXAMPLE_PROMPTS = [
  "Make an album of our trip to the beach.",
  "Create an album from our vacation in Florida.",
  "Build an album from last weekend.",
];

const CAPTION_STYLE_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "warm", label: "Warm" },
  { value: "playful", label: "Playful" },
  { value: "descriptive", label: "Descriptive" },
] as const;
type CaptionStyle = (typeof CAPTION_STYLE_OPTIONS)[number]["value"];

type ToolPart = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
};

type StepRow = {
  key: string;
  icon: React.ReactNode;
  label: string;
  done: boolean;
  failed: boolean;
};

/** Turns a raw UI message part into a human-readable "what's happening" row. */
function describeStep(part: unknown): StepRow | null {
  const p = part as ToolPart;

  if (p.type === "tool-listRecentPhotos") {
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Search className="size-4" />,
      label: streaming
        ? "Looking through your recent photos…"
        : p.state === "output-error"
          ? "Couldn't load your recent photos."
          : "Checked your recent photos.",
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-listPhotosByDateRange") {
    const range =
      p.input?.startDate && p.input?.endDate
        ? `${p.input.startDate} to ${p.input.endDate}`
        : "that date range";
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Calendar className="size-4" />,
      label: streaming
        ? `Checking photos from ${range}…`
        : p.state === "output-error"
          ? `Couldn't check photos from ${range}.`
          : `Checked photos from ${range}.`,
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-searchPhotosByTag") {
    const tags = Array.isArray(p.input?.tags)
      ? (p.input.tags as string[]).join(", ")
      : "matching content";
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Tags className="size-4" />,
      label: streaming
        ? `Searching for photos tagged "${tags}"…`
        : p.state === "output-error"
          ? `Couldn't search for "${tags}".`
          : `Searched for photos tagged "${tags}".`,
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-searchPhotosByLocation") {
    const location =
      typeof p.input?.location === "string" ? p.input.location : "that place";
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <MapPin className="size-4" />,
      label: streaming
        ? `Searching for photos near "${location}"…`
        : p.state === "output-error"
          ? `Couldn't search near "${location}".`
          : `Searched for photos near "${location}".`,
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-searchPhotosByPerson") {
    const people = Array.isArray(p.input?.people)
      ? (p.input.people as string[]).join(", ")
      : "that person";
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Users className="size-4" />,
      label: streaming
        ? `Looking for photos of "${people}"…`
        : p.state === "output-error"
          ? `Couldn't search for "${people}".`
          : `Looked for photos of "${people}".`,
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-searchPhotosVisually") {
    const description =
      typeof p.input?.description === "string"
        ? p.input.description
        : "what you described";
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Eye className="size-4" />,
      label: streaming
        ? `Taking a closer look for "${description}"…`
        : p.state === "output-error"
          ? `Couldn't visually check for "${description}".`
          : `Looked through your photos for "${description}".`,
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-confirmPlan") {
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <HelpCircle className="size-4" />,
      label: streaming
        ? "Working out a plan…"
        : p.state === "output-error"
          ? "Couldn't put together a plan."
          : "Plan ready for your go-ahead.",
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-proposeAlbum") {
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <Sparkles className="size-4" />,
      label: streaming
        ? "Putting together your draft…"
        : p.state === "output-error"
          ? "Couldn't finish the draft."
          : "Draft ready.",
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  if (p.type === "tool-askForClarification") {
    const streaming =
      p.state !== "output-available" && p.state !== "output-error";
    return {
      key: p.toolCallId ?? p.type,
      icon: <HelpCircle className="size-4" />,
      label: streaming
        ? "Thinking about how to read that request…"
        : p.state === "output-error"
          ? "Couldn't finish thinking that through."
          : "Needs a bit more detail from you.",
      done: p.state === "output-available",
      failed: p.state === "output-error",
    };
  }

  return null;
}

/**
 * Seeds the chat as if the assistant had just proposed the album's current
 * photos itself — so the existing "refinement" flow (see the system prompt)
 * treats the very first message here as building on this album instead of
 * starting from scratch, and so proposeAlbum's "only photos actually
 * retrieved" check accepts them without a fresh retrieval call.
 */
function buildExistingAlbumSeed(existingAlbum: {
  albumId: string;
  title: string;
  photos: AlbumDraftPhoto[];
}) {
  return [
    {
      id: "existing-album",
      role: "assistant" as const,
      parts: [
        {
          type: "tool-proposeAlbum" as const,
          toolCallId: "existing-album",
          state: "output-available" as const,
          input: {
            title: existingAlbum.title,
            photos: existingAlbum.photos.map((photo) => ({
              photoId: photo.photoId,
              caption: photo.caption,
            })),
          },
          output: {
            title: existingAlbum.title,
            photos: existingAlbum.photos,
          },
        },
      ],
    },
  ];
}

export function AlbumAssistant({
  examplePrompts = FALLBACK_EXAMPLE_PROMPTS,
  initialCaptionStyle = "minimal",
  initialChallengeMe = false,
  initialPrompt = "",
  existingAlbum,
}: {
  examplePrompts?: string[];
  initialCaptionStyle?: CaptionStyle;
  initialChallengeMe?: boolean;
  /** Pre-fills the textarea, e.g. from a Memories "build an album" link. */
  initialPrompt?: string;
  /** When set, the assistant edits this already-saved album instead of building a new one. */
  existingAlbum?: {
    albumId: string;
    title: string;
    photos: AlbumDraftPhoto[];
  };
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>(initialCaptionStyle);
  const [challengeMe, setChallengeMe] = useState(initialChallengeMe);
  const [inputError, setInputError] = useState<string | null>(null);
  const [queuedText, setQueuedText] = useState<string | null>(null);
  const [discarded, setDiscarded] = useState<Record<string, true>>({});
  const [lastSentText, setLastSentText] = useState<string | null>(null);
  const [autoRetriedFor, setAutoRetriedFor] = useState<string | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/album-assistant" }),
    ...(existingAlbum
      ? { messages: buildExistingAlbumSeed(existingAlbum) }
      : {}),
  });

  const isWorking = status === "submitted" || status === "streaming";
  const rateLimited = !!error && isRateLimitError(error.message);

  // The AI Gateway's free-tier rate limit is usually a brief, short-lived
  // ceiling — one silent retry a few seconds later resolves most of them
  // without making the user manually resend their request.
  useEffect(() => {
    if (!rateLimited || !lastSentText || autoRetriedFor === error?.message) {
      return;
    }
    const text = lastSentText;
    setAutoRetriedFor(error?.message ?? null);
    const timer = setTimeout(() => {
      sendMessage(
        { text },
        { body: { captionStyle, challengeMode: challengeMe } },
      );
    }, 4000);
    return () => clearTimeout(timer);
  }, [
    rateLimited,
    lastSentText,
    autoRetriedFor,
    error,
    captionStyle,
    challengeMe,
    sendMessage,
  ]);

  // A queued follow-up fires as soon as the current turn finishes.
  useEffect(() => {
    if (status === "ready" && queuedText) {
      const text = queuedText;
      setQueuedText(null);
      sendMessage(
        { text },
        { body: { captionStyle, challengeMode: challengeMe } },
      );
    }
  }, [status, queuedText, captionStyle, challengeMe, sendMessage]);

  const lastAssistantMessage = messages
    .filter((m) => m.role === "assistant")
    .at(-1);
  const lastParts = (lastAssistantMessage?.parts ?? []) as ToolPart[];
  const steps = lastParts
    .map(describeStep)
    .filter((step): step is StepRow => step !== null);

  const proposeAlbumPart = lastParts.find(
    (part) => part.type === "tool-proposeAlbum",
  );
  const clarificationPart = lastParts.find(
    (part) => part.type === "tool-askForClarification",
  );
  const confirmPlanPart = lastParts.find(
    (part) => part.type === "tool-confirmPlan",
  );

  const pendingPlan =
    confirmPlanPart?.state === "output-available" && status === "ready"
      ? (confirmPlanPart.output as { summary: string; photoCount: number })
      : null;

  const isDraftDiscarded =
    !!proposeAlbumPart?.toolCallId &&
    discarded[proposeAlbumPart.toolCallId] === true;
  const isDraftReady =
    !!proposeAlbumPart &&
    proposeAlbumPart.state === "output-available" &&
    !isDraftDiscarded;
  const isDraftStreaming =
    !!proposeAlbumPart &&
    proposeAlbumPart.state !== "output-available" &&
    proposeAlbumPart.state !== "output-error" &&
    !isDraftDiscarded;
  const clarificationQuestion =
    clarificationPart?.state === "output-available"
      ? (clarificationPart.output as { question: string }).question
      : null;

  const didFinishWithoutOutcome =
    status === "ready" &&
    messages.length > 0 &&
    !isDraftReady &&
    !isDraftStreaming &&
    !isDraftDiscarded &&
    !clarificationQuestion &&
    !pendingPlan;

  const submit = () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setInputError("Describe the album you want first.");
      return;
    }
    setInputError(null);
    setPrompt("");
    setLastSentText(trimmed);
    setAutoRetriedFor(null);
    if (isWorking) {
      setQueuedText(trimmed);
      return;
    }
    sendMessage(
      { text: trimmed },
      { body: { captionStyle, challengeMode: challengeMe } },
    );
  };

  const respondToPlan = (text: string) => {
    setLastSentText(text);
    setAutoRetriedFor(null);
    sendMessage(
      { text },
      { body: { captionStyle, challengeMode: challengeMe } },
    );
  };

  type DisplayDraft = {
    toolCallId: string;
    title: string;
    note?: string;
    photos: AlbumDraftPhoto[];
    isStreaming: boolean;
  };

  let displayDraft: DisplayDraft | null = null;
  if (proposeAlbumPart?.toolCallId && !isDraftDiscarded) {
    if (proposeAlbumPart.state === "output-available") {
      const output = proposeAlbumPart.output as AlbumDraftResult;
      displayDraft = {
        toolCallId: proposeAlbumPart.toolCallId,
        title: output.title,
        note: output.note,
        photos: output.photos,
        isStreaming: false,
      };
    } else if (proposeAlbumPart.state !== "output-error") {
      const input = proposeAlbumPart.input as
        | { title?: string; photos?: Array<Record<string, unknown>> }
        | undefined;
      const rawPhotos = Array.isArray(input?.photos) ? input.photos : [];
      displayDraft = {
        toolCallId: proposeAlbumPart.toolCallId,
        title: input?.title ?? "",
        photos: rawPhotos
          .filter(
            (photo) =>
              typeof photo.photoId === "string" && photo.photoId.length >= 30,
          )
          .map((photo) => ({
            photoId: photo.photoId as string,
            caption: typeof photo.caption === "string" ? photo.caption : "",
            fileName: "",
            url: null,
          })),
        isStreaming: true,
      };
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
      <div className="flex flex-1 flex-col gap-2">
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            existingAlbum
              ? "Add more sunset photos, remove the blurry one, warm up the captions…"
              : examplePrompts[0]
          }
          rows={3}
          maxLength={500}
          aria-label="Describe the album you want"
        />
        {existingAlbum ? null : (
          <div className="flex flex-wrap items-center gap-1.5">
            {examplePrompts.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Caption style</span>
          <Select
            value={captionStyle}
            onValueChange={(value) => setCaptionStyle(value as CaptionStyle)}
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPTION_STYLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="button"
            onClick={() => setChallengeMe((value) => !value)}
            aria-pressed={challengeMe}
            title="Mix in a few less-obvious picks instead of the safest matches."
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              challengeMe
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            Challenge me
          </button>
        </div>

        {inputError ? (
          <p className="text-sm text-destructive">{inputError}</p>
        ) : null}
        {error ? (
          <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <p>
              {rateLimited
                ? "The AI is briefly overloaded. Retrying automatically…"
                : "Something went wrong talking to the AI. This is usually temporary."}
            </p>
            {!rateLimited && lastSentText ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() =>
                  sendMessage(
                    { text: lastSentText },
                    { body: { captionStyle, challengeMode: challengeMe } },
                  )
                }
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}
        {clarificationQuestion ? (
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>{clarificationQuestion} Try rewriting your request above.</p>
          </div>
        ) : null}
        {pendingPlan ? (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p>{pendingPlan.summary}</p>
            </div>
            <div className="flex gap-2 pl-6">
              <Button
                type="button"
                size="sm"
                onClick={() => respondToPlan("Yes, go ahead.")}
              >
                Yes
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  respondToPlan("No, let's try something different.")
                }
              >
                No
              </Button>
            </div>
          </div>
        ) : null}
        {didFinishWithoutOutcome ? (
          <p className="text-sm text-destructive">
            The assistant didn't finish a draft. Try rephrasing your request.
          </p>
        ) : null}
        {queuedText ? (
          <p className="text-sm text-muted-foreground">
            Queued — "{queuedText}" will send once the current step finishes.
          </p>
        ) : null}

        <div>
          <Button type="button" onClick={submit}>
            {isWorking ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {messages.length > 0 ? "Queue message" : "Working…"}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {messages.length > 0 ? "Send" : "Generate album"}
              </>
            )}
          </Button>
        </div>

        {displayDraft ? (
          <AlbumDraftEditor
            key={displayDraft.toolCallId}
            albumId={existingAlbum?.albumId}
            initialTitle={displayDraft.title}
            initialPhotos={displayDraft.photos}
            note={displayDraft.note}
            isStreaming={displayDraft.isStreaming}
            onDiscard={() => {
              setDiscarded((prev) => ({
                ...prev,
                [displayDraft.toolCallId]: true,
              }));
            }}
            discardLabel={existingAlbum ? "Cancel" : "Discard draft"}
            saveLabel={existingAlbum ? "Save changes" : "Save album"}
          />
        ) : null}
      </div>

      {messages.length > 0 ? (
        <div className="flex w-full shrink-0 flex-col gap-2 rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs sm:w-80">
          <p className="font-sans text-xs font-medium text-muted-foreground">
            What the assistant is doing
          </p>
          <ul className="flex flex-col gap-2">
            {steps.map((step) => (
              <li
                key={step.key}
                className={cn(
                  "flex items-start gap-2",
                  step.failed
                    ? "text-destructive"
                    : step.done
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {step.failed ? (
                    <XCircle className="size-4" />
                  ) : step.done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                </span>
                <span>{step.label}</span>
              </li>
            ))}
            {steps.length === 0 && isWorking ? (
              <li className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Starting up…
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
