#!/usr/bin/env -S node --env-file-if-exists=.env.local --import tsx
/**
 * Evaluate ONE receipt against the real production Gemini extractor.
 *
 * This makes a real API call (unless a valid cache entry already exists —
 * see eval/lib/cache.ts) — it is never run automatically by `npm test`,
 * `npm run build`, or any other normal dev command. See eval/README.md.
 *
 * Usage:
 *   npm run eval:receipt -- receipt-01
 *   npm run eval:receipt -- receipt-01 --force   (bypass the cache, re-call Gemini)
 */
import { EvaluationSkippedError, runEvaluation } from "./lib/run-evaluation";
import { formatReceiptReport } from "./lib/report";
import { writeReceiptResult } from "./lib/results-store";

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const receiptId = args.find((a) => !a.startsWith("--"));

  if (!receiptId) {
    console.error("Usage: npm run eval:receipt -- <receipt-id> [--force]");
    console.error("Example: npm run eval:receipt -- receipt-01");
    process.exit(1);
  }

  try {
    const { result, fromCache } = await runEvaluation(receiptId, { force });
    writeReceiptResult(result);
    console.log(formatReceiptReport(result, fromCache));
    console.log(`\nSaved: eval/results/${receiptId}.json, eval/cache/ai-output/${receiptId}.json`);
  } catch (err) {
    if (err instanceof EvaluationSkippedError) {
      console.error(`\n${receiptId}: SKIPPED — ${err.message}`);
      process.exit(1);
    }
    console.error(`\n${receiptId}: unexpected error —`, err);
    process.exit(1);
  }
}

main();
