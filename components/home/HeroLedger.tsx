"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import { cn } from "@/lib/utils/cn";

export function HeroLedger({
  amountOwed,
  peopleCount,
  billsCount,
  onNudgeAll,
}: {
  amountOwed: number;
  peopleCount: number;
  billsCount: number;
  onNudgeAll: () => void;
}) {
  const [sent, setSent] = useState(false);
  const nothingOwed = amountOwed <= 0;

  return (
    <div className="relative bg-surface-container-lowest rounded-xl shadow-card p-6 lg:p-12 overflow-hidden mb-8">
      <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
      <div className="absolute right-12 bottom-8 opacity-[0.04] pointer-events-none select-none hidden lg:block">
        <span className="text-display-xl text-on-surface font-black leading-none tracking-tighter text-[140px]">
          OWED
        </span>
      </div>
      <div className="relative z-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          {!nothingOwed && (
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          )}
          <span className="text-caption-caps text-primary-container tracking-widest">
            YOU&rsquo;RE OWED
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-numeral-hero text-on-surface lg:text-[68px] lg:leading-[72px]">
            {formatCurrency(amountOwed)}
          </span>
          <span className="text-label-md text-secondary">net pending</span>
        </div>
        <p className="text-body-lg text-on-surface-variant mb-8">
          {nothingOwed
            ? "Everyone's squared up. Nothing pending right now."
            : `${peopleCount} ${peopleCount === 1 ? "person" : "people"} still owe you across ${billsCount} recent ${billsCount === 1 ? "split" : "splits"}. No awkward chats needed.`}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={nothingOwed}
            onClick={() => {
              onNudgeAll();
              setSent(true);
            }}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-label-md font-semibold shadow-card transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
              sent
                ? "bg-tertiary text-on-tertiary"
                : "bg-primary-container text-on-primary hover:bg-primary",
            )}
          >
            <Icon name={sent ? "done_all" : "campaign"} size={18} />
            {sent ? "Nudges sent!" : "Nudge everyone"}
          </button>
          <Link
            href="/new-split"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-variant text-label-md font-semibold transition-colors"
          >
            <Icon name="add" size={18} />
            New split
          </Link>
          {sent && (
            <span className="text-label-sm text-tertiary-container font-medium bg-tertiary-container/10 px-3 py-1 rounded-lg">
              ✓ Reminders dispatched casually
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
