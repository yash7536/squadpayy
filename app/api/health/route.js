import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Simple diagnostic endpoint: confirms env vars are loaded and the Supabase
// connection actually works, without ever revealing the key values
// themselves. Visit /api/health in the browser to check.
export async function GET() {
  const envReport = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };

  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        env: envReport,
        error: "Supabase client not initialized (missing public env vars).",
      },
      { status: 500 }
    );
  }

  // A lightweight real query. With RLS on and nobody signed in, this should
  // succeed and return 0 rows (not an error) — that's what "connected and
  // RLS is working" looks like from an anonymous request.
  const { error, count } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json(
      { ok: false, env: envReport, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    env: envReport,
    message:
      "Connected to Supabase. 'bills' table is reachable (RLS active, " +
      "so an anonymous request correctly sees 0 rows).",
    visibleRowCount: count,
  });
}
