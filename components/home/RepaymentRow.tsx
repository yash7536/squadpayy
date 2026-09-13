"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusChip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";
import { cn } from "@/lib/utils/cn";
import type { Participant, PaymentStatus } from "@/lib/domain/types";

export function RepaymentRow({
  person,
  billTitle,
  amount,
  status,
  splitId,
  onNudge,
  onMarkPaid,
}: {
  person: Participant;
  billTitle: string;
  amount: number;
  status: PaymentStatus;
  splitId: string;
  onNudge: () => void;
  onMarkPaid: () => void;
}) {
  const [justNudged, setJustNudged] = useState(false);
  const settled = status === "paid";

  return (
    <div
      className={cn(
        "bg-surface-container-lowest rounded-xl p-4 lg:p-5 shadow-card transition-all hover:shadow-elevated flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        settled && "opacity-80",
      )}
    >
      <Link
        href={`/splits/${splitId}`}
        className="flex items-center gap-4 min-w-0 focus-ring rounded-lg"
      >
        <div className="relative">
          <Avatar name={person.name} size="lg" />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-surface-container-lowest flex items-center justify-center">
            <span
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                settled ? "bg-tertiary" : "bg-primary-container",
              )}
            />
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-headline-sm text-on-surface truncate">{person.name}</h3>
            <StatusChip status={status} />
          </div>
          <p className="text-body-sm text-on-surface-variant truncate">
            For <span className="text-on-surface font-medium">{billTitle}</span>
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between sm:justify-end gap-4">
        <span
          className={cn(
            "text-numeral-md text-on-surface",
            settled && "text-on-surface-variant line-through",
          )}
        >
          {formatCurrency(amount)}
        </span>
        {settled ? (
          <span className="text-label-sm text-tertiary-container font-semibold px-3 py-1.5 rounded-lg bg-tertiary-container/10 inline-flex items-center gap-1">
            <Icon name="done_all" size={15} />
            Settled
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onNudge();
                setJustNudged(true);
              }}
              className={cn(
                "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-label-sm font-semibold shadow-card transition-colors active:scale-95",
                justNudged
                  ? "bg-tertiary text-on-tertiary"
                  : "bg-primary-container text-on-primary hover:bg-primary",
              )}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={justNudged ? "sent" : "idle"}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex items-center gap-1"
                >
                  <Icon name={justNudged ? "done" : "send"} size={15} />
                  {justNudged ? "Nudged" : "Nudge"}
                </motion.span>
              </AnimatePresence>
            </button>
            <button
              type="button"
              onClick={onMarkPaid}
              className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-variant text-label-sm font-semibold transition-colors"
            >
              Mark as paid
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
