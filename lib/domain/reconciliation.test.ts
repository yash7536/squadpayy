import { describe, it, expect } from "vitest";
import { reconcileReceipt, RECONCILIATION_TOLERANCE } from "./reconciliation";
import { computeShares } from "./split-engine";
import type { Bill, Participant, ReceiptLineItem } from "./types";

function makeItems(overrides: Partial<ReceiptLineItem>[] = []): ReceiptLineItem[] {
  const base: ReceiptLineItem[] = [
    { id: "i1", name: "Cold Brew", quantity: 2, amount: 340 },
    { id: "i2", name: "Avocado Toast", quantity: 2, amount: 560 },
  ];
  if (overrides.length === 0) return base;
  return overrides.map((o, i) => ({ ...base[i], ...o }));
}

describe("reconcileReceipt", () => {
  it("reconciles when items + tax exactly match the extracted total", () => {
    const items = makeItems();
    const result = reconcileReceipt(items, 90, 990); // 340 + 560 + 90 = 990
    expect(result.itemsTotal).toBe(900);
    expect(result.computedTotal).toBe(990);
    expect(result.extractedTotal).toBe(990);
    expect(result.difference).toBe(0);
    expect(result.applicable).toBe(true);
    expect(result.reconciled).toBe(true);
  });

  it("reconciles within the tolerance (rounding slack)", () => {
    const items = makeItems();
    const result = reconcileReceipt(items, 90, 990 + RECONCILIATION_TOLERANCE);
    expect(result.reconciled).toBe(true);
    const resultOther = reconcileReceipt(items, 90, 990 - RECONCILIATION_TOLERANCE);
    expect(resultOther.reconciled).toBe(true);
  });

  it("flags a mismatch when the difference exceeds the tolerance", () => {
    const items = makeItems();
    // 340 + 560 + 90 = 990, but Gemini said the receipt totals 1200 —
    // something's missing from the extracted items.
    const result = reconcileReceipt(items, 90, 1200);
    expect(result.computedTotal).toBe(990);
    expect(result.difference).toBe(990 - 1200);
    expect(result.applicable).toBe(true);
    expect(result.reconciled).toBe(false);
  });

  it("recomputes when the user edits an item's price", () => {
    const edited = makeItems([{ amount: 300 }, { amount: 560 }]); // was 340
    const result = reconcileReceipt(edited, 90, 990);
    expect(result.itemsTotal).toBe(860);
    expect(result.computedTotal).toBe(950);
    expect(result.difference).toBe(950 - 990);
    expect(result.reconciled).toBe(false);

    // Editing it back to match the extracted total reconciles again.
    const fixed = makeItems([{ amount: 340 }, { amount: 560 }]);
    const fixedResult = reconcileReceipt(fixed, 90, 990);
    expect(fixedResult.reconciled).toBe(true);
  });

  it("recomputes when the user edits an item's quantity", () => {
    // Quantity itself isn't part of the sum (amount is already the line's
    // total price), but editing quantity is still a user edit that should
    // flow through the same recomputation — verify the function is purely
    // a function of the current items/tax, not stale state.
    const items = makeItems([{ quantity: 4 }, { quantity: 2 }]);
    const result = reconcileReceipt(items, 90, 990);
    expect(result.itemsTotal).toBe(900);
    expect(result.reconciled).toBe(true);
  });

  it("recomputes when the user edits the tax/service amount", () => {
    const items = makeItems();
    const mismatched = reconcileReceipt(items, 50, 990); // tax edited down from 90
    expect(mismatched.computedTotal).toBe(950);
    expect(mismatched.reconciled).toBe(false);

    const fixed = reconcileReceipt(items, 90, 990);
    expect(fixed.reconciled).toBe(true);
  });

  it("is not applicable when there is no extracted total (manual entry / manual fallback)", () => {
    const result = reconcileReceipt([], 0, undefined);
    expect(result.applicable).toBe(false);
    expect(result.reconciled).toBe(true);
    expect(result.extractedTotal).toBeUndefined();
  });

  it("is not applicable for manually-added items with no scan behind them", () => {
    const items = makeItems();
    const result = reconcileReceipt(items, 90, undefined);
    expect(result.applicable).toBe(false);
    expect(result.reconciled).toBe(true);
  });

  it("is not applicable when the scan produced a total but no items (incomplete extraction)", () => {
    // SquadPay's own total switches to the separate manual-total field once
    // items.length === 0 (see useSplitDraft().total), so comparing an
    // items+tax sum of 0 against the extracted total here would be a false
    // mismatch, not a real one — reconciliation only applies once there are
    // actual items to check.
    const result = reconcileReceipt([], 0, 800);
    expect(result.itemsTotal).toBe(0);
    expect(result.computedTotal).toBe(0);
    expect(result.applicable).toBe(false);
    expect(result.reconciled).toBe(true);
  });
});

describe("reconciliation + split-engine integration", () => {
  it("the reconciled computedTotal is exactly what split-engine distributes across participants", () => {
    const items = makeItems();
    const taxAndService = 90;
    const { computedTotal, reconciled } = reconcileReceipt(items, taxAndService, 990);
    expect(reconciled).toBe(true);

    const bill: Bill = {
      id: "bill-1",
      title: "Test",
      date: new Date().toISOString(),
      subtotal: 900,
      taxAndService,
      total: computedTotal,
      splitMode: "item",
      items,
      createdAt: new Date().toISOString(),
    };
    const participants: Participant[] = [
      { id: "p1", name: "Alice" },
      { id: "p2", name: "Bob" },
    ];
    const assignments = [
      { itemId: "i1", shared: true, shares: { p1: 1, p2: 1 } },
      { itemId: "i2", shared: true, shares: { p1: 1, p2: 1 } },
    ];
    const { shares } = computeShares(bill, assignments, participants);
    const sumOfShares = shares.reduce((sum, s) => sum + s.total, 0);
    expect(sumOfShares).toBe(computedTotal);
  });
});
