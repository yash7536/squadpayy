"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ItemAssignment,
  ReceiptLineItem,
  SplitMode,
} from "@/lib/domain/types";
import { generateId } from "@/lib/utils/id";
import { YOU_ID } from "@/lib/data/fixtures";

/**
 * In-progress "create a split" wizard state, shared across the three
 * /new-split/* steps. Lives in sessionStorage so a reload mid-flow doesn't
 * lose work, but doesn't leak into the permanent data store until the user
 * actually sends the split (see `commitSplit` in the summary step).
 */

// Exported so AppShell can clear an abandoned draft the moment navigation
// actually leaves the /new-split wizard without completing it — see
// components/app-shell/AppShell.tsx. Completion itself already clears this
// via `reset()` below (see new-split/summary/page.tsx); this covers every
// other way to leave (discard link, nav bar, browser back) generically.
export const STORAGE_KEY = "squadpay-draft-v1";

export interface SplitDraft {
  merchant: string;
  merchantLocation: string;
  billTitle: string;
  billDate: string; // ISO
  items: ReceiptLineItem[];
  taxAndService: number;
  manualTotal: number | null; // used only when items.length === 0
  /**
   * The total Gemini reported at scan time, kept verbatim — never
   * recalculated, never overwritten by edits to items/tax. This is the
   * fixed reference point `reconcileReceipt` compares the user's current
   * (possibly edited) items + tax/service against. `undefined` when
   * nothing has been scanned yet (pure manual entry, or manually-added
   * items with no scan behind them) — reconciliation is simply not
   * applicable in that case.
   */
  extractedTotal?: number;
  splitMode: SplitMode;
  participantIds: string[];
  payerId: string;
  assignments: ItemAssignment[];
  scanned: boolean;
}

function defaultDraft(): SplitDraft {
  return {
    merchant: "",
    merchantLocation: "",
    billTitle: "",
    billDate: new Date().toISOString(),
    items: [],
    taxAndService: 0,
    manualTotal: null,
    splitMode: "item",
    participantIds: [YOU_ID],
    payerId: YOU_ID,
    assignments: [],
    scanned: false,
  };
}

function loadDraft(): SplitDraft {
  if (typeof window === "undefined") return defaultDraft();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDraft();
    return { ...defaultDraft(), ...(JSON.parse(raw) as Partial<SplitDraft>) };
  } catch {
    return defaultDraft();
  }
}

interface DraftContextValue {
  draft: SplitDraft;
  update: (patch: Partial<SplitDraft>) => void;
  addItem: (item: Omit<ReceiptLineItem, "id">) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<ReceiptLineItem>) => void;
  toggleParticipant: (id: string) => void;
  setAssignment: (assignment: ItemAssignment) => void;
  subtotal: number;
  total: number;
  reset: () => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function SplitDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SplitDraft>(defaultDraft);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from sessionStorage after mount, so the server-
    // rendered (storage-less) markup matches the client on first paint and
    // React doesn't flag a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const update = useCallback((patch: Partial<SplitDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const addItem = useCallback((item: Omit<ReceiptLineItem, "id">) => {
    setDraft((prev) => ({
      ...prev,
      items: [...prev.items, { ...item, id: generateId("item") }],
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== id),
      assignments: prev.assignments.filter((a) => a.itemId !== id),
    }));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ReceiptLineItem>) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }));
  }, []);

  const toggleParticipant = useCallback((id: string) => {
    setDraft((prev) => {
      const has = prev.participantIds.includes(id);
      if (has && id === prev.payerId) return prev; // never drop the payer
      return {
        ...prev,
        participantIds: has
          ? prev.participantIds.filter((p) => p !== id)
          : [...prev.participantIds, id],
      };
    });
  }, []);

  const setAssignment = useCallback((assignment: ItemAssignment) => {
    setDraft((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments.filter((a) => a.itemId !== assignment.itemId),
        assignment,
      ],
    }));
  }, []);

  const reset = useCallback(() => {
    const fresh = defaultDraft();
    setDraft(fresh);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const subtotal = useMemo(
    () => draft.items.reduce((sum, i) => sum + i.amount, 0),
    [draft.items],
  );

  const total = useMemo(() => {
    if (draft.items.length === 0) return draft.manualTotal ?? 0;
    return subtotal + draft.taxAndService;
  }, [draft.items.length, draft.manualTotal, subtotal, draft.taxAndService]);

  const value = useMemo<DraftContextValue>(
    () => ({
      draft,
      update,
      addItem,
      removeItem,
      updateItem,
      toggleParticipant,
      setAssignment,
      subtotal,
      total,
      reset,
    }),
    [draft, update, addItem, removeItem, updateItem, toggleParticipant, setAssignment, subtotal, total, reset],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useSplitDraft(): DraftContextValue {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error("useSplitDraft must be used within <SplitDraftProvider>");
  return ctx;
}
