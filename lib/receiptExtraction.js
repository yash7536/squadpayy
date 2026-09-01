// Pure helpers for the Gemini receipt-extraction call (Phase 10 Part F):
// building the request, parsing Gemini's response, and sanitizing the
// result before it's ever trusted by the rest of the app. No Next.js, no
// network calls — just data in, data out, so this is easy to unit-test
// (Part J) independently of the API route that calls it
// (app/api/scan-receipt/route.js).

export const GEMINI_MODEL = "gemini-2.5-flash";

const EXTRACTION_PROMPT = `You are extracting structured data from a photo of a receipt (restaurant, cafe, store, etc.).

Read the receipt carefully and return:
- merchantName: the business name, or null if not legible
- date: the date as printed, or null if not present/legible
- currency: the currency symbol or code as it appears (e.g. "Rs.", "INR", "$"), or null
- subtotal: the pre-tax/tip subtotal, or null if not shown
- tax: the tax amount, or null if not shown
- tip: any tip or service charge amount, or null if not shown
- total: the final total amount, or null if not legible
- items: a line item for each item on the receipt, with:
  - name: the item's name/description
  - quantity: the quantity, or null if not shown (assume 1 if a quantity column exists but this line is blank)
  - price: the TOTAL price for that line (quantity x unit price as printed), not a per-unit price — or null if not legible
- confidence: "high" if the receipt is clear and fully legible, "medium" if mostly readable with a few uncertain values, "low" if the photo is blurry, dark, cropped, or otherwise hard to read
- warning: a short plain-English note about anything uncertain (e.g. "Tip amount was hard to read"), or null if there's nothing to flag

Rules:
- Never invent items, prices, or amounts that are not visibly present on the receipt.
- If a value isn't visible or legible, use null for it rather than guessing.
- If the image doesn't look like a receipt at all, return an empty items array, confidence "low", and a warning explaining that no receipt was detected.
- Return only the fields described above.`;

// Gemini's structured-output schema (a constrained subset of OpenAPI's
// schema format) — this is what makes the model's JSON output reliably
// match this shape, rather than just hoping the prose instructions above
// are followed. Field descriptions are intentionally kept in the prompt
// text (Gemini doesn't require them here, and duplicating them adds no
// value).
export const RECEIPT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchantName: { type: "STRING", nullable: true },
    date: { type: "STRING", nullable: true },
    currency: { type: "STRING", nullable: true },
    subtotal: { type: "NUMBER", nullable: true },
    tax: { type: "NUMBER", nullable: true },
    tip: { type: "NUMBER", nullable: true },
    total: { type: "NUMBER", nullable: true },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER", nullable: true },
          price: { type: "NUMBER", nullable: true },
        },
        required: ["name"],
      },
    },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    warning: { type: "STRING", nullable: true },
  },
  required: ["items", "confidence"],
};

/**
 * Builds the request body for Gemini's `generateContent` endpoint from a
 * base64-encoded image. `temperature: 0` favors faithfully reading what's
 * printed over creative interpretation, which is what we want for
 * extracting numbers off a receipt.
 */
export function buildGeminiRequestBody(base64Data, mimeType) {
  return {
    contents: [
      {
        role: "user",
        parts: [
          { text: EXTRACTION_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RECEIPT_RESPONSE_SCHEMA,
    },
  };
}

export class ReceiptExtractionError extends Error {}

/**
 * Pulls the extracted-JSON text out of a raw Gemini `generateContent`
 * response and parses it. Throws ReceiptExtractionError (safe to show to a
 * user, doesn't leak response internals) if the response doesn't have the
 * expected shape — e.g. the request was blocked by a safety filter, or
 * Gemini returned something that isn't valid JSON despite the schema.
 */
export function parseGeminiResponse(rawResponse) {
  const candidate = rawResponse?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new ReceiptExtractionError(
      "The receipt couldn't be processed. Try a clearer photo."
    );
  }

  const text = candidate?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new ReceiptExtractionError(
      "The receipt couldn't be read. Try again with better lighting."
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ReceiptExtractionError(
      "The receipt couldn't be read. Try again with better lighting."
    );
  }
}

const MAX_ITEMS = 100;
const MAX_STRING_LENGTH = 200;
const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);

function sanitizeString(value, maxLength = MAX_STRING_LENGTH) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

// Numbers come back from Gemini as untyped JSON — coerce and clamp rather
// than trust: non-finite, negative, or absurd values become null instead
// of silently flowing into later math (Part G/K reconciliation) as
// garbage. Receipts are never negative, so negative numbers are treated as
// unreadable rather than, say, refunds.
function sanitizeAmount(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  // Round to the nearest cent/paisa — extraction noise past 2 decimals
  // (e.g. 12.9999999) isn't meaningful for a receipt amount.
  return Math.round(value * 100) / 100;
}

function sanitizeItem(rawItem) {
  const name = sanitizeString(rawItem?.name);
  if (!name) return null;
  return {
    name,
    quantity:
      typeof rawItem?.quantity === "number" &&
      Number.isFinite(rawItem.quantity) &&
      rawItem.quantity > 0
        ? rawItem.quantity
        : null,
    price: sanitizeAmount(rawItem?.price),
  };
}

/**
 * Validates and clamps a parsed Gemini extraction result into a safe,
 * predictable shape before it's ever shown in the UI or used in
 * calculations. Nothing here is assumed to be trustworthy just because it
 * came back JSON-schema-shaped — types are re-checked and out-of-range
 * values are dropped to null rather than trusted.
 */
export function sanitizeExtractedReceipt(parsed) {
  const items = Array.isArray(parsed?.items)
    ? parsed.items.map(sanitizeItem).filter(Boolean).slice(0, MAX_ITEMS)
    : [];

  const confidence = CONFIDENCE_VALUES.has(parsed?.confidence)
    ? parsed.confidence
    : "low";

  return {
    merchantName: sanitizeString(parsed?.merchantName),
    date: sanitizeString(parsed?.date, 50),
    currency: sanitizeString(parsed?.currency, 10),
    subtotal: sanitizeAmount(parsed?.subtotal),
    tax: sanitizeAmount(parsed?.tax),
    tip: sanitizeAmount(parsed?.tip),
    total: sanitizeAmount(parsed?.total),
    items,
    confidence,
    warning: sanitizeString(parsed?.warning, 300),
  };
}
