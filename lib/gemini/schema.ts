import { z } from "zod";

export const ExtractedItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive().default(1),
  amount: z.number().nonnegative(),
});

// Deliberately no "confidence" field: Gemini's generateContent response
// doesn't expose a real per-extraction confidence signal for this prompt
// shape, and asking the model to invent a percentage would just be a
// hallucinated number dressed up as data. If a genuine signal (e.g.
// requested response logprobs) is wired in later, add it back honestly.
// The extraction prompt explicitly tells Gemini these two fields may be
// `null` when it can't determine them — so the schema has to accept `null`
// (not just "absent"), or a perfectly valid, honest Gemini response (e.g.
// for a photo with no readable subtotal line) fails to parse and gets
// treated as a crash instead of the normal "couldn't fully read this" case.
export const ExtractedReceiptSchema = z.object({
  merchant: z.string().default("Unknown merchant"),
  location: z.string().nullable().optional().transform((v) => v ?? undefined),
  items: z.array(ExtractedItemSchema).default([]),
  subtotal: z.number().nonnegative().nullable().optional().transform((v) => v ?? undefined),
  taxAndService: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
});

export type ExtractedReceipt = z.infer<typeof ExtractedReceiptSchema>;
