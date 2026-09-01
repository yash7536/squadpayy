"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import {
  getReceiptScanState,
  setScanResult,
  setScanError,
  clearReceiptScan,
} from "@/lib/receiptScanStore";

// Matches the "Reading Script" screen of the Figma prototype (node 2:2).
//
// Phase 10 Part F: this screen now performs the real Gemini extraction
// (via the server-side /api/scan-receipt route — the Gemini API key never
// reaches the browser) instead of the Phase 3 placeholder timer. The
// progress bar still fills the same way, just driven by the real request
// instead of a fixed setTimeout.
//
// If extraction fails (network error, timeout, unreadable receipt), this
// screen shows that inline with a way to retry or fall back to manual
// entry — extracted values are never auto-trusted or silently carried
// forward on a failure.
const REQUEST_TIMEOUT_MS = 30_000;

export default function ReadingReceipt() {
  const router = useRouter();
  const [progressFilled, setProgressFilled] = useState(false);
  const [failure, setFailure] = useState(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    // Effects can run twice in dev (React Strict Mode) — guard so the
    // image is only ever sent to Gemini once per visit to this screen.
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const { image } = getReceiptScanState();
    if (!image) {
      // Nothing to process — e.g. this screen was reached directly, or by
      // refreshing after the pending image was already consumed. Nothing
      // useful to show here, so go back to where a scan actually starts.
      router.replace("/add-bill");
      return;
    }

    // No cancellation flag here on purpose: React (Strict Mode, dev only)
    // invokes this effect's cleanup immediately after the first mount as
    // part of its double-invoke check, before this fetch has any chance to
    // resolve — a `cancelled` flag set in that cleanup would make every
    // response look "cancelled" and the screen would hang on the loading
    // state forever (caught by manually testing this screen against a real
    // request, not just reading the code). The `hasStartedRef` guard above
    // already prevents the request from ever being sent twice, which is
    // the actual problem a cancellation flag would be trying to solve; the
    // simulated double-mount doesn't tear down this component instance, so
    // the eventual state update below still lands on the right screen.
    async function runExtraction() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch("/api/scan-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageDataUrl: image.dataUrl }),
          signal: controller.signal,
        });
        const body = await response.json().catch(() => null);

        if (!response.ok || !body?.ok) {
          const message = body?.error || "Couldn't read that receipt. Try again.";
          setScanError(message);
          setFailure(message);
          return;
        }

        if (!body.data.items.length) {
          const message =
            body.data.warning ||
            "Couldn't find any items on that receipt. Try a clearer photo.";
          setScanError(message);
          setFailure(message);
          return;
        }

        // The bar sits at its starting position for the real duration of
        // the request (no fake progress, since Gemini doesn't report
        // incremental progress) and only fills to 100% once extraction has
        // actually finished — with a brief pause so that fill is visible
        // before moving on, rather than the whole thing snapping instantly.
        setProgressFilled(true);
        setScanResult(body.data);
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push("/review-bill");
      } catch (error) {
        const message =
          error?.name === "AbortError"
            ? "That took too long. Try again."
            : "Couldn't read that receipt. Try again.";
        setScanError(message);
        setFailure(message);
      } finally {
        clearTimeout(timeout);
      }
    }

    runExtraction();
  }, [router]);

  function handleRetry() {
    setFailure(null);
    hasStartedRef.current = false;
    // Re-running the effect needs the pending image to still be there —
    // setScanError() (called on failure) already clears it, so there's
    // nothing left to retry with; go back to Add Bill to take/pick another
    // photo instead of pretending to retry with nothing.
    router.replace("/add-bill");
  }

  function handleEnterManually() {
    clearReceiptScan();
    router.push("/review-bill");
  }

  if (failure) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Reading your receipt" backHref="/add-bill" />

        <p className="mt-[14px] text-base font-semibold text-black">
          We couldn&rsquo;t read that receipt
        </p>
        <p className="mt-[10px] text-sm text-[#737373]">{failure}</p>

        <Button
          type="button"
          variant="dark"
          className="mt-[30px] h-14 w-full"
          onClick={handleRetry}
        >
          Try another photo
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="mt-[16px] h-14 w-full"
          onClick={handleEnterManually}
        >
          Enter manually instead
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Reading your receipt" backHref="/add-bill" />

      <p className="mt-[14px] text-base font-semibold text-black">
        Checking the items and amounts....
      </p>

      <div className="mt-[14px] h-[6px] w-[280px] bg-[#D9D9D9]">
        <div
          className="h-[6px] bg-[#737373] transition-all duration-1000 ease-out"
          style={{ width: progressFilled ? "100%" : "43%" }}
        />
      </div>

      <p className="mt-[57px] text-sm text-black">
        You can review everything before sending the split
      </p>
    </div>
  );
}
