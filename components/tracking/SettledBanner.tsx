"use client";

import { motion } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/domain/format";

export function SettledBanner({ total }: { total: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden bg-surface-container-lowest rounded-xl shadow-card p-8 lg:p-12 text-center flex flex-col items-center gap-3"
    >
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-tertiary-fixed/40 blur-3xl pointer-events-none" />
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1, ease: [0.34, 1.2, 0.64, 1] }}
        className="relative z-10 w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary-container"
      >
        <Icon name="task_alt" size={34} />
      </motion.div>
      <h2 className="relative z-10 text-display-lg text-on-surface tracking-tight">All settled.</h2>
      <p className="relative z-10 text-body-lg text-on-surface-variant max-w-md">
        Every share of {formatCurrency(total)} has been paid. No follow-ups needed here.
      </p>
    </motion.div>
  );
}
