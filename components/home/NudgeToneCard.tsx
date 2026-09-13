"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NUDGE_TONES, buildNudgeMessage } from "@/lib/domain/nudge";
import { cn } from "@/lib/utils/cn";
import type { NudgeTone } from "@/lib/domain/types";

const PREVIEWS: Record<NudgeTone, string> = {
  casual: buildNudgeMessage("casual", {
    recipientFirstName: "Meera",
    amount: 640,
    billTitle: "the grill night",
    link: "squadpay.me/m",
  }),
  direct: buildNudgeMessage("direct", {
    recipientFirstName: "Meera",
    amount: 640,
    billTitle: "the grill night",
    link: "squadpay.me/m",
  }),
  banter: buildNudgeMessage("banter", {
    recipientFirstName: "Meera",
    amount: 640,
    billTitle: "the grill night",
    link: "squadpay.me/m",
  }),
};

export function NudgeToneCard() {
  const [tone, setTone] = useState<NudgeTone>("casual");

  return (
    <div className="bg-surface-container-low rounded-xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="psychology" className="text-primary-container" size={20} />
          <h4 className="text-headline-sm text-on-surface">Nudge tone template</h4>
        </div>
        <span className="text-caption-caps text-secondary">No social friction</span>
      </div>
      <p className="text-body-sm text-on-surface-variant mb-4">
        Pre-scripted casual copy so you don&rsquo;t spend 10 minutes crafting an awkward text message.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {NUDGE_TONES.map((option) => (
          <label
            key={option.id}
            className={cn(
              "flex flex-col p-3 rounded-xl cursor-pointer transition-all shadow-card",
              tone === option.id
                ? "bg-surface-container-lowest ring-1 ring-primary-container"
                : "bg-surface-container-lowest hover:bg-surface-bright",
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-label-sm font-semibold text-on-surface">
                {option.label}
              </span>
              <input
                type="radio"
                name="nudge-tone"
                checked={tone === option.id}
                onChange={() => setTone(option.id)}
                className="accent-[#0F3FE6]"
              />
            </div>
            <span className="text-body-sm text-on-surface-variant">
              &ldquo;{PREVIEWS[option.id]}&rdquo;
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
