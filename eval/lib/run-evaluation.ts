import { z } from "zod";
import {
  extractReceipt,
  isGeminiAuthError,
  isGeminiConfigured,
  isTransientGeminiError,
  ReceiptExtractionError,
} from "../../lib/gemini/extract";
import type { ExtractedReceipt } from "../../lib/gemini/schema";
import { readCachedOutput, writeCachedOutput, isCacheValid } from "./cache";
import { loadGroundTruth, receiptImagePath, GroundTruthNotReadyError } from "./ground-truth";
import { loadImage } from "./image";
import { scoreReceipt } from "./scoring";
import type {
  AiExtractionOutcome,
  CachedAiOutput,
  FailureCategory,
  GroundTruth,
  ReceiptEvaluationResult,
} from "./types";

/**
 * The single code path both cli-eval-one.ts and cli-eval-all.ts run per
 * receipt — deliberately factored out so "evaluate all 15" is not a
 * separate reimplementation of "evaluate one", it's this function called
 * 15 times. This is the ONLY place in the harness that calls the real
 * production extractReceipt() — never duplicated, never wrapped in a way
 * that changes its behavior, and mock-fallback.ts is never imported here,
 * so mock data can never be substituted into an evaluation result.
 */

const MODEL_NAME = "gemini-3.6-flash"; // must match lib/gemini/extract.ts — recorded for the record, not re-selected here.

/** Classifies a thrown error into one of the failure categories, reusing extract.ts's own classifier functions rather than re-detecting failure types. */
function classifyFailure(error: unknown): { category: FailureCategory; message: string } {
  const message = error instanceof Error ? error.message : String(error);

  if (error instanceof ReceiptExtractionError) {
    // extract.ts throws this same class for two distinct situations,
    // distinguished only by message text (there's no separate error type
    // for each) — see lib/gemini/extract.ts. Matched on the literal text
    // it uses today; if that ever changes, this falls back to the safe
    // generic "malformed_response" bucket rather than throwing.
    const category: FailureCategory = message.includes("doesn't look like a receipt")
      ? "unreadable_receipt"
      : "malformed_response";
    return { category, message };
  }
  if (error instanceof z.ZodError) {
    return { category: "malformed_response", message: `Gemini's response didn't match the expected schema: ${message}` };
  }
  if (isGeminiAuthError(error)) {
    return { category: "api_failure", message };
  }
  if (isTransientGeminiError(error)) {
    return { category: "timeout_transient_failure", message };
  }
  return { category: "other", message };
}

function normalizeExtractedReceipt(receipt: ExtractedReceipt): AiExtractionOutcome {
  return {
    status: "success",
    merchant: receipt.merchant,
    items: receipt.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      amount: item.amount,
    })),
    taxAndService: receipt.taxAndService,
    total: receipt.total,
  };
}

export interface RunOptions {
  /** Re-call Gemini even if a valid cache entry exists for this receipt's current image. */
  force?: boolean;
}

export interface RunOutcome {
  receiptId: string;
  groundTruth: GroundTruth;
  outcome: AiExtractionOutcome;
  result: ReceiptEvaluationResult;
  fromCache: boolean;
}

/** Thrown (not returned) when a receipt can't be evaluated at all — no ground truth, no image, or no API key. Callers use this to build the "skipped" list without ever fabricating a result. */
export class EvaluationSkippedError extends Error {}

export async function runEvaluation(receiptId: string, options: RunOptions = {}): Promise<RunOutcome> {
  let groundTruth: GroundTruth;
  try {
    groundTruth = loadGroundTruth(receiptId);
  } catch (err) {
    if (err instanceof GroundTruthNotReadyError) {
      throw new EvaluationSkippedError(err.message);
    }
    throw err;
  }

  const imagePath = receiptImagePath(groundTruth.imageFile);
  const image = loadImage(imagePath);

  const cached = readCachedOutput(receiptId);
  if (!options.force && isCacheValid(cached, image.sha256)) {
    return {
      receiptId,
      groundTruth,
      outcome: cached!.outcome,
      result: scoreReceipt(groundTruth, cached!.outcome),
      fromCache: true,
    };
  }

  if (!isGeminiConfigured()) {
    throw new EvaluationSkippedError(
      "GEMINI_API_KEY is not configured. Set it in .env.local (see .env.example) — the evaluation harness never substitutes mock data.",
    );
  }

  const startedAt = Date.now();
  let outcome: AiExtractionOutcome;
  let rawExtractedJson: unknown;
  try {
    const receipt = await extractReceipt(image.base64, image.mimeType);
    outcome = normalizeExtractedReceipt(receipt);
    rawExtractedJson = receipt;
  } catch (err) {
    const { category, message } = classifyFailure(err);
    outcome = { status: "failed", failureCategory: category, errorMessage: message };
  }
  const durationMs = Date.now() - startedAt;

  const cacheEntry: CachedAiOutput = {
    receiptId,
    model: MODEL_NAME,
    evaluatedAt: new Date().toISOString(),
    durationMs,
    imageSha256: image.sha256,
    outcome,
    rawExtractedJson,
  };
  writeCachedOutput(cacheEntry);

  return {
    receiptId,
    groundTruth,
    outcome,
    result: scoreReceipt(groundTruth, outcome),
    fromCache: false,
  };
}
