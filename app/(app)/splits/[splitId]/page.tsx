"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSquadPay } from "@/lib/data/store-context";
import { sharesFor, isFullySettled, progressPct, paidCount } from "@/lib/data/selectors";
import { PaymentTrackingRow } from "@/components/tracking/PaymentTrackingRow";
import { SettledBanner } from "@/components/tracking/SettledBanner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatBillDate } from "@/lib/domain/format";

export default function SplitDetailPage({
  params,
}: {
  params: Promise<{ splitId: string }>;
}) {
  const { splitId } = use(params);
  const { splits, markPaid } = useSquadPay();
  const searchParams = useSearchParams();
  const [dismissedToast, setDismissedToast] = useState(false);

  const split = splits.find((s) => s.id === splitId);

  if (!split) {
    return (
      <div className="container-max gutter w-full py-16 text-center">
        <p className="text-headline-md text-on-surface mb-2">Split not found</p>
        <Link href="/splits" className="text-primary-container hover:underline">
          Back to all splits
        </Link>
      </div>
    );
  }

  const shares = sharesFor(split);
  const settled = isFullySettled(split);
  const justSent = searchParams.get("sent") === "1" && !dismissedToast;

  return (
    <div className="container-max gutter w-full py-8">
      <Link
        href="/splits"
        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-label-md font-semibold transition-colors mb-6"
      >
        <Icon name="arrow_back" size={18} />
        Back to all splits
      </Link>

      {justSent && (
        <div className="mb-6 flex items-center justify-between gap-3 bg-tertiary-container/10 border border-tertiary-fixed rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-tertiary-container text-label-md font-semibold">
            <Icon name="check_circle" size={18} />
            Split created — nudge whoever&rsquo;s ready below.
          </div>
          <button
            type="button"
            onClick={() => setDismissedToast(true)}
            className="text-on-surface-variant hover:text-on-surface focus-ring rounded-md p-1"
            aria-label="Dismiss"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-display-lg text-on-surface tracking-tight">{split.bill.title}</h1>
        <p className="text-body-lg text-on-surface-variant">
          {split.bill.merchant && `${split.bill.merchant} · `}
          {formatBillDate(split.bill.date)} · {formatCurrency(split.bill.total)} total
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-4">
          {settled && <SettledBanner total={split.bill.total} />}

          {split.participants.map((p) => (
            <PaymentTrackingRow
              key={p.id}
              person={p}
              amount={shares.find((s) => s.participantId === p.id)?.total ?? 0}
              status={split.paymentStatus[p.id]}
              splitId={split.id}
              isPayer={p.id === split.payerId}
              onMarkPaid={() => markPaid(split.id, p.id)}
            />
          ))}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="text-headline-sm text-on-surface mb-4">Progress</h3>
            <ProgressBar pct={progressPct(split)} tone={settled ? "tertiary" : "primary"} />
            <p className="text-body-sm text-secondary mt-2">
              {paidCount(split)} of {split.participants.length} paid
            </p>
          </Card>

          {split.bill.items.length > 0 && (
            <Card className="p-6">
              <h3 className="text-headline-sm text-on-surface mb-4">Receipt</h3>
              <div className="flex flex-col gap-2">
                {split.bill.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-body-sm">
                    <span className="text-on-surface-variant truncate pr-2">
                      {item.name} {item.quantity > 1 && `×${item.quantity}`}
                    </span>
                    <span className="text-on-surface font-medium shrink-0">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-body-sm pt-2 mt-1 border-t border-surface-container">
                  <span className="text-on-surface-variant">Tax &amp; service</span>
                  <span className="text-on-surface font-medium">
                    {formatCurrency(split.bill.taxAndService)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-label-md pt-1">
                  <span className="text-on-surface font-semibold">Total</span>
                  <span className="text-on-surface font-bold">{formatCurrency(split.bill.total)}</span>
                </div>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
