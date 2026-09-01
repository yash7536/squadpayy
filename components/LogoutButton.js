"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/authActions";

// Small, unobtrusive — there's no logout control in the Figma prototype
// (it has no login screen either), so this matches the app's existing
// muted secondary-text styling rather than introducing a new visual
// pattern.
export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => signOutAction())}
      disabled={isPending}
      className="text-sm text-[#737373] underline underline-offset-2"
    >
      {isPending ? "Signing out…" : "Log out"}
    </button>
  );
}
