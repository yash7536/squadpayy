"use client";

import { cn } from "@/lib/utils/cn";

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer select-none">
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={cn(
            "w-10 h-6 rounded-full transition-colors",
            checked ? "bg-primary-container" : "bg-secondary-container",
          )}
        />
        <div
          className={cn(
            "absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4",
          )}
        />
      </div>
      <span className="text-body-sm text-on-surface">{label}</span>
    </label>
  );
}
