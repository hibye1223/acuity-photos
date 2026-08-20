"use client";

import { Check, DollarSign } from "lucide-react";
import { useState } from "react";
import {
  openBillingPortalAction,
  startProCheckoutAction,
} from "~/app/actions/billing";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import type { Plan } from "~/lib/plans";
import { PRO_PRICE_LABEL } from "~/lib/plans";
import { formatBytes } from "~/lib/storage-quota";

type Status = "idle" | "loading" | "error";

export function PlanCard({
  plan,
  storageUsedBytes,
  storageLimitBytes,
}: {
  plan: Plan;
  storageUsedBytes: number;
  storageLimitBytes: number;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: () => Promise<{ url: string }>) {
    setStatus("loading");
    setError(null);
    try {
      const { url } = await action();
      window.location.href = url;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Badge variant={plan === "pro" ? "default" : "secondary"}>
          {plan === "pro" ? "Pro" : "Free"}
        </Badge>
        {plan === "pro" ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5" />
            You're all set — thanks for upgrading.
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Storage</span>
          <span>
            {formatBytes(storageUsedBytes)} of {formatBytes(storageLimitBytes)}
          </span>
        </div>
        <Progress value={(storageUsedBytes / storageLimitBytes) * 100} />
      </div>

      {plan === "free" ? (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 animate-bounce text-primary" />
            <p className="font-semibold text-foreground">
              Upgrade to Pro — {PRO_PRICE_LABEL}
            </p>
          </div>
          <ul className="flex flex-col gap-1.5">
            <li className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              5x the storage — 5 GB instead of 1 GB
            </li>
          </ul>
          <Button
            type="button"
            disabled={status === "loading"}
            onClick={() => runAction(startProCheckoutAction)}
            className="w-fit"
          >
            {status === "loading" ? "Redirecting…" : "Upgrade to Pro"}
          </Button>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={status === "loading"}
            onClick={() => runAction(openBillingPortalAction)}
            className="w-fit"
          >
            {status === "loading" ? "Redirecting…" : "Manage billing"}
          </Button>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
