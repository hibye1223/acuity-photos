"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { joinWaitlist, type WaitlistState } from "~/app/actions/waitlist";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/lib/utils";

const initialState: WaitlistState = { status: "idle" };

export function FloatingWaitlistCta() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [state, formAction, pending] = useActionState(
    joinWaitlist,
    initialState,
  );
  const emailId = useId();
  const feedbackId = useId();

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-x-4 z-50 flex justify-center transition-all duration-500 ease-out sm:inset-x-auto sm:right-6 sm:justify-end",
        mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
      )}
      style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className={cn(
          "w-full origin-bottom rounded-2xl border border-border bg-card text-card-foreground shadow-xl shadow-black/10 transition-all duration-300 ease-out sm:w-80",
          open
            ? "scale-100 opacity-100"
            : "pointer-events-none absolute scale-95 opacity-0",
        )}
      >
        {state.status === "success" ? (
          <div className="flex items-start justify-between gap-3 p-4">
            <p className="text-sm">
              <span className="font-medium">{state.message}</span>{" "}
              <span className="text-muted-foreground">
                We'll email you when there's something to try.
              </span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : (
          <form action={formAction} className="p-4" noValidate>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Join the waitlist</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <Label htmlFor={emailId} className="sr-only">
              Email address
            </Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              aria-invalid={state.status === "error"}
              aria-describedby={
                state.status === "error" ? `${emailId}-error` : undefined
              }
              className="h-10"
            />

            {state.status === "error" && (
              <p
                id={`${emailId}-error`}
                className="mt-1.5 text-xs text-destructive"
              >
                {state.message}
              </p>
            )}

            {showFeedback ? (
              <div className="mt-2">
                <Label
                  htmlFor={feedbackId}
                  className="mb-1 text-xs font-normal text-muted-foreground"
                >
                  What's frustrating about your photos right now?{" "}
                  <span className="text-muted-foreground/70">(optional)</span>
                </Label>
                <Input
                  id={feedbackId}
                  name="feedback"
                  type="text"
                  maxLength={500}
                  className="h-9 text-sm"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowFeedback(true)}
                className="mt-2 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Add a quick note (optional)
              </button>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-3 w-full"
              size="sm"
            >
              {pending ? "Joining..." : "Join Waitlist"}
            </Button>

            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Still in development. We'll let you know when it's ready.
            </p>
          </form>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-black/15 transition-all duration-300 ease-out hover:scale-105 active:scale-95",
          open && "pointer-events-none scale-95 opacity-0",
        )}
      >
        Join Waitlist
      </button>
    </div>
  );
}
