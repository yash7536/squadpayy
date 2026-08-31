import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client bound to the current request's cookies —
// this is how Server Components, Server Actions, and Route Handlers know
// who's actually logged in. Uses the ANON key (never the service role
// key), so Row Level Security applies exactly as it would for any other
// client: a signed-in sender can only read/write their own
// bills/people/splits/payment_requests — enforced by Postgres itself, not
// by application code remembering to filter correctly.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Thrown when called from a Server Component, where cookies
            // can't be written — harmless here, because proxy.js
            // refreshes the session on every request instead.
          }
        },
      },
    }
  );
}

// Convenience helper: the current signed-in user, or null.
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
