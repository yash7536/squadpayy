import { describe, it, expect } from "vitest";
import { detectAnomalies } from "./anomaly-detection";
import type { ReceiptLineItem } from "./types";

function item(name: string, amount: number, quantity = 1): ReceiptLineItem {
  return { id: name, name, quantity, amount };
}

describe("detectAnomalies", () => {
  it("flags nothing for a clean receipt (real data: receipt-03's actual Gemini output, a fully-correct baseline eval result)", () => {
    const items = [item("Coffee", 3), item("Lunch", 45.9, 2), item("Coke", 3)];
    const flags = detectAnomalies(items, 4.68, 56.58);
    expect(flags).toEqual([]);
  });

  it("flags unusual_precision on the exact real thousands-separator misread from the baseline eval (receipt-15)", () => {
    // Real Gemini output for receipt-15: the receipt actually reads
    // "28.182" (Indonesian Rupiah, "." as thousands separator, i.e.
    // 28,182), but Gemini extracted it as the literal float 28.182 —
    // every figure 1000x too small, yet internally self-consistent
    // (28.182 + 2.818 = 31, and reconciliation reported "reconciled: true").
    const items = [item("TRAD KY TOAST CARTE", 28.182)];
    const flags = detectAnomalies(items, 2.818, 31);
    expect(flags.map((f) => f.code)).toContain("unusual_precision");
    const flag = flags.find((f) => f.code === "unusual_precision")!;
    expect(flag.message).toContain("TRAD KY TOAST CARTE");
    expect(flag.message).toContain("tax/service");
  });

  it("does not flag ordinary 2-decimal-place currency amounts", () => {
    const flags = detectAnomalies([item("Coffee", 3.5)], 0.32, 3.82);
    expect(flags.map((f) => f.code)).not.toContain("unusual_precision");
  });

  it("flags non_positive_total when the total is zero", () => {
    const flags = detectAnomalies([item("Something", 10)], 0, 0);
    expect(flags.map((f) => f.code)).toContain("non_positive_total");
  });

  it("does not flag non_positive_total for a genuinely positive total", () => {
    const flags = detectAnomalies([item("Something", 10)], 1, 11);
    expect(flags.map((f) => f.code)).not.toContain("non_positive_total");
  });

  it("flags suspiciously_low_total for a multi-item receipt totalling under the floor", () => {
    const items = [item("A", 2), item("B", 3)];
    const flags = detectAnomalies(items, 0, 5);
    expect(flags.map((f) => f.code)).toContain("suspiciously_low_total");
  });

  it("does not flag suspiciously_low_total once above the floor (real data: receipt-01, the cheapest real single-item receipt in the eval set)", () => {
    const flags = detectAnomalies([item("Ribeye Steak Lunch", 10)], 0.95, 10.95);
    expect(flags.map((f) => f.code)).not.toContain("suspiciously_low_total");
  });

  it("does not flag suspiciously_low_total for manual entry with no items (nothing to compare against)", () => {
    const flags = detectAnomalies([], 0, 0);
    expect(flags.map((f) => f.code)).not.toContain("suspiciously_low_total");
  });

  it("can raise multiple independent flags at once", () => {
    const flags = detectAnomalies([item("X", 0.123)], 0, 0);
    expect(flags.map((f) => f.code).sort()).toEqual(["non_positive_total", "unusual_precision"]);
  });
});
