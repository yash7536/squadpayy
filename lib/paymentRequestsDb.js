// Server-only reads/writes against the real `bills` / `people` / `splits`
// / `payment_requests` tables (see supabase/schema.sql).
//
// "You" (the sender) is never written as a `people`/`splits` row — the
// schema's splits/payment_requests are specifically about what OTHER
// people owe the sender, not a generic ledger including yourself. Your
// own share is computed as (bill total - everyone else's share) instead,
// purely for display, so the UI can keep showing it as a row like before.
//
// Two different kinds of access happen here, deliberately:
// - Sender-side functions take a `supabase` client that's bound to the
//   signed-in user's session (see lib/supabaseServer.js). Row Level
//   Security enforces "only your own data" at the database level — not
//   just by convention in this code.
// - The recipient's public /pay/[token] page has no session at all, so
//   its lookups use the service-role admin client (lib/supabaseAdmin.js),
//   which deliberately bypasses RLS — see supabase/schema.sql for why
//   that's the correct, safe place to do it (the token match is checked
//   in trusted server code, not exposed as an open RLS policy).
import { requireSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generatePaymentRequest } from "@/lib/paymentRequest";

// The `token` column is a Postgres `uuid`, not plain text. Querying it
// with a value that isn't UUID-shaped (a mistyped link, a bot probing
// random paths) makes Postgres throw a type error rather than just
// finding no rows — so we check the shape ourselves first and treat
// anything malformed the same as "not found", instead of letting a
// database error become an unhandled 500.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidToken(token) {
  return typeof token === "string" && UUID_PATTERN.test(token);
}

// --- Sender-side (authenticated, RLS-scoped) ---

// Creates a bill, then a person + split + payment_request row for every
// participant except "You", all owned by `ownerId` (the signed-in
// sender). `supabase` must be a client bound to that same user's session
// — RLS's "owner_id = auth.uid()" check requires it, and will reject the
// inserts otherwise. Returns the same flat shape the UI already expects.
export async function createBillWithRequests({
  supabase,
  ownerId,
  splitResult,
  contacts = [],
  totalAmount,
  billTitle,
  billMessageLabel,
}) {
  if (!Array.isArray(splitResult) || splitResult.length === 0) {
    throw new Error("splitResult must be a non-empty array");
  }
  if (!(totalAmount > 0)) {
    throw new Error("totalAmount must be a positive number");
  }
  if (!ownerId) {
    throw new Error("ownerId is required");
  }

  // Matches each split entry's person NAME back to that contact's phone
  // number, entered on Add People — splitResult itself only carries names
  // (see lib/splitBill.js), not full contact records. `contact_info` is
  // an existing, previously-unused column (see supabase/schema.sql) —
  // storing the phone number there needs no schema change.
  const phoneByName = new Map(contacts.map((contact) => [contact.name, contact.phone]));

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({ owner_id: ownerId, title: billTitle, total_amount: totalAmount })
    .select()
    .single();
  if (billError) throw billError;

  const others = splitResult.filter((entry) => entry.person !== "You");
  const created = [];

  for (const entry of others) {
    const { data: person, error: personError } = await supabase
      .from("people")
      .insert({
        owner_id: ownerId,
        name: entry.person,
        contact_info: phoneByName.get(entry.person) ?? null,
      })
      .select()
      .single();
    if (personError) throw personError;

    const { data: split, error: splitError } = await supabase
      .from("splits")
      .insert({
        bill_id: bill.id,
        person_id: person.id,
        amount_owed: entry.amount,
        status: "pending",
      })
      .select()
      .single();
    if (splitError) throw splitError;

    const { message } = generatePaymentRequest(
      entry.person,
      entry.amount,
      billMessageLabel
    );

    const { data: request, error: requestError } = await supabase
      .from("payment_requests")
      .insert({ split_id: split.id, message })
      .select()
      .single();
    if (requestError) throw requestError;

    created.push({
      person: entry.person,
      amount: Number(split.amount_owed),
      status: split.status,
      token: request.token,
      message: request.message,
      link: `/pay/${request.token}`,
    });
  }

  return { billId: bill.id, requests: created };
}

