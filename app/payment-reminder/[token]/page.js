import { redirect } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getOwnedPaymentRequestByToken } from "@/lib/paymentRequestsDb";
import { buildWhatsAppLink } from "@/lib/phone";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import SendReminderButton from "./SendReminderButton";
import RemindLaterButton from "./RemindLaterButton";

// Reads from Supabase on every request — this must never show a stale
// cached page for someone else's token.
export const dynamic = "force-dynamic";

// Matches the "Payment Reminder" screen of the Figma prototype (node
// 2:149) — shown to the SENDER, about one specific person's outstanding
// request. A Server Component, scoped to the signed-in sender's own
// session: Row Level Security means a token that exists but belongs to a
// different sender's bill is indistinguishable from an unknown one here.
export default async function PaymentReminder({ params }) {
  const { token } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/payment-reminder/${token}`);
  }

  const request = await getOwnedPaymentRequestByToken({ supabase, token });

  // Graceful handling of an unknown/invalid/not-yours token — e.g. the
  // bill was reset, or the URL was typed by hand.
  if (!request) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Payment reminder" backHref="/payment-status" />
        <p className="mt-[14px] text-sm text-black">
          We couldn&rsquo;t find this reminder. It may have already been
          sent, or the bill was reset.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Payment reminder" backHref="/review-send" />

      <p className="mt-[14px] text-sm text-black">
        {request.person} hasn&rsquo;t paid yet
      </p>

      <div className="mt-[7px] flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-black">
          Rs.{request.amount}
        </p>
        <p className="text-sm text-black">Due Today</p>
      </div>

      <div className="mt-[67px] flex h-[76px] w-full items-center rounded-[10px] bg-[#D9D9D9] px-4 text-base text-black">
        &ldquo;{request.message}&rdquo;
      </div>

      <SendReminderButton
        whatsappUrl={buildWhatsAppLink(request.phone, request.message)}
        personName={request.person}
      />

      <RemindLaterButton token={token} />

      {/* Truthful record of the last time this was acknowledged — not a
          promise of a future automatic reminder, since there's no
          scheduler behind this app. */}
      {request.lastRemindedAt && (
        <p className="mt-[12px] text-sm text-[#C0C0C0]">
          Last reminded: {formatRelativeTime(request.lastRemindedAt)}
        </p>
      )}
    </div>
  );
}
