"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";
import { cn } from "@/lib/utils/cn";
import type { ExtractedReceipt } from "@/lib/gemini/schema";

export function ReceiptPanel() {
  const { draft, update, addItem } = useSplitDraft();
  const browseInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  // Whether "Try again" makes sense for the current error. Defaults to
  // true (network hiccups etc. are worth retrying); set to false only when
  // the API explicitly says so — e.g. a discount the extraction schema
  // can't represent will fail the same way on the same photo every time,
  // so offering "Try again" there would be actively misleading.
  const [retryable, setRetryable] = useState(true);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  // True when a scan succeeded but Gemini could only read the receipt's
  // total, not individual line items — a distinct state from both "success"
  // and "failure": the extraction isn't wrong, it's incomplete, and the
  // user should know that before assuming every item was captured.
  const [incompleteExtraction, setIncompleteExtraction] = useState(false);

  async function handleFile(file: File) {
    setStatus("scanning");
    setError(null);
    setRetryable(true);
    setIncompleteExtraction(false);
    setLastFile(file);
    setThumbnail(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const res = await fetch("/api/receipts/scan", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Couldn't read that receipt.");
        setRetryable(data.retryable !== false);
        return;
      }

      const receipt: ExtractedReceipt = data.receipt;
      setDemoMode(Boolean(data.demo));

      update({
        merchant: receipt.merchant,
        merchantLocation: receipt.location ?? "",
        billTitle: draft.billTitle || `${receipt.merchant} ${draft.splitMode === "equal" ? "" : "Dinner"}`.trim(),
        taxAndService: receipt.taxAndService,
        manualTotal: receipt.total,
        // Kept verbatim — this is what reconcileReceipt compares the
        // reviewed items/tax against, regardless of later edits. Gemini's
        // total is never used for the actual split math (see
        // lib/domain/reconciliation.ts and split-engine.ts).
        extractedTotal: receipt.total,
        scanned: true,
        items: [],
      });
      for (const item of receipt.items) {
        addItem({ name: item.name, quantity: item.quantity, amount: item.amount });
      }
      // Gemini read a total but couldn't make out individual items — that's
      // not a failure, but it's not a complete extraction either. Don't
      // invent line items; tell the user and point at manual/equal-split.
      setIncompleteExtraction(receipt.items.length === 0 && receipt.total > 0);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function handleRetry() {
    if (lastFile) handleFile(lastFile);
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative group bg-surface-container-lowest rounded-xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 flex flex-col justify-between min-h-[360px] overflow-hidden"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-8 px-4 rounded-lg bg-surface-container-low transition-colors">
          <div className="w-14 h-14 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container mb-4 group-hover:scale-110 transition-transform">
            <Icon
              name={status === "scanning" ? "sync" : "document_scanner"}
              size={30}
              className={status === "scanning" ? "animate-spin" : undefined}
            />
          </div>
          <h3 className="text-headline-sm text-on-surface mb-1">
            {status === "scanning" ? "Reading your receipt…" : "Drop receipt photo here"}
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-4 max-w-xs">
            Supports JPEG, HEIC, PNG up to 15MB. Gemini extracts every line item automatically.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 bg-surface-container-highest hover:bg-surface-variant text-on-surface px-4 py-2 rounded-xl text-label-md font-semibold transition-colors active:scale-95">
              <Icon name="add_photo_alternate" size={18} />
              Browse files
              <input
                ref={browseInputRef}
                accept="image/*"
                className="hidden"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="cursor-pointer inline-flex items-center gap-2 bg-primary-fixed hover:bg-primary-fixed-dim text-on-primary-fixed px-4 py-2 rounded-xl text-label-md font-semibold transition-colors active:scale-95">
              <Icon name="photo_camera" size={18} />
              Take photo
              <input
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {error && (
            <div className="mt-3 flex flex-col items-center gap-2 max-w-xs">
              <p className="text-body-sm text-error text-center">{error}</p>
              {lastFile && retryable && (
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-primary-container hover:text-primary transition-colors"
                >
                  <Icon name="refresh" size={16} />
                  Try again
                </button>
              )}
              <p className="text-body-sm text-on-surface-variant text-center">
                Or skip scanning and enter the bill total manually on the right.
              </p>
            </div>
          )}
        </div>

        {draft.scanned && (
          <div className="mt-4 bg-surface-container-low rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-caption-caps text-on-surface-variant">Scanned Document</span>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-caption-caps">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
                {demoMode ? "Demo extraction" : "Verified OCR"}
              </div>
            </div>
            <div className="flex items-center gap-4 pt-0.5">
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt="Uploaded receipt"
                  className="w-16 h-20 rounded-lg object-cover flex-shrink-0 bg-surface-container-highest shadow-card"
                />
              ) : (
                <div className="w-16 h-20 rounded-lg flex-shrink-0 bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                  <Icon name="receipt_long" size={22} />
                </div>
              )}
              <div className="flex flex-col justify-center min-w-0">
                <span className="text-headline-sm text-on-surface truncate">{draft.merchant}</span>
                <span className="text-body-sm text-on-surface-variant truncate">
                  {draft.merchantLocation}
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Icon
                    name={incompleteExtraction ? "info" : "verified"}
                    className={incompleteExtraction ? "text-on-warning-container" : "text-tertiary-container"}
                    size={18}
                  />
                  <span
                    className={cn(
                      "text-label-sm font-semibold",
                      incompleteExtraction ? "text-on-warning-container" : "text-tertiary-container",
                    )}
                  >
                    {incompleteExtraction
                      ? "Only the total was readable — add items below"
                      : `${draft.items.length} items parsed`}
                  </span>
                </div>
              </div>
            </div>
            {incompleteExtraction && (
              <p className="text-body-sm text-on-surface-variant">
                Gemini couldn&rsquo;t make out individual line items on this receipt, so none were
                added — nothing was invented. The total is filled in on the right; add items
                manually there if you want an item-by-item split, or continue with just the total.
              </p>
            )}
          </div>
        )}
      </div>

      <div className={cn("bg-surface-container-lowest rounded-xl p-4 flex gap-4 shadow-card")}>
        <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary-container flex-shrink-0">
          <Icon name="auto_awesome" size={18} />
        </div>
        <div className="flex flex-col">
          <span className="text-label-md text-on-surface font-semibold">
            Zero awkward calculations
          </span>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Tax and service charges scale proportionally across every shared item when you assign
            who had what in step 2.
          </p>
        </div>
      </div>
    </div>
  );
}
