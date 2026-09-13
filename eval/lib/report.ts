import type { AggregateMetrics, ReceiptEvaluationResult } from "./types";

function pct(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value * 100)}%`;
}

function yesNo(value: boolean | null): string {
  return value === null ? "N/A" : value ? "yes" : "no";
}

/** Human-readable single-receipt summary printed to stdout after each run. */
export function formatReceiptReport(result: ReceiptEvaluationResult, fromCache: boolean): string {
  const lines: string[] = [];
  lines.push(`\n${result.receiptId} ${fromCache ? "(cached AI output)" : "(new Gemini call)"}`);

  if (result.extractionStatus === "failed") {
    lines.push(`  extraction:        FAILED (${result.extractionFailureCategory})`);
    lines.push(`  error:             ${result.extractionErrorMessage}`);
    lines.push(`  overall:           FAIL`);
    return lines.join("\n");
  }

  lines.push(`  item accuracy:     ${pct(result.itemAccuracy)}  (${result.aiItemCount} AI items vs ${result.groundTruthItemCount} ground truth)`);
  lines.push(`  quantity accuracy: ${pct(result.quantityAccuracy)}`);
  lines.push(`  price accuracy:    ${pct(result.priceAccuracy)}`);
  lines.push(`  tax:               ${yesNo(result.taxWithinTolerance)}`);
  lines.push(`  total:             ${yesNo(result.totalWithinTolerance)}`);
  lines.push(`  reconciled:        ${yesNo(result.reconciled)}${result.reconciliationDifference != null ? ` (diff ₹${result.reconciliationDifference})` : ""}`);
  lines.push(`  overall:           ${result.fullyCorrect ? "PASS" : "FAIL"}`);
  if (result.failureCategories.length > 0) {
    lines.push(`  failure categories: ${result.failureCategories.join(", ")}`);
  }
  return lines.join("\n");
}

export function formatAggregateReport(metrics: AggregateMetrics): string {
  const lines: string[] = [];
  lines.push("\n=== Aggregate results ===");
  lines.push(
    `Evaluated ${metrics.receiptsEvaluated} of ${metrics.totalReceiptsInDataset} receipts in the dataset.`,
  );
  if (metrics.receiptsSkipped.length > 0) {
    lines.push(`Skipped ${metrics.receiptsSkipped.length}:`);
    for (const s of metrics.receiptsSkipped) {
      lines.push(`  - ${s.receiptId}: ${s.reason}`);
    }
  }
  if (metrics.receiptsEvaluated === 0) {
    lines.push("\nNo receipts were evaluated — no metrics to report.");
    return lines.join("\n");
  }
  lines.push("");
  lines.push(`Extraction failure rate:      ${pct(metrics.extractionFailureRate)} (${metrics.extractionFailureCount}/${metrics.receiptsEvaluated})`);
  lines.push(`Complete receipt accuracy:    ${pct(metrics.fullyCorrectRate)} (${metrics.fullyCorrectCount}/${metrics.receiptsEvaluated} fully correct)`);
  lines.push(`Average item accuracy:        ${pct(metrics.averageItemAccuracy)}`);
  lines.push(`Average quantity accuracy:    ${pct(metrics.averageQuantityAccuracy)}`);
  lines.push(`Average price accuracy:       ${pct(metrics.averagePriceAccuracy)}`);
  lines.push(`Tax accuracy rate:            ${pct(metrics.taxAccuracyRate)}`);
  lines.push(`Total accuracy rate:          ${pct(metrics.totalAccuracyRate)}`);
  lines.push(`Reconciliation success rate:  ${pct(metrics.reconciliationSuccessRate)}`);
  const categories = Object.entries(metrics.failureCategoryCounts);
  if (categories.length > 0) {
    lines.push("\nFailure categories across all evaluated receipts:");
    for (const [category, count] of categories) {
      lines.push(`  ${category}: ${count}`);
    }
  }
  return lines.join("\n");
}
