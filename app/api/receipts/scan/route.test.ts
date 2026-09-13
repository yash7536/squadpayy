import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Route-level tests for the response-mapping in app/api/receipts/scan/route.ts.
 *
 * Deliberately mocks lib/gemini/extract's exported functions, NOT the
 * @google/generative-ai SDK — we're testing how this route turns each kind
 * of extraction outcome into an HTTP response, not Gemini's own retry
 * behavior (extract.ts's model/retry architecture is untouched and already
 * has its own manually-verified behavior; see extract.ts's own comments).
 */

const {
  extractReceipt,
  isGeminiConfigured,
  isGeminiAuthError,
  isTransientGeminiError,
  isUnsupportedNegativeValueError,
  ReceiptExtractionError,
} = vi.hoisted(() => {
  class ReceiptExtractionError extends Error {}
  return {
    extractReceipt: vi.fn(),
    isGeminiConfigured: vi.fn(() => true),
    isGeminiAuthError: vi.fn(() => false),
    isTransientGeminiError: vi.fn(() => false),
    isUnsupportedNegativeValueError: vi.fn(() => false),
    ReceiptExtractionError,
  };
});

vi.mock("@/lib/gemini/extract", () => ({
  extractReceipt,
  isGeminiConfigured,
  isGeminiAuthError,
  isTransientGeminiError,
  isUnsupportedNegativeValueError,
  ReceiptExtractionError,
}));

vi.mock("@/lib/gemini/mock-fallback", () => ({
  mockExtractReceipt: vi.fn(() => ({
    merchant: "Copper Kettle Café",
    items: [{ name: "Cold Brew", quantity: 1, amount: 340 }],
    taxAndService: 34,
    total: 374,
  })),
}));

import { POST } from "./route";

// Builds a minimal stand-in for the incoming Request rather than a real one.
// route.ts's POST handler only ever calls `request.formData()` — nothing
// else on Request is used — so this avoids round-tripping a File through
// real multipart body serialization/parsing, which jsdom's Fetch API
// implementation doesn't reliably support and isn't what these tests are
// meant to exercise (that's the Fetch spec's problem, not this route's).
function makeRequest(file: File | null): Request {
  const formData = new FormData();
  if (file) formData.append("receipt", file);
  return { formData: async () => formData } as unknown as Request;
}

function makeImageFile(name = "receipt.jpg", type = "image/jpeg"): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

beforeEach(() => {
  vi.clearAllMocks();
  isGeminiConfigured.mockReturnValue(true);
  isGeminiAuthError.mockReturnValue(false);
  isTransientGeminiError.mockReturnValue(false);
  isUnsupportedNegativeValueError.mockReturnValue(false);
});

describe("POST /api/receipts/scan — response mapping", () => {
  it("returns 422 for an unreadable receipt (ReceiptExtractionError)", async () => {
    extractReceipt.mockRejectedValueOnce(
      new ReceiptExtractionError(
        "That doesn't look like a receipt — try a different photo, or enter the bill manually.",
      ),
    );

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.retryable).toBe(true);
    expect(body.error).toMatch(/doesn.t look like a receipt/i);
  });

  it("returns a distinct, non-retryable 422 when Gemini tries to represent a discount as a negative value", async () => {
    // Real shape observed from the baseline evaluation (receipt-08,
    // receipt-12, receipt-14 all failed this exact way — see
    // eval/results/receipt-08.json): ExtractedReceiptSchema.parse() throws
    // a ZodError because Gemini emitted a negative amount/taxAndService
    // for a coupon/discount line.
    isUnsupportedNegativeValueError.mockReturnValue(true);
    extractReceipt.mockRejectedValueOnce(new Error("Too small: expected number to be >=0"));

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(422);
    expect(body.retryable).toBe(false);
    expect(body.error).toMatch(/discount|adjustment/i);
    expect(body.error).toMatch(/manually/i);
  });

  it("returns 503 when Gemini reports a transient failure after its own retries are exhausted", async () => {
    isTransientGeminiError.mockReturnValue(true);
    extractReceipt.mockRejectedValueOnce(new Error("[503] The model is overloaded"));

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.retryable).toBe(true);
    expect(body.error).toMatch(/heavy load/i);
  });

  it("returns 500 for an auth/configuration failure (bad API key)", async () => {
    isGeminiAuthError.mockReturnValue(true);
    extractReceipt.mockRejectedValueOnce(new Error("[401] API key not valid"));

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.retryable).toBe(false);
    expect(body.error).toMatch(/misconfigured/i);
  });

  it("returns 500 with a generic retryable message for an unrecognized failure", async () => {
    extractReceipt.mockRejectedValueOnce(new Error("Something exploded"));

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.retryable).toBe(true);
  });

  it("returns 200 with the extracted receipt on success", async () => {
    extractReceipt.mockResolvedValueOnce({
      merchant: "Test Cafe",
      items: [{ name: "Coffee", quantity: 1, amount: 200 }],
      taxAndService: 20,
      total: 220,
    });

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.demo).toBe(false);
    expect(body.receipt.total).toBe(220);
  });

  it("falls back to mock data (not Gemini) when no API key is configured", async () => {
    isGeminiConfigured.mockReturnValue(false);

    const res = await POST(makeRequest(makeImageFile()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.demo).toBe(true);
    expect(extractReceipt).not.toHaveBeenCalled();
  });

  it("returns 400, non-retryable, when no file is attached", async () => {
    const res = await POST(makeRequest(null));
    const body = await res.json();
    expect(res.status).toBe(400);
    // Retrying without ever attaching a new file can never succeed —
    // retryable must be explicitly false, not merely absent (absent
    // defaults to retryable client-side, which would wrongly show "Try
    // again").
    expect(body.retryable).toBe(false);
  });

  it("returns 400, non-retryable, for a non-image file", async () => {
    const textFile = new File(["not an image"], "notes.txt", { type: "text/plain" });
    const res = await POST(makeRequest(textFile));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.retryable).toBe(false);
  });

  it("returns 413, non-retryable, for an oversized file", async () => {
    const bigFile = new File([new Uint8Array(16 * 1024 * 1024)], "big.jpg", { type: "image/jpeg" });
    const res = await POST(makeRequest(bigFile));
    const body = await res.json();
    expect(res.status).toBe(413);
    expect(body.retryable).toBe(false);
  });
});
