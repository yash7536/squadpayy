"use client";

import { useEffect, useMemo } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { mockReceiptItems, mockReceiptTotal } from "@/lib/mockBill";
import { useReceiptScan } from "@/lib/receiptScanStore";
import { useBillDraft } from "@/lib/billDraftStore";

// Matches the "Review Script" screen of the Figma prototype (node 2:27).
//
// Phase 10 Part F: when a receipt was actually scanned (Add Bill -> Reading
// Receipt), this screen shows the real extracted items instead of the
// fixed mock data — reading them from lib/receiptScanStore.js, populated
// by Reading Receipt right before it navigates here. "Enter manually"
// still lands here with nothing in that store, so it shows the same mock
// data exactly as before Part F.
//
// Final MVP pass: this is also where the confirmed bill (items/tax/tip/
// total) gets written into the shared bill draft (lib/billDraftStore.js),
// so Split Bill and Review & Send compute real participant amounts from
// whatever was actually scanned or entered — not the hardcoded mock bill
// regardless of input, which was a real gap (the scan was cosmetic-only
// until now).
//
// Amounts are rounded to the nearest whole rupee here, once, before
// anything downstream sees them. lib/splitBill.js's remainder-rotation
// math (Part K) is built and tested for whole-rupee amounts only —
// feeding it a real receipt's paise (e.g. Rs.400.50) would silently lose
// or misplace half a rupee (Math.floor treats a 0.5 remainder as a whole
// extra rupee for one person and none for another). Rounding once here
// keeps that entire tested engine unchanged and correct, at the cost of
// paisa-level precision — an explicit MVP simplification, not a bug.
//
// Still a read-only display, not an editable form — turning it into one
// (correcting individual items/tax/tip/total by hand, reconciliation
// validation) is a separate, not-yet-scoped piece of work.
function formatAmount(amount) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-IN");
}

export default function ReviewBill() {
  const { result } = useReceiptScan();
  const { setConfirmedBill } = useBillDraft();

  // Whole-rupee items in the {name, amount} shape lib/splitBill.js expects
  // (scanned items use `price`, the mock/manual items already use
  // `amount` — normalized to one shape here rather than downstream).
  const items = useMemo(() => {
    if (!result) return mockReceiptItems;
    return result.items.map((item) => ({
      name: item.name,
      amount: Math.round(item.price ?? 0),
      quantity: item.quantity ?? null,
    }));
  }, [result]);

  const tax = result ? Math.round(result.tax ?? 0) : 0;
  const tip = result ? Math.round(result.tip ?? 0) : 0;

  // The mock bill's total already includes "Service Charge" as a literal
  // item with no separate tax/tip, so it's used as-is for manual entry.
  // For a real scan, the total is always computed as items + tax + tip —
  // deliberately not Gemini's own reported `total` field — so what's
  // shown here always matches exactly what Split Bill/Review & Send will
  // actually divide (Gemini's total can disagree slightly with its own
  // line items on a real receipt; picking one consistent number avoids a
  // "Review Bill says X, Split Bill says Y" mismatch).
  const total = result
    ? items.reduce((sum, item) => sum + item.amount, 0) + tax + tip
    : mockReceiptTotal;

  useEffect(() => {
    setConfirmedBill({ items, tax, tip, total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review your bill" backHref="/add-bill" />

      {result && (
        <p className="mt-[14px] text-xs font-semibold uppercase tracking-wide text-[#A6879E]">
          Scanned with AI — double-check before continuing
        </p>
      )}

      {result?.merchantName && (
        <p className="mt-[10px] text-sm text-black">{result.merchantName}</p>
      )}

      <p className={result ? "mt-[10px] text-sm text-black" : "mt-[14px] text-sm text-black"}>
        Receipt Total
      </p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{formatAmount(total)}
      </p>

      {result?.warning && (
        <p className="mt-[10px] text-sm text-red-600">{result.warning}</p>
      )}

      <h2 className="mt-[49px] text-2xl font-semibold text-black">
        Detected items
      </h2>

      <div className="mt-[5px] flex flex-col">
        {items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={`flex h-14 w-full items-center justify-center rounded-[10px] bg-[#E6DDDD] text-base text-black ${
              index === 0 ? "" : "mt-[22px]"
            }`}
          >
            {item.name}
            {item.quantity && item.quantity !== 1 ? ` ×${item.quantity}` : ""}
            {" - "}Rs.{formatAmount(item.amount)}
          </div>
        ))}
      </div>

      {result && (tax > 0 || tip > 0) && (
        <p className="mt-[16px] text-sm text-[#737373]">
          Plus Rs.{formatAmount(tax)} tax and Rs.{formatAmount(tip)} tip,
          split proportionally to what each person ordered.
        </p>
      )}

      <p className="mt-[22px] text-sm text-[#ABABAB]">
        Does something look wrong? Edit before continuing.
      </p>

      <Button
        href="/split-bill"
        variant="dark"
        className="mt-[22px] h-14 w-full"
      >
        Continue to split
      </Button>
    </div>
  );
}
