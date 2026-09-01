"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockBillLabel, mockBillMessageLabel } from "@/lib/mockBill";
import { splitEqually, splitBillWithTaxAndTip } from "@/lib/splitBill";
import { useBillDraft, clearBillDraft } from "@/lib/billDraftStore";
import { createPaymentRequestsAction } from "@/lib/paymentRequestsActions";

// Matches the "Review & Send" screen of the Figma prototype (node 2:132).
//
// The people, split method, and bill itself (items/tax/tip/total) all
// come from the sessionStorage-backed bill draft — whatever the sender
// actually scanned/entered on Review Bill, chose on Split Bill, and
// added/removed on Add People is exactly what's computed and sent here,
// not a fixed mock example.
export default function ReviewSend() {
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

  // Saves a real bill + people + splits + payment_requests to Supabase
  // (see lib/paymentRequestsActions.js), then moves on to the reminder
  // screen for whoever's owed first. Sending itself is a wa.me deep link
  // built from each person's phone number (see lib/phone.js), generated
  // on the Payment Reminder screen — no WhatsApp API integration.
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
        {splitResult.map((entry, index) => (
          <div
            key={entry.person}
            className={`flex h-14 w-full items-center justify-center rounded-[10px] bg-[#D9D9D9] text-base text-black ${
              index === 0 ? "" : "mt-[13px]"
            }`}
          >
            {entry.person} - Rs.{entry.amount}
          </div>
        ))}
      </div>

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
    </div>
  );
}
