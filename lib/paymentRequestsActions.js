"use server";

// Server Actions — the only way Client Components in this app touch the
// database. A Server Action is a real POST endpoint reachable by anyone
// who can send that request, not just through this app's UI, so treat
// its arguments as untrusted input and check identity from the session,
// never from anything the client claims about itself.
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  createBillWithRequests,
  markPaymentRequestPaid,
  markReminderSent,
} from "@/lib/paymentRequestsDb";

export async function createPaymentRequestsAction({
  splitResult,
  contacts,
  totalAmount,
  billTitle,
  billMessageLabel,
}) {
  if (!Array.isArray(splitResult) || splitResult.length === 0) {
    throw new Error("splitResult must be a non-empty array");
  }
  if (!Array.isArray(contacts)) {
    throw new Error("contacts must be an array");
  }
  if (typeof totalAmount !== "number" || !(totalAmount > 0)) {
    throw new Error("totalAmount must be a positive number");
  }
  if (typeof billTitle !== "string" || !billTitle.trim()) {
    throw new Error("billTitle is required");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Render-time gating (only showing "Send" to a signed-in user) isn't
    // a security boundary on its own — this action could be called
    // directly, so the check has to live here too.
    throw new Error("UNAUTHENTICATED");
  }

  return createBillWithRequests({
    supabase,
    ownerId: user.id,
    splitResult,
    contacts,
    totalAmount,
    billTitle,
    billMessageLabel,
  });
}

// Called by the RECIPIENT, who has no session — deliberately does not
// check auth here. markPaymentRequestPaid itself uses the service-role
// admin client, the one legitimate bypass of RLS in this app (see
// lib/paymentRequestsDb.js and supabase/schema.sql).
export async function markPaymentRequestPaidAction(token) {
  if (typeof token !== "string" || !token) {
    throw new Error("token is required");
  }
  return markPaymentRequestPaid(token);
}

// Called by the SENDER from "Remind me later" on Payment Reminder — same
// auth-check pattern as createPaymentRequestsAction above. Unlike
// markPaymentRequestPaidAction, this one does check auth: it's a
// sender-side write (scoped to the sender's own session via RLS, not the
// admin client), not something the recipient calls.
export async function markReminderSentAction(token) {
  if (typeof token !== "string" || !token) {
    throw new Error("token is required");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return markReminderSent({ supabase, token });
}
