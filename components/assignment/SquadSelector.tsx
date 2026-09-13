"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency } from "@/lib/domain/format";
import { cn } from "@/lib/utils/cn";
import type { Participant } from "@/lib/domain/types";

export function SquadSelector({
  participants,
  selectedIds,
  payerId,
  totals,
  onToggle,
  onAddFriend,
}: {
  participants: Participant[];
  selectedIds: string[];
  payerId: string;
  totals: Record<string, number>;
  onToggle: (id: string) => void;
  onAddFriend: (name: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    if (!name.trim()) return;
    onAddFriend(name.trim());
    setName("");
    setAdding(false);
  }

  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-caption-caps text-secondary tracking-wider">
          ACTIVE SELECTOR &amp; RUNNING TALLIES
        </span>
        <span className="text-label-sm text-primary-container font-semibold">
          {selectedIds.length} in this bill
        </span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
        {participants.map((p) => {
          const active = selectedIds.includes(p.id);
          const isPayer = p.id === payerId;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              disabled={isPayer}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-left flex-shrink-0 relative disabled:cursor-default",
                active
                  ? "bg-surface-container text-on-surface shadow-card ring-2 ring-primary-container"
                  : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant",
              )}
            >
              <div className="relative">
                <Avatar name={p.name} tone={active ? "accent" : "neutral"} />
                {active && (
                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary-container rounded-full flex items-center justify-center text-on-primary text-[9px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <div className="text-label-md font-bold flex items-center gap-1.5">
                  {p.isSelf ? "You" : p.name.split(" ")[0]}
                  {isPayer && (
                    <span className="px-1.5 py-px rounded text-[10px] font-caption-caps bg-primary text-on-primary">
                      Payer
                    </span>
                  )}
                </div>
                <div className="text-headline-sm text-on-surface">
                  {formatCurrency(totals[p.id] ?? 0)}
                </div>
              </div>
            </button>
          );
        })}
        {adding ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low flex-shrink-0">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Friend's name"
              className="bg-transparent text-label-md text-on-surface focus:outline-none w-28"
            />
            <button type="button" onClick={submit} className="text-primary-container p-1">
              <Icon name="check" size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0"
          >
            <Icon name="person_add" size={20} />
            <span className="text-label-md font-semibold">Add friend</span>
          </button>
        )}
      </div>
    </div>
  );
}
