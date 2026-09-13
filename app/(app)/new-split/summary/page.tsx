"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/create-split/Stepper";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useSplitDraft } from "@/lib/data/draft-context";
import { useSquadPay } from "@/lib/data/store-context";
import { computeShares, computeEqualSplitShares } from "@/lib/domain/split-engine";
import { formatCurrency, formatBillDate } from "@/lib/domain/format";
import { generateId } from "@/lib/utils/id";
import type { Bill } from "@/lib/domain/types";

export default function SplitSummaryPage() {
  const router = useRouter();
  const { draft, total, subtotal, reset } = useSplitDraft();
  const { participants: allParticipants, createSplit } = useSquadPay();
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const squad = useMemo(
    () => allParticipants.filter((p) => draft.participantIds.includes(p.id)),
    [allParticipants, draft.participantIds],
  );

  const bill: Bill = useMemo(
    () => ({
      id: "draft",
      title: draft.billTitle,
      merchant: draft.merchant,
      merchantLocation: draft.merchantLocation,
      date: draft.billDate,
      subtotal,
      taxAndService: draft.taxAndService,
      total,
      splitMode: draft.splitMode,
      items: draft.items,
      createdAt: draft.billDate,
    }),
    [draft, subtotal, total],
  );

  const shares =
    draft.splitMode === "equal"
      ? computeEqualSplitShares(bill, squad)
      : computeShares(bill, draft.assignments, squad).shares;

  const payerShare = shares.find((s) => s.participantId === draft.payerId)?.total ?? 0;
  const owed = shares
    .filter((s) => s.participantId !== draft.payerId)
    .reduce((sum, s) => sum + s.total, 0);

  async function handleSend() {
    setSending(true);
    setSendError(null);
    try {
      const split = await createSplit({
        bill: { ...bill, id: generateId("bill") },
        participants: squad,
        assignments: draft.assignments,
        payerId: draft.payerId,
      });
      reset();
      router.push(`/splits/${split.id}?sent=1`);
    } catch (err) {
      console.error("[new-split/summary] failed to create split:", err);
      setSendError("Couldn't save this split. Check your connection and try again.");
      setSending(false);
    }
  }

  return (
    <div className="container-max gutter w-full py-8">
      <Stepper activeIndex={2} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div>
            <div className="text-caption-caps text-primary-container tracking-widest mb-2">
              Step 03 of 04 / Squad review
            </div>
            <h1 className="text-display-lg text-on-surface tracking-tight">
              {draft.billTitle || "Your split"}
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-1">
              {formatBillDate(draft.billDate)} · {squad.length} people
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-card p-6 lg:p-8 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-caption-caps text-secondary">TOTAL</span>
                <span className="text-numeral-md text-on-surface">{formatCurrency(total)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-caption-caps text-secondary">YOUR SHARE</span>
                <span className="text-numeral-md text-on-surface">{formatCurrency(payerShare)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-caption-caps text-secondary">YOU&rsquo;RE OWED</span>
                <span className="text-numeral-md text-primary-container">{formatCurrency(owed)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 pt-2 border-t border-surface-container">
              <span className="text-caption-caps text-secondary pb-2">EVERYONE&rsquo;S SHARE</span>
              {shares.map((s) => {
                const p = squad.find((pp) => pp.id === s.participantId);
                if (!p) return null;
                return (
                  <div
                    key={s.participantId}
                    className="flex items-center justify-between py-2 border-b border-surface-container last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} size="sm" tone={p.id === draft.payerId ? "accent" : "neutral"} />
                      <span className="text-body-md text-on-surface">
                        {p.isSelf ? "You" : p.name}
                        {p.id === draft.payerId && (
                          <span className="ml-2 text-caption-caps text-primary-container">PAID BILL</span>
                        )}
                      </span>
                    </div>
                    <span className="text-label-md font-semibold text-on-surface">
                      {formatCurrency(s.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-surface-container-lowest rounded-xl shadow-elevated p-6 lg:p-8 flex flex-col gap-5 lg:sticky lg:top-24">
            <div>
              <span className="text-caption-caps text-primary-container tracking-widest">Step 04 · Send</span>
              <h2 className="text-headline-lg text-on-surface mt-1">Ready to send?</h2>
              <p className="text-body-md text-on-surface-variant mt-1">
                SquadPay creates the split and gets WhatsApp nudges ready for everyone who owes
                you — you choose when to actually send each one.
              </p>
            </div>
            <button
              type="button"
              disabled={sending || squad.length < 2}
              onClick={handleSend}
              className="w-full h-14 bg-primary-container text-on-primary text-headline-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary transition-all active:scale-[0.98] shadow-elevated disabled:opacity-40 disabled:pointer-events-none"
            >
              <Icon name={sending ? "sync" : "send_spark"} className={sending ? "animate-spin" : undefined} size={22} />
              {sending ? "Creating split…" : "Send split to squad"}
            </button>
            {squad.length < 2 && (
              <p className="text-body-sm text-error text-center -mt-2">
                Add at least one friend on the previous step first.
              </p>
            )}
            {sendError && (
              <p className="text-body-sm text-error text-center -mt-2">{sendError}</p>
            )}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low">
              <Icon name="lock" className="text-tertiary-container" size={18} />
              <p className="text-body-sm text-on-surface-variant">
                SquadPay only requests payment — it never moves money itself.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 pt-6 flex items-center justify-between border-t border-surface-variant/60">
        <Link
          href="/new-split/assign"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-label-md font-semibold transition-colors px-4 py-2"
        >
          <Icon name="arrow_back" size={18} />
          Back to assignment
        </Link>
      </div>
    </div>
  );
}
