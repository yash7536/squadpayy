import { reconcileReceipt } from "../../lib/domain/reconciliation";
import type { ReceiptLineItem } from "../../lib/domain/types";
import type {
  AiExtractionOutcome,
  FailureCategory,
  GroundTruth,
  GroundTruthItem,
  ItemPairing,
  MatchedItemPair,
  NormalizedAiItem,
  ReceiptEvaluationResult,
} from "./types";

/**
 * Deterministic comparison between a receipt's ground truth and the AI
 * output captured for it. Pure functions only — no I/O, no Gemini calls —
 * so this file is safe to unit test directly (see scoring.test.ts) without
 * touching the production API or burning quota.
 *
 * Scoring rules (explicit, so results are auditable rather than "vibes"):
 *  - Item identification: names are normalized (lowercase, accents
 *    stripped, punctuation stripped, whitespace collapsed) then paired
 *    greedily by highest bigram-overlap similarity first, one-to-one,
 *    above ITEM_NAME_MATCH_THRESHOLD. This is the ONLY fuzzy step — it
 *    exists purely to find "the same item" across OCR noise (truncation,
 *    stray characters) so quantity/price can still be compared; it is NOT
 *    what "item accuracy" measures.
 *  - Item accuracy: of the paired items, how many have an EXACT normalized
 *    name match (not just similarity above threshold) — divided by
 *    max(ground truth count, AI count), so both missing and extra items
 *    reduce it.
 *  - Quantity: exact integer match, no tolerance.
 *  - Price / tax / total: numeric match within a fixed rupee tolerance
 *    (matches the tolerance philosophy of the app's own
 *    RECONCILIATION_TOLERANCE).
 */

// 0.5 (not stricter) deliberately: a plausible real OCR truncation like
// "Cold Brew" for a printed "Cold Brew Concentrate" scores ~0.57 on this
// bigram measure — comfortably matchable, but well short of 0.6. This
// value was checked against that concrete example, not picked blind; see
// scoring.test.ts.
export const ITEM_NAME_MATCH_THRESHOLD = 0.5;
export const ITEM_PRICE_TOLERANCE = 1;
export const TAX_TOLERANCE = 1;
export const TOTAL_TOLERANCE = 1;

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    // Punctuation becomes a space, not nothing — "Cold-Brew" must normalize
    // to "cold brew" (two words), not "coldbrew" (one word merged
    // together), or bigram similarity against "Cold Brew" would be wrong.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): string[] {
  if (s.length < 2) return s.length === 0 ? [] : [s];
  const out: string[] = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
}

/** Dice coefficient (bigram overlap): 1 = identical, 0 = nothing shared. Deterministic, no external library. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;
  const bbCounts = new Map<string, number>();
  for (const bg of bb) bbCounts.set(bg, (bbCounts.get(bg) ?? 0) + 1);
  let overlap = 0;
  for (const bg of ba) {
    const count = bbCounts.get(bg) ?? 0;
    if (count > 0) {
      overlap += 1;
      bbCounts.set(bg, count - 1);
    }
  }
  return (2 * overlap) / (ba.length + bb.length);
}

/** Greedy, highest-similarity-first, one-to-one pairing — order-independent, so item reordering between ground truth and AI output never counts as a mismatch. */
export function pairItems(
  groundTruthItems: GroundTruthItem[],
  aiItems: NormalizedAiItem[],
): ItemPairing {
  const candidates: { gtIndex: number; aiIndex: number; similarity: number }[] = [];
  groundTruthItems.forEach((gt, gtIndex) => {
    aiItems.forEach((ai, aiIndex) => {
      const similarity = nameSimilarity(gt.name, ai.name);
      if (similarity >= ITEM_NAME_MATCH_THRESHOLD) {
        candidates.push({ gtIndex, aiIndex, similarity });
      }
    });
  });
  candidates.sort((a, b) => b.similarity - a.similarity);

  const usedGt = new Set<number>();
  const usedAi = new Set<number>();
  const matched: MatchedItemPair[] = [];

  for (const c of candidates) {
    if (usedGt.has(c.gtIndex) || usedAi.has(c.aiIndex)) continue;
    usedGt.add(c.gtIndex);
    usedAi.add(c.aiIndex);
    const groundTruth = groundTruthItems[c.gtIndex];
    const ai = aiItems[c.aiIndex];
    matched.push({
      groundTruth,
      ai,
      nameSimilarity: c.similarity,
      nameExact: normalizeName(groundTruth.name) === normalizeName(ai.name),
      quantityCorrect: groundTruth.quantity === ai.quantity,
      priceCorrect: Math.abs(groundTruth.lineTotal - ai.amount) <= ITEM_PRICE_TOLERANCE,
    });
  }

  const missing = groundTruthItems.filter((_, i) => !usedGt.has(i));
  const extra = aiItems.filter((_, i) => !usedAi.has(i));
  return { matched, missing, extra };
}

