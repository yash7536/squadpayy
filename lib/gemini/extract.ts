import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { ExtractedReceiptSchema, type ExtractedReceipt } from "./schema";

const EXTRACTION_PROMPT = `You are a receipt-reading assistant for a bill-splitting app.
Look at the attached photo of a restaurant or store receipt and extract its
contents as strict JSON matching exactly this shape, with no commentary:

{
  "merchant": string,
  "location": string | null,
  "items": [{ "name": string, "quantity": number, "amount": number }],
  "subtotal": number | null,
  "taxAndService": number,
  "total": number
}

Rules:
- "amount" for each item is the TOTAL price for that line (not per-unit).
- Roll every tax, GST, service charge, and tip line into "taxAndService".
- "total" must equal the sum of all item amounts plus taxAndService.
- If the photo isn't a readable receipt at all, return items: [] and total: 0.
- Respond with ONLY the JSON object, no markdown fences.`;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class ReceiptExtractionError extends Error {}

/** Thrown for transient Gemini-side failures (overloaded/rate-limited) — the caller's move is "try again in a moment," not "something's broken." */
export class ReceiptExtractionRetryableError extends Error {}

export function isTransientGeminiError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\[(429|503)\b/.test(message) || /overloaded|high demand|rate limit/i.test(message);
}

/** True for a bad/missing/rejected API key — a config problem, not something a retry fixes. */
export function isGeminiAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\[(401|403)\b/.test(message) || /api[_ ]?key|unauthorized|permission denied/i.test(message);
}

/**
 * True when ExtractedReceiptSchema rejected the response specifically
 * because an amount/tax/subtotal field came back negative — i.e. Gemini
 * tried to represent a discount, coupon, or other downward adjustment as a
 * negative number, which this schema deliberately doesn't allow (see
 * schema.ts and docs/ai-pm/decision-log.md, "Discounts / negative
 * values"). Distinct from a generic malformed response: retrying the same
 * photo will very likely fail the same way again, so the caller's honest
 * next move is "enter this bill manually," not "try again." Confirmed
 * against real Gemini output on 3 of 15 receipts in the baseline
 * evaluation (eval/results/receipt-08.json, receipt-12.json,
 * receipt-14.json) — this was a predicted, then observed, real failure
 * mode, not a hypothetical.
 */
export function isUnsupportedNegativeValueError(error: unknown): boolean {
  if (!(error instanceof z.ZodError)) return false;
  return error.issues.some(
    (issue) =>
      issue.code === "too_small" &&
      issue.path.some((segment) => segment === "amount" || segment === "taxAndService" || segment === "subtotal"),
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a receipt photo to Gemini and returns structured line items.
 * Throws if GEMINI_API_KEY isn't configured — callers should check
 * `isGeminiConfigured()` first and use the mock fallback otherwise.
 */
export async function extractReceipt(
  imageBase64: string,
  mimeType: string,
): Promise<ExtractedReceipt> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // "gemini-2.5-flash" was retired — the API itself now 404s on it and
  // names "gemini-3.6-flash" as the direct replacement for new callers.
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const content = [
    { text: EXTRACTION_PROMPT },
    { inlineData: { data: imageBase64, mimeType } },
  ];

  // Gemini's "high demand" 503s are genuinely transient (Google's own error
  // text says so) — worth a couple of short-backoff retries before making
  // this the user's problem.
  const RETRY_DELAYS_MS = [1200, 2800];
  let lastError: unknown;
  let text: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await model.generateContent(content);
      text = result.response.text().trim();
      break;
    } catch (err) {
      lastError = err;
      if (!isTransientGeminiError(err) || attempt === RETRY_DELAYS_MS.length) {
        throw err;
      }
      console.error(
        `[gemini] transient failure, retrying (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length}):`,
        err instanceof Error ? err.message : String(err),
      );
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  if (text === undefined) {
    throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ReceiptExtractionError(
      "Gemini didn't return readable data for that photo. Try a clearer, well-lit shot.",
    );
  }

  const receipt = ExtractedReceiptSchema.parse(parsed);
  if (receipt.items.length === 0 && receipt.total === 0) {
    throw new ReceiptExtractionError(
      "That doesn't look like a receipt — try a different photo, or enter the bill manually.",
    );
  }
  return receipt;
}
