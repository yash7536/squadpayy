import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatCurrency, formatRelativeTime } from "@/lib/domain/format";
import type { ActivityEvent } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

const EVENT_ICON: Record<ActivityEvent["type"], string> = {
  viewed: "visibility",
  paid: "payments",
  created: "receipt_long",
  settled: "check_circle",
  nudged: "send",
};

const EVENT_TONE: Record<ActivityEvent["type"], string> = {
  viewed: "bg-primary-fixed text-primary-container",
  paid: "bg-tertiary-fixed text-tertiary-container",
  created: "bg-surface-container-high text-on-surface",
  settled: "bg-tertiary-fixed text-tertiary-container",
  nudged: "bg-info-container text-info",
};

export function ActivityFeed({ events, title = "Recent activity" }: { events: ActivityEvent[]; title?: string }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-headline-sm text-on-surface">{title}</h3>
      </div>
      {events.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Nothing yet — create a split to get started.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  EVENT_TONE[event.type],
                )}
              >
                <Icon name={EVENT_ICON[event.type]} size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-body-sm text-on-surface">
                  <span className="font-semibold">{event.actorName}</span> {event.detail}
                  {typeof event.amount === "number" && (
                    <>
                      {" "}
                      <span className="font-semibold text-tertiary-container">
                        {formatCurrency(event.amount)}
                      </span>
                    </>
                  )}
                </p>
                <span className="text-caption-caps text-secondary">
                  {formatRelativeTime(event.timestamp)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
