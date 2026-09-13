"use client";

import { useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Route-segment error boundary for everything under the (app) group.
 *
 * Without this file, a render error in a page has no scoped boundary to
 * catch it — Next.js has to hand the error to a parent boundary, and
 * exactly what renders in the meantime (nothing, in the worst case) is not
 * something to leave to chance. With this in place, a failure in any page's
 * content shows a real, on-brand, recoverable message here instead — the
 * header and bottom nav (rendered by the layout, outside this boundary)
 * stay interactive, and "Try again" re-renders just this segment.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] route segment error:", error);
  }, [error]);

  return (
    <div className="container-narrow gutter w-full py-16">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center text-error">
          <Icon name="error" size={28} />
        </div>
        <h1 className="text-headline-lg text-on-surface">Something went wrong</h1>
        <p className="text-body-md text-on-surface-variant max-w-sm">
          This page hit a snag loading. Your data is safe — try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-6 py-3 rounded-xl text-label-md font-semibold shadow-card transition-colors active:scale-95 mt-2"
        >
          <Icon name="refresh" size={18} />
          Try again
        </button>
      </div>
    </div>
  );
}
