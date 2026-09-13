import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { createHash } from "node:crypto";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".webp": "image/webp",
};

export interface LoadedImage {
  base64: string;
  mimeType: string;
  /** sha256 of the raw image bytes — used to invalidate the AI-output cache automatically if the photo is swapped out. */
  sha256: string;
}

export function loadImage(path: string): LoadedImage {
  const bytes = readFileSync(path);
  const ext = extname(path).toLowerCase();
  const mimeType = MIME_BY_EXTENSION[ext];
  if (!mimeType) {
    throw new Error(
      `Unrecognized image extension "${ext}" for ${path}. Supported: ${Object.keys(MIME_BY_EXTENSION).join(", ")}`,
    );
  }
  return {
    base64: bytes.toString("base64"),
    mimeType,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
