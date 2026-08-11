"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";

export function Switch({
  label,
  description,
  defaultChecked = false,
  className,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
  className?: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => setChecked((value) => !value)}
        className={cn(
          "relative mt-0.5 h-6 w-10 shrink-0 rounded-full border border-border transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform",
            checked && "translate-x-4",
          )}
        />
      </button>
    </div>
  );
}
