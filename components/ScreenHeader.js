import Link from "next/link";

// The "< " back arrow + page title pattern that appears at the top of
// nearly every screen in the Figma prototype (all except Home). Reused so
// the remaining 8 screens stay visually consistent as we build them.
export default function ScreenHeader({ title, backHref }) {
  return (
    <div className="pt-5">
      <Link
        href={backHref}
        aria-label="Back"
        className="inline-block text-2xl leading-none text-black"
      >
        &lt;
      </Link>
      <h1 className="mt-[14px] text-2xl font-semibold text-black">{title}</h1>
    </div>
  );
}
