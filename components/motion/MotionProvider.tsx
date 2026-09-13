"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * App-wide motion defaults. `reducedMotion="user"` makes every animation in
 * the tree automatically respect the OS-level prefers-reduced-motion
 * setting — transform/layout animations collapse to instant, opacity fades
 * still play. This is the one global switch; individual components don't
 * need their own prefers-reduced-motion checks.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </MotionConfig>
  );
}
