"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import Button from "@/components/Button";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

// There's no login screen in the Figma prototype — the 10 screens are all
// post-login sender flow. This is a minimal addition needed to satisfy
// "users must only access their own data" from Phase 9, styled to match
// the rest of the app (same fonts, colors, button variants) rather than
// inventing a new look.
//
// Magic-link only — no passwords. Matches the approach agreed on earlier
// in this project (simplest to build and use, nothing to reset/leak).

// Supabase itself rate-limits how often the same email can request a new
// link — we hit this ourselves during testing. A client-side cooldown
// keeps a sender from immediately hammering "resend" into that limit.
const RESEND_COOLDOWN_SECONDS = 30;

// Supabase's error messages are accurate but a little terse/technical —
// this maps the ones a real sender might actually hit to plainer language,
// without inventing detail we don't actually know.
function friendlyAuthErrorMessage(error) {
  const message = error?.message || "";
  // Supabase-js sets `error.code` from the API's own `code` field (see
  // @supabase/auth-js's AuthApiError) — checking it directly is more
  // reliable than matching on message text, which is only used as a
  // fallback below for older/unclassified errors.
  const code = error?.code || "";

  if (/rate limit/i.test(message)) {
    return "You've requested a few links recently — please wait a bit before trying again.";
  }
  if (/invalid/i.test(message) && /email/i.test(message)) {
    return "That doesn't look like a valid email address.";
  }
  // The request was well-formed and reached Supabase, but Supabase itself
  // failed while trying to dispatch the email (e.g. its mail sender is
  // misconfigured or unavailable) — this isn't something the sender typed
  // wrong, and retyping/retrying their email won't fix it.
  if (code === "unexpected_failure" || /error sending .*email/i.test(message)) {
    return "We couldn't send that email right now — this is a problem on our end, not with your email address. Please try again shortly.";
  }
  return "Something went wrong sending the link. Please try again.";
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const hadSessionError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [hasSent, setHasSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  // Ticks the resend cooldown down once a second while it's active.
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  async function sendMagicLink(targetEmail) {
    setIsSending(true);
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setIsSending(false);

    if (error) {
      setErrorMessage(friendlyAuthErrorMessage(error));
      return;
    }

    setHasSent(true);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || isSending) return;
    sendMagicLink(trimmedEmail);
  }

  function handleResend() {
    if (cooldown > 0 || isSending) return;
    sendMagicLink(email);
  }

  if (hasSent) {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Check your email" backHref="/" />

        <p className="mt-[14px] text-sm text-black">
          We sent a sign-in link to <strong>{email}</strong>. Open it on
          this device to continue.
        </p>

        <p className="mt-3 text-sm text-[#C0C0C0]">
          Don&rsquo;t see it? Check spam, or request a new one below.
        </p>

        <Button
          variant="secondary"
          onClick={handleResend}
          disabled={isSending || cooldown > 0}
          className="mt-4 h-14 w-full"
        >
          {isSending
            ? "Sending…"
            : cooldown > 0
              ? `Resend link (${cooldown}s)`
              : "Resend link"}
        </Button>

        {errorMessage && (
          <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Sign in" backHref="/" />

      <p className="mt-[14px] text-sm text-black">
        Sign in to send payment requests and track who&rsquo;s paid.
      </p>

      {hadSessionError && (
        <p className="mt-3 text-sm text-red-600">
          Your session expired or that sign-in link didn&rsquo;t work. Sign
          in again below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          className="h-14 w-full rounded-[10px] border border-[#D9D9D9] px-4 text-base text-black outline-none focus:border-[#737373]"
        />

        <Button
          type="submit"
          variant="dark"
          disabled={isSending}
          className="mt-4 h-14 w-full"
        >
          {isSending ? "Sending…" : "Send magic link"}
        </Button>

        {errorMessage && (
          <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
        )}
      </form>

      <p className="mt-4 text-sm text-[#C0C0C0]">
        No password — we&rsquo;ll email you a link to sign in.
      </p>
    </div>
  );
}
