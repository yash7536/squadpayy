"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client for the login page. Deliberately uses
// @supabase/ssr's createBrowserClient (not plain @supabase/supabase-js)
// so the session is written to cookies instead of only localStorage —
// that's what lets Server Components/Actions (lib/supabaseServer.js) see
// "who's logged in" too. Using the plain client here would silently break
// server-side auth checks after a successful sign-in.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
