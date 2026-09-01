"use client";

import { useEffect, useMemo, useState } from "react";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { useReceiptScan } from "@/lib/receiptScanStore";
import { useBillDraft } from "@/lib/billDraftStore";

// Matches the "Review Script" screen of the Figma prototype (node 2:27).
//
// Two genuinely different modes live on this one screen, both ending up
// in the same shared bill draft (lib/billDraftStore.js) that Split Bill
// and Review & Send read from:
//
// - Scanned (Add Bill -> Reading Receipt -> here, with a real AI result
//   in lib/receiptScanStore.js): read-only, exactly as Phase 10 Part F
//   built it — the confirmed items/tax/tip/total are written to the draft
//   once, automatically, when the scan result arrives.
// - Manual ("Enter manually" on Add Bill, no scan result): an actual
//   add/edit/remove item form, starting EMPTY. This used to always show
//   the same fixed mock example ("Dinner", "Drinks", "Service Charge")
//   regardless of what the sender wanted to bill for — every edit here
//   writes straight to the draft via setBillItems, so there's no separate
//   "confirm" step to wire up.
//
// Amounts are always whole rupees. lib/splitBill.js's remainder-rotation
// math (Part K) is built and tested for whole-rupee amounts only — a
// fractional item (e.g. Rs.400.50) would silently lose or misplace half a
// rupee (Math.floor treats a 0.5 remainder as a whole extra rupee for one
// person and none for another). Rounding scanned amounts once here (and
// only accepting whole-rupee input for manual entries) keeps that entire
// tested engine unchanged and correct — an explicit MVP simplification,
// not a bug.
function formatAmount(amount) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return amount.toLocaleString("en-IN");
}

function validateItemInput(name, amountText) {
  if (!name.trim()) return "Enter an item name.";
  const amount = Number(amountText);
  if (!amountText.trim() || !Number.isFinite(amount) || amount <= 0) {
    return "Enter a valid amount.";
  }
  return null;
}

export default function ReviewBill() {
  const { result } = useReceiptScan();

  if (result) {
    return <ScannedReview result={result} />;
  }
  return <ManualReview />;
}