function toReceiptLineItems(items: NormalizedAiItem[]): ReceiptLineItem[] {
  return items.map((item, index) => ({
    id: `ai-item-${index}`,
    name: item.name,
    quantity: item.quantity,
    amount: item.amount,
  }));
}

/**
 * Scores one receipt. `extractionFailureCategory`/`extractionErrorMessage`
 * are only meaningful when `outcome.status === "failed"`.
 */
export function scoreReceipt(
  groundTruth: GroundTruth,
  outcome: AiExtractionOutcome,
): ReceiptEvaluationResult {
  if (outcome.status === "failed") {
    return {
      receiptId: groundTruth.receiptId,
      extractionStatus: "failed",
      extractionFailureCategory: outcome.failureCategory,
      extractionErrorMessage: outcome.errorMessage,
      groundTruthItemCount: groundTruth.items.length,
      aiItemCount: 0,
      itemAccuracy: null,
      quantityAccuracy: null,
      priceAccuracy: null,
      taxWithinTolerance: null,
      totalWithinTolerance: null,
      reconciled: null,
      reconciliationDifference: null,
      failureCategories: [outcome.failureCategory],
      fullyCorrect: false,
      notes: [outcome.errorMessage],
    };
  }

  const pairing = pairItems(groundTruth.items, outcome.items);
  const denominator = Math.max(groundTruth.items.length, outcome.items.length);
  const itemAccuracy =
    denominator === 0 ? null : pairing.matched.filter((m) => m.nameExact).length / denominator;

  const quantityAccuracy =
    pairing.matched.length === 0
      ? null
      : pairing.matched.filter((m) => m.quantityCorrect).length / pairing.matched.length;

  const priceAccuracy =
    pairing.matched.length === 0
      ? null
      : pairing.matched.filter((m) => m.priceCorrect).length / pairing.matched.length;

  const taxWithinTolerance = Math.abs(groundTruth.tax - outcome.taxAndService) <= TAX_TOLERANCE;
  const totalWithinTolerance =
    Math.abs(groundTruth.receiptTotal - outcome.total) <= TOTAL_TOLERANCE;

  // Independent safety check, reusing production code as-is: does the AI's
  // OWN output (its items + tax vs. its own reported total) reconcile?
  // Deliberately never compares against ground truth.
  const reconciliation = reconcileReceipt(
    toReceiptLineItems(outcome.items),
    outcome.taxAndService,
    outcome.total,
  );

  const failureCategories: FailureCategory[] = [];
  if (pairing.missing.length > 0) failureCategories.push("missing_item");
  if (pairing.extra.length > 0) failureCategories.push("extra_item");
  if (pairing.matched.some((m) => !m.nameExact)) failureCategories.push("incorrect_item_name");
  if (pairing.matched.some((m) => !m.quantityCorrect)) failureCategories.push("incorrect_quantity");
  if (pairing.matched.some((m) => !m.priceCorrect)) failureCategories.push("incorrect_price");
  if (!taxWithinTolerance) failureCategories.push("incorrect_tax");
  if (!totalWithinTolerance) failureCategories.push("incorrect_total");

  const fullyCorrect =
    failureCategories.length === 0 &&
    (reconciliation.applicable ? reconciliation.reconciled : true);

  const notes: string[] = [];
  if (!reconciliation.applicable) {
    notes.push("AI output had no items — reconciliation not applicable.");
  } else if (!reconciliation.reconciled) {
    notes.push(
      `AI's own items+tax (₹${reconciliation.computedTotal}) don't reconcile with its own reported total (₹${reconciliation.extractedTotal}).`,
    );
  }

  return {
    receiptId: groundTruth.receiptId,
    extractionStatus: "success",
    groundTruthItemCount: groundTruth.items.length,
    aiItemCount: outcome.items.length,
    itemAccuracy,
    quantityAccuracy,
    priceAccuracy,
    taxWithinTolerance,
    totalWithinTolerance,
    reconciled: reconciliation.applicable ? reconciliation.reconciled : null,
    reconciliationDifference: reconciliation.applicable ? reconciliation.difference : null,
    failureCategories,
    fullyCorrect,
    notes,
  };
}
