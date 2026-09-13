import type { ReceiptLineItem } from "./types";

/**
 * Deterministic reconciliation between a Gemini-extracted receipt and the
 * items/tax the user is actually reviewing.
 *
 * No I/O, no framework dependencies — same spirit as split-engine.ts.
 * Gemini extracts data; this module (and split-engine.ts) are what SquadPay
 * actually trusts for arithmetic. Gemini's own "total" field is never used
 * to calculate the split — it's only ever compared against, so the app can
 * tell the user when the numbers it extracted don't add up to what it also
 * claimed the receipt says.
 */

/**
 * Rupees of slack allowed between Gemini's stated receipt total and
 * SquadPay's own items + tax/service sum before flagging a mismatch —
 * covers ordinary rounding on the printed receipt, not genuine extraction
 * errors.
 */
export const RECONCILIATION_TOLERANCE = 1;

export interface ReconciliationResult {
  /** Sum of every item's amount, as currently reviewed/edited. */
  itemsTotal: number;
  /**
   * items total + tax/service, as currently reviewed/edited — the number
   * SquadPay will actually split. Always computed here, in application
   * code, never taken from Gemini directly.
   */
  computedTotal: number;
  /**
   * The total Gemini read directly off the receipt at scan time, kept
   * verbatim (see `SplitDraft.extractedTotal`) — never recalculated, so
   * later edits don't erase the thing being reconciled against. Undefined
   * when nothing has been scanned (pure manual entry).
   */
  extractedTotal: number | undefined;
  /** computedTotal - extractedTotal. Positive means the reviewed items/tax currently add up to MORE than Gemini's stated total. */
  difference: number;
  /**
   * False when there's nothing meaningful to reconcile — no scan happened,
   * the scan didn't produce a total, or there are no items at all. That
   * last case matters because SquadPay's own total switches to the
   * separate manual-total field the moment items.length === 0 (see
   * `SplitDraft.manualTotal` / `useSplitDraft().total`) — comparing an
   * items+tax sum of 0 against an extracted total there would be a false
   * mismatch, not a real one, since that manual total is what's actually
   * used downstream. Not a mismatch, just not applicable (the manual-entry
   * / incomplete-extraction case).
   */
  applicable: boolean;
  /**
   * True when computedTotal and extractedTotal agree within
   * RECONCILIATION_TOLERANCE. Always true when `applicable` is false —
   * there's nothing to disagree with.
   */
  reconciled: boolean;
}

/**
 * Compares what the user is currently reviewing (items + tax/service)
 * against the total Gemini reported at scan time. Discounts/adjustments are
 * deliberately not part of this calculation — the current receipt data
 * model (ExtractedReceiptSchema, Bill, ReceiptLineItem) has no concept of
 * them to reconcile.
 */
export function reconcileReceipt(
  items: ReceiptLineItem[],
  taxAndService: number,
  extractedTotal: number | undefined,
): ReconciliationResult {
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const computedTotal = itemsTotal + taxAndService;

  if (extractedTotal === undefined || items.length === 0) {
    return {
      itemsTotal,
      computedTotal,
      extractedTotal: undefined,
      difference: 0,
      applicable: false,
      reconciled: true,
    };
  }

  const difference = computedTotal - extractedTotal;
  return {
    itemsTotal,
    computedTotal,
    extractedTotal,
    difference,
    applicable: true,
    reconciled: Math.abs(difference) <= RECONCILIATION_TOLERANCE,
  };
}
