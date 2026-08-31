"use client";

import { useState, useTransition } from "react";
import Button from "@/components/Button";
import { mockBillLabel } from "@/lib/mockBill";
import { markPaymentRequestPaidAction } from "@/lib/paymentRequestsActions";

// The interactive half of the recipient page — the "Mark as Paid" write
// needs a Client Component, so the data-loading half stays a Server
// Component (see app/pay/[token]/page.js) and only this piece ships
// client JS.
export default function PayClient({ token, initialRequest }) {
  const [request, setRequest] = useState(initialRequest);
  const [isPending, startTransition] = useTransition();

  function handleMarkAsPaid() {
    startTransition(async () => {
      const updated = await markPaymentRequestPaidAction(token);
      if (updated) setRequest(updated);
    });
  }

  if (request.status === "paid") {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pt-16">
        <p className="text-2xl font-semibold text-black">Payment complete</p>
        <p className="mt-[14px] text-sm text-black">
          {request.person === "You"
            ? "You’re all settled."
            : `Thanks, ${request.person} — you’re all settled.`}
        </p>
        <p className="mt-[7px] text-2xl font-semibold text-black">
          Rs.{request.amount.toLocaleString("en-IN")}
        </p>
        <p className="mt-[4px] text-sm text-black">
          Everyone has paid their share.
        </p>
        <p className="mt-8 text-sm text-[#C0C0C0]">
          You can close this page now.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pt-16">
      <p className="text-2xl font-semibold text-black">{mockBillLabel}</p>
      <p className="mt-[14px] text-sm text-black">{request.person}, you owe</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{request.amount.toLocaleString("en-IN")}
      </p>

      {request.message && (
        <div className="mt-8 flex min-h-[76px] w-full items-center rounded-[10px] bg-[#D9D9D9] px-4 py-3 text-base text-black">
          &ldquo;{request.message}&rdquo;
        </div>
      )}

      <Button
        variant="dark"
        onClick={handleMarkAsPaid}
        disabled={isPending}
        className="mt-8 h-14 w-full"
      >
        {isPending ? "Marking as paid…" : "Mark as Paid"}
      </Button>

      <p className="mt-4 text-sm text-[#C0C0C0]">
        SquadPay — no account needed to pay.
      </p>
    </div>
  );
}