// --- Scanned path (Phase 10 Part F) — unchanged behavior, just split out
// into its own component now that manual entry needs very different UI. ---
function ScannedReview({ result }) {
  const { setConfirmedBill } = useBillDraft();

  const items = useMemo(
    () =>
      result.items.map((item) => ({
        name: item.name,
        amount: Math.round(item.price ?? 0),
        quantity: item.quantity ?? null,
      })),
    [result]
  );

  const tax = Math.round(result.tax ?? 0);
  const tip = Math.round(result.tip ?? 0);
  // Deliberately not Gemini's own reported `total` field — computed here
  // so what's shown always matches exactly what Split Bill/Review & Send
  // will actually divide (Gemini's total can disagree slightly with its
  // own line items on a real receipt; picking one consistent number
  // avoids a "Review Bill says X, Split Bill says Y" mismatch).
  const total = items.reduce((sum, item) => sum + item.amount, 0) + tax + tip;

  useEffect(() => {
    setConfirmedBill({ items, tax, tip, total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review your bill" backHref="/add-bill" />

      <p className="mt-[14px] text-xs font-semibold uppercase tracking-wide text-[#A6879E]">
        Scanned with AI — double-check before continuing
      </p>

      {result.merchantName && (
        <p className="mt-[10px] text-sm text-black">{result.merchantName}</p>
      )}

      <p className="mt-[10px] text-sm text-black">Receipt Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{formatAmount(total)}
      </p>

      {result.warning && (
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

      {(tax > 0 || tip > 0) && (
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

// --- Manual path — new: starts empty, sender builds the item list
// themselves. Mirrors Add People's add/edit/remove inline-form pattern
// for a consistent feel. Every change writes straight to the shared bill
// draft (lib/billDraftStore.js) via setBillItems — there's no separate
// local draft to keep in sync, and no "confirm" step needed. ---
function ManualReview() {
  const { billItems, billTotal, setBillItems } = useBillDraft();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [addError, setAddError] = useState(null);

  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editError, setEditError] = useState(null);

  function startAdding() {
    setEditingIndex(null);
    setIsAdding(true);
    setAddError(null);
  }

  function handleAddItem(event) {
    event.preventDefault();
    const error = validateItemInput(newName, newAmount);
    if (error) {
      setAddError(error);
      return;
    }
    setBillItems([...billItems, { name: newName.trim(), amount: Math.round(Number(newAmount)) }]);
    setNewName("");
    setNewAmount("");
    setAddError(null);
    setIsAdding(false);
  }

  function handleCancelAdd() {
    setIsAdding(false);
    setNewName("");
    setNewAmount("");
    setAddError(null);
  }

  function handleRemoveItem(index) {
    setBillItems(billItems.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function startEditing(index, item) {
    setIsAdding(false);
    setEditingIndex(index);
    setEditName(item.name);
    setEditAmount(String(item.amount));
    setEditError(null);
  }

  function handleSaveEdit(event) {
    event.preventDefault();
    const error = validateItemInput(editName, editAmount);
    if (error) {
      setEditError(error);
      return;
    }
    const editedIndex = editingIndex;
    setBillItems(
      billItems.map((item, i) =>
        i === editedIndex
          ? { name: editName.trim(), amount: Math.round(Number(editAmount)) }
          : item
      )
    );
    setEditingIndex(null);
    setEditError(null);
  }

  function handleCancelEdit() {
    setEditingIndex(null);
    setEditError(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4 pb-14">
      <ScreenHeader title="Review your bill" backHref="/add-bill" />

      <p className="mt-[14px] text-sm text-black">Receipt Total</p>
      <p className="mt-[5px] text-2xl font-semibold text-black">
        Rs.{formatAmount(billTotal)}
      </p>

      <h2 className="mt-[49px] text-2xl font-semibold text-black">
        Your items
      </h2>

      <div className="mt-[5px] flex flex-col gap-[14px]">
        {billItems.map((item, index) =>
          editingIndex === index ? (
            <form
              key={index}
              onSubmit={handleSaveEdit}
              className="flex flex-col gap-2 rounded-[10px] border border-[#737373] p-3"
            >
              <input
                type="text"
                value={editName}
                onChange={(event) => {
                  setEditName(event.target.value);
                  setEditError(null);
                }}
                placeholder="Item name"
                autoFocus
                className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={editAmount}
                onChange={(event) => {
                  setEditAmount(event.target.value);
                  setEditError(null);
                }}
                placeholder="Amount"
                className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
              />
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-2">
                <Button type="submit" variant="dark" className="h-11 flex-1">
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 flex-1"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div
              key={index}
              className="relative flex h-14 w-full items-center justify-center rounded-[10px] bg-[#E6DDDD] text-base text-black"
            >
              <span>
                {item.name} - Rs.{formatAmount(item.amount)}
              </span>
              <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
                <button
                  type="button"
                  onClick={() => startEditing(index, item)}
                  aria-label={`Edit ${item.name}`}
                  className="flex h-10 w-10 items-center justify-center text-base text-[#737373]"
                >
                  ✎
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  aria-label={`Remove ${item.name}`}
                  className="flex h-10 w-10 items-center justify-center text-xl leading-none text-[#737373]"
                >
                  &times;
                </button>
              </div>
            </div>
          )
        )}

        {billItems.length === 0 && !isAdding && (
          <p className="text-center text-sm text-[#BCBCBC]">
            No items yet — add what you paid for below.
          </p>
        )}
      </div>

      {isAdding ? (
        <form
          onSubmit={handleAddItem}
          className="mt-[22px] flex flex-col gap-2 rounded-[10px] border border-[#D9D9D9] p-3"
        >
          <input
            type="text"
            value={newName}
            onChange={(event) => {
              setNewName(event.target.value);
              setAddError(null);
            }}
            placeholder="Item name"
            autoFocus
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={newAmount}
            onChange={(event) => {
              setNewAmount(event.target.value);
              setAddError(null);
            }}
            placeholder="Amount"
            className="h-11 w-full rounded-[8px] border border-[#D9D9D9] px-3 text-base text-black outline-none focus:border-[#737373]"
          />
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <Button type="submit" variant="dark" className="h-11 flex-1">
              Add
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1"
              onClick={handleCancelAdd}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="mt-[22px] h-14 w-full"
          onClick={startAdding}
        >
          + Add an item
        </Button>
      )}

      <p className="mt-[22px] text-sm text-[#ABABAB]">
        Does something look wrong? Edit before continuing.
      </p>

      <Button
        href={billItems.length > 0 ? "/split-bill" : undefined}
        variant="dark"
        aria-disabled={billItems.length === 0}
        className={`mt-[22px] h-14 w-full ${
          billItems.length === 0 ? "pointer-events-none opacity-50" : ""
        }`}
      >
        Continue to split
      </Button>
      {billItems.length === 0 && (
        <p className="mt-2 text-center text-sm text-[#BCBCBC]">
          Add at least one item to continue.
        </p>
      )}
    </div>
  );
}
