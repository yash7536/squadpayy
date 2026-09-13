import { Icon } from "@/components/ui/Icon";

export function RecoveryStat({ pct }: { pct: number }) {
  const circumference = 100;
  const dash = Math.max(0, Math.min(100, pct));

  return (
    <div className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between shadow-card">
      <div className="flex items-center gap-3">
        <svg className="w-10 h-10 -rotate-90 text-primary-container" viewBox="0 0 36 36">
          <path
            className="text-surface-container-highest"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.8"
          />
          <path
            className="text-primary-container"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeDasharray={`${dash}, ${circumference}`}
            strokeLinecap="round"
            strokeWidth="3.8"
          />
        </svg>
        <div>
          <p className="text-label-md font-semibold text-on-surface">{pct}% Recovery rate</p>
          <p className="text-body-sm text-secondary">Share of splits fully settled</p>
        </div>
      </div>
      <Icon name="verified" className="text-tertiary-container" size={20} />
    </div>
  );
}
