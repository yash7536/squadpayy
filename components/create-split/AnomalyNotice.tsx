"use client";

import { Icon } from "@/components/ui/Icon";
import type { AnomalyFlag } from "@/lib/domain/anomaly-detection";

/**
 * Surfaces plausibility warnings from lib/domain/anomaly-detection.ts — a
 * second, independent guardrail layer from ReconciliationNotice. That
 * component asks "does the AI's own math add up?"; this one asks "do these
 * numbers look right at all?" — reconciliation cannot catch a uniform
 * scale error (see anomaly-detection.ts's doc comment), which is exactly
 * why this exists as a separate check rather than folded into the same one.
 *
 * Same dismissal contract as ReconciliationNotice: `dismissed` is only ever
 * true for the exact current set of flags, so editing a value that changes
 * the flags automatically brings the notice back.
 */
export function AnomalyNotice({
  flags,
  dismissed,
  onContinueAnyway,
}: {
  flags: AnomalyFlag[];
  dismissed: boolean;
  onContinueAnyway: () => void;
}) {
  if (flags.length === 0 || dismissed) {
    return null;
  }

  return (
    <div className="rounded-xl bg-warning-container border border-warning-fixed p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-warning text-on-warning flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
          !
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="text-label-md font-semibold text-on-warning-container">
            Some receipt values look unusual
          </p>
          {flags.map((flag) => (
            <p key={flag.code} className="text-body-sm text-on-warning-container">
              {flag.message}
            </p>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 pl-8">
        <button
          type="button"
          onClick={onContinueAnyway}
          className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-on-warning-container hover:opacity-80 transition-opacity"
        >
          <Icon name="check" size={16} />
          Continue anyway
        </button>
      </div>
    </div>
  );
}
