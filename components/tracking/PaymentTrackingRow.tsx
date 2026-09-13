"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import type { Participant, PaymentStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

export function PaymentTrackingRow({
  person,
  amount,
  status,
  splitId,
  isPayer,
  onMarkPaid,
}: {
  person: Participant;
  amount: number;
  status: PaymentStatus;
  splitId: string;
  isPayer: boolean;
  onMarkPaid: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 lg:p-5 bg-surface-container-lowest rounded-xl shadow-card">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar name={person.name} size="lg" tone={isPayer ? "accent" : "neutral"} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-headline-sm text-on-surface truncate">
              {person.isSelf ? "You" : person.name}
            </h3>
            {isPayer ? (
              <span className="text-caption-caps text-primary-container bg-primary-fixed/40 px-2 py-0.5 rounded-full">
                Paid the bill
              </span>
            ) : (
              <StatusChip status={status} />
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant">
            {isPayer ? "Fronted the full amount" : "Owes their share"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between sm:justify-end gap-4">
        <span
          className={cn(
            "text-numeral-md",
            status === "paid" || isPayer ? "text-on-surface-variant line-through" : "text-on-surface",
          )}
        >
          {formatCurrency(amount)}
        </span>
        {!isPayer &&
          (status === "paid" ? (
            <span className="text-label-sm text-tertiary-container font-semibold px-3 py-1.5 rounded-lg bg-tertiary-container/10 inline-flex items-center gap-1">
              <Icon name="done_all" size={15} />
              Settled
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/splits/${splitId}/nudge/${person.id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary text-label-sm font-semibold shadow-card transition-all active:scale-95"
              >
                <Icon name="send" size={15} />
                Nudge
              </Link>
              <button
                type="button"
                onClick={onMarkPaid}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-variant text-label-sm font-semibold transition-colors"
              >
                Mark as paid
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
