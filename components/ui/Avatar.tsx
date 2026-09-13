import { cn } from "@/lib/utils/cn";
import { initialsFor } from "@/lib/domain/format";

const sizeClasses = {
  sm: "w-8 h-8 text-label-sm",
  md: "w-9 h-9 text-label-md",
  lg: "w-12 h-12 text-headline-sm",
};

export function Avatar({
  name,
  size = "md",
  tone = "neutral",
  className,
}: {
  name: string;
  size?: keyof typeof sizeClasses;
  tone?: "neutral" | "accent";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0 select-none",
        sizeClasses[size],
        tone === "accent"
          ? "bg-primary-fixed text-on-primary-fixed"
          : "bg-surface-container-high text-on-surface",
        className,
      )}
    >
      {initialsFor(name)}
    </div>
  );
}
