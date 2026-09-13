"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSquadPay } from "@/lib/data/store-context";
import { sharesFor } from "@/lib/data/selectors";
import { ToneSelector } from "@/components/nudge/ToneSelector";
import { WhatsAppPreview } from "@/components/nudge/WhatsAppPreview";
import { Toggle } from "@/components/ui/Toggle";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { buildNudgeMessage, buildWhatsAppLink } from "@/lib/domain/nudge";
import { formatCurrency, formatRelativeTime } from "@/lib/domain/format";
import { getSiteUrl } from "@/lib/supabase/env";
import type { NudgeTone } from "@/lib/domain/types";

export default function NudgePage({
  params,
}: {
  params: Promise<{ splitId: string; personId: string }>;
}) {
  const { splitId, personId } = use(params);
  const router = useRouter();
  const { splits, recordNudge } = useSquadPay();
  const [tone, setTone] = useState<NudgeTone>("casual");
  const [autoRecord, setAutoRecord] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const split = splits.find((s) => s.id === splitId);
  const person = split?.participants.find((p) => p.id === personId);

  const amount = split
    ? (sharesFor(split).find((s) => s.participantId === personId)?.total ?? 0)
    : 0;

  if (!split || !person) {
    return (
      <div className="container-max gutter w-full py-16 text-center">
        <p className="text-headline-md text-on-surface mb-2">Nothing to nudge here</p>
        <Link href="/home" className="text-primary-container hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  const link = `${getSiteUrl()}/splits/${split.id}`;
  const message = buildNudgeMessage(tone, {
    recipientFirstName: person.name.split(" ")[0],
    amount,
    billTitle: split.bill.title,
    link,
  });
  const whatsappHref = buildWhatsAppLink(message);

  function handleSend() {
    setSent(true);
    if (autoRecord) recordNudge(split!.id, person!.id);
  }

  function handleCopy() {
    navigator.clipboard?.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      if (autoRecord) recordNudge(split!.id, person!.id);
    });
  }

  return (
    <div className="relative w-full overflow-hidden bg-surface py-8 md:py-12">
      <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-[30rem] h-[30rem] rounded-full bg-tertiary-fixed/20 blur-3xl pointer-events-none" />

      <div className="relative container-max gutter">
        <button
          type="button"
          onClick={() => router.push(`/splits/${split.id}`)}
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-on-surface text-label-md font-semibold transition-colors mb-8"
        >
          <Icon name="arrow_back" size={18} />
          Back to {split.bill.title}
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-elevated flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-caption-caps tracking-widest text-primary-container uppercase font-bold">
                  Repayment nudge
                </span>
                <h1 className="text-display-lg text-on-surface tracking-tight">
                  Ask {person.name.split(" ")[0]} for{" "}
                  <span className="text-primary-container">{formatCurrency(amount)}</span>?
                </h1>
                <div className="flex items-center gap-2 text-on-surface-variant text-body-sm mt-1">
                  <Icon name="schedule" className="text-tertiary-container" size={16} />
                  <span>
                    For {split.bill.title} · {formatRelativeTime(split.createdAt)}
                  </span>
                </div>
              </div>

              <ToneSelector value={tone} onChange={setTone} />
              <WhatsAppPreview message={message} />

              <div className="flex flex-col gap-4 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleSend}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary hover:bg-primary text-headline-sm h-14 rounded-xl shadow-elevated transition-all active:scale-95"
                  >
                    <Icon name="chat" size={24} />
                    {sent ? "Sent — open WhatsApp again" : "Send on WhatsApp"}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center justify-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-semibold px-6 h-14 rounded-xl transition-colors active:scale-95"
                  >
                    <Icon name={copied ? "check" : "content_copy"} size={20} />
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-surface-container p-3 rounded-lg">
                  <Toggle
                    id="auto-record"
                    checked={autoRecord}
                    onChange={setAutoRecord}
                    label="Mark as reminder sent automatically"
                  />
                  {sent && <Icon name="verified" className="text-tertiary-container" size={18} />}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-elevated flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={person.name} size="lg" />
                  <div>
                    <h2 className="text-headline-sm text-on-surface leading-tight">{person.name}</h2>
                    <span className="text-body-sm text-on-surface-variant">
                      Status: {split.paymentStatus[person.id].replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-px w-full bg-surface-container" />
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low">
                <div className="flex items-center gap-2">
                  <Icon name="receipt_long" className="text-on-surface-variant" size={20} />
                  <span className="text-body-sm text-on-surface">
                    Bill total: {formatCurrency(split.bill.total)} ({split.participants.length} people)
                  </span>
                </div>
                <Link
                  href={`/splits/${split.id}`}
                  className="text-label-sm text-primary-container hover:underline"
                >
                  Inspect bill
                </Link>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-elevated flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-tertiary-fixed flex items-center justify-center text-tertiary-container shrink-0">
                  <Icon name="psychology" size={22} />
                </div>
                <div>
                  <span className="text-caption-caps text-tertiary-container uppercase font-bold tracking-wide">
                    Why this works
                  </span>
                  <h3 className="text-headline-sm text-on-surface mt-1">A nudge, not a notice</h3>
                </div>
              </div>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Friendly, pre-written reminders get paid faster than bare payment requests — because
                they preserve the friendship, not just the ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
