"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { completeOnboarding } from "~/app/actions/onboarding";
import { Button } from "~/components/ui/button";
import { onboardingSteps } from "~/lib/onboarding-steps";

const SPOTLIGHT_PADDING = 8;

type Rect = { top: number; left: number; width: number; height: number };

export function OnboardingTour({
  initiallyCompleted,
}: {
  initiallyCompleted: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(!initiallyCompleted);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = onboardingSteps[stepIndex];
  const isLast = stepIndex === onboardingSteps.length - 1;

  // Navigate to the step's page when it changes.
  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.path) {
      router.push(step.path);
    }
  }, [active, step, pathname, router]);

  // Locate and track the spotlighted element on the current page.
  useEffect(() => {
    if (!active || !step?.target || pathname !== step.path) {
      setRect(null);
      return;
    }

    let frame: number;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);

    return () => cancelAnimationFrame(frame);
  }, [active, pathname, step]);

  if (!active || !step) return null;

  const finish = () => {
    setActive(false);
    void completeOnboarding();
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  const waitingForTarget = Boolean(step.target) && !rect;

  return (
    <div className="fixed inset-0 z-50">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-lg transition-all duration-200"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      {!waitingForTarget ? (
        <div
          className="fixed z-10 w-80 rounded-xl border border-border bg-background p-5 shadow-lg"
          style={
            rect
              ? {
                  top: Math.min(
                    rect.top + rect.height + SPOTLIGHT_PADDING + 12,
                    window.innerHeight - 220,
                  ),
                  left: Math.min(
                    Math.max(rect.left, 16),
                    window.innerWidth - 336,
                  ),
                }
              : {
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }
          }
        >
          <p className="text-xs font-medium text-muted-foreground">
            {stepIndex + 1} of {onboardingSteps.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">
            {step.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {step.description}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              Skip
            </Button>
            <div className="flex gap-2">
              {stepIndex > 0 ? (
                <Button variant="outline" size="sm" onClick={back}>
                  Back
                </Button>
              ) : null}
              <Button size="sm" onClick={next}>
                {isLast ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
