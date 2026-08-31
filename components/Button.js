import Link from "next/link";

// Matches the button styles used throughout the Figma prototype.
// - primary: the dark "main action" button (e.g. Home's "Upload a bill")
// - secondary: light gray buttons (e.g. "Upload from gallery")
// - accent: the dusty-rose button (e.g. "Take a photo")
const VARIANT_STYLES = {
  primary: "bg-[#737373] text-white font-semibold",
  secondary: "bg-[#D9D9D9] text-black font-normal",
  accent: "bg-[#E6DDDD] text-black font-normal",
  // Same fill as "primary", but black/regular text — this exact combo is
  // what the Figma file uses for "Continue to split" on Review Bill. It's
  // a real inconsistency in the source design (Home's equivalent button
  // uses white/bold text on the same fill), kept faithfully rather than
  // "fixed", per the instruction to reproduce the design as-is.
  dark: "bg-[#737373] text-black font-normal",
};

// Renders as a link when `href` is passed, otherwise a plain button.
// Width/height aren't baked in here since they differ slightly per screen
// in the design — pass them via className at the call site.
export default function Button({
  children,
  href,
  variant = "secondary",
  className = "",
  ...props
}) {
  const classes = `flex items-center justify-center rounded-[10px] text-base ${VARIANT_STYLES[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
