import type { AggregateMetrics, FailureCategory, ReceiptEvaluationResult } from "./types";

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function rate(count: number, total: number): number | null {
  return total === 0 ? null : count / total;
}

/**
 * Rolls up per-receipt results into dataset-level metrics. Every rate is
 * computed only over receipts that were actually evaluated —
 * `receiptsSkipped` is always reported alongside so "N of 15 evaluated" is
 * never silently collapsed into "15 of 15 passed".
 */
export function computeAggregateMetrics(
  totalReceiptsInDataset: number,
  results: ReceiptEvaluationResult[],
  skipped: { receiptId: string; reason: string }[],
): AggregateMetrics {
  const successResults = results.filter((r) => r.extractionStatus === "success");
  const failureResults = results.filter((r) => r.extractionStatus === "failed");

  const itemAccuracies = successResults
    .map((r) => r.itemAccuracy)
    .filter((v): v is number => v !== null);
  const quantityAccuracies = successResults
    .map((r) => r.quantityAccuracy)
    .filter((v): v is number => v !== null);
  const priceAccuracies = successResults
    .map((r) => r.priceAccuracy)
    .filter((v): v is number => v !== null);

  const taxResults = successResults
    .map((r) => r.taxWithinTolerance)
    .filter((v): v is boolean => v !== null);
  const totalResults = successResults
    .map((r) => r.totalWithinTolerance)
    .filter((v): v is boolean => v !== null);
  const reconciledResults = successResults
    .map((r) => r.reconciled)
    .filter((v): v is boolean => v !== null);

  const failureCategoryCounts: Partial<Record<FailureCategory, number>> = {};
  for (const r of results) {
    for (const category of r.failureCategories) {
      failureCategoryCounts[category] = (failureCategoryCounts[category] ?? 0) + 1;
    }
  }

  return {
    totalReceiptsInDataset,
    receiptsEvaluated: results.length,
    receiptsSkipped: skipped,

    extractionSuccessCount: successResults.length,
    extractionFailureCount: failureResults.length,
    extractionFailureRate: rate(failureResults.length, results.length),

    fullyCorrectCount: results.filter((r) => r.fullyCorrect).length,
    fullyCorrectRate: rate(results.filter((r) => r.fullyCorrect).length, results.length),

    averageItemAccuracy: average(itemAccuracies),
    averageQuantityAccuracy: average(quantityAccuracies),
    averagePriceAccuracy: average(priceAccuracies),
    taxAccuracyRate: rate(taxResults.filter(Boolean).length, taxResults.length),
    totalAccuracyRate: rate(totalResults.filter(Boolean).length, totalResults.length),
    reconciliationSuccessRate: rate(reconciledResults.filter(Boolean).length, reconciledResults.length),

    failureCategoryCounts,
    evaluatedAt: new Date().toISOString(),
  };
}
