"use client";

import { useState } from "react";
import { removeLockPin, setLockPin } from "~/app/actions/locked-album";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export function LockedAlbumSettings({
  initialHasPin,
}: {
  initialHasPin: boolean;
}) {
  const [hasPin, setHasPin] = useState(initialHasPin);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSetPin() {
    if (pin !== confirmPin) {
      setError("PINs don't match.");
      setStatus("error");
      return;
    }
    setStatus("saving");
    setError(null);
    try {
      await setLockPin(pin);
      setHasPin(true);
      setPin("");
      setConfirmPin("");
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  async function handleRemovePin() {
    setStatus("saving");
    setError(null);
    try {
      await removeLockPin();
      setHasPin(false);
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        A PIN-gated album for photos you'd rather keep out of the main gallery,
        Album Assistant searches, and Memories. Lock a photo from its viewer in
        the Gallery.
      </p>

      {hasPin ? (
        <div className="flex items-center gap-3">
          <p className="text-sm">A PIN is set.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemovePin}
            disabled={status === "saving"}
          >
            Remove PIN &amp; unlock all
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="4-10 digit PIN"
            maxLength={10}
          />
          <Input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value)}
            placeholder="Confirm PIN"
            maxLength={10}
          />
          <Button
            type="button"
            onClick={handleSetPin}
            disabled={status === "saving" || !pin || !confirmPin}
          >
            Set PIN
          </Button>
        </div>
      )}

      {status === "saved" ? (
        <p className="text-sm text-muted-foreground">Saved.</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
