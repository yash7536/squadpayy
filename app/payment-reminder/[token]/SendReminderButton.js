"use client";

import { useState } from "react";
import Button from "@/components/Button";

// The only genuinely interactive piece of the Payment Reminder screen —
// pulled into its own tiny Client Component so the rest of the page can
// stay a Server Component that reads Supabase directly.
//
// Final MVP pass: opens a real `wa.me` deep link (built server-side in
// page.js from the person's phone number — see lib/phone.js) in a new
// tab, which hands off to WhatsApp with the reminder message pre-filled.
// No WhatsApp Business API — a plain click-to-chat link is enough for
// this MVP. `whatsappUrl` is null when the person has no usable phone
// number on file (e.g. a request created before phone numbers were
// required) — in that case there's nothing to link to, so this shows a
// plain explanation instead of a dead button.
export default function SendReminderButton({ whatsappUrl, personName }) {
  const [justSent, setJustSent] = useState(false);

  if (!whatsappUrl) {
    return (
      <p className="mt-[18px] text-sm text-red-600">
        No valid phone number on file for {personName} — edit them in Add
        People on your next bill to send WhatsApp reminders.
      </p>
    );
  }

  return (
    <Button
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      onClick={() => setJustSent(true)}
      className="mt-[18px] h-14 w-full"
    >
      {justSent ? "Opened WhatsApp" : "Send reminder on WhatsApp"}
    </Button>
  );
}
