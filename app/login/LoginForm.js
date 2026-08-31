"use client";

import { useState } from "react";
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
export default function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const hadError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setStatus("sending");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
        <ScreenHeader title="Check your email" backHref="/" />
        <p className="mt-[14px] text-sm text-black">
          We sent a sign-in link to <strong>{email}</strong>. Open it on
          this device to continue.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[393px] flex-1 flex-col bg-white px-4">
      <ScreenHeader title="Sign in" backHref="/" />

      <p className="mt-[14px] text-sm text-black">
        Sign in to send payment requests and track who&rsquo;s paid.
      </p>

      {hadError && (
        <p className="mt-3 text-sm text-red-600">
          That sign-in link didn&rsquo;t work — it may have expired. Try
          again below.
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
          disabled={status === "sending"}
          className="mt-4 h-14 w-full"
        >
          {status === "sending" ? "Sending…" : "Send magic link"}
        </Button>

        {status === "error" && (
          <p className="mt-3 text-sm text-red-600">
            Something went wrong sending the link. Please try again.
          </p>
        )}
      </form>

      <p className="mt-4 text-sm text-[#C0C0C0]">
        No password — we&rsquo;ll email you a link to sign in.
      </p>
    </div>
  );
}
