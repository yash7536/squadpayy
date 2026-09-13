"use client";

import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";
import { cn } from "@/lib/utils/cn";

export function SplitModeSelector() {
  const { draft, update } = useSplitDraft();

  return (
    <div className="flex flex-col gap-3">
      <span className="text-label-sm text-on-surface font-semibold">Split mode</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-surface-container rounded-xl">
        <button
          type="button"
          onClick={() => update({ splitMode: "item" })}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg text-left transition-all",
            draft.splitMode === "item"
              ? "bg-surface-container-lowest text-on-surface shadow-card"
              : "bg-transparent text-on-surface-variant hover:text-on-surface",
          )}
        >
          <div className="flex items-center gap-3">
            <Icon name="checklist_rtl" className="text-primary-container" size={22} />
            <div>
              <div className="text-label-md font-semibold text-on-surface">Item-by-item</div>
              <div className="text-caption-caps text-primary-container">Recommended</div>
            </div>
          </div>
          {draft.splitMode === "item" && (
            <Icon name="check_circle" className="text-primary-container" size={20} />
          )}
        </button>
        <button
          type="button"
          onClick={() => update({ splitMode: "equal" })}
          className={cn(
            "flex items-center justify-between p-4 rounded-lg text-left transition-all",
            draft.splitMode === "equal"
              ? "bg-surface-container-lowest text-on-surface shadow-card"
              : "bg-transparent text-on-surface-variant hover:text-on-surface",
          )}
        >
          <div className="flex items-center gap-3">
            <Icon name="balance" className="text-outline" size={22} />
            <div>
              <div className="text-label-md font-semibold">Split equally</div>
              <div className="text-body-sm text-on-surface-variant">Divide total by squad</div>
            </div>
          </div>
          {draft.splitMode === "equal" ? (
            <Icon name="check_circle" className="text-primary-container" size={20} />
          ) : (
            <span className="w-5 h-5 rounded-full bg-surface-variant inline-block" />
          )}
        </button>
      </div>
    </div>
  );
}
