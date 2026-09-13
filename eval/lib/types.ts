/**
 * Shared types for the receipt-OCR evaluation harness.
 *
 * This harness is developer-only tooling for measuring the existing
 * production Gemini extraction (lib/gemini/extract.ts) against manually
 * verified ground truth. It does not change, wrap, or duplicate the
 * production extraction/reconciliation logic — see eval/README.md.
 */

// --- Ground truth (human-verified, per receipt) ----------------------------

export interface GroundTruthItem {
  name: string;
  quantity: number;
  /** Per-unit price, when the receipt prints one distinctly. Omit if the receipt only shows a line total. */
  unitPrice?: number;
  /** Total price for this line (all units) — always required, mirrors ReceiptLineItem.amount. */
  lineTotal: number;
}

export type GroundTruthStatus = "unverified" | "verified";

export interface GroundTruth {
  receiptId: string;
  /** Filename of the receipt photo under eval/dataset/receipts/. */
  imageFile: string;
  merchant?: string;
  items: GroundTruthItem[];
  /** Total tax/service/GST/tip on the receipt, summed into one number (mirrors how Gemini is prompted to report it). */
  tax: number;
  /** The total printed on the receipt. Manually read — never copied from an AI extraction. */
  receiptTotal: number;
  /**
   * Must be "verified" before this receipt is included in an evaluation run.
   * Stub files are created as "unverified" so a template can never be
   * silently scored as if it were real ground truth.
   */
  status: GroundTruthStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  notes?: string;
}

// --- AI output (captured from the real production extractor) ---------------

export type FailureCategory =
  | "missing_item"
  | "extra_item"
  | "incorrect_item_name"
  | "incorrect_quantity"
  | "incorrect_price"
  | "incorrect_tax"
  | "incorrect_total"
  | "malformed_response"
  | "unreadable_receipt"
  | "api_failure"
  | "timeout_transient_failure"
  | "other";

export interface NormalizedAiItem {
  name: string;
  quantity: number;
  amount: number;
}

export interface AiExtractionSuccess {
  status: "success";
  merchant?: string;
  items: NormalizedAiItem[];
  taxAndService: number;
  total: number;
}

export interface AiExtractionFailure {
  status: "failed";
  failureCategory: FailureCategory;
  errorMessage: string;
}

export type AiExtractionOutcome = AiExtractionSuccess | AiExtractionFailure;

/** What's cached to disk per receipt, so a second run doesn't re-call Gemini. */
export interface CachedAiOutput {
  receiptId: string;
  model: string;
  evaluatedAt: string;
  durationMs: number;
  /** sha256 of the image bytes that were sent — cache is invalidated automatically if the photo changes. */
  imageSha256: string;
  outcome: AiExtractionOutcome;
  /**
   * The schema-validated object exactly as production's extractReceipt()
   * returns it, when status === "success". See eval/README.md, "On 'raw'
   * AI output" — we deliberately don't make a second Gemini call just to
   * also capture pre-validation text.
   */
  rawExtractedJson?: unknown;
}

// --- Scoring -----------------------------------------------------------------

export interface MatchedItemPair {
  groundTruth: GroundTruthItem;
  ai: NormalizedAiItem;
  nameSimilarity: number;
  nameExact: boolean;
  quantityCorrect: boolean;
  priceCorrect: boolean;
}

export interface ItemPairing {
  matched: MatchedItemPair[];
  missing: GroundTruthItem[];
  extra: NormalizedAiItem[];
}

export interface ReceiptEvaluationResult {
  receiptId: string;
  extractionStatus: "success" | "failed";
  extractionFailureCategory?: FailureCategory;
  extractionErrorMessage?: string;

  groundTruthItemCount: number;
  aiItemCount: number;

  /** Fraction of items correctly identified by name (exact match after normalization). null only if extraction failed. */
  itemAccuracy: number | null;
  /** Fraction of matched item-pairs with an exact quantity match. null if there were no matched pairs. */
  quantityAccuracy: number | null;
  /** Fraction of matched item-pairs with price within ITEM_PRICE_TOLERANCE. null if there were no matched pairs. */
  priceAccuracy: number | null;
  taxWithinTolerance: boolean | null;
  totalWithinTolerance: boolean | null;

  /**
   * SquadPay's existing, independent reconciliation check
   * (lib/domain/reconciliation.ts), run against the AI's OWN items/tax/total
   * — i.e. does Gemini's output internally add up? This is never derived
   * from ground truth, and ground truth is never derived from it.
   */
  reconciled: boolean | null;
  reconciliationDifference: number | null;

  failureCategories: FailureCategory[];
  /** True only when every accuracy criterion is met, tax/total are within tolerance, AND the AI's own output reconciles. */
  fullyCorrect: boolean;
  notes: string[];
}

export interface AggregateMetrics {
  totalReceiptsInDataset: number;
  receiptsEvaluated: number;
  receiptsSkipped: { receiptId: string; reason: string }[];

  extractionSuccessCount: number;
  extractionFailureCount: number;
  extractionFailureRate: number | null;

  fullyCorrectCount: number;
  /** "Complete receipt accuracy" — fullyCorrectCount / receiptsEvaluated. */
  fullyCorrectRate: number | null;

  averageItemAccuracy: number | null;
  averageQuantityAccuracy: number | null;
  averagePriceAccuracy: number | null;
  taxAccuracyRate: number | null;
  totalAccuracyRate: number | null;
  reconciliationSuccessRate: number | null;

  failureCategoryCounts: Partial<Record<FailureCategory, number>>;
  evaluatedAt: string;
}
