"use client";

// Client-side helpers for turning a captured/selected receipt photo into
// something small enough to store in sessionStorage and send to Gemini.
// Browser-only (Canvas/Image/FileReader) — never imported from server code.

// A raw phone photo can be 10-20MB. Reject absurdly large files outright
// (before even trying to decode them) rather than let the tab hang trying
// to resize something huge. This is a basic sanity guard for Part F to
// function reliably; Part J tightens/finishes file-size and type validation.
export const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024; // 20MB

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export class ReceiptImageError extends Error {}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new ReceiptImageError("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new ReceiptImageError("That doesn't look like a readable image."));
    img.src = src;
  });
}

/**
 * Validates, downscales, and JPEG-compresses a captured/selected receipt
 * photo. Returns a `data:image/jpeg;base64,...` string small enough to hold
 * in sessionStorage and send to the extraction API — resizing large phone
 * photos down to a max dimension keeps both well within reasonable limits
 * without visibly hurting legibility of receipt text.
 *
 * Throws ReceiptImageError with a user-facing message on any failure
 * (wrong type, unreadable/corrupt image, etc.) — callers should catch this
 * and show it inline rather than letting it surface as a crash.
 */
export async function prepareReceiptImage(file) {
  if (!file) throw new ReceiptImageError("No file selected.");
  if (!file.type?.startsWith("image/")) {
    throw new ReceiptImageError("Please choose a photo (JPEG, PNG, or WEBP).");
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new ReceiptImageError("That photo is too large. Try a smaller one.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ReceiptImageError("Couldn't process that image on this device.");
  ctx.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (!dataUrl || dataUrl === "data:,") {
    throw new ReceiptImageError("Couldn't process that image on this device.");
  }

  return { dataUrl, mimeType: "image/jpeg" };
}
