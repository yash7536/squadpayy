"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { useSquadPay } from "@/lib/data/store-context";

const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/splits", label: "Splits" },
  { href: "/activity", label: "Activity" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { participants, currentUserId } = useSquadPay();
  const you = participants.find((p) => p.id === currentUserId);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md border-b border-surface-variant pt-[env(safe-area-inset-top)]">
      <div className="h-16 container-max gutter flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/home" className="focus-ring rounded-md">
            <Logo size={32} />
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-label-md transition-colors",
                    active
                      ? "text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/new-split"
            className="inline-flex items-center gap-1.5 bg-primary-container text-on-primary hover:bg-primary px-4 py-2 rounded-xl text-label-md font-semibold transition-colors active:scale-95"
          >
            <Icon name="add" size={18} />
            <span className="hidden sm:inline">New split</span>
          </Link>
          <div className="h-6 w-px bg-surface-variant hidden sm:block" />
          <Link
            href="/profile"
            className="flex items-center rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus-ring"
          >
            <Avatar name={you?.name ?? "You"} size="sm" tone="accent" />
          </Link>
        </div>
      </div>
    </header>
  );
}
