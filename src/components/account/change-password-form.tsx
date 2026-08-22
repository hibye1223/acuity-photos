"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/lib/supabase/client";

type Status = "idle" | "submitting" | "success" | "error";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }

    setStatus("submitting");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setStatus("success");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setStatus("idle");
          }}
          disabled={status === "submitting"}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <Input
          id="confirm-new-password"
          name="confirm-new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
            setStatus("idle");
          }}
          disabled={status === "submitting"}
        />
      </div>
      <Button
        type="submit"
        disabled={status === "submitting"}
        className="w-fit"
      >
        {status === "submitting" ? "Updating..." : "Update password"}
      </Button>

      {status === "success" && (
        <p className="text-sm text-muted-foreground">Password updated.</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
