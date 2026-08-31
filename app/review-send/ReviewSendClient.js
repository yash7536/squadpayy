"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockReceiptItems, mockReceiptTotal, mockBillLabel, mockBillMessageLabel } from "@/lib/mockBill";
import { splitEqually, splitByItem } from "@/lib/splitBill";
import { useBillFlow } from "@/lib/BillFlowContext";
import { createPaymentRequestsAction } from "@/lib/paymentRequestsActions";

// Matches the "Review & Send" screen of the Figma prototype (node 2:132).
//
// The people and split method come from BillFlowContext — whatever the
// sender actually chose on Split Bill and actually added/removed on Add
// People is exactly what's shown and sent here, not a fixed mock example.
export default function ReviewSend() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const { splitMethod, contacts } = useBillFlow();

  const participants = ["You", ...contacts.map((contact) => contact.name)];
  const splitResult =
    splitMethod === "equal"
      ? splitEqually(mockReceiptTotal, participants)
      : splitByItem(mockReceiptItems, participants, {});

  // Saves a real bill + people + splits + payment_requests to Supabase
  // (see lib/paymentRequestsActions.js), then moves on to the reminder
  // screen for whoever's owed first. No real SMS/WhatsApp/email/payment
  // integration — this only generates what would be sent.
  function handleSend() {
    setError(null);
    startTransition(async () => {
      try {
        const { requests } = await createPaymentRequestsAction({
          splitResult,
          totalAmount: mockReceiptTotal,
          billTitle: mockBillLabel,
          billMessageLabel: mockBillMessageLabel,
        });

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
        Rs.{mockReceiptTotal.toLocaleString("en-IN")}
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
        Payment requests will be sent by text.
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
