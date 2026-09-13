"use client";

import { useState, useTransition } from "react";
import { Logo, LogoMark } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { sendMagicLink } from "@/lib/supabase/actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const res = await sendMagicLink(email.trim());
      setResult(res);
    });
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* One restrained glow — not two — kept small enough to read as an
          accent, not template filler. */}
      <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-primary-fixed/25 blur-3xl pointer-events-none" />
      {/* Oversized, near-invisible brand mark: the same "editorial watermark"
          move as Home's "OWED" wordmark behind the hero, but using the
          actual logo asset instead of inventing new marketing copy. */}
      <div className="absolute -bottom-20 -left-20 opacity-[0.04] pointer-events-none select-none hidden sm:block">
        <LogoMark size={340} />
      </div>

      <div className="page-enter relative w-full max-w-md flex flex-col items-center">
        <Logo size={36} className="mb-10" />

        <div className="w-full bg-surface-container-lowest rounded-xl shadow-elevated p-8 sm:p-10 flex flex-col gap-6">
          {result?.ok ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="w-16 h-16 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary-container">
                <Icon name="mark_email_read" size={32} />
              </div>
              <div>
                <h1 className="text-headline-lg text-on-surface">Check your email</h1>
                <p className="text-body-md text-on-surface-variant mt-2">{result.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-label-sm text-primary-container hover:text-primary font-semibold transition-colors mt-1"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-display-lg text-on-surface tracking-tight">Sign in</h1>
                <p className="text-body-md text-on-surface-variant mt-2">
                  Sign in to keep your splits synced and send payment requests.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <label htmlFor="email" className="text-label-sm text-on-surface font-semibold">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-body-md focus:outline-none focus:bg-surface-container-lowest focus-ring border border-surface-variant"
                />

                {result && !result.ok && (
                  <div className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2.5">
                    <Icon name="error" className="text-error shrink-0 mt-0.5" size={16} />
                    <p className="text-body-sm text-on-error-container">{result.message}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="h-14 mt-1 inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary hover:bg-primary text-headline-sm font-bold rounded-xl shadow-elevated transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <Icon
                    name={pending ? "sync" : "mail"}
                    size={20}
                    className={pending ? "animate-spin" : undefined}
                  />
                  Continue with magic link
                </button>
                <p className="text-body-sm text-on-surface-variant text-center">
                  No password needed.
                </p>
              </form>
            </>
          )}
        </div>

        {!result?.ok && (
          <a
            href="/home"
            className="text-label-sm text-on-surface-variant hover:text-on-surface font-semibold transition-colors mt-6"
          >
            Prefer to explore first? Continue in demo mode
          </a>
        )}
      </div>
    </div>
  );
}
