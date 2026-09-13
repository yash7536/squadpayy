import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityEvent,
  Bill,
  ItemAssignment,
  Participant,
  PaymentStatus,
  Split,
} from "@/lib/domain/types";
import { YOU_ID } from "@/lib/data/fixtures";
import { generateUuid } from "@/lib/utils/id";

/** Postgres's "unique_violation" error code. */
const DUPLICATE_KEY = "23505";

/**
 * Insert rows, treating "this exact row already exists" (a duplicate-key
 * conflict on a unique index) as success instead of an error.
 *
 * Why not `.upsert(..., { onConflict })` here like the `splits`/`split_items`
 * writes below: this table's uniqueness rule is a `coalesce(contact_id, ...)`
 * *expression* index (see supabase/schema.sql), not a plain-column one —
 * PostgREST's `onConflict` can only target plain-column unique
 * indexes/constraints, so it can't be used as an upsert conflict target here
 * without reshaping how the owner's NULL contact_id is represented, which is
 * a bigger schema change than this needs. The database constraint still
 * fully prevents a duplicate row either way; this just stops a retried
 * insert (the same rows sent twice) from surfacing that as a failure.
 */
async function insertIgnoringDuplicates(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).insert(rows);
  if (error && error.code !== DUPLICATE_KEY) throw error;
}

/**
 * Real Supabase-backed persistence for splits, payment status, and
 * activity — used by lib/data/store-context.tsx in place of the local demo
 * store whenever Supabase is configured and a user is signed in. Every
 * table is RLS-scoped to auth.uid() (see supabase/schema.sql), so these
 * functions never need the service-role key.
 *
 * Domain participant ids are either the constant YOU_ID (the signed-in
 * owner) or a contact's UUID. `contact_id IS NULL` + `is_self = true` in the
 * database is how "the owner" is represented in tables that reference a
 * participant, since the owner isn't a row in `contacts`.
 */

const SELF_MARKER = "00000000-0000-0000-0000-000000000000";

function participantIdFor(row: { contact_id: string | null; is_self: boolean }): string {
  return row.is_self ? YOU_ID : (row.contact_id ?? SELF_MARKER);
}

function dbIdentity(participantId: string): { contact_id: string | null; is_self: boolean } {
  return participantId === YOU_ID
    ? { contact_id: null, is_self: true }
    : { contact_id: participantId, is_self: false };
}

// --- contacts (a.k.a. friends, mapped to Participant) -----------------------

export async function fetchParticipants(
  supabase: SupabaseClient,
  selfName: string,
): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const self: Participant = { id: YOU_ID, name: selfName, isSelf: true };
  const contacts: Participant[] = (data ?? []).map((c) => ({ id: c.id, name: c.name }));
  return [self, ...contacts];
}

export async function addContact(
  supabase: SupabaseClient,
  ownerId: string,
  name: string,
): Promise<Participant> {
  const { data, error } = await supabase
    .from("contacts")
    .insert({ owner_id: ownerId, name })
    .select("id, name")
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name };
}

// --- splits -------------------------------------------------------------

interface SplitRow {
  id: string;
  title: string;
  merchant: string | null;
  merchant_location: string | null;
  bill_date: string;
  subtotal: number;
  tax_and_service: number;
  total: number;
  split_mode: "item" | "equal";
  payer_contact_id: string | null;
  created_at: string;
}

