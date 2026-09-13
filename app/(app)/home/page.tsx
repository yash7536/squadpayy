"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useSquadPay } from "@/lib/data/store-context";
import {
  obligationsOwedTo,
  totalYoureOwed,
} from "@/lib/data/selectors";
import { HeroLedger } from "@/components/home/HeroLedger";
import { RepaymentRow } from "@/components/home/RepaymentRow";
import { NudgeToneCard } from "@/components/home/NudgeToneCard";
import { ActiveSplitsCard } from "@/components/home/ActiveSplitsCard";
import { RecoveryStat } from "@/components/home/RecoveryStat";

export default function HomePage() {
  const { splits, participants, currentUserId, recordNudge, markPaid } = useSquadPay();

  const obligations = useMemo(
    () => obligationsOwedTo(splits, currentUserId),
    [splits, currentUserId],
  );

  const sortedObligations = useMemo(() => {
    const statusRank = { pending: 0, reminder_sent: 1, paid: 2 } as const;
    return [...obligations].sort((a, b) => {
      const rankA = statusRank[a.split.paymentStatus[a.participantId]];
      const rankB = statusRank[b.split.paymentStatus[b.participantId]];
      if (rankA !== rankB) return rankA - rankB;
      return (
        new Date(b.split.createdAt).getTime() -
        new Date(a.split.createdAt).getTime()
      );
    });
  }, [obligations]);

  const amountOwed = totalYoureOwed(splits, currentUserId);
  const pendingObligations = obligations.filter(
    (o) => o.split.paymentStatus[o.participantId] !== "paid",
  );
  const peopleCount = new Set(pendingObligations.map((o) => o.participantId)).size;
  const billsCount = new Set(pendingObligations.map((o) => o.split.id)).size;

  const activeSplits = useMemo(
    () =>
      splits
        .filter((s) => s.payerId === currentUserId)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [splits, currentUserId],
  );

  const recoveryPct = useMemo(() => {
    if (obligations.length === 0) return 100;
    const paid = obligations.filter(
      (o) => o.split.paymentStatus[o.participantId] === "paid",
    ).length;
    return Math.round((paid / obligations.length) * 100);
  }, [obligations]);

  function handleNudgeAll() {
    for (const o of pendingObligations) {
      recordNudge(o.split.id, o.participantId);
    }
  }

  return (
    <div className="container-max gutter w-full py-8">
      <HeroLedger
        amountOwed={amountOwed}
        peopleCount={peopleCount}
        billsCount={billsCount}
        onNudgeAll={handleNudgeAll}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <section className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-headline-md text-on-surface">Who owes you</h2>
              <p className="text-body-sm text-on-surface-variant">
                See who&rsquo;s paid. Nudge who hasn&rsquo;t.
              </p>
            </div>
            <span className="text-label-sm px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-medium">
              {new Set(obligations.map((o) => o.participantId)).size} people
            </span>
          </div>

          {sortedObligations.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-10 text-center shadow-card">
              <p className="text-headline-sm text-on-surface mb-1">Nobody owes you — yet</p>
              <p className="text-body-sm text-on-surface-variant">
                Start a split and SquadPay will track who needs to pay you back.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {sortedObligations.map((o) => {
                  const person = participants.find((p) => p.id === o.participantId)!;
                  return (
                    <motion.div
                      key={`${o.split.id}-${o.participantId}`}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <RepaymentRow
                        person={person}
                        billTitle={o.split.bill.title}
                        amount={o.amount}
                        status={o.split.paymentStatus[o.participantId]}
                        splitId={o.split.id}
                        onNudge={() => recordNudge(o.split.id, o.participantId)}
                        onMarkPaid={() => markPaid(o.split.id, o.participantId)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          <NudgeToneCard />
        </section>

        <aside className="lg:col-span-4 flex flex-col gap-6">
          <ActiveSplitsCard splits={activeSplits} />
          <RecoveryStat pct={recoveryPct} />
        </aside>
      </div>
    </div>
  );
}
