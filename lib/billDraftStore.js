"use client";

// Client-side draft state for the in-progress bill wizard (Split Bill →
// Add People → Review & Send): which split method was picked, who's in
// the split, and the confirmed bill (items/tax/tip/total). Backed by
// sessionStorage so an accidental refresh doesn't wipe out what the
// sender already entered — but nothing here ever touches Supabase; that
// still only happens at Review & Send's "Send requests" (see
// lib/paymentRequestsActions.js), and only for a signed-in sender.
// sessionStorage also means the draft never outlives the tab, so it
// doesn't linger around indefinitely for what's admittedly
// low-sensitivity data (names/phone numbers about to be shared on
// WhatsApp anyway) but still shouldn't hang around forever either.
//
// This draft is ALWAYS temporary, local-only data, whether or not anyone
// is signed in — that doesn't change. What auth gates is what happens to
// it at the very end: an authenticated "Send requests" turns it into a
// real, persistent, RLS-owned Supabase bill (trackable status, history,
// a real /pay/[token] per recipient); an anonymous demo (see
// app/review-send/ReviewSendClient.js) computes the exact same split and
// WhatsApp messages from this same draft but never sends any of it to
// Supabase — it's discarded the moment the tab closes, same as it always
// was before "Send requests" is even clicked.
//
// Uses useSyncExternalStore rather than the more obvious
// useEffect-then-setState pattern for reading sessionStorage — that
// pattern causes a real hydration mismatch (the server has no
// sessionStorage, so its render necessarily differs from the client's),
// which is exactly what tripped react-hooks/set-state-in-effect twice
// already in this project (Payment Status, /pay/[token], both Phase 7/8).
// useSyncExternalStore has a built-in server/client snapshot split that
// handles that transition correctly, and needs no Context/Provider —
// components just import the hook directly.
import { useSyncExternalStore } from "react";
import { mockContacts, mockReceiptItems, mockReceiptTotal } from "@/lib/mockBill";

const STORAGE_KEY = "squadpay:billDraft";

// billItems/billTax/billTip/billTotal are the CONFIRMED bill this draft is
// for — populated by Review Bill (either the real AI-scanned receipt, or
// the mock data for "Enter manually", see app/review-bill/page.js) and
// read by Split Bill/Review & Send instead of importing the mock data
// directly. Defaulting them to the mock bill means a session that somehow
// reaches Split Bill without visiting Review Bill first (shouldn't happen
// via normal navigation) still behaves exactly as before this changed.
const DEFAULT_DRAFT = {
  splitMethod: "equal",
  contacts: mockContacts,
  billItems: mockReceiptItems,
  billTax: 0,
  billTip: 0,
  billTotal: mockReceiptTotal,
};

const listeners = new Set();
let cachedRaw;
let cachedDraft = DEFAULT_DRAFT;

function readDraft() {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedDraft = raw
        ? { ...DEFAULT_DRAFT, ...JSON.parse(raw) }
        : DEFAULT_DRAFT;
    } catch {
      cachedDraft = DEFAULT_DRAFT;
    }
  }
  return cachedDraft;
}

function writeDraft(next) {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(next);
  window.sessionStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedDraft = next;
  for (const listener of listeners) listener();
}

function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getServerSnapshot() {
  return DEFAULT_DRAFT;
}

export function useBillDraft() {
  const draft = useSyncExternalStore(subscribe, readDraft, getServerSnapshot);

  function setSplitMethod(splitMethod) {
    writeDraft({ ...readDraft(), splitMethod });
  }

  // Accepts either a value or an updater function, matching useState's
  // setter convention — so call sites (e.g. Add People's add/remove
  // handlers) don't need to change.
  function setContacts(update) {
    const current = readDraft();
    const nextContacts =
      typeof update === "function" ? update(current.contacts) : update;
    writeDraft({ ...current, contacts: nextContacts });
  }

  // Called once by Review Bill once it knows the confirmed items/tax/
  // tip/total (whether from a real scan or the manual-entry mock) — see
  // that page for why every amount here is a whole rupee (Math.round),
  // matching the whole-rupee assumption baked into lib/splitBill.js's
  // remainder-rotation math.
  function setConfirmedBill({ items, tax, tip, total }) {
    writeDraft({
      ...readDraft(),
      billItems: items,
      billTax: tax,
      billTip: tip,
      billTotal: total,
    });
  }

  return {
    splitMethod: draft.splitMethod,
    setSplitMethod,
    contacts: draft.contacts,
    setContacts,
    billItems: draft.billItems,
    billTax: draft.billTax,
    billTip: draft.billTip,
    billTotal: draft.billTotal,
    setConfirmedBill,
  };
}

// Resets the draft back to its starting example — called once a bill is
// actually sent, so a stale people-list doesn't linger into the next one.
export function clearBillDraft() {
  writeDraft(DEFAULT_DRAFT);
}
