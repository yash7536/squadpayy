import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatCurrency } from "@/lib/domain/format";
import { paidCount, progressPct, remainingAmount } from "@/lib/data/selectors";
import type { Split } from "@/lib/domain/types";

export function ActiveSplitsCard({ splits }: { splits: Split[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-headline-sm text-on-surface">Your active splits</h3>
        <Link href="/splits" className="text-label-sm text-primary-container hover:underline">
          View all
        </Link>
      </div>
      <div className="flex flex-col gap-4">
        {splits.slice(0, 4).map((split) => {
          const pct = progressPct(split);
          const settled = pct === 100;
          const left = remainingAmount(split);
          return (
            <Link
              key={split.id}
              href={`/splits/${split.id}`}
              className="flex flex-col gap-1.5 focus-ring rounded-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-label-md text-on-surface font-medium truncate">
                  {split.bill.title}
                </span>
                <span
                  className={
                    settled
                      ? "text-label-sm text-tertiary-container font-semibold shrink-0"
                      : "text-label-sm text-on-surface font-semibold shrink-0"
                  }
                >
                  {settled
                    ? "100% settled"
                    : `${paidCount(split)} of ${split.participants.length} paid`}
                </span>
              </div>
              <ProgressBar pct={pct} tone={settled ? "tertiary" : "primary"} />
              <span className="text-body-sm text-secondary">
                {formatCurrency(split.bill.total)} total
                {settled ? " · fully settled" : ` · ${formatCurrency(left)} left`}
              </span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
