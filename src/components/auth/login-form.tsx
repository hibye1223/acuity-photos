"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { createClient } from "~/lib/supabase/client";

type Mode = "password" | "magic-link";
type Status =
  | "idle"
  | "submitting"
  | "sending-link"
  | "link-sent"
  | "redirecting"
  | "error";

function callbackUrl(next?: string) {
  const url = new URL("/auth/callback", window.location.origin);
  if (next) url.searchParams.set("next", next);
  return url.toString();
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handlePasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("redirecting");
    router.push(next ?? "/app");
    router.refresh();
  }

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending-link");
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl(next) },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("link-sent");
  }

  async function handleGoogle() {
    setError(null);
    setStatus("redirecting");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
    }
  }

  if (status === "link-sent") {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="font-medium">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a sign-in link to {email}. Open it on this device to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {mode === "password" ? (
        <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={status === "submitting"}
            />
          </div>
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={status === "submitting"}
            />
          </div>
          <Button type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? "Signing in..." : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setMode("magic-link");
              setError(null);
            }}
          >
            Email me a magic link instead
          </button>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-left">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={status === "sending-link"}
            />
          </div>
          <Button type="submit" disabled={status === "sending-link"}>
            {status === "sending-link" ? "Sending link..." : "Send magic link"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={() => {
              setMode("password");
              setError(null);
            }}
          >
            Sign in with a password instead
          </button>
        </form>
      )}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={status === "redirecting"}
      >
        Continue with Google
      </Button>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="text-foreground underline underline-offset-4"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
