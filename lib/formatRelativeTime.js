// Turns a persisted timestamp into a short, truthful "how long ago" label
// — used for "Last reminded: …" on Payment Reminder. Deliberately never
// implies anything about the future (no "reminding again in..."): this
// only describes something that already happened (see
// lib/paymentRequestsDb.js's markReminderSent) — there's no scheduler in
// this app to promise a future reminder from.
//
// Pure function (no Date.now() default baked in) so it's easy to test
// deterministically — see formatRelativeTime.test.mjs.
export function formatRelativeTime(isoString, now = new Date()) {
  if (!isoString) return null;

  const then = new Date(isoString);
  if (Number.isNaN(then.getTime())) return null;

  // Clamp negative diffs (a slightly-ahead persisted timestamp due to
  // clock skew between the DB and this read) to "just now" rather than
  // showing a nonsensical "in the past" negative duration.
  const diffSeconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));

  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  // Older than a week — a relative label ("2 weeks ago") gets vague fast,
  // so switch to an actual date. Include the year only once it's not the
  // same year as `now`, to keep it short for anything within ~12 months.
  return then.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: then.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
