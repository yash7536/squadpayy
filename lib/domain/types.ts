/**
 * Core SquadPay domain types.
 *
 * These model a bill split independently of any storage layer so the same
 * types work whether data comes from Supabase or the local demo store.
 */

export type SplitMode = "item" | "equal";

export type PaymentStatus = "pending" | "reminder_sent" | "paid";

export interface Participant {
  id: string;
  name: string;
  /** Two-letter monogram shown in avatar circles. Derived if omitted. */
  initials?: string;
  /** True for the person who is logged in / created the split. */
  isSelf?: boolean;
  /** True for the person who paid the bill up front. */
  isPayer?: boolean;
}

export interface ReceiptLineItem {
  id: string;
  name: string;
  quantity: number;
  /** Total price for this line (all units), in rupees. */
  amount: number;
  category?: string;
  icon?: string;
}

/** How one line item's cost is divided across participants. */
export interface ItemAssignment {
  itemId: string;
  /** participantId -> number of units (or weight) claimed. Sum need not equal quantity for equal-share items using `shared: true`. */
  shares: Record<string, number>;
  /** When true, the item is split evenly among every participant in `shares`. */
  shared: boolean;
}

export interface Bill {
  id: string;
  title: string;
  merchant?: string;
  merchantLocation?: string;
  date: string; // ISO date
  subtotal: number;
  taxAndService: number;
  total: number;
  splitMode: SplitMode;
  items: ReceiptLineItem[];
  createdAt: string;
}

export interface Split {
  id: string;
  bill: Bill;
  participants: Participant[];
  assignments: ItemAssignment[];
  payerId: string;
  /** participantId -> payment status */
  paymentStatus: Record<string, PaymentStatus>;
  createdAt: string;
  /**
   * Stable UUID assigned once, at creation, regardless of backend — the
   * idempotency key used to sync a locally-created split to Supabase
   * without ever producing a duplicate row (see supabase/schema.sql's
   * `splits_owner_client_unique` index). Always set for splits created by
   * this app; only absent for pre-existing rows from before this field
   * existed.
   */
  clientId?: string;
  /**
   * Local-only bookkeeping: ISO timestamp of when this split was last
   * confirmed pushed to Supabase. Undefined means "not yet synced" (or not
   * applicable — a split fetched directly from Supabase doesn't need one).
   * Never read by anything except the local demo store's own sync pass.
   */
  syncedAt?: string;
}

export interface ParticipantShare {
  participantId: string;
  /** Pre-tax subtotal attributable to this person. */
  subtotal: number;
  /** Their proportional cut of tax + service charge. */
  taxAndService: number;
  /** subtotal + taxAndService, rounded to the nearest rupee. */
  total: number;
}

export interface ActivityEvent {
  id: string;
  splitId: string;
  type: "viewed" | "paid" | "created" | "settled" | "nudged";
  actorName: string;
  detail: string;
  amount?: number;
  timestamp: string;
}

export type NudgeTone = "casual" | "direct" | "banter";
