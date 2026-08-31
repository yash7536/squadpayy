"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";

// Matches the "Reading Script" screen of the Figma prototype (node 2:2).
//
// This is a mock "processing" step — there is no real OCR/AI extraction
// yet (that's a later phase). We just show the designed loading state for
// a moment, then move on to Review Bill, which is what this screen is
// building anticipation for either way.
const ADVANCE_AFTER_MS = 1600;

export default function ReadingReceipt() {
  const router = useRouter();
  const [progressFilled, setProgressFilled] = useState(false);

  useEffect(() => {
    // Two ticks: fill the bar shortly after mount (so the transition is
    // visible instead of snapping instantly), then move on once it's done.
    const fillTimer = setTimeout(() => setProgressFilled(true), 150);
    const navigateTimer = setTimeout(() => {
      router.push("/review-bill");
    }, ADVANCE_AFTER_MS);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(navigateTimer);
    };
  }, [router]);

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
