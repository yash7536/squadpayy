"use client";

import { Icon } from "@/components/ui/Icon";
import { NUDGE_TONES } from "@/lib/domain/nudge";
import { cn } from "@/lib/utils/cn";
import type { NudgeTone } from "@/lib/domain/types";

export function ToneSelector({
  value,
  onChange,
}: {
  value: NudgeTone;
  onChange: (tone: NudgeTone) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-label-md text-on-surface">Pick a tone that fits your vibe</span>
        <span className="text-caption-caps text-on-surface-variant">No awkwardness guarantee</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {NUDGE_TONES.map((tone) => {
          const active = tone.id === value;
          return (
            <button
              key={tone.id}
              type="button"
              onClick={() => onChange(tone.id)}
              className={cn(
                "text-left p-4 rounded-xl transition-all flex flex-col justify-between h-full",
                active
                  ? "bg-primary-fixed/40"
                  : "bg-surface-container hover:bg-surface-container-high",
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span
                  className={cn(
                    "text-headline-sm",
                    active ? "text-on-primary-fixed" : "text-on-surface",
                  )}
                >
                  {tone.label}
                </span>
                <Icon
                  name="check_circle"
                  size={18}
                  className={active ? "text-primary-container" : "text-outline opacity-0"}
                />
              </div>
              <p className="text-body-sm text-on-surface-variant leading-snug">{tone.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
