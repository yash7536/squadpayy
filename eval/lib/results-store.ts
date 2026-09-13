import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AggregateMetrics, ReceiptEvaluationResult } from "./types";

const RESULTS_DIR = join(import.meta.dirname, "..", "results");

function writeJson(filename: string, data: unknown): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(join(RESULTS_DIR, filename), JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function writeReceiptResult(result: ReceiptEvaluationResult): void {
  writeJson(`${result.receiptId}.json`, result);
}

export function writeSummaryJson(metrics: AggregateMetrics): void {
  writeJson("summary.json", metrics);
}

export function writeSummaryCsv(csv: string): void {
  mkdirSync(RESULTS_DIR, { recursive: true });
  writeFileSync(join(RESULTS_DIR, "summary.csv"), csv, "utf-8");
}
