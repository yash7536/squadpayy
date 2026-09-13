#!/usr/bin/env -S node --env-file-if-exists=.env.local --import tsx
/**
 * Evaluate ALL 15 receipts in the canonical dataset (eval/dataset/manifest.ts)
 * against the real production Gemini extractor.
 *
 * This can make up to 15 real API calls (fewer if some are already cached —
 * see eval/lib/cache.ts) — it is never run automatically by `npm test`,
 * `npm run build`, or any other normal dev command, and it is NEVER run
 * automatically by this harness itself. See eval/README.md.
 *
 * Receipts with no ground truth yet, or ground truth still marked
 * "unverified", are skipped and reported as skipped — never silently
 * treated as failures or passes.
 *
 * Usage:
 *   npm run eval:receipts
 *   npm run eval:receipts -- --force   (bypass the cache for every receipt)
 */
import { RECEIPT_IDS } from "./dataset/manifest";
import { EvaluationSkippedError, runEvaluation } from "./lib/run-evaluation";
import { computeAggregateMetrics } from "./lib/aggregate";
import { formatAggregateReport, formatReceiptReport } from "./lib/report";
import { writeReceiptResult, writeSummaryCsv, writeSummaryJson } from "./lib/results-store";
import { buildCsv, type CsvRow } from "./lib/csv";
import type { ReceiptEvaluationResult } from "./lib/types";

// Sequential, with a short pause between real Gemini calls — this is a
// quota-limited external API, not a throughput benchmark. Cached receipts
// don't pause.
const DELAY_BETWEEN_CALLS_MS = 500;
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const force = process.argv.includes("--force");

  const results: ReceiptEvaluationResult[] = [];
  const csvRows: CsvRow[] = [];
  const skipped: { receiptId: string; reason: string }[] = [];

  console.log(`Evaluating ${RECEIPT_IDS.length} receipts from eval/dataset/manifest.ts...`);

  for (const receiptId of RECEIPT_IDS) {
    try {
      const { groundTruth, outcome, result, fromCache } = await runEvaluation(receiptId, { force });
      writeReceiptResult(result);
      results.push(result);
      csvRows.push({ groundTruth, outcome, result });
      console.log(formatReceiptReport(result, fromCache));
      if (!fromCache) await sleep(DELAY_BETWEEN_CALLS_MS);
    } catch (err) {
      if (err instanceof EvaluationSkippedError) {
        skipped.push({ receiptId, reason: err.message });
        console.log(`\n${receiptId}: SKIPPED — ${err.message}`);
        continue;
      }
      skipped.push({ receiptId, reason: err instanceof Error ? err.message : String(err) });
      console.error(`\n${receiptId}: unexpected error —`, err);
    }
  }

  const metrics = computeAggregateMetrics(RECEIPT_IDS.length, results, skipped);
  writeSummaryJson(metrics);
  writeSummaryCsv(buildCsv(csvRows));

  console.log(formatAggregateReport(metrics));
  console.log("\nSaved: eval/results/summary.json, eval/results/summary.csv");
}

main();
