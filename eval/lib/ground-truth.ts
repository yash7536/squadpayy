import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { GroundTruth } from "./types";

/**
 * Loads and validates one receipt's ground-truth JSON. Uses zod (already a
 * project dependency, same pattern as lib/gemini/schema.ts) so a typo'd or
 * incomplete ground-truth file fails loudly and specifically, instead of
 * producing a confusing NaN somewhere deep in scoring.
 */
const GroundTruthItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative().optional(),
  // Not .nonnegative(): a real downloaded receipt (receipt-12, a Walmart
  // grocery receipt) prints a coupon/discount as its own line
  // ("COUPON 23100 ... -1.00"). This dataset's schema has no separate
  // discount field (by design — see eval/README.md), so an honest ground
  // truth needs to represent that line as a negative lineTotal rather than
  // dropping it or inventing a discount field. This only loosens ground-
  // truth validation; it does not touch scoring math (which already
  // handles negative numbers correctly) or production's own extraction
  // schema (lib/gemini/schema.ts), which still requires nonnegative
  // amounts — see receipt-12's ground-truth notes for why that's a
  // deliberate, interesting stress case rather than a bug to paper over.
  lineTotal: z.number(),
});

const GroundTruthSchema = z.object({
  receiptId: z.string().min(1),
  imageFile: z.string().min(1),
  merchant: z.string().optional(),
  items: z.array(GroundTruthItemSchema),
  tax: z.number().nonnegative(),
  receiptTotal: z.number().nonnegative(),
  status: z.enum(["unverified", "verified"]),
  verifiedBy: z.string().optional(),
  verifiedAt: z.string().optional(),
  notes: z.string().optional(),
});

const GROUND_TRUTH_DIR = join(import.meta.dirname, "..", "dataset", "ground-truth");
const RECEIPTS_DIR = join(import.meta.dirname, "..", "dataset", "receipts");

export class GroundTruthNotReadyError extends Error {}

export function groundTruthPath(receiptId: string): string {
  return join(GROUND_TRUTH_DIR, `${receiptId}.json`);
}

export function receiptImagePath(imageFile: string): string {
  return join(RECEIPTS_DIR, imageFile);
}

/**
 * Loads one receipt's ground truth. Throws GroundTruthNotReadyError (with a
 * clear, specific reason) rather than returning something that could be
 * mistaken for real data when:
 *  - the ground-truth file doesn't exist yet,
 *  - it's still the unfilled "unverified" template stub,
 *  - or its image file isn't present on disk.
 * This is the mechanism that guarantees the harness can never silently
 * evaluate against a template or a missing photo.
 */
export function loadGroundTruth(receiptId: string): GroundTruth {
  const path = groundTruthPath(receiptId);
  if (!existsSync(path)) {
    throw new GroundTruthNotReadyError(
      `No ground-truth file for "${receiptId}" at ${path}. Run the setup step in eval/README.md first.`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    throw new GroundTruthNotReadyError(
      `Ground-truth file for "${receiptId}" is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const parsed = GroundTruthSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GroundTruthNotReadyError(
      `Ground-truth file for "${receiptId}" doesn't match the expected shape: ${parsed.error.message}`,
    );
  }

  const groundTruth = parsed.data;
  if (groundTruth.status !== "verified") {
    throw new GroundTruthNotReadyError(
      `Ground truth for "${receiptId}" is still "unverified" — fill it in from the real receipt and set status to "verified" before evaluating. See eval/README.md.`,
    );
  }

  const imagePath = receiptImagePath(groundTruth.imageFile);
  if (!existsSync(imagePath)) {
    throw new GroundTruthNotReadyError(
      `Receipt photo "${groundTruth.imageFile}" for "${receiptId}" not found at ${imagePath}. Add the image, or fix imageFile in ${path}.`,
    );
  }

  return groundTruth;
}
