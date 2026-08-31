import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// During Phase 1 (before a Supabase project is connected) these env vars
// won't be set yet. We avoid crashing the whole app on import — pages that
// don't touch the database can still render. Anything that actually calls
// Supabase before it's configured will get a clear error instead of a
// confusing one.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local (see .env.local.example)."
    );
  }
  return supabase;
}
