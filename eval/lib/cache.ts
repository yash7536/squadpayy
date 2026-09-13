import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CachedAiOutput } from "./types";

/**
 * Caches the AI output captured for a receipt, keyed by receipt ID, so
 * re-running the evaluation (e.g. after editing ground truth) doesn't
 * re-call Gemini unless the photo actually changed or --force is passed.
 * See eval/README.md "API/quota safety".
 */
const CACHE_DIR = join(import.meta.dirname, "..", "cache", "ai-output");

function cachePath(receiptId: string): string {
  return join(CACHE_DIR, `${receiptId}.json`);
}

export function readCachedOutput(receiptId: string): CachedAiOutput | null {
  const path = cachePath(receiptId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as CachedAiOutput;
  } catch {
    return null;
  }
}

export function writeCachedOutput(cached: CachedAiOutput): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath(cached.receiptId), JSON.stringify(cached, null, 2) + "\n", "utf-8");
}

/** True when a cached entry exists and matches the image currently on disk — safe to reuse without calling Gemini again. */
export function isCacheValid(cached: CachedAiOutput | null, currentImageSha256: string): boolean {
  return cached !== null && cached.imageSha256 === currentImageSha256;
}
