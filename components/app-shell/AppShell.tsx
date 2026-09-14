"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";
import { STORAGE_KEY as DRAFT_STORAGE_KEY } from "@/lib/data/draft-context";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // The in-progress "create a split" draft lives in sessionStorage so an
  // accidental reload mid-flow doesn't lose work (see draft-context.tsx).
  // But that same persistence must not let an abandoned attempt reappear
  // as the starting state next time someone opens New Split. Completing a
  // split already clears it (reset() in new-split/summary/page.tsx); this
  // catches every other way to leave — Discard and go back, the nav bar,
  // browser back — generically, the moment the route actually leaves the
  // /new-split wizard without having completed it.
  const wasInNewSplit = useRef(pathname.startsWith("/new-split"));
  useEffect(() => {
    const isInNewSplit = pathname.startsWith("/new-split");
    if (wasInNewSplit.current && !isInNewSplit) {
      try {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        // sessionStorage can throw in locked-down contexts (private mode,
        // disabled storage) — safe to ignore, nothing to clean up.
      }
    }
    wasInNewSplit.current = isInNewSplit;
  }, [pathname]);

  return (
    <div className="min-h-screen bg-surface">
      <AppHeader />
      <main className="w-full pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 bg-surface">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
