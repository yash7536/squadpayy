import type { AiExtractionOutcome, GroundTruth, ReceiptEvaluationResult } from "./types";

const COLUMNS = [
  "Receipt ID",
  "Ground Truth Items",
  "AI Items",
  "Item Accuracy",
  "Quantity Accuracy",
  "Price Accuracy",
  "Tax Accuracy",
  "Total Accuracy",
  "Reconciled",
  "Overall Pass/Fail",
  "Failure Category",
  "Notes",
] as const;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function pct(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value * 100)}%`;
}

function passFail(value: boolean | null): string {
  if (value === null) return "N/A";
  return value ? "PASS" : "FAIL";
}

function itemList(names: string[]): string {
  if (names.length === 0) return "(none)";
  return `${names.length} (${names.join("; ")})`;
}

export interface CsvRow {
  groundTruth: GroundTruth;
  outcome: AiExtractionOutcome;
  result: ReceiptEvaluationResult;
}

export function buildCsv(rows: CsvRow[]): string {
  const lines = [COLUMNS.join(",")];
  for (const { groundTruth, outcome, result } of rows) {
    const aiItemNames = outcome.status === "success" ? outcome.items.map((i) => i.name) : [];
    const notes = [...result.notes, groundTruth.notes].filter(Boolean).join(" | ");
    const fields = [
      result.receiptId,
      itemList(groundTruth.items.map((i) => i.name)),
      itemList(aiItemNames),
      pct(result.itemAccuracy),
      pct(result.quantityAccuracy),
      pct(result.priceAccuracy),
      passFail(result.taxWithinTolerance),
      passFail(result.totalWithinTolerance),
      result.reconciled === null ? "N/A" : result.reconciled ? "YES" : "NO",
      result.fullyCorrect ? "PASS" : "FAIL",
      result.failureCategories.length > 0 ? result.failureCategories.join("; ") : "-",
      notes || "-",
    ];
    lines.push(fields.map((f) => csvEscape(String(f))).join(","));
  }
  return lines.join("\n") + "\n";
}
