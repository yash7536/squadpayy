"use client";

import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockReceiptTotal } from "@/lib/mockBill";
import { useBillFlow } from "@/lib/BillFlowContext";

// Matches the "Split Bill" screen of the Figma prototype (node 2:70).
//
// The two option rows render identically in the Figma file — it doesn't
// show a distinct "selected" state. Since this needs to actually work as a
// toggle, we add a minimal border to show what's picked, without changing
// the designed colors, text, or layout otherwise.
//
// The chosen method is held in BillFlowContext (not local state) so it
// carries through Add People to Review & Send, which actually computes
// the split with it.
export default function SplitBill() {
  const { splitMethod: method, setSplitMethod: setMethod } = useBillFlow();

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Split the bill" backHref="/review-bill" />

      <p className="mt-[14px] text-sm text-black">Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{mockReceiptTotal.toLocaleString("en-IN")}
      </p>

      <p className="mt-[40px] text-sm text-black">
        How would you like to split it?
      </p>

      <button
        type="button"
        onClick={() => setMethod("equal")}
        aria-pressed={method === "equal"}
        className={`mt-[25px] flex h-14 w-full items-center justify-center rounded-[10px] border-2 bg-[#D9D9D9] text-base text-black ${
          method === "equal" ? "border-[#737373]" : "border-transparent"
        }`}
      >
        Split equally
      </button>

      <button
        type="button"
        onClick={() => setMethod("item")}
        aria-pressed={method === "item"}
        className={`mt-[22px] flex h-14 w-full items-center justify-center rounded-[10px] border-2 bg-[#D9D9D9] text-base text-black ${
          method === "item" ? "border-[#737373]" : "border-transparent"
        }`}
      >
        Split by item
      </button>

      <Button
        href="/add-people"
        variant="dark"
        className="mt-[23px] h-14 w-full"
      >
        Continue
      </Button>
    </div>
  );
}
