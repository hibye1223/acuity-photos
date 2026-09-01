"use client";

import { useState } from "react";
import {
  confirmPeopleGroup,
  dismissPeopleGroup,
  type PeopleGroupSuggestion,
} from "~/app/actions/people";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

export function PeopleReview({
  initialGroups,
}: {
  initialGroups: PeopleGroupSuggestion[];
}) {
  const [groups, setGroups] = useState(initialGroups);
  const [names, setNames] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function removeGroup(index: number) {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleConfirm(index: number) {
    const group = groups[index];
    const name = names[index]?.trim();
    if (!group || !name) return;

    setBusyIndex(index);
    setError(null);
    try {
      await confirmPeopleGroup(group.photoIds, name);
      removeGroup(index);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyIndex(null);
    }
  }

  async function handleSkip(index: number) {
    const group = groups[index];
    if (!group) return;

    setBusyIndex(index);
    setError(null);
    try {
      await dismissPeopleGroup(group.photoIds);
      removeGroup(index);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyIndex(null);
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No suggestions right now — upload a few more photos with people in them,
        or check back later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {groups.map((group, index) => (
        <Card key={group.photoIds.join("-")}>
          <CardHeader>
            <CardTitle className="text-base">
              {group.photoIds.length} photos, possibly the same person
            </CardTitle>
            <CardDescription>{group.sharedDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {group.thumbnails.map((thumb) =>
                thumb.url ? (
                  // biome-ignore lint/performance/noImgElement: signed URLs are one-off and expire, not worth next/image optimization
                  <img
                    key={thumb.photoId}
                    src={thumb.url}
                    alt=""
                    className="size-18 rounded-md object-cover"
                  />
                ) : null,
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Name this person"
                value={names[index] ?? ""}
                onChange={(e) =>
                  setNames((prev) => ({ ...prev, [index]: e.target.value }))
                }
                disabled={busyIndex === index}
              />
              <Button
                type="button"
                onClick={() => handleConfirm(index)}
                disabled={busyIndex === index || !names[index]?.trim()}
              >
                Confirm
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleSkip(index)}
                disabled={busyIndex === index}
              >
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
