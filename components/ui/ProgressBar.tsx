import { cn } from "@/lib/utils/cn";

export function ProgressBar({
  pct,
  tone = "primary",
  className,
}: {
  pct: number;
  tone?: "primary" | "tertiary";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      className={cn(
        "w-full h-2 bg-surface-container rounded-full overflow-hidden",
        className,
      )}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          tone === "tertiary" ? "bg-tertiary" : "bg-primary-container",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
