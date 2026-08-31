"use client";

import { useState } from "react";
import Button from "@/components/Button";

// The only genuinely interactive piece of the Payment Reminder screen —
// pulled into its own tiny Client Component so the rest of the page can
// stay a Server Component that reads Supabase directly. No real
// SMS/WhatsApp/email is wired up — this just confirms the reminder was
// "sent" (mock).
export default function SendReminderButton() {
  const [justSent, setJustSent] = useState(false);

  return (
    <Button
      variant="secondary"
      onClick={() => setJustSent(true)}
      className="mt-[18px] h-14 w-full"
    >
      {justSent ? "Reminder sent" : "Send reminder"}
    </Button>
  );
}
