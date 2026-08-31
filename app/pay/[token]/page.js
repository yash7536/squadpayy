import { getPublicPaymentRequestByToken } from "@/lib/paymentRequestsDb";
import PayClient from "./PayClient";

// Reads from Supabase on every request — this must never show a stale
// cached page for someone else's token.
export const dynamic = "force-dynamic";

// The public, no-login page a recipient opens from their payment link
// (squadpay.app/pay/<token>) — the core product differentiator: they
// never install SquadPay or create an account.
//
// There's no Figma frame for this exact screen — the 10-screen prototype
// only covers the sender's side. This Server Component fetches the
// request straight from Supabase by token, then hands it to PayClient
// (the small Client Component that owns the "Mark as Paid" interaction).
// It reuses "Payment Complete"'s exact wording (node 1:3) for the paid
// state, per the brief.
export default async function PayByToken({ params }) {
  const { token } = await params;
  const request = await getPublicPaymentRequestByToken(token);

  // Graceful handling of an invalid/unknown/expired token — no crash, no
  // dead end, just a plain explanation.
  if (!request) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col items-center justify-center bg-white px-4 text-center">
        <p className="text-2xl font-semibold text-black">
          This link isn&rsquo;t valid
        </p>
        <p className="mt-3 text-sm text-black">
          It may have expired, already been used, or been typed
          incorrectly. Ask whoever sent it for a new link.
        </p>
      </div>
    );
  }

  return <PayClient token={token} initialRequest={request} />;
}
