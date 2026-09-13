import type { ReactNode } from "react";

/**
 * A Next.js `template` (unlike `layout`) remounts on every navigation, so
 * this fade + slight rise plays once per page visit — a restrained page
 * entrance instead of a hard cut, without needing to touch every page file.
 *
 * Deliberately plain CSS (`.page-enter`, see globals.css), not Framer
 * Motion: a JS-driven "initial opacity:0 → animate to 1" here would bake
 * opacity:0 into the server-rendered HTML for the entire page and rely on
 * React hydrating before the user ever sees it. On a fast desktop that gap
 * is invisible; on a slower real phone (or if hydration hiccups at all) it
 * reads as "the page is blank." A CSS keyframe animation starts the moment
 * the browser paints the element — no JS required — so the content is never
 * gated on script execution. Server component, so it adds no client JS.
 */
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
