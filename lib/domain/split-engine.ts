import type {
  Bill,
  ItemAssignment,
  Participant,
  ParticipantShare,
} from "./types";

/**
 * Pure bill-splitting math. No I/O, no framework dependencies — everything
 * here is unit tested in split-engine.test.ts.
 *
 * Rounding strategy: the "largest remainder" method. Every participant's
 * exact (fractional) share is computed first, then rounded down to whole
 * rupees, and the few leftover rupees created by rounding are handed out
 * one at a time to whoever was rounded down the most — so the totals always
 * add up to the bill exactly, with no unaccounted paise.
 */

/** Distribute `total` rupees across `count` people as evenly as possible, summing exactly to `total`. */
export function splitEqually(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  let remainder = Math.round(total - base * count);
  return Array.from({ length: count }, () => {
    if (remainder > 0) {
      remainder -= 1;
      return base + 1;
    }
    return base;
  });
}

/** Round a list of fractional amounts to whole rupees so they sum to `targetTotal` exactly. */
function roundToMatchTotal(
  exactAmounts: Record<string, number>,
  targetTotal: number,
): Record<string, number> {
  const ids = Object.keys(exactAmounts);
  const floored: Record<string, number> = {};
  const remainders: { id: string; remainder: number }[] = [];

  let flooredSum = 0;
  for (const id of ids) {
    const value = exactAmounts[id];
    const flooredValue = Math.floor(value);
    floored[id] = flooredValue;
    flooredSum += flooredValue;
    remainders.push({ id, remainder: value - flooredValue });
  }

  let leftover = Math.round(targetTotal - flooredSum);
  remainders.sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remainders.length && leftover > 0; i++) {
    floored[remainders[i].id] += 1;
    leftover -= 1;
  }

  return floored;
}

/** Exact (unrounded) pre-tax subtotal each participant consumed, based on item assignments. */
export function computeExactSubtotals(
  bill: Bill,
  assignments: ItemAssignment[],
  participantIds: string[],
): { subtotals: Record<string, number>; unassigned: number } {
  const subtotals: Record<string, number> = Object.fromEntries(
    participantIds.map((id) => [id, 0]),
  );
  let unassigned = 0;

  for (const item of bill.items) {
    const assignment = assignments.find((a) => a.itemId === item.id);
    if (!assignment || Object.keys(assignment.shares).length === 0) {
      unassigned += item.amount;
      continue;
    }

    if (assignment.shared) {
      const people = Object.keys(assignment.shares).filter((id) =>
        participantIds.includes(id),
      );
      if (people.length === 0) {
        unassigned += item.amount;
        continue;
      }
      const per = item.amount / people.length;
      for (const id of people) {
        subtotals[id] = (subtotals[id] ?? 0) + per;
      }
    } else {
      const totalUnits = Object.values(assignment.shares).reduce(
        (sum, units) => sum + units,
        0,
      );
      if (totalUnits <= 0) {
        unassigned += item.amount;
        continue;
      }
      const perUnit = item.amount / item.quantity;
      let claimedAmount = 0;
      for (const [id, units] of Object.entries(assignment.shares)) {
        if (!participantIds.includes(id)) continue;
        const amount = perUnit * units;
        subtotals[id] = (subtotals[id] ?? 0) + amount;
        claimedAmount += amount;
      }
      // Any units left unclaimed within this item's quantity count as unassigned.
      const claimedUnits = totalUnits;
      if (claimedUnits < item.quantity) {
        unassigned += perUnit * (item.quantity - claimedUnits);
      } else if (claimedAmount < item.amount - 0.01) {
        unassigned += item.amount - claimedAmount;
      }
    }
  }

  return { subtotals, unassigned };
}

/** Full per-participant breakdown (subtotal, tax/service cut, rounded total) for an item-mode split. */
export function computeItemSplitShares(
  bill: Bill,
  assignments: ItemAssignment[],
  participants: Participant[],
): { shares: ParticipantShare[]; unassignedAmount: number } {
  const participantIds = participants.map((p) => p.id);
  const { subtotals, unassigned } = computeExactSubtotals(
    bill,
    assignments,
    participantIds,
  );

  const assignedSubtotal = Object.values(subtotals).reduce(
    (a, b) => a + b,
    0,
  );

  // Distribute tax + service proportionally to what each person actually ordered.
  const exactTax: Record<string, number> = {};
  for (const id of participantIds) {
    exactTax[id] =
      assignedSubtotal > 0
        ? (subtotals[id] / assignedSubtotal) * bill.taxAndService
        : 0;
  }

  const roundedSubtotals = roundToMatchTotal(
    subtotals,
    Math.round(assignedSubtotal),
  );
  const roundedTax = roundToMatchTotal(
    exactTax,
    Math.round(bill.taxAndService),
  );

  const shares: ParticipantShare[] = participantIds.map((id) => ({
    participantId: id,
    subtotal: roundedSubtotals[id] ?? 0,
    taxAndService: roundedTax[id] ?? 0,
    total: (roundedSubtotals[id] ?? 0) + (roundedTax[id] ?? 0),
  }));

  return { shares, unassignedAmount: Math.round(unassigned) };
}

/** Full per-participant breakdown for an equal-split bill (total divided evenly). */
export function computeEqualSplitShares(
  bill: Bill,
  participants: Participant[],
): ParticipantShare[] {
  const amounts = splitEqually(bill.total, participants.length);
  return participants.map((p, i) => ({
    participantId: p.id,
    subtotal: 0,
    taxAndService: 0,
    total: amounts[i],
  }));
}

/** Convenience wrapper that picks the right calculation based on `bill.splitMode`. */
export function computeShares(
  bill: Bill,
  assignments: ItemAssignment[],
  participants: Participant[],
): { shares: ParticipantShare[]; unassignedAmount: number } {
  if (bill.splitMode === "equal") {
    return { shares: computeEqualSplitShares(bill, participants), unassignedAmount: 0 };
  }
  return computeItemSplitShares(bill, assignments, participants);
}

/** How much a single person still owes (their share minus nothing — SquadPay doesn't do partial payments). */
export function shareFor(
  shares: ParticipantShare[],
  participantId: string,
): number {
  return shares.find((s) => s.participantId === participantId)?.total ?? 0;
}

/** Net amount owed *to* the payer across everyone else's shares. */
export function totalOwedToPayer(
  shares: ParticipantShare[],
  payerId: string,
): number {
  return shares
    .filter((s) => s.participantId !== payerId)
    .reduce((sum, s) => sum + s.total, 0);
}
