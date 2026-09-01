// Server-side receipt extraction (Phase 10 Part F). Takes a receipt photo
// from the client and sends it to Gemini 2.5 Flash to extract structured
// data. GEMINI_API_KEY is read from the server environment only — it is
// never sent to the client, never logged, and this route is the only place
// in the app that touches it.
//
// Deliberately calls Gemini's REST API directly via fetch rather than
// adding the @google/generative-ai SDK as a dependency — this is one POST
// request with a fixed shape, which plain fetch handles without needing an
// extra package.
import {
  buildGeminiRequestBody,
  parseGeminiResponse,
  sanitizeExtractedReceipt,
  ReceiptExtractionError,
  GEMINI_MODEL,
} from "@/lib/receiptExtraction";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// The client resizes images down to ~1600px/JPEG before sending — this
// limit is a defensive server-side backstop against a modified/direct
// request, not the normal path. Generous enough for a resized receipt
// photo, well short of anything that would strain the request.
const MAX_BASE64_BYTES = 8 * 1024 * 1024; // ~8MB decoded

const GEMINI_TIMEOUT_MS = 25_000;

function jsonError(message, status) {
  return Response.json({ ok: false, error: message }, { status });
}

// Splits a `data:<mime>;base64,<data>` URL into its parts. Returns null if
// the string isn't actually in that shape, rather than throwing.
function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
}

// Rough byte length of a base64 string, without decoding it — enough to
// reject an oversized payload cheaply before doing any real work.
function estimateBase64ByteLength(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("scan-receipt: GEMINI_API_KEY is not configured");
    return jsonError("Receipt scanning isn't available right now.", 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("Malformed request.", 400);
  }

  const parsedImage = parseDataUrl(body?.imageDataUrl);
  if (!parsedImage) {
    return jsonError("No valid image was provided.", 400);
  }
  const { mimeType, base64Data } = parsedImage;

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return jsonError("Unsupported image type.", 400);
  }
  if (estimateBase64ByteLength(base64Data) > MAX_BASE64_BYTES) {
    return jsonError("That image is too large.", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let geminiResponse;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header-based auth rather than a `?key=` query string, so the
          // key never ends up in a URL (logs, proxies, browser history —
          // moot here since this call never leaves the server, but it's
          // the safer default regardless).
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(buildGeminiRequestBody(base64Data, mimeType)),
        signal: controller.signal,
      }
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      return jsonError("Receipt scanning timed out. Try again.", 504);
    }
    console.error("scan-receipt: network error calling Gemini", error);
    return jsonError("Couldn't reach the receipt scanner. Try again.", 502);
  } finally {
    clearTimeout(timeout);
  }

  if (!geminiResponse.ok) {
    const errorBody = await geminiResponse.text().catch(() => "");
    console.error(
      `scan-receipt: Gemini returned ${geminiResponse.status}`,
      errorBody.slice(0, 500)
    );
    if (geminiResponse.status === 429) {
      return jsonError("Receipt scanning is busy right now. Try again shortly.", 429);
    }
    return jsonError("Couldn't read that receipt. Try again.", 502);
  }

  let rawResult;
  try {
    rawResult = await geminiResponse.json();
  } catch {
    console.error("scan-receipt: Gemini response was not valid JSON");
    return jsonError("Couldn't read that receipt. Try again.", 502);
  }

  let extracted;
  try {
    extracted = parseGeminiResponse(rawResult);
  } catch (error) {
    if (error instanceof ReceiptExtractionError) {
      return jsonError(error.message, 422);
    }
    throw error;
  }

  const sanitized = sanitizeExtractedReceipt(extracted);
  return Response.json({ ok: true, data: sanitized });
}
