"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function WhatsAppPreview({ message }: { message: string }) {
  // Computed client-side only, after mount — reading the clock directly in
  // render would make the server-rendered HTML and the client's first
  // render disagree whenever they straddle a minute boundary, which is a
  // real (if minor) hydration mismatch. Starting empty and filling in via
  // an effect sidesteps that entirely; the timestamp just appears a beat
  // after mount, which is imperceptible for a preview bubble like this.
  const [sentAt, setSentAt] = useState<string | null>(null);
  useEffect(() => {
    // Deliberately client-only (see the comment above) — this is exactly
    // the "synchronize with the outside world after mount" case, not the
    // cascading-render pattern this rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSentAt(new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-caption-caps text-on-surface-variant uppercase tracking-wide">
          WhatsApp dispatch preview
        </span>
        <span className="inline-flex items-center gap-1 text-caption-caps text-tertiary-container">
          <Icon name="lock" size={14} />
          End-to-end private
        </span>
      </div>
      <div className="w-full rounded-xl p-4 sm:p-6 bg-[#efeae2] shadow-inner relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#6b7280 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative max-w-md ml-auto bg-white rounded-xl rounded-tr-none p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-label-sm text-primary-container font-bold">SquadPay QuickNudge</span>
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container" />
            <span className="text-caption-caps text-on-secondary-container">WhatsApp ready</span>
          </div>
          <p className="text-body-md text-on-surface leading-relaxed">{message}</p>
          <div className="mt-3 pt-2 flex items-center justify-between text-on-surface-variant">
            <div className="inline-flex items-center gap-1 text-[#0F3FE6] text-label-sm">
              <Icon name="bolt" size={16} />
              Payment link included
            </div>
            <div className="flex items-center gap-1 text-caption-caps text-on-secondary-container">
              <span>{sentAt}</span>
              <Icon name="done_all" size={14} className="text-[#53bdeb]" filled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
