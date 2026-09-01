"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { markReminderSentAction } from "@/lib/paymentRequestsActions";

// "Remind me later" used to be a plain link to /payment-status with no
// side effect at all — clicking it looked like it did something but
// recorded nothing. This records a real, truthful "last reminded"
// timestamp via markReminderSentAction (see lib/paymentRequestsDb.js's
// markReminderSent) before navigating on — NOT a scheduled future
// reminder; there's no scheduler/cron/notification service in this app,
// only a persisted record of when the sender last acknowledged this.
export default function RemindLaterButton({ token }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await markReminderSentAction(token);
        router.push("/payment-status");
      } catch (err) {
        if (err instanceof Error && err.message === "UNAUTHENTICATED") {
          router.push(`/login?next=/payment-reminder/${token}`);
          return;
        }
        setError("Couldn't record that just now. Please try again.");
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        disabled={isPending}
        className="mt-[21px] h-14 w-full"
      >
        {isPending ? "Saving…" : "Remind me later"}
      </Button>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </>
  );
}
