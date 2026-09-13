const inr = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Format a rupee amount as "₹1,360" — no decimals, Indian digit grouping. */
export function formatCurrency(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}₹${inr.format(Math.abs(Math.round(amount)))}`;
}

/** "Aman Verma" -> "AV". Falls back to the first two letters of a single name. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Relative "20m ago" / "2h ago" / "Yesterday" / "3 days ago" style timestamp. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

/** "Tonight, Nov 14" style friendly date used on bill detail forms. */
export function formatBillDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const isToday = date.toDateString() === now.toDateString();
  const formatted = date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
  return isToday ? `Tonight, ${formatted}` : formatted;
}
