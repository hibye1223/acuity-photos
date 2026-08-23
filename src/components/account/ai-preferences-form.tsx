"use client";

import { useState } from "react";
import {
  updateAiPreferences,
  updateFaceGroupingEnabled,
} from "~/app/actions/profile";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

const CAPTION_STYLE_OPTIONS = [
  { value: "minimal", label: "Minimal" },
  { value: "warm", label: "Warm" },
  { value: "playful", label: "Playful" },
  { value: "descriptive", label: "Descriptive" },
] as const;
type CaptionStyle = (typeof CAPTION_STYLE_OPTIONS)[number]["value"];

type Status = "idle" | "saving" | "saved" | "error";

export function AiPreferencesForm({
  initialCaptionStyle,
  initialChallengeMe,
  initialFaceGroupingEnabled,
}: {
  initialCaptionStyle: CaptionStyle;
  initialChallengeMe: boolean;
  initialFaceGroupingEnabled: boolean;
}) {
  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>(initialCaptionStyle);
  const [challengeMe, setChallengeMe] = useState(initialChallengeMe);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [faceGroupingEnabled, setFaceGroupingEnabled] = useState(
    initialFaceGroupingEnabled,
  );
  const [faceGroupingStatus, setFaceGroupingStatus] = useState<Status>("idle");

  async function handleFaceGroupingChange(value: boolean) {
    setFaceGroupingEnabled(value);
    setFaceGroupingStatus("saving");
    try {
      await updateFaceGroupingEnabled(value);
      setFaceGroupingStatus("saved");
    } catch (err) {
      setFaceGroupingEnabled(!value);
      setFaceGroupingStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);
    try {
      await updateAiPreferences({
        defaultCaptionStyle: captionStyle,
        challengeMe,
      });
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Default caption style</p>
          <p className="text-xs text-muted-foreground">
            Pre-selected each time you open the Album Assistant.
          </p>
        </div>
        <Select
          value={captionStyle}
          onValueChange={(value) => {
            setCaptionStyle(value as CaptionStyle);
            setStatus("idle");
          }}
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
      </div>

      <Switch
        label="Challenge me"
        description="Mix in a few less-obvious photo picks instead of the safest matches."
        checked={challengeMe}
        onCheckedChange={(value) => {
          setChallengeMe(value);
          setStatus("idle");
        }}
      />

      <Switch
        label="Suggest people groupings"
        description="Let the AI notice photos that might show the same person, based on a physical description (never an identity guess) — you review and name each suggested group yourself. Off by default."
        checked={faceGroupingEnabled}
        onCheckedChange={handleFaceGroupingChange}
      />
      {faceGroupingStatus === "saved" && (
        <p className="-mt-2 text-sm text-muted-foreground">Preference saved.</p>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={status === "saving"}
        className="w-fit"
      >
        {status === "saving" ? "Saving..." : "Save"}
      </Button>

      {status === "saved" && (
        <p className="text-sm text-muted-foreground">Preferences saved.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
