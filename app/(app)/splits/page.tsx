"use client";

import Link from "next/link";
import { useSquadPay } from "@/lib/data/store-context";
import { isFullySettled, paidCount, progressPct, remainingAmount } from "@/lib/data/selectors";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Icon } from "@/components/ui/Icon";
import { formatBillDate, formatCurrency } from "@/lib/domain/format";

export default function SplitsListPage() {
  const { splits } = useSquadPay();
  const sorted = [...splits].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="container-max gutter w-full py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-display-lg text-on-surface tracking-tight">Your splits</h1>
          <p className="text-body-lg text-on-surface-variant mt-1">
            Every bill you&rsquo;ve split, active or settled.
          </p>
        </div>
        <Link
          href="/new-split"
          className="hidden sm:inline-flex items-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-5 py-3 rounded-xl text-label-md font-semibold transition-colors active:scale-95"
        >
          <Icon name="add" size={18} />
          New split
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-12 text-center shadow-card">
          <p className="text-headline-sm text-on-surface mb-1">No splits yet</p>
          <p className="text-body-sm text-on-surface-variant">Create your first split to get going.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((split) => {
            const settled = isFullySettled(split);
            return (
              <Link
                key={split.id}
                href={`/splits/${split.id}`}
                className="bg-surface-container-lowest rounded-xl p-6 shadow-card hover:shadow-elevated transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-headline-sm text-on-surface truncate">{split.bill.title}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {formatBillDate(split.bill.date)} · {split.participants.length} people
                    </p>
                  </div>
                  <span className="text-numeral-md text-on-surface shrink-0">
                    {formatCurrency(split.bill.total)}
                  </span>
                </div>
                <ProgressBar pct={progressPct(split)} tone={settled ? "tertiary" : "primary"} />
                <div className="flex items-center justify-between text-body-sm">
                  <span className={settled ? "text-tertiary-container font-semibold" : "text-secondary"}>
                    {settled ? "Fully settled" : `${paidCount(split)} of ${split.participants.length} paid`}
                  </span>
                  {!settled && (
                    <span className="text-on-surface font-medium">
                      {formatCurrency(remainingAmount(split))} left
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
