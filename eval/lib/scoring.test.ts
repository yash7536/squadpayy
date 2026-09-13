import { describe, it, expect } from "vitest";
import {
  nameSimilarity,
  normalizeName,
  pairItems,
  scoreReceipt,
  ITEM_NAME_MATCH_THRESHOLD,
} from "./scoring";
import type { GroundTruth, NormalizedAiItem } from "./types";

// Pure logic only — no Gemini calls, no filesystem, no network. Safe to run
// under the normal `npm test` suite (see eval/README.md — evaluation
// against real receipts is a separate, explicit command).

function makeGroundTruth(overrides: Partial<GroundTruth> = {}): GroundTruth {
  return {
    receiptId: "receipt-test",
    imageFile: "receipt-test.jpg",
    items: [
      { name: "Cold Brew", quantity: 2, lineTotal: 340 },
      { name: "Avocado Toast", quantity: 2, lineTotal: 560 },
    ],
    tax: 90,
    receiptTotal: 990,
    status: "verified",
    ...overrides,
  };
}

function aiItems(overrides: Partial<NormalizedAiItem>[] = []): NormalizedAiItem[] {
  const base: NormalizedAiItem[] = [
    { name: "Cold Brew", quantity: 2, amount: 340 },
    { name: "Avocado Toast", quantity: 2, amount: 560 },
  ];
  if (overrides.length === 0) return base;
  return overrides.map((o, i) => ({ ...base[i], ...o }));
}

describe("normalizeName", () => {
  it("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeName("  Cold-Brew,  Concentrate!! ")).toBe("cold brew concentrate");
  });
});

describe("nameSimilarity", () => {
  it("is 1 for identical (post-normalization) names", () => {
    expect(nameSimilarity("Cold Brew", "cold   brew")).toBe(1);
  });

  it("is 0 for names with no shared bigrams", () => {
    expect(nameSimilarity("Coffee", "Zzz")).toBe(0);
  });

  it("is partial for a truncated/reworded name", () => {
    const s = nameSimilarity("Cold Brew", "Cold Brew Concentrate");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
    expect(s).toBeGreaterThanOrEqual(ITEM_NAME_MATCH_THRESHOLD);
  });
});

describe("pairItems", () => {
  it("pairs items by name regardless of order", () => {
    const gt = makeGroundTruth().items;
    const ai = [aiItems()[1], aiItems()[0]]; // reversed order
    const { matched, missing, extra } = pairItems(gt, ai);
    expect(matched).toHaveLength(2);
    expect(missing).toHaveLength(0);
    expect(extra).toHaveLength(0);
  });

  it("reports a ground-truth item with no AI counterpart as missing", () => {
    const gt = makeGroundTruth().items;
    const ai = [aiItems()[0]]; // Avocado Toast never extracted
    const { matched, missing, extra } = pairItems(gt, ai);
    expect(matched).toHaveLength(1);
    expect(missing).toEqual([gt[1]]);
    expect(extra).toHaveLength(0);
  });

  it("reports an AI item with no ground-truth counterpart as extra", () => {
    const gt = [makeGroundTruth().items[0]];
    const ai = aiItems(); // AI also hallucinated "Avocado Toast"
    const { matched, missing, extra } = pairItems(gt, ai);
    expect(matched).toHaveLength(1);
    expect(missing).toHaveLength(0);
    expect(extra).toHaveLength(1);
    expect(extra[0].name).toBe("Avocado Toast");
  });

  it("does not pair names below the similarity threshold", () => {
    const gt = [{ name: "Espresso", quantity: 1, lineTotal: 150 }];
    const ai = [{ name: "Garlic Naan", quantity: 1, amount: 150 }];
    const { matched, missing, extra } = pairItems(gt, ai);
    expect(matched).toHaveLength(0);
    expect(missing).toHaveLength(1);
    expect(extra).toHaveLength(1);
  });
});

