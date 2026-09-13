"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/create-split/Stepper";
import { ReceiptPanel } from "@/components/create-split/ReceiptPanel";
import { BillDetailsForm } from "@/components/create-split/BillDetailsForm";
import { SplitModeSelector } from "@/components/create-split/SplitModeSelector";
import { LineItemsList } from "@/components/create-split/LineItemsList";
import { ReconciliationNotice } from "@/components/create-split/ReconciliationNotice";
import { AnomalyNotice } from "@/components/create-split/AnomalyNotice";
import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";
import { reconcileReceipt } from "@/lib/domain/reconciliation";
import { detectAnomalies } from "@/lib/domain/anomaly-detection";

export default function NewSplitBillPage() {
  const router = useRouter();
  const { draft, total } = useSplitDraft();

  const reconciliation = useMemo(
    () => reconcileReceipt(draft.items, draft.taxAndService, draft.extractedTotal),
    [draft.items, draft.taxAndService, draft.extractedTotal],
  );

  // Remembers only the exact mismatch amount the user explicitly dismissed
  // — not "dismissed forever". Editing any item, quantity, price, or
  // tax/service afterward changes `reconciliation.difference`, which no
  // longer matches this stored value, so the notice reappears
  // automatically instead of staying silently suppressed.
  const [dismissedDifference, setDismissedDifference] = useState<number | null>(null);
  const dismissed = dismissedDifference !== null && dismissedDifference === reconciliation.difference;

  // Independent from reconciliation — see anomaly-detection.ts for why a
  // second layer is needed (reconciliation can't catch a uniform scale
  // error). Same dismissal contract: keyed to the exact current set of
  // flags, so a further edit that changes them un-dismisses automatically.
  const anomalies = useMemo(
    () => detectAnomalies(draft.items, draft.taxAndService, total),
    [draft.items, draft.taxAndService, total],
  );
  const [dismissedAnomalyKey, setDismissedAnomalyKey] = useState<string | null>(null);
  // Keyed on each flag's full message, not just its code — two edits can
  // both trigger "unusual_precision" while flagging different fields (e.g.
  // first the item price, then only the tax after the price is fixed);
  // keying on code alone would let a stale dismissal of the first hide the
  // second. This was caught by testing the exact real receipt-15 data
  // through the live UI, not assumed.
  const anomalyKey = anomalies
    .map((f) => f.message)
    .sort()
    .join("|");
  const anomaliesDismissed = anomalyKey !== "" && dismissedAnomalyKey === anomalyKey;

  const canContinue =
    draft.billTitle.trim().length > 0 &&
    total > 0 &&
    (draft.splitMode === "equal" || draft.items.length > 0) &&
    (reconciliation.reconciled || dismissed) &&
    (anomalies.length === 0 || anomaliesDismissed);

  return (
    <div className="container-max gutter w-full py-8">
      <Stepper activeIndex={0} />

      <div className="flex flex-col gap-1 mb-10">
        <div className="flex items-center gap-2 text-primary-container text-caption-caps">
          <span>Step 01 of 04</span>
          <span>/</span>
          <span>Expense Setup</span>
        </div>
        <h1 className="text-display-lg text-on-surface tracking-tight">Start a new split</h1>
        <p className="text-body-lg text-on-surface-variant max-w-2xl">
          Upload a receipt photo or enter the bill total manually. Gemini extracts the line items
          automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-5">
          <ReceiptPanel />
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-xl p-6 lg:p-8 shadow-card flex flex-col gap-8">
            <BillDetailsForm />
            <SplitModeSelector />
            <LineItemsList />
            <ReconciliationNotice
              reconciliation={reconciliation}
              dismissed={dismissed}
              onContinueAnyway={() => setDismissedDifference(reconciliation.difference)}
            />
            <AnomalyNotice
              flags={anomalies}
              dismissed={anomaliesDismissed}
              onContinueAnyway={() => setDismissedAnomalyKey(anomalyKey)}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-surface-variant/60">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-label-md font-semibold transition-colors px-4 py-2"
        >
          <Icon name="arrow_back" size={18} />
          Discard and go back
        </Link>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-caption-caps text-on-surface-variant">Next action</span>
            <span className="text-label-sm text-on-surface font-medium">
              Claim line items with friends
            </span>
          </div>
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => router.push("/new-split/assign")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-8 py-4 rounded-xl text-label-md font-semibold shadow-card active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            Next: Assign items
            <Icon name="arrow_forward" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
