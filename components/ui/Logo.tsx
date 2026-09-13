import { cn } from "@/lib/utils/cn";

/**
 * The canonical SquadPay mark — ported verbatim from the Stitch
 * `squadpay_mark` export (intersecting split/loop glyph on a cobalt tile).
 * Used everywhere a mark is needed; never redrawn as a bare letter "S".
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      role="img"
      aria-label="SquadPay"
    >
      <rect width="80" height="80" rx="20" fill="#0F3FE6" />
      <path
        d="M26 30C26 24.4772 30.4772 20 36 20H44C49.5228 20 54 24.4772 54 30V34C54 39.5228 49.5228 44 44 44H32"
        stroke="#FFFFFF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M54 50C54 55.5228 49.5228 60 44 60H36C30.4772 60 26 55.5228 26 50V46C26 40.4772 30.4772 36 36 36H48"
        stroke="#FFFFFF"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="50" cy="50" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

export function Logo({
  size = 32,
  wordmark = true,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-headline-sm text-on-surface tracking-tight">SquadPay</span>
      )}
    </span>
  );
}
