"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/splits", label: "Splits", icon: "receipt_long" },
  { href: "/new-split", label: "New", icon: "add_circle" },
  { href: "/activity", label: "Activity", icon: "history" },
  { href: "/profile", label: "Profile", icon: "person" },
];

/** Bottom thumb-reach navigation, mobile-only. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-variant pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors",
                active ? "text-primary-container" : "text-on-surface-variant",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon name={tab.icon} size={22} filled={active} />
              <span className="text-[10px] font-label-sm font-semibold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
