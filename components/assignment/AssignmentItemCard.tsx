"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import { cn } from "@/lib/utils/cn";
import type { ItemAssignment, Participant, ReceiptLineItem } from "@/lib/domain/types";

function firstName(p: Participant) {
  return p.isSelf ? "You" : p.name.split(" ")[0];
}

export function AssignmentItemCard({
  item,
  assignment,
  participants,
  onChange,
}: {
  item: ReceiptLineItem;
  assignment: ItemAssignment | undefined;
  participants: Participant[];
  onChange: (assignment: ItemAssignment) => void;
}) {
  const [editing, setEditing] = useState(false);
  const shared = assignment?.shared ?? true;
  const shares = assignment?.shares ?? {};
  const includedIds = Object.keys(shares).filter((id) =>
    participants.some((p) => p.id === id),
  );

  function togglePerson(id: string) {
    const next = { ...shares };
    if (next[id] !== undefined) {
      delete next[id];
    } else {
      next[id] = 1;
    }
    onChange({ itemId: item.id, shared: true, shares: next });
  }

  function setUnits(id: string, units: number) {
    const next = { ...shares, [id]: Math.max(0, units) };
    if (next[id] === 0) delete next[id];
    onChange({ itemId: item.id, shared: false, shares: next });
  }

  function switchMode(nextShared: boolean) {
    if (nextShared) {
      const equal = Object.fromEntries(includedIds.map((id) => [id, 1]));
      onChange({ itemId: item.id, shared: true, shares: equal });
    } else {
      onChange({ itemId: item.id, shared: false, shares: {} });
    }
  }

  const perShareAmount = includedIds.length > 0 ? item.amount / includedIds.length : 0;
  const claimedUnits = Object.values(shares).reduce((a, b) => a + b, 0);
  const fullyClaimed = shared ? includedIds.length > 0 : claimedUnits >= item.quantity;

  return (
    <div className="p-6 hover:bg-surface-container-low/40 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant flex-shrink-0">
            <Icon name={item.icon ?? "restaurant"} size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-headline-sm text-on-surface">{item.name}</h3>
              {item.quantity > 1 && (
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-caption-caps font-semibold">
                  x{item.quantity}
                </span>
              )}
            </div>
            <p className="text-body-sm text-secondary mt-0.5">
              {shared
                ? includedIds.length > 0
                  ? `Split ${includedIds.length} ways · ${formatCurrency(perShareAmount)} each`
                  : "Not assigned yet"
                : `${claimedUnits} of ${item.quantity} units claimed`}
            </p>
          </div>
        </div>
        <div className="text-right sm:self-center">
          <span className="text-headline-md text-on-surface">{formatCurrency(item.amount)}</span>
        </div>
      </div>

      <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-container-high/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          {includedIds.length === 0 && (
            <span className="text-label-sm text-on-surface-variant italic">Nobody assigned</span>
          )}
          {shared
            ? includedIds.map((id) => {
                const p = participants.find((pp) => pp.id === id);
                if (!p) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-medium"
                  >
                    <span className="w-2 h-2 rounded-full bg-primary-container" />
                    {firstName(p)} ({formatCurrency(perShareAmount)})
                  </span>
                );
              })
            : includedIds.map((id) => {
                const p = participants.find((pp) => pp.id === id);
                if (!p) return null;
                const units = shares[id];
                const amount = (item.amount / item.quantity) * units;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-fixed text-on-primary-fixed text-label-sm font-semibold"
                  >
                    {firstName(p)} ({units} {units === 1 ? "unit" : "units"} · {formatCurrency(amount)})
                  </span>
                );
              })}
          {!fullyClaimed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-warning-container text-on-warning-container text-caption-caps font-semibold">
              <Icon name="error" size={12} />
              Incomplete
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-label-sm text-primary-container hover:underline flex items-center gap-1"
        >
          {editing ? "Done" : "Edit split"}
          <Icon name={editing ? "expand_less" : "tune"} size={16} />
        </button>
      </div>

      {editing && (
        <div className="mt-3 p-4 rounded-lg bg-surface-container-low flex flex-col gap-3">
          {item.quantity > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchMode(true)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors",
                  shared ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface-variant",
                )}
              >
                Split evenly
              </button>
              <button
                type="button"
                onClick={() => switchMode(false)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-label-sm font-semibold transition-colors",
                  !shared ? "bg-primary-container text-on-primary" : "bg-surface-container-lowest text-on-surface-variant",
                )}
              >
                Assign by units
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {participants.map((p) => {
              const inShare = shares[p.id] !== undefined;
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-label-md text-on-surface cursor-pointer">
                    {shared ? (
                      <input
                        type="checkbox"
                        checked={inShare}
                        onChange={() => togglePerson(p.id)}
                        className="accent-[#0F3FE6] w-4 h-4"
                      />
                    ) : (
                      <span className="w-4 h-4" />
                    )}
                    {firstName(p)}
                  </label>
                  {!shared && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Remove one unit from ${firstName(p)}`}
                        onClick={() => setUnits(p.id, (shares[p.id] ?? 0) - 1)}
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center focus-ring"
                      >
                        <Icon name="remove" size={16} />
                      </button>
                      <span className="w-5 text-center text-label-md" aria-live="polite">
                        {shares[p.id] ?? 0}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one unit to ${firstName(p)}`}
                        onClick={() => setUnits(p.id, (shares[p.id] ?? 0) + 1)}
                        className="w-7 h-7 rounded-lg bg-surface-container-lowest text-on-surface flex items-center justify-center focus-ring"
                      >
                        <Icon name="add" size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
