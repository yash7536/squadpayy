// Generates the "payment request" info for one person's share of a bill.
//
// The shape here — token + message — deliberately matches the
// `payment_requests` table in supabase/schema.sql, so swapping this mock
// generator for a real Supabase insert later is a drop-in change, not a
// rewrite. Nothing is actually sent anywhere yet (no SMS/WhatsApp/email) —
// this only produces what *would* be sent, for review.
export function generatePaymentRequest(person, amount, billLabel) {
  const token =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `mock-${Math.random().toString(36).slice(2)}`;

  // You don't send yourself a reminder — everyone else gets one.
  const message =
    person === "You"
      ? null
      : `Hey ${person}, just a friendly reminder about the Rs.${amount} from ${billLabel}. You can pay whenever you're free.`;

  return {
    person,
    amount,
    token,
    message,
    // Matches the public, no-login recipient link from the architecture
    // plan (squadpay.app/pay/<token>).
    link: `/pay/${token}`,
  };
}

export function generatePaymentRequests(splitResult, billLabel) {
  return splitResult.map(({ person, amount }) =>
    generatePaymentRequest(person, amount, billLabel)
  );
}
