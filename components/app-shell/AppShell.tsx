import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";

export function AppShell({ children }: { children: ReactNode }) {
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
