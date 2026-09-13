import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  elevated = false,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-xl border border-surface-variant/60",
        elevated ? "shadow-elevated" : "shadow-card",
        className,
      )}
      {...rest}
    />
  );
}
