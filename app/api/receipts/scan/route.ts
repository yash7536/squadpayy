import { NextResponse } from "next/server";
import {
  extractReceipt,
  isGeminiConfigured,
  isGeminiAuthError,
  isTransientGeminiError,
  isUnsupportedNegativeValueError,
  ReceiptExtractionError,
} from "@/lib/gemini/extract";
import { mockExtractReceipt } from "@/lib/gemini/mock-fallback";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 15 * 1024 * 1024; // 15MB, matches the dropzone copy

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("receipt");

    // These three are all deterministic facts about the file itself — the
    // same file will fail the same way every time, so none of them are
    // retryable. (retryable defaults to true client-side when omitted,
    // which used to make "Try again" appear here even though retrying the
    // identical file can never succeed — found via a full audit of every
    // failure branch against that exact rule, not assumed.)
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attach a receipt photo as multipart form field 'receipt'.", retryable: false },
        { status: 400 },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "That doesn't look like an image. Try a JPEG, HEIC, or PNG.", retryable: false },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Receipt photo is larger than 15MB.", retryable: false },
        { status: 413 },
      );
    }

    if (!isGeminiConfigured()) {
      // Demo mode: no Gemini key configured. Return realistic mock data so
      // the flow stays fully usable end-to-end.
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ receipt: mockExtractReceipt(), demo: true });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const receipt = await extractReceipt(bytes.toString("base64"), file.type);
    return NextResponse.json({ receipt, demo: false });
  } catch (error) {
    // Log only the message — never the raw error object, which for a failed
    // API call can carry request/response payloads.
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[receipts/scan] extraction failed:", message);

    if (error instanceof ReceiptExtractionError) {
      // A readable-but-not-a-receipt photo, or unparseable model output —
      // the user's next move is just "try again", not a server outage.
      return NextResponse.json({ error: message, retryable: true }, { status: 422 });
    }
    if (isGeminiAuthError(error)) {
      // A rejected/misconfigured API key — the site owner's problem, not
      // something the person taking the photo can fix by retrying.
      console.error("[receipts/scan] Gemini rejected the API key — check GEMINI_API_KEY.");
      return NextResponse.json(
        { error: "Receipt scanning is misconfigured right now. Enter the bill manually for now.", retryable: false },
        { status: 500 },
      );
    }
    if (isTransientGeminiError(error)) {
      // Gemini itself reported overload/rate-limiting after our own
      // retries were exhausted — genuinely transient, not a bug.
      return NextResponse.json(
        { error: "Gemini is under heavy load right now. Try again in a moment.", retryable: true },
        { status: 503 },
      );
    }
    if (isUnsupportedNegativeValueError(error)) {
      // Gemini tried to represent a discount/coupon/adjustment as a
      // negative amount, which the extraction schema rejects (see
      // docs/ai-pm/decision-log.md). Retrying the same photo will very
      // likely fail the same way again — the honest next step is manual
      // entry, not "try again", so retryable is false and the message
      // says so directly instead of falling through to the generic
      // catch-all below.
      return NextResponse.json(
        {
          error:
            "This receipt includes a discount or adjustment SquadPay can't total automatically yet. Enter the bill manually below to keep your split accurate.",
          retryable: false,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        error: "Couldn't read that receipt right now. Try again or enter the total manually.",
        retryable: true,
      },
      { status: 500 },
    );
  }
}