// The signed-in sender's most recently created bill, with every
// participant's status — powers Payment Status and Payment Complete.
// `supabase` must be bound to that user's session; RLS means this can
// only ever return a bill they actually own. Returns null if they haven't
// sent a bill yet.
export async function getLatestBillWithRequests({ supabase, ownerId }) {
  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, title, total_amount")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (billError) throw billError;
  if (!bill) return null;

  const { data: splits, error: splitsError } = await supabase
    .from("splits")
    .select(
      `
      amount_owed,
      status,
      person:people ( name ),
      payment_requests ( token )
    `
    )
    .eq("bill_id", bill.id);
  if (splitsError) throw splitsError;

  const others = splits.map((split) => ({
    person: split.person.name,
    amount: Number(split.amount_owed),
    status: split.status,
    token: split.payment_requests[0]?.token ?? null,
  }));

  const totalAmount = Number(bill.total_amount);
  const othersTotal = others.reduce((sum, item) => sum + item.amount, 0);

  const requests = [
    { person: "You", amount: totalAmount - othersTotal, status: "paid", token: null },
    ...others,
  ];

  return {
    billId: bill.id,
    billLabel: bill.title,
    totalAmount,
    requests,
  };
}

// Looks up one payment request by token, scoped to the signed-in sender —
// powers /payment-reminder/[token]. `supabase` must be bound to that
// user's session: RLS means a token belonging to someone else's bill
// simply won't be found, the same as an unknown token. Returns null for
// an unknown, malformed, or not-owned-by-this-user token.
//
// Includes the person's phone number (`contact_info`) — this is the only
// read path that needs it, to build that person's wa.me reminder link
// (see lib/phone.js). The recipient-facing lookups below don't need it:
// recipients aren't texting themselves.
export async function getOwnedPaymentRequestByToken({ supabase, token }) {
  if (!isValidToken(token)) return null;

  const { data, error } = await supabase
    .from("payment_requests")
    .select(
      `
      token,
      message,
      last_reminded_at,
      split:splits (
        amount_owed,
        status,
        person:people ( name, contact_info )
      )
    `
    )
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.split) return null;

  return {
    person: data.split.person.name,
    phone: data.split.person.contact_info,
    amount: Number(data.split.amount_owed),
    status: data.split.status,
    token: data.token,
    message: data.message,
    lastRemindedAt: data.last_reminded_at,
    link: `/pay/${data.token}`,
  };
}

// Records that the sender tapped "Remind me later" for this request — a
// truthful timestamp of the last acknowledgment, not a scheduled future
// reminder (there is no scheduler in this app; see
// lib/formatRelativeTime.js's file comment). `supabase` must be bound to
// the signed-in sender's session: the UPDATE is scoped by the same RLS
// policy as every other sender-side write on this table (see
// supabase/schema.sql) — a token belonging to someone else's bill matches
// zero rows, silently, rather than erroring or leaking whether it exists.
// Re-reads via getOwnedPaymentRequestByToken afterward so the returned
// shape is the same either way (also naturally returns null for an
// unowned/unknown/malformed token).
export async function markReminderSent({ supabase, token }) {
  if (!isValidToken(token)) return null;

  const { error } = await supabase
    .from("payment_requests")
    .update({ last_reminded_at: new Date().toISOString() })
    .eq("token", token);
  if (error) throw error;

  return getOwnedPaymentRequestByToken({ supabase, token });
}

// --- Recipient-side (public, no session — service role) ---

// Looks up one payment request by its public token, for the recipient's
// /pay/[token] page. Deliberately bypasses RLS via the admin client — see
// the file-level comment for why that's the correct, safe place to do it.
export async function getPublicPaymentRequestByToken(token) {
  if (!isValidToken(token)) return null;

  const supabase = requireSupabaseAdmin();

  const { data, error } = await supabase
    .from("payment_requests")
    .select(
      `
      token,
      message,
      split:splits (
        amount_owed,
        status,
        person:people ( name )
      )
    `
    )
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.split) return null;

  return {
    person: data.split.person.name,
    amount: Number(data.split.amount_owed),
    status: data.split.status,
    token: data.token,
    message: data.message,
    link: `/pay/${data.token}`,
  };
}

// Flips the split behind a payment request to "paid" — the recipient has
// no session, so this uses the admin client too, same as the lookup
// above. Returns the updated request, or null for an unknown token.
export async function markPaymentRequestPaid(token) {
  if (!isValidToken(token)) return null;

  const supabase = requireSupabaseAdmin();

  const { data: request, error: findError } = await supabase
    .from("payment_requests")
    .select("split_id")
    .eq("token", token)
    .maybeSingle();
  if (findError) throw findError;
  if (!request) return null;

  const { error: updateError } = await supabase
    .from("splits")
    .update({ status: "paid" })
    .eq("id", request.split_id);
  if (updateError) throw updateError;

  return getPublicPaymentRequestByToken(token);
}
