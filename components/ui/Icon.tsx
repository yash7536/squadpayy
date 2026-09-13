import { cn } from "@/lib/utils/cn";

/**
 * Thin wrapper around a Material Symbols ligature icon.
 *
 * The box is pinned to exactly `size × size` with `overflow: hidden` and
 * centered content. Material Symbols is loaded with `font-display: swap`
 * (see app/layout.tsx), which means there's a real window where the browser
 * renders the fallback — the literal icon name as text, e.g.
 * "add_photo_alternate" — before the glyph font arrives. That fallback text
 * is far wider than the eventual glyph; without a fixed box, the swap
 * visibly reflows everything next to it (a concrete cause of mobile
 * jitter). Pinning the box means the swap happens invisibly inside a
 * clipped, stably-sized container instead.
 */
export function Icon({
  name,
  className,
  size = 20,
  filled = false,
}: {
  name: string;
  className?: string;
  size?: number;
  filled?: boolean;
}) {
  return (
    <span
      className={cn(
        "material-symbols-outlined inline-flex items-center justify-center leading-none select-none shrink-0 overflow-hidden",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
