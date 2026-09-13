"use client";

import { useSquadPay } from "@/lib/data/store-context";
import { ActivityFeed } from "@/components/home/ActivityFeed";

export default function ActivityPage() {
  const { activity } = useSquadPay();
  const sorted = [...activity].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className="container-narrow gutter w-full py-8">
      <div className="mb-8">
        <h1 className="text-display-lg text-on-surface tracking-tight">Activity</h1>
        <p className="text-body-lg text-on-surface-variant mt-1">
          Every nudge, payment, and split — as it happens.
        </p>
      </div>
      <ActivityFeed events={sorted} title="All activity" />
    </div>
  );
}
