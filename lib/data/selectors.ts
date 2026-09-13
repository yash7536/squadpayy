import type { ParticipantShare, Split } from "@/lib/domain/types";
import { computeShares } from "@/lib/domain/split-engine";

/** Per-participant totals for a split, memo-free (cheap enough to recompute). */
export function sharesFor(split: Split): ParticipantShare[] {
  return computeShares(split.bill, split.assignments, split.participants).shares;
}

export function unassignedFor(split: Split): number {
  return computeShares(split.bill, split.assignments, split.participants)
    .unassignedAmount;
}

/** How much `personId` owes on this split (0 if they're the payer or fully paid contributes to "owed" regardless — status is separate). */
export function shareAmount(split: Split, personId: string): number {
  return sharesFor(split).find((s) => s.participantId === personId)?.total ?? 0;
}

/** Every (split, participant) pair where someone besides the payer still needs to pay the payer. */
export interface Obligation {
  split: Split;
  participantId: string;
  amount: number;
}

export function obligationsOwedTo(splits: Split[], payerId: string): Obligation[] {
  const result: Obligation[] = [];
  for (const split of splits) {
    if (split.payerId !== payerId) continue;
    const shares = sharesFor(split);
    for (const share of shares) {
      if (share.participantId === payerId) continue;
      result.push({ split, participantId: share.participantId, amount: share.total });
    }
  }
  return result;
}

/** Net rupees currently outstanding across every split where `payerId` fronted the bill. */
export function totalYoureOwed(splits: Split[], payerId: string): number {
  return obligationsOwedTo(splits, payerId)
    .filter((o) => {
      const status = o.split.paymentStatus[o.participantId];
      return status !== "paid";
    })
    .reduce((sum, o) => sum + o.amount, 0);
}

export function paidCount(split: Split): number {
  return split.participants.filter(
    (p) => split.paymentStatus[p.id] === "paid",
  ).length;
}

export function isFullySettled(split: Split): boolean {
  return split.participants.every((p) => split.paymentStatus[p.id] === "paid");
}

export function progressPct(split: Split): number {
  const total = split.participants.length;
  if (total === 0) return 100;
  return Math.round((paidCount(split) / total) * 100);
}

export function remainingAmount(split: Split): number {
  const shares = sharesFor(split);
  return shares
    .filter((s) => split.paymentStatus[s.participantId] !== "paid")
    .reduce((sum, s) => sum + s.total, 0);
}
