"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stepper } from "@/components/create-split/Stepper";
import { SquadSelector } from "@/components/assignment/SquadSelector";
import { AssignmentItemCard } from "@/components/assignment/AssignmentItemCard";
import { BreakdownPanel } from "@/components/assignment/BreakdownPanel";
import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";
import { useSquadPay } from "@/lib/data/store-context";
import { computeShares, computeEqualSplitShares } from "@/lib/domain/split-engine";
import type { Bill } from "@/lib/domain/types";

export default function AssignItemsPage() {
  const router = useRouter();
  const { draft, setAssignment, toggleParticipant, total, subtotal } = useSplitDraft();
  const { participants: allParticipants, addParticipant: addGlobalParticipant } = useSquadPay();

  const squad = useMemo(
    () => allParticipants.filter((p) => draft.participantIds.includes(p.id)),
    [allParticipants, draft.participantIds],
  );

  const draftBill: Bill = useMemo(
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

  // Auto-assign new items to the whole current squad so nothing starts unassigned.
  useEffect(() => {
    if (draft.splitMode !== "item") return;
    for (const item of draft.items) {
      const existing = draft.assignments.find((a) => a.itemId === item.id);
      if (!existing) {
        setAssignment({
          itemId: item.id,
          shared: true,
          shares: Object.fromEntries(draft.participantIds.map((id) => [id, 1])),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.items.length, draft.splitMode]);

  const { shares, unassignedAmount } =
    draft.splitMode === "equal"
      ? { shares: computeEqualSplitShares(draftBill, squad), unassignedAmount: 0 }
      : computeShares(draftBill, draft.assignments, squad);

  async function handleAddFriend(name: string) {
    try {
      const person = await addGlobalParticipant(name);
      toggleParticipant(person.id);
    } catch (err) {
      console.error("[new-split/assign] failed to add friend:", err);
    }
  }

  function handleContinue() {
    router.push("/new-split/summary");
  }

  return (
    <div className="container-max gutter w-full py-8">
      <Stepper activeIndex={1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant text-caption-caps mb-3">
              <span className="w-2 h-2 rounded-full bg-tertiary-container" />
              {draft.scanned ? `OCR PARSED · ${draft.merchant.toUpperCase()}` : draft.billTitle.toUpperCase() || "MANUAL ENTRY"}
            </div>
            <h1 className="text-display-lg text-on-surface tracking-tight">
              {draft.splitMode === "equal" ? "Who's splitting this?" : "Who had what?"}
            </h1>
            <p className="text-body-lg text-on-surface-variant mt-1">
              {draft.splitMode === "equal"
                ? "Add everyone in on this bill — the total divides evenly."
                : "Tap dishes to assign to friends. Shared plates split evenly across selected people."}
            </p>
          </div>

          <SquadSelector
            participants={allParticipants}
            selectedIds={draft.participantIds}
            payerId={draft.payerId}
            totals={Object.fromEntries(shares.map((s) => [s.participantId, s.total]))}
            onToggle={toggleParticipant}
            onAddFriend={handleAddFriend}
          />

          {draft.splitMode === "item" && (
            <div className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden divide-y divide-surface-container">
              {draft.items.map((item) => (
                <AssignmentItemCard
                  key={item.id}
                  item={item}
                  assignment={draft.assignments.find((a) => a.itemId === item.id)}
                  participants={squad}
                  onChange={setAssignment}
                />
              ))}
            </div>
          )}

          <div className="bg-surface-container-lowest p-4 rounded-xl border-l-4 border-primary-container flex items-start gap-3">
            <Icon name="info" className="text-primary-container flex-shrink-0 mt-0.5" size={22} />
            <div>
              <p className="text-label-md font-bold text-on-surface">
                {draft.splitMode === "equal"
                  ? "Want a different split for one item?"
                  : "Need to split an item by exact units?"}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {draft.splitMode === "equal"
                  ? "Switch to item-by-item mode on step 1 for per-dish control."
                  : "Tap any dish's “Edit split” to toggle between equal shares or exact unit counts."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <BreakdownPanel
            total={total}
            unassignedAmount={draft.splitMode === "equal" ? 0 : unassignedAmount}
            shares={shares}
            participants={squad}
            payerId={draft.payerId}
            onContinue={handleContinue}
            continueDisabled={draft.splitMode === "item" && unassignedAmount !== 0}
          />
        </div>
      </div>

      <div className="mt-10 pt-6 flex items-center justify-between border-t border-surface-variant/60">
        <Link
          href="/new-split"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-label-md font-semibold transition-colors px-4 py-2"
        >
          <Icon name="arrow_back" size={18} />
          Back to bill
        </Link>
      </div>
    </div>
  );
}
