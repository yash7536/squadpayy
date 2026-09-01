"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockBillLabel, mockBillMessageLabel } from "@/lib/mockBill";
import { splitEqually, splitBillWithTaxAndTip } from "@/lib/splitBill";
import { generatePaymentRequest } from "@/lib/paymentRequest";
import { buildWhatsAppLink } from "@/lib/phone";
import { useBillDraft, clearBillDraft } from "@/lib/billDraftStore";
import { createPaymentRequestsAction } from "@/lib/paymentRequestsActions";

// Matches the "Review & Send" screen of the Figma prototype (node 2:132).
//
// The people, split method, and bill itself (items/tax/tip/total) all
// come from the sessionStorage-backed bill draft — whatever the sender
// actually scanned/entered on Review Bill, chose on Split Bill, and
// added/removed on Add People is exactly what's computed and shown here,
// not a fixed mock example. This computation is always local (pure
// functions over the draft) and happens the same way whether or not
// anyone is signed in — it's TEMPORARY, in-browser-only data either way.
//
// What differs by `isAuthenticated` (passed down from the Server
// Component in page.js) is only the final step:
// - Signed in: "Send requests" persists a real bill to Supabase, scoped
//   to that account by Row Level Security — this is the
//   ACCOUNT-SPECIFIC/PERSISTENT path (trackable status, history, a real
//   /pay/[token] link for each recipient).
// - Anonymous: nothing is ever sent to Supabase. Each person's WhatsApp
//   reminder is generated and opened directly from the local draft — a
//   one-off demo of the exact same split/messaging logic, gone the moment
//   the tab closes, with no account or history behind it.
export default function ReviewSend({ isAuthenticated }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const { splitMethod, contacts, billItems, billTax, billTip, billTotal } = useBillDraft();

  const participants = ["You", ...contacts.map((contact) => contact.name)];
  // "Split equally" divides the full confirmed total (already includes
  // tax/tip, if any). "Split by item" reuses Part K's
  // splitBillWithTaxAndTip so tax/tip are still divided proportionally to
  // what each person ordered, rather than being dropped — both methods
  // are guaranteed (by lib/splitBill.test.mjs) to sum to exactly the bill
  // total, no floating-point/rounding discrepancies.
  const splitResult =
    splitMethod === "equal"
      ? splitEqually(billTotal, participants)
      : splitBillWithTaxAndTip({
          items: billItems,
          tax: billTax,
          tip: billTip,
          people: participants,
        });

  const phoneByName = new Map(contacts.map((contact) => [contact.name, contact.phone]));

  // Saves a real bill + people + splits + payment_requests to Supabase
  // (see lib/paymentRequestsActions.js), then moves on to the reminder
  // screen for whoever's owed first. Only reachable when isAuthenticated —
  // the button that calls this doesn't render otherwise.
  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const { requests } = await createPaymentRequestsAction({
          splitResult,
          contacts,
          totalAmount: billTotal,
          billTitle: mockBillLabel,
          billMessageLabel: mockBillMessageLabel,
        });

        // The bill is safely in Supabase now — clear the local draft so
        // it doesn't linger and get reused for the next unrelated bill.
        clearBillDraft();

        const firstPending = requests.find((request) => request.status === "pending");
        router.push(
          firstPending ? `/payment-reminder/${firstPending.token}` : "/payment-status"
        );
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHENTICATED") {
          router.push("/login?next=/review-send");
          return;
        }
        setError("Something went wrong saving your bill. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review & send" backHref="/add-people" />

      <p className="mt-[14px] text-sm text-black">Your split</p>
      <p className="mt-[7px] text-sm text-black">Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{billTotal.toLocaleString("en-IN")}
      </p>

      <div className="mt-[27px] flex flex-col">
        {splitResult.map((entry, index) => {
          // Only relevant for the anonymous demo path (see below) — computed
          // for everyone unconditionally since it's cheap and keeps this
          // map straightforward to read.
          const isSelf = entry.person === "You";
          const { message } = isSelf
            ? { message: null }
            : generatePaymentRequest(entry.person, entry.amount, mockBillMessageLabel);
          const whatsappUrl = isSelf
            ? null
            : buildWhatsAppLink(phoneByName.get(entry.person), message);

          return (
            <div
              key={entry.person}
              className={`flex h-14 w-full items-center justify-between gap-2 rounded-[10px] bg-[#D9D9D9] px-4 text-base text-black ${
                index === 0 ? "" : "mt-[13px]"
              }`}
            >
              <span>
                {entry.person} - Rs.{entry.amount}
              </span>

              {/* Anonymous demo only — a signed-in sender gets one bulk
                  "Send requests" action below instead (real, persisted,
                  per-recipient reminder screens with tracked status). */}
              {!isAuthenticated && !isSelf && (
                whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm font-semibold text-[#737373] underline"
                  >
                    WhatsApp
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-red-600">No phone</span>
                )
              )}
            </div>
          );
        })}
      </div>

      {isAuthenticated ? (
        <>
          <p className="mt-[38px] text-sm text-[#C0C0C0]">
            Payment reminders are sent via WhatsApp.
          </p>

          <Button
            variant="dark"
            onClick={handleSend}
            disabled={isPending}
            className="mt-[22px] h-14 w-full"
          >
            {isPending ? "Sending…" : "Send requests"}
          </Button>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </>
      ) : (
        <>
          <p className="mt-[38px] text-sm text-[#C0C0C0]">
            This is a demo split — tap WhatsApp above to try sending a
            reminder. Nothing is saved, and no one is contacted unless you
            actually send the message yourself.
          </p>

          <Button
            href="/login?next=/review-send"
            variant="dark"
            className="mt-[22px] h-14 w-full"
          >
            Sign in to save this bill
          </Button>
        </>
      )}
    </div>
  );
}
