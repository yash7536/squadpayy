import type { ReceiptLineItem } from "./types";

/**
 * Deterministic "does this number look plausible" checks — a second,
 * independent guardrail layer alongside reconciliation.ts.
 *
 * Why this exists: reconciliation.ts only checks whether the AI's own
 * items + tax add up to its own reported total. It says nothing about
 * whether those numbers are actually CORRECT. The receipt-OCR evaluation
 * (eval/results/receipt-15.json) found a real case where Gemini
 * misread a thousands separator as a decimal point — every extracted
 * number came out exactly 1000x too small (28182 read as 28.182) — and
 * because the error was applied uniformly, items + tax still summed to
 * the (also 1000x-too-small) total. Reconciliation reported "reconciled:
 * true" on that receipt. This module exists to catch that class of error,
 * which reconciliation structurally cannot.
 *
 * Deliberately NOT a confidence model — every check here is a simple,
 * explainable, deterministic rule a person can read and verify, so every
 * flag can answer "why are we stopping the user?" in one sentence. See
 * docs/ai-pm/guardrail-architecture.md for the full layered design and
 * which checks were deliberately left out (currency detection, "no tax
 * present") and why.
 */

export type AnomalyCode = "unusual_precision" | "non_positive_total" | "suspiciously_low_total";

export interface AnomalyFlag {
  code: AnomalyCode;
  message: string;
}

/**
 * No currency SquadPay handles (₹, $, €, Rp, ...) is ever quoted to more
 * than 2 decimal places in ordinary use. A third decimal digit is the
 * single strongest signal available that a thousands separator ("28.182"
 * meaning 28,182) was misread as a decimal point — exactly what happened
 * on receipt-15 in the baseline evaluation.
 */
const MAX_DECIMAL_PLACES = 2;

/**
 * A conservative, deliberately low floor: no realistic bill someone would
 * open SquadPay to split costs less than this. Chosen as a round number
 * comfortably below the cheapest real single-item receipt in the
 * evaluation set (receipt-01, ₹10.95), not fitted to any statistic — see
 * docs/ai-pm/decision-log.md for the reasoning and its limits.
 */
const MINIMUM_PLAUSIBLE_TOTAL = 10;

function hasExcessPrecision(value: number): boolean {
  const scaled = value * 10 ** MAX_DECIMAL_PLACES;
  return Math.abs(scaled - Math.round(scaled)) > 1e-6;
}

/**
 * Runs every check against the currently-reviewed items/tax/total (the
 * same live, user-editable state reconciliation.ts reads) — so, like
 * reconciliation, a flag clears the moment the user corrects the value
 * that triggered it.
 */
export function detectAnomalies(
  items: ReceiptLineItem[],
  taxAndService: number,
  total: number,
): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  const impreciseFields: string[] = [];
  for (const item of items) {
    if (hasExcessPrecision(item.amount)) impreciseFields.push(item.name);
  }
  if (hasExcessPrecision(taxAndService)) impreciseFields.push("tax/service");
  if (hasExcessPrecision(total)) impreciseFields.push("total");
  if (impreciseFields.length > 0) {
    flags.push({
      code: "unusual_precision",
      message:
        "Some amounts have more than 2 decimal places, which can happen when a receipt's " +
        `thousands separator gets misread as a decimal point. Please double-check: ${impreciseFields.join(", ")}.`,
    });
  }

  if (total <= 0) {
    flags.push({
      code: "non_positive_total",
      message: "The total is zero — please check the amounts below or enter the bill manually.",
    });
  } else if (items.length > 0 && total < MINIMUM_PLAUSIBLE_TOTAL) {
    flags.push({
      code: "suspiciously_low_total",
      message: `The total looks unusually low for a receipt with ${items.length} item${
        items.length === 1 ? "" : "s"
      } — please double-check the amounts before continuing.`,
    });
  }

  return flags;
}
