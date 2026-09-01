"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { prepareReceiptImage, ReceiptImageError } from "@/lib/receiptImage";
import { setPendingImage, clearReceiptScan } from "@/lib/receiptScanStore";

// Matches the "Add Bill" screen of the Figma prototype (node 1:29).
//
// Phase 10 Part F wires "Take a photo" and "Upload from gallery" into real
// camera capture / file upload, feeding the AI receipt scanner (Reading
// Receipt performs the actual extraction — see that page). Each opens a
// native file picker via a hidden <input type="file">; the "Take a photo"
// input adds `capture="environment"`, which mobile browsers use as a hint
// to open the camera directly (rear-facing, appropriate for photographing
// a receipt) instead of a general file/gallery picker. "Enter manually"
// is unchanged from Phase 3 — it has nothing to read, so it skips straight
// to Review Bill.
export default function AddBill() {
  const router = useRouter();
  const photoInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState(null);

  // A scan (or error) left over from a previous bill must never leak into
  // this one — including the "Enter manually" path, which should always
  // start clean. Every visit to Add Bill is the start of a fresh bill.
  useEffect(() => {
    clearReceiptScan();
  }, []);

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    // Always clear the input's value so selecting the *same* file again
    // later still fires a change event.
    event.target.value = "";
    if (!file) return;

    setError(null);
    setIsPreparing(true);
    try {
      const { dataUrl, mimeType } = await prepareReceiptImage(file);
      setPendingImage(dataUrl, mimeType);
      router.push("/reading-receipt");
    } catch (err) {
      setIsPreparing(false);
      setError(
        err instanceof ReceiptImageError
          ? err.message
          : "Couldn't use that photo. Try a different one."
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Add your bill" backHref="/" />

      <div className="mt-[58px] flex flex-col">
        {/* capture="environment" hints mobile browsers to open the rear
            camera directly rather than a gallery/file picker. */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        <Button
          type="button"
          variant="accent"
          className="h-14 w-full disabled:opacity-60"
          disabled={isPreparing}
          onClick={() => photoInputRef.current?.click()}
        >
          {isPreparing ? "Preparing photo…" : "Take a photo"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          className="mt-[38px] h-14 w-full disabled:opacity-60"
          disabled={isPreparing}
          onClick={() => galleryInputRef.current?.click()}
        >
          {isPreparing ? "Preparing photo…" : "Upload from gallery"}
        </Button>

        <Button
          href="/review-bill"
          variant="secondary"
          className="mt-[37px] h-14 w-full"
        >
          Enter manually
        </Button>
      </div>

      {error && <p className="mt-[20px] text-sm text-red-600">{error}</p>}

      <p className="mt-[35px] text-sm text-[#A6A6A6]">
        We&rsquo;ll use the receipt to create your split
      </p>
    </div>
  );
}
