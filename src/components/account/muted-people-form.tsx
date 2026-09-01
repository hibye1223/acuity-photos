"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { updateMutedPeople } from "~/app/actions/profile";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function MutedPeopleForm({
  initialMutedPeople,
}: {
  initialMutedPeople: string[];
}) {
  const [names, setNames] = useState(initialMutedPeople);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: string[]) {
    setSaving(true);
    setError(null);
    const prev = names;
    setNames(next);
    try {
      await updateMutedPeople(next);
    } catch (err) {
      setNames(prev);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function addName() {
    const trimmed = draft.trim().toLowerCase();
    if (!trimmed || names.includes(trimmed)) {
      setDraft("");
      return;
    }
    setDraft("");
    save([...names, trimmed]);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Photos of muted people are left out of "On this day" and recent-trip
        memories. This never affects the Album Assistant when you ask for
        someone by name.
      </p>
      {names.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {names.map((name) => (
            <Badge key={name} variant="secondary" className="gap-1 py-1">
              {name}
              <button
                type="button"
                onClick={() => save(names.filter((n) => n !== name))}
                disabled={saving}
                aria-label={`Unmute ${name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addName();
            }
          }}
          placeholder="Name to mute"
          disabled={saving}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addName}
          disabled={saving || !draft.trim()}
        >
          Add
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
