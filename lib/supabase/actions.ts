"use server";

import { createClient } from "./server";
import { getSiteUrl, isSupabaseConfigured } from "./env";

export interface SendMagicLinkResult {
  ok: boolean;
  message: string;
}

/** Sends a Supabase magic-link email. No-ops with a helpful message in demo mode. */
export async function sendMagicLink(email: string): Promise<SendMagicLinkResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Supabase isn't configured yet — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable real magic-link sign-in.",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: false, message: "Auth is unavailable right now." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: `Check ${email} for your sign-in link.` };
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
}
