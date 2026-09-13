"use client";

import { Icon } from "@/components/ui/Icon";
import { useSplitDraft } from "@/lib/data/draft-context";
import { formatBillDate } from "@/lib/domain/format";

export function BillDetailsForm() {
  const { draft, update, subtotal, total } = useSplitDraft();
  const hasItems = draft.items.length > 0;

  return (
    <div className="flex flex-col gap-1 bg-surface-container-low p-6 rounded-xl">
      <label className="text-caption-caps text-on-surface-variant font-semibold">
        {hasItems ? "Total (items + tax)" : "Total amount"}
      </label>
      <div className="flex items-baseline gap-2">
        <span className="text-numeral-hero text-outline select-none">₹</span>
        {hasItems ? (
          <span className="text-numeral-hero text-on-surface tracking-tight">
            {total.toLocaleString("en-IN")}
          </span>
        ) : (
          <input
            className="text-numeral-hero text-on-surface bg-transparent focus:outline-none w-full tracking-tight"
            inputMode="decimal"
            value={draft.manualTotal ?? ""}
            placeholder="0"
            onChange={(e) => {
              const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
              update({ manualTotal: Number.isFinite(n) ? n : null });
            }}
          />
        )}
      </div>
      {hasItems ? (
        <div className="flex items-center gap-1.5 text-tertiary-container pt-0.5 flex-wrap">
          <Icon name="check_circle" size={16} />
          <span className="text-label-sm font-semibold">
            ₹{subtotal.toLocaleString("en-IN")} items +
          </span>
          <span className="flex items-center gap-1 text-label-sm font-semibold">
            ₹
            <input
              type="text"
              inputMode="decimal"
              aria-label="Tax and service"
              value={draft.taxAndService}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                update({ taxAndService: Number.isFinite(n) ? n : 0 });
              }}
              className="w-14 bg-transparent focus:outline-none border-b border-tertiary-container/50 text-tertiary-container"
            />
            tax &amp; service
          </span>
        </div>
      ) : (
        <p className="text-label-sm text-on-surface-variant pt-0.5">
          Or add line items below to split item-by-item instead.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface font-semibold" htmlFor="billTitle">
            Bill title
          </label>
          <div className="relative flex items-center">
            <input
              id="billTitle"
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus-ring border border-surface-variant"
              type="text"
              value={draft.billTitle}
              onChange={(e) => update({ billTitle: e.target.value })}
              placeholder="Friday night dinner"
            />
            <Icon name="edit_note" className="absolute right-4 text-outline pointer-events-none" size={20} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-sm text-on-surface font-semibold" htmlFor="billDate">
            Date
          </label>
          <div className="relative flex items-center">
            <input
              id="billDate"
              className="w-full h-12 px-4 rounded-xl bg-surface-container-lowest text-on-surface text-body-md focus:outline-none focus-ring border border-surface-variant"
              type="text"
              readOnly
              value={formatBillDate(draft.billDate)}
            />
            <Icon name="calendar_today" className="absolute right-4 text-outline pointer-events-none" size={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
