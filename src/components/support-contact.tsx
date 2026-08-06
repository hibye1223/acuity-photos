import { cn } from "~/lib/utils";

const SUPPORT_EMAIL = "hello@acuityphotos.com";

export function SupportContact({
  label = "Email us for help",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className={cn(
        "underline-offset-4 hover:text-foreground hover:underline",
        className,
      )}
    >
      {label}
    </a>
  );
}
