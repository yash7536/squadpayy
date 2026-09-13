"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

const STEPS = [
  { n: "01", label: "BILL" },
  { n: "02", label: "SPLIT" },
  { n: "03", label: "SQUAD" },
  { n: "04", label: "SEND" },
] as const;

export function Stepper({ activeIndex }: { activeIndex: 0 | 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-between gap-2 pb-8 overflow-x-auto no-scrollbar select-none">
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "upcoming";
        return (
          <div key={step.n} className="flex items-center gap-2 flex-1 min-w-0 last:flex-none">
            {state === "active" ? (
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 bg-primary text-on-primary shadow-card"
              >
                <span className="text-caption-caps tracking-wider">{step.n}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />
                <span className="text-label-md font-semibold">{step.label}</span>
              </motion.div>
            ) : (
              <div
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 transition-colors",
                  state === "done" && "bg-surface-container text-on-surface-variant",
                  state === "upcoming" && "bg-surface-container text-on-surface-variant opacity-60",
                )}
              >
                <span className="text-caption-caps tracking-wider">{step.n}</span>
                {state === "done" && <Icon name="done" size={14} />}
                <span className="text-label-md font-semibold">{step.label}</span>
              </div>
            )}
            {i < STEPS.length - 1 && (
              <div className="h-0.5 flex-1 min-w-[1.5rem] bg-surface-variant" />
            )}
          </div>
        );
      })}
    </div>
  );
}
