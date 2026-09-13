import { cn } from "@/lib/utils/cn";
import { Icon } from "./Icon";
import type { PaymentStatus } from "@/lib/domain/types";

type ChipTone = "paid" | "pending" | "reminder" | "neutral";

const toneClasses: Record<ChipTone, string> = {
  paid: "bg-tertiary-container/10 text-tertiary-container border-tertiary-fixed",
  pending: "bg-warning-container text-on-warning-container border-warning-fixed",
  reminder: "bg-info-container text-on-info-container border-info-fixed",
  neutral: "bg-surface-container text-on-surface-variant border-surface-variant",
};

export function Chip({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: ChipTone;
  icon?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 h-[26px] rounded-full border text-caption-caps font-caption-caps",
        toneClasses[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

const STATUS_TONE: Record<PaymentStatus, ChipTone> = {
  paid: "paid",
  pending: "pending",
  reminder_sent: "reminder",
};

const STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: "Paid",
  pending: "Still pending",
  reminder_sent: "Reminder sent",
};

const STATUS_ICON: Record<PaymentStatus, string | undefined> = {
  paid: "check",
  pending: undefined,
  reminder_sent: "send",
};

export function StatusChip({ status }: { status: PaymentStatus }) {
  return (
    <Chip tone={STATUS_TONE[status]} icon={STATUS_ICON[status]}>
      {STATUS_LABEL[status]}
    </Chip>
  );
}