export async function fetchSplits(
  supabase: SupabaseClient,
  ownerId: string,
  participantsById: Map<string, Participant>,
): Promise<Split[]> {
  const { data: splitRows, error: splitsErr } = await supabase
    .from("splits")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (splitsErr) throw splitsErr;
  if (!splitRows || splitRows.length === 0) return [];

  const splitIds = splitRows.map((s: SplitRow) => s.id);

  const [{ data: items, error: itemsErr }, { data: participants, error: partsErr },
    { data: assignments, error: assignErr }, { data: statuses, error: statusErr }] =
    await Promise.all([
      supabase.from("split_items").select("*").in("split_id", splitIds).order("position"),
      supabase.from("split_participants").select("*").in("split_id", splitIds),
      supabase.from("item_assignments").select("*").in("split_id", splitIds),
      supabase.from("payment_status").select("*").in("split_id", splitIds),
    ]);
  if (itemsErr) throw itemsErr;
  if (partsErr) throw partsErr;
  if (assignErr) throw assignErr;
  if (statusErr) throw statusErr;

  return splitRows.map((row: SplitRow) => {
    const billItems = (items ?? [])
      .filter((i) => i.split_id === row.id)
      .map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        amount: Number(i.amount),
        category: i.category ?? undefined,
        icon: i.icon ?? undefined,
      }));

    const splitParticipants: Participant[] = (participants ?? [])
      .filter((p) => p.split_id === row.id)
      .map((p) => participantsById.get(participantIdFor(p)))
      .filter((p): p is Participant => Boolean(p));

    const assignmentsByItem = new Map<string, ItemAssignment>();
    for (const a of (assignments ?? []).filter((a) => a.split_id === row.id)) {
      const pid = participantIdFor(a);
      const existing = assignmentsByItem.get(a.item_id);
      if (existing) {
        existing.shares[pid] = Number(a.units);
      } else {
        assignmentsByItem.set(a.item_id, {
          itemId: a.item_id,
          shared: a.shared,
          shares: { [pid]: Number(a.units) },
        });
      }
    }

    const paymentStatus: Record<string, PaymentStatus> = {};
    for (const s of (statuses ?? []).filter((s) => s.split_id === row.id)) {
      paymentStatus[participantIdFor(s)] = s.status as PaymentStatus;
    }

    const bill: Bill = {
      id: row.id,
      title: row.title,
      merchant: row.merchant ?? undefined,
      merchantLocation: row.merchant_location ?? undefined,
      date: row.bill_date,
      subtotal: Number(row.subtotal),
      taxAndService: Number(row.tax_and_service),
      total: Number(row.total),
      splitMode: row.split_mode,
      items: billItems,
      createdAt: row.created_at,
    };

    const split: Split = {
      id: row.id,
      bill,
      participants: splitParticipants,
      assignments: Array.from(assignmentsByItem.values()),
      payerId: row.payer_contact_id ?? YOU_ID,
      paymentStatus,
      createdAt: row.created_at,
    };
    return split;
  });
}

interface CreateSplitInput {
  bill: Bill;
  participants: Participant[];
  assignments: ItemAssignment[];
  payerId: string;
  /**
   * Idempotency key. If this exact (owner, clientId) pair was already
   * pushed — a retried sync, a re-sent request after a dropped connection,
   * a second attempt after a partial failure — this upserts the same row
   * instead of creating a duplicate split. Generated if omitted, so a
   * normal in-session create (not part of the local-first sync flow) stays
   * a one-line change here and gets the same retry-safety for free.
   */
  clientId?: string;
}

