"use client";

// Client-side state for the AI receipt scanner (Phase 10 Part F), bridging
// Add Bill -> Reading Receipt -> Review Bill. These are three separate page
// navigations, so a captured File object can't just live in React state —
// it has to survive a route change. sessionStorage does that (same
// reasoning, and same useSyncExternalStore pattern, as lib/billDraftStore.js
// — see that file's comment for why useEffect+setState isn't used here).
//
// Holds at most one of `image` (a captured/selected photo waiting to be
// sent to Gemini) or `result` (what Gemini returned, once extraction
// succeeds) or `error` (a message to show if extraction failed) — never
// more than one at a time, so there's no risk of a screen reading stale
// data left over from a previous attempt.
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "squadpay:receiptScan";
const DEFAULT_STATE = { image: null, result: null, error: null };

const listeners = new Set();
let cachedRaw;
let cachedState = DEFAULT_STATE;

function readState() {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedState = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
    } catch {
      cachedState = DEFAULT_STATE;
    }
  }
  return cachedState;
}

function writeState(next) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.sessionStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedState = next;
  for (const listener of listeners) listener();
}

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getServerSnapshot() {
  return DEFAULT_STATE;
}

// A plain (non-hook) getter for use in effects/event handlers — Reading
// Receipt needs to read "is there a pending image?" once on mount, not
// re-render every time it changes.
export function getReceiptScanState() {
  return readState();
}

// A captured/selected photo, ready for Reading Receipt to send to Gemini.
// `dataUrl` is a `data:<mimeType>;base64,...` string (already resized/
// compressed client-side — see lib/receiptImage.js).
export function setPendingImage(dataUrl, mimeType) {
  writeState({ image: { dataUrl, mimeType }, result: null, error: null });
}

export function setScanResult(result) {
  writeState({ image: null, result, error: null });
}

export function setScanError(error) {
  writeState({ image: null, result: null, error });
}

// Called whenever a fresh bill is started (Add Bill mount) so a scan (or
// error) from a previous bill never leaks into a new one — including the
// "Enter manually" path, which must always start from a clean slate.
export function clearReceiptScan() {
  writeState(DEFAULT_STATE);
}

// Reactive read for Review Bill, which needs to re-render once the result
// arrives.
export function useReceiptScan() {
  return useSyncExternalStore(subscribe, readState, getServerSnapshot);
}
