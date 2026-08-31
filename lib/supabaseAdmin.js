// Server-only Supabase client using the service role key. This
// deliberately bypasses Row Level Security — see supabase/schema.sql for
// why (RLS can't check "does this visitor have the right token", only a
// row's data, so the public /pay/[token] page and its "Mark as Paid"
// action are handled by trusted server code instead).
//
// NEVER import this from a "use client" file. The guard below makes an
// accidental browser import fail loudly instead of silently shipping
// (or silently not shipping, and just breaking) the service role key.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabaseAdmin.js was imported into browser code. This file uses " +
      "the Supabase service role key and must only be used in server-side " +
      "code (Server Components, Server Actions, Route Handlers)."
  );
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client is not configured. Add " +
        "SUPABASE_SERVICE_ROLE_KEY to .env.local (see .env.local.example)."
    );
  }
  return supabaseAdmin;
}
