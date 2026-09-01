import { getCurrentUser } from "@/lib/supabaseServer";
import ReviewSendClient from "./ReviewSendClient";

export const dynamic = "force-dynamic";

// Final MVP auth-flow pass: this screen no longer requires a session to
// view. Magic-link email delivery is currently broken in production (see
// lib/paymentRequestsActions.js / the Magic Link diagnosis from the
// previous pass), which was blocking anyone from ever reaching the app's
// actual payoff — seeing their split and sending a WhatsApp reminder.
//
// "Send requests" is the only part of this screen that touches Supabase
// (persisting a real, trackable bill under the signed-in sender's
// account — the "account-specific/persistent" functionality auth is still
// required for). ReviewSendClient branches on `isAuthenticated`: signed-in
// senders get that exact existing behavior; anonymous visitors get a
// local-only demo — the split and WhatsApp links are generated entirely
// from the in-browser bill draft, nothing is ever written to Supabase, and
// nothing here exposes another user's data (there isn't a session to leak
// from). No other screen's auth gating changed — /payment-reminder,
// /payment-status, and /payment-complete (all real, persisted, per-user
// history) still redirect to /login exactly as before.
export default async function ReviewSendPage() {
  const user = await getCurrentUser();

  return <ReviewSendClient isAuthenticated={Boolean(user)} />;
}
