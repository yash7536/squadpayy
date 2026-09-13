import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * SquadPay is product-first: every page already renders fine for an
 * anonymous visitor (lib/data/store-context.tsx falls back to local demo
 * data whenever there's no signed-in user — that's been true since before
 * Supabase was even wired up). So this middleware does NOT gate any page
 * behind auth. Its only two jobs:
 *  1. Keep the Supabase session cookie refreshed on every request (the
 *     standard Supabase SSR pattern — needed for #5 in the audit: sessions
 *     must survive a refresh).
 *  2. Send an already-signed-in user away from /login — no reason to show
 *     them the sign-in screen again.
 * Individual pages/actions that actually need an account (see the Profile
 * page, or any real Supabase write) prompt for sign-in themselves, in place
 * — nothing here forces a redirect to get there.
 */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // API routes handle their own auth (or, like /api/receipts/scan, need
    // none) and must return JSON on failure, never an HTML redirect to
    // /login — so they're excluded from this page-level gate entirely.
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
