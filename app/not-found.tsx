import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <Logo size={36} />
        <div className="flex flex-col items-center gap-2">
          <span className="text-numeral-hero text-on-surface">404</span>
          <h1 className="text-headline-lg text-on-surface">Nothing here</h1>
          <p className="text-body-md text-on-surface-variant">
            That page doesn&rsquo;t exist, or it moved. Let&rsquo;s get you back to your splits.
          </p>
        </div>
        <Link
          href="/home"
          className="inline-flex items-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-6 py-3 rounded-xl text-label-md font-semibold shadow-card transition-colors active:scale-95"
        >
          <Icon name="home" size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
