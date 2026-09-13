"use client";

import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import type { ReconciliationResult } from "@/lib/domain/reconciliation";

/**
 * Surfaces a Gemini extraction/reconciliation mismatch before the user can
 * continue past it. Renders nothing when there's nothing to warn about
 * (not applicable, or already reconciled) or once the user has explicitly
 * dismissed this exact mismatch — see `dismissed` in the parent, which is
 * only ever true for the specific difference it was dismissed at.
 *
 * Visual language matches the existing "Unassigned amount" warning in
 * BreakdownPanel.tsx (bg-warning / on-warning-container tokens) rather than
 * inventing new styling.
 */
export function ReconciliationNotice({
  reconciliation,
  dismissed,
  onContinueAnyway,
}: {
  reconciliation: ReconciliationResult;
  dismissed: boolean;
  onContinueAnyway: () => void;
}) {
  if (!reconciliation.applicable || reconciliation.reconciled || dismissed) {
    return null;
  }

  return (
    <div className="rounded-xl bg-warning-container border border-warning-fixed p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="w-5 h-5 rounded-full bg-warning text-on-warning flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
          !
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-label-md font-semibold text-on-warning-container">
            Extracted items don&rsquo;t add up to the receipt total
          </p>
          <p className="text-body-sm text-on-warning-container">
            Items + tax/service currently come to{" "}
            <span className="font-semibold">{formatCurrency(reconciliation.computedTotal)}</span>,
            but the receipt says{" "}
            <span className="font-semibold">
              {formatCurrency(reconciliation.extractedTotal ?? 0)}
            </span>
            . Check the item prices, quantities, and tax/service below, or continue if you&rsquo;ve
            confirmed the numbers yourself.
          </p>
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
