import { cn } from "~/lib/utils";

const SUPPORT_EMAIL = "acuityphotoshelp@gmail.com";

export function SupportContact({
  label = "Email us",
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