describe("scoreReceipt — extraction success", () => {
  it("scores a perfect extraction as fully correct", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems(),
      taxAndService: 90,
      total: 990,
    });
    expect(result.itemAccuracy).toBe(1);
    expect(result.quantityAccuracy).toBe(1);
    expect(result.priceAccuracy).toBe(1);
    expect(result.taxWithinTolerance).toBe(true);
    expect(result.totalWithinTolerance).toBe(true);
    expect(result.reconciled).toBe(true);
    expect(result.failureCategories).toEqual([]);
    expect(result.fullyCorrect).toBe(true);
  });

  it("flags a missing item and lowers item accuracy", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: [aiItems()[0]], // Avocado Toast missing
      taxAndService: 90,
      total: 430, // internally consistent with what was actually extracted
    });
    expect(result.itemAccuracy).toBe(0.5); // 1 correct / max(2 gt, 1 ai) = 0.5
    expect(result.failureCategories).toContain("missing_item");
    expect(result.fullyCorrect).toBe(false);
  });

  it("flags an extra (hallucinated) item", () => {
    const result = scoreReceipt(makeGroundTruth({ items: [makeGroundTruth().items[0]] }), {
      status: "success",
      items: aiItems(),
      taxAndService: 90,
      total: 990,
    });
    expect(result.failureCategories).toContain("extra_item");
    expect(result.fullyCorrect).toBe(false);
  });

  it("flags an incorrect item name on an otherwise-matched item", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems([{ name: "Cold Brew Concentrate" }, {}]),
      taxAndService: 90,
      total: 990,
    });
    expect(result.failureCategories).toContain("incorrect_item_name");
    expect(result.itemAccuracy).toBeLessThan(1);
    expect(result.fullyCorrect).toBe(false);
  });

  it("flags an incorrect quantity with no tolerance", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems([{ quantity: 3 }, {}]),
      taxAndService: 90,
      total: 990,
    });
    expect(result.quantityAccuracy).toBe(0.5);
    expect(result.failureCategories).toContain("incorrect_quantity");
    expect(result.fullyCorrect).toBe(false);
  });

  it("allows a price difference within tolerance", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems([{ amount: 340.5 }, {}]), // within ITEM_PRICE_TOLERANCE of 1
      taxAndService: 90,
      total: 990.5,
    });
    expect(result.priceAccuracy).toBe(1);
    expect(result.failureCategories).not.toContain("incorrect_price");
  });

  it("flags a price difference beyond tolerance", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems([{ amount: 300 }, {}]), // ₹40 off
      taxAndService: 90,
      total: 950,
    });
    expect(result.priceAccuracy).toBe(0.5);
    expect(result.failureCategories).toContain("incorrect_price");
    expect(result.fullyCorrect).toBe(false);
  });

  it("flags incorrect tax", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems(),
      taxAndService: 50, // ground truth says 90
      total: 950,
    });
    expect(result.taxWithinTolerance).toBe(false);
    expect(result.failureCategories).toContain("incorrect_tax");
    expect(result.fullyCorrect).toBe(false);
  });

  it("flags incorrect total", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems(),
      taxAndService: 90,
      total: 1200, // ground truth says 990
    });
    expect(result.totalWithinTolerance).toBe(false);
    expect(result.failureCategories).toContain("incorrect_total");
    expect(result.fullyCorrect).toBe(false);
  });

  it("fails 'fully correct' when every field matches ground truth but the AI's own output doesn't reconcile", () => {
    // Ground truth total is 990, and the AI happens to also report 990 —
    // but the AI's own items (as it extracted them) only sum to 900+50=950,
    // internally inconsistent. This must never be scored as fully correct,
    // and ground truth must never be substituted for the AI's own claimed
    // total in the reconciliation check.
    const result = scoreReceipt(makeGroundTruth(), {
      status: "success",
      items: aiItems([{ amount: 300 }, {}]), // items now sum to 860
      taxAndService: 40, // 860 + 40 = 900, but total below claims 990
      total: 990,
    });
    expect(result.reconciled).toBe(false);
    expect(result.fullyCorrect).toBe(false);
  });

  it("treats reconciliation as not-applicable (not a failure) when the AI extracted zero items", () => {
    const result = scoreReceipt(makeGroundTruth({ items: [] }), {
      status: "success",
      items: [],
      taxAndService: 0,
      total: 990,
    });
    expect(result.reconciled).toBeNull();
  });
});

describe("scoreReceipt — extraction failure", () => {
  it("never fabricates accuracy numbers for a failed extraction", () => {
    const result = scoreReceipt(makeGroundTruth(), {
      status: "failed",
      failureCategory: "unreadable_receipt",
      errorMessage: "That doesn't look like a receipt.",
    });
    expect(result.extractionStatus).toBe("failed");
    expect(result.itemAccuracy).toBeNull();
    expect(result.quantityAccuracy).toBeNull();
    expect(result.priceAccuracy).toBeNull();
    expect(result.taxWithinTolerance).toBeNull();
    expect(result.totalWithinTolerance).toBeNull();
    expect(result.reconciled).toBeNull();
    expect(result.failureCategories).toEqual(["unreadable_receipt"]);
    expect(result.fullyCorrect).toBe(false);
  });
});
