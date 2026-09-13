import type { ExtractedReceipt } from "./schema";

/**
 * Deterministic stand-in used only when GEMINI_API_KEY isn't configured, so
 * the Create Split flow stays demoable end-to-end without a key. A real key
 * always takes priority — see app/api/receipts/scan/route.ts.
 */
export function mockExtractReceipt(): ExtractedReceipt {
  return {
    merchant: "Copper Kettle Café",
    location: "Indiranagar, Bengaluru · All-day café",
    items: [
      { name: "Cold Brew Concentrate", quantity: 2, amount: 340 },
      { name: "Avocado Sourdough Toast", quantity: 2, amount: 560 },
      { name: "Shakshuka Skillet", quantity: 1, amount: 320 },
      { name: "Fresh Orange Juice", quantity: 3, amount: 450 },
      { name: "Blueberry Cheesecake Slice", quantity: 1, amount: 260 },
    ],
    subtotal: 1930,
    taxAndService: 193,
    total: 2123,
  };
}