export async function createSplitRemote(
  supabase: SupabaseClient,
  ownerId: string,
  input: CreateSplitInput,
): Promise<Split> {
  const payerIdentity = dbIdentity(input.payerId);
  const clientId = input.clientId ?? generateUuid();

  const { data: splitRow, error: splitErr } = await supabase
    .from("splits")
    .upsert(
      {
        owner_id: ownerId,
        client_id: clientId,
        title: input.bill.title,
        merchant: input.bill.merchant ?? null,
        merchant_location: input.bill.merchantLocation ?? null,
        bill_date: input.bill.date.slice(0, 10),
        subtotal: input.bill.subtotal,
        tax_and_service: input.bill.taxAndService,
        total: input.bill.total,
        split_mode: input.bill.splitMode,
        payer_contact_id: payerIdentity.contact_id,
      },
      { onConflict: "owner_id,client_id" },
    )
    .select("*")
    .single();
  if (splitErr) throw splitErr;
  const splitId = splitRow.id as string;

  if (input.bill.items.length > 0) {
    const { error } = await supabase.from("split_items").upsert(
      input.bill.items.map((item, position) => ({
        split_id: splitId,
        name: item.name,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category ?? null,
        icon: item.icon ?? null,
        position,
      })),
      { onConflict: "split_id,position" },
    );
    if (error) throw error;
  }

  // Re-fetch items so we have their generated DB ids for assignment rows.
  const { data: insertedItems, error: reItemsErr } = await supabase
    .from("split_items")
    .select("id, name, position")
    .eq("split_id", splitId)
    .order("position");
  if (reItemsErr) throw reItemsErr;
  const dbItemIdByPosition = new Map((insertedItems ?? []).map((i) => [i.position, i.id as string]));
  const draftItemIdToDbId = new Map(
    input.bill.items.map((item, position) => [item.id, dbItemIdByPosition.get(position)!]),
  );

  await insertIgnoringDuplicates(
    supabase,
    "split_participants",
    input.participants.map((p) => ({ split_id: splitId, ...dbIdentity(p.id) })),
  );

  const assignmentRows = input.assignments.flatMap((a) => {
    const dbItemId = draftItemIdToDbId.get(a.itemId);
    if (!dbItemId) return [];
    return Object.entries(a.shares).map(([participantId, units]) => ({
      split_id: splitId,
      item_id: dbItemId,
      shared: a.shared,
      units,
      ...dbIdentity(participantId),
    }));
  });
  await insertIgnoringDuplicates(supabase, "item_assignments", assignmentRows);

  await insertIgnoringDuplicates(
    supabase,
    "payment_status",
    input.participants.map((p) => ({
      split_id: splitId,
      status: p.id === input.payerId ? "paid" : "pending",
      ...dbIdentity(p.id),
    })),
  );

  // No uniqueness on activity_events, deliberately — a retried sync might
  // log an extra "created split" entry, which is cosmetic (an activity feed
  // duplicate line), not a data-integrity problem, so it isn't worth a
  // dedup mechanism of its own. See the design write-up's "what NOT to
  // build" section.
  await supabase.from("activity_events").insert({
    owner_id: ownerId,
    split_id: splitId,
    type: "created",
    actor_name: "You",
    detail: `created split for ${input.bill.title}`,
    amount: input.bill.total,
  });

  return {
    id: splitId,
    clientId,
    bill: { ...input.bill, id: splitId },
    participants: input.participants,
    assignments: input.assignments,
    payerId: input.payerId,
    paymentStatus: Object.fromEntries(
      input.participants.map((p) => [p.id, p.id === input.payerId ? "paid" : "pending"]),
    ),
    createdAt: splitRow.created_at,
  };
}

export async function setPaymentStatusRemote(
  supabase: SupabaseClient,
  splitId: string,
  participantId: string,
  status: PaymentStatus,
): Promise<void> {
  const identity = dbIdentity(participantId);
  let query = supabase
    .from("payment_status")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("split_id", splitId);

  // .eq() can't match NULL — the owner's row (contact_id IS NULL) needs .is() instead.
  query = identity.contact_id === null
    ? query.is("contact_id", null)
    : query.eq("contact_id", identity.contact_id);

  const { error } = await query;
  if (error) throw error;
}

export async function logActivity(
  supabase: SupabaseClient,
  ownerId: string,
  event: Omit<ActivityEvent, "id" | "timestamp">,
): Promise<void> {
  const { error } = await supabase.from("activity_events").insert({
    owner_id: ownerId,
    split_id: event.splitId,
    type: event.type,
    actor_name: event.actorName,
    detail: event.detail,
    amount: event.amount ?? null,
  });
  if (error) throw error;
}

export async function fetchActivity(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("activity_events")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((e) => ({
    id: e.id,
    splitId: e.split_id,
    type: e.type,
    actorName: e.actor_name,
    detail: e.detail,
    amount: e.amount != null ? Number(e.amount) : undefined,
    timestamp: e.created_at,
  }));
}
