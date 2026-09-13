import { describe, it, expect } from "vitest";
import {
  splitEqually,
  computeExactSubtotals,
  computeItemSplitShares,
  computeEqualSplitShares,
  computeShares,
  totalOwedToPayer,
} from "./split-engine";
import type { Bill, ItemAssignment, Participant } from "./types";

describe("splitEqually", () => {
  it("splits evenly with no remainder", () => {
    expect(splitEqually(300, 3)).toEqual([100, 100, 100]);
  });

  it("distributes the remainder as single rupees, summing exactly", () => {
    const result = splitEqually(100, 3);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
    expect(result).toEqual([34, 33, 33]);
  });

  it("returns an empty array for zero people", () => {
    expect(splitEqually(500, 0)).toEqual([]);
  });
});

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
    title: "Test Dinner",
    date: new Date().toISOString(),
    subtotal: 1000,
    taxAndService: 150,
    total: 1150,
    splitMode: "item",
    items: [
      { id: "i1", name: "Item A", quantity: 2, amount: 600 },
      { id: "i2", name: "Item B", quantity: 1, amount: 400 },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const participants: Participant[] = [
  { id: "p1", name: "Alice", isSelf: true, isPayer: true },
  { id: "p2", name: "Bob" },
];

describe("computeExactSubtotals", () => {
  it("splits a shared item evenly across claimants", () => {
    const assignments: ItemAssignment[] = [
      { itemId: "i1", shared: true, shares: { p1: 1, p2: 1 } },
      { itemId: "i2", shared: false, shares: { p1: 1 } },
    ];
    const { subtotals, unassigned } = computeExactSubtotals(
      makeBill(),
      assignments,
      ["p1", "p2"],
    );
    expect(subtotals.p1).toBeCloseTo(300 + 400);
    expect(subtotals.p2).toBeCloseTo(300);
    expect(unassigned).toBe(0);
  });

  it("counts unclaimed quantity as unassigned", () => {
    const assignments: ItemAssignment[] = [
      { itemId: "i1", shared: false, shares: { p1: 1 } }, // only 1 of 2 units claimed
      { itemId: "i2", shared: false, shares: { p2: 1 } },
    ];
    const { unassigned } = computeExactSubtotals(makeBill(), assignments, [
      "p1",
      "p2",
    ]);
    expect(unassigned).toBeCloseTo(300); // half of item i1 (₹300/unit) left unclaimed
  });

  it("treats an item with no assignment at all as fully unassigned", () => {
    const { unassigned } = computeExactSubtotals(makeBill(), [], ["p1", "p2"]);
    expect(unassigned).toBe(1000);
  });
});

describe("computeItemSplitShares", () => {
  it("distributes tax/service proportionally and sums to the bill total", () => {
    const assignments: ItemAssignment[] = [
      { itemId: "i1", shared: true, shares: { p1: 1, p2: 1 } },
      { itemId: "i2", shared: false, shares: { p1: 1 } },
    ];
    const { shares, unassignedAmount } = computeItemSplitShares(
      makeBill(),
      assignments,
      participants,
    );
    expect(unassignedAmount).toBe(0);
    const sumTotal = shares.reduce((a, s) => a + s.total, 0);
    expect(sumTotal).toBe(1150);
    // Alice consumed 700 of 1000 => should carry the larger tax share.
    const alice = shares.find((s) => s.participantId === "p1")!;
    const bob = shares.find((s) => s.participantId === "p2")!;
    expect(alice.total).toBeGreaterThan(bob.total);
  });

  it("always sums exactly to the bill total even with ugly fractions", () => {
    const bill = makeBill({
      subtotal: 100,
      taxAndService: 10,
      total: 110,
      items: [{ id: "i1", name: "Split 3 ways", quantity: 1, amount: 100 }],
    });
    const threePeople: Participant[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const assignments: ItemAssignment[] = [
      { itemId: "i1", shared: true, shares: { a: 1, b: 1, c: 1 } },
    ];
    const { shares } = computeItemSplitShares(bill, assignments, threePeople);
    expect(shares.reduce((sum, s) => sum + s.total, 0)).toBe(110);
  });
});

describe("computeEqualSplitShares", () => {
  it("divides the bill total evenly and exactly", () => {
    const bill = makeBill({ splitMode: "equal", total: 1001 });
    const three: Participant[] = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
    ];
    const shares = computeEqualSplitShares(bill, three);
    expect(shares.reduce((sum, s) => sum + s.total, 0)).toBe(1001);
  });
});

describe("computeShares dispatcher", () => {
  it("routes to equal split when bill.splitMode is 'equal'", () => {
    const bill = makeBill({ splitMode: "equal" });
    const { shares } = computeShares(bill, [], participants);
    expect(shares.every((s) => s.subtotal === 0)).toBe(true);
    expect(shares.reduce((sum, s) => sum + s.total, 0)).toBe(bill.total);
  });
});

describe("totalOwedToPayer", () => {
  it("excludes the payer's own share", () => {
    const shares = [
      { participantId: "p1", subtotal: 0, taxAndService: 0, total: 500 },
      { participantId: "p2", subtotal: 0, taxAndService: 0, total: 300 },
      { participantId: "p3", subtotal: 0, taxAndService: 0, total: 200 },
    ];
    expect(totalOwedToPayer(shares, "p1")).toBe(500);
  });
});
