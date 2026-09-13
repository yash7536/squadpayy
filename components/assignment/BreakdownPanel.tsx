"use client";

import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import type { Participant, ParticipantShare } from "@/lib/domain/types";

export function BreakdownPanel({
  total,
  unassignedAmount,
  shares,
  participants,
  payerId,
  onContinue,
  continueLabel = "Review split summary",
  continueDisabled,
}: {
  total: number;
  unassignedAmount: number;
  shares: ParticipantShare[];
  participants: Participant[];
  payerId: string;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
}) {
  const payerShare = shares.find((s) => s.participantId === payerId);
  const owedToYou = shares
    .filter((s) => s.participantId !== payerId)
    .reduce((sum, s) => sum + s.total, 0);
  const othersCount = shares.filter((s) => s.participantId !== payerId).length;
  const settled = unassignedAmount === 0;

  return (
    <div className="lg:sticky lg:top-24 flex flex-col gap-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-elevated p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between pb-3 border-b border-surface-container">
          <div>
            <span className="text-caption-caps text-secondary">RECEIPT SUMMARY</span>
            <h2 className="text-headline-md text-on-surface">Live breakdown</h2>
          </div>
          <div className="text-right">
            <span className="text-caption-caps text-secondary">TOTAL BILL</span>
            <div className="text-numeral-md text-on-surface">{formatCurrency(total)}</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={
                "w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold " +
                (settled ? "bg-tertiary text-on-tertiary" : "bg-warning text-on-warning")
              }
            >
              {settled ? "✓" : "!"}
            </span>
            <span className="text-label-md text-on-surface font-medium">Unassigned amount</span>
          </div>
          <span
            className={
              "text-headline-sm font-bold " + (settled ? "text-tertiary-container" : "text-on-warning-container")
            }
          >
            {formatCurrency(unassignedAmount)}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
            <div>
              <span className="text-caption-caps text-secondary">YOUR SHARE</span>
              <p className="text-body-sm text-on-surface-variant">What you consumed</p>
            </div>
            <div className="text-numeral-md text-on-surface">
              {formatCurrency(payerShare?.total ?? 0)}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-primary-fixed/40 flex items-center justify-between">
            <div>
              <span className="text-caption-caps text-on-primary-fixed-variant">YOU&rsquo;RE OWED</span>
              <p className="text-body-sm text-on-surface-variant">From {othersCount} squad members</p>
            </div>
            <div className="text-numeral-md text-primary-container">{formatCurrency(owedToYou)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-1 pt-1 border-t border-surface-container">
          <span className="text-caption-caps text-secondary pb-1">MEMBER COLLECTION STATUS</span>
          {shares
            .filter((s) => s.participantId !== payerId)
            .map((s) => {
              const p = participants.find((pp) => pp.id === s.participantId);
              if (!p) return null;
              return (
                <div key={s.participantId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-outline" />
                    <span className="text-body-md text-on-surface">{p.name.split(" ")[0]}</span>
                  </div>
                  <span className="text-label-md font-semibold text-on-surface">
                    {formatCurrency(s.total)}
                  </span>
                </div>
              );
            })}
        </div>

        <div className="pt-1">
          <button
            type="button"
            disabled={continueDisabled}
            onClick={onContinue}
            className="w-full h-12 bg-primary-container text-on-primary text-label-md font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-[0.98] shadow-elevated disabled:opacity-40 disabled:pointer-events-none"
          >
            {continueLabel}
            <Icon name="arrow_forward" size={18} />
          </button>
          <p className="text-body-sm text-secondary text-center mt-2.5">
            Instant WhatsApp payment links are drafted next.
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-low flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant flex-shrink-0">
          <Icon name="verified" size={18} />
        </div>
        <p className="text-body-sm text-on-surface-variant">
          SquadPay rounds split rupees fairly using the largest-remainder method — totals always add
          up exactly.
        </p>
      </div>
    </div>
  );
}
