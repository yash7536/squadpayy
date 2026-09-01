import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatRelativeTime } from "./formatRelativeTime.js";

const NOW = new Date("2026-09-02T12:00:00.000Z");

function minutesAgo(n) {
  return new Date(NOW.getTime() - n * 60 * 1000).toISOString();
}
function hoursAgo(n) {
  return new Date(NOW.getTime() - n * 60 * 60 * 1000).toISOString();
}
function daysAgo(n) {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("formatRelativeTime", () => {
  test("null/undefined/empty input returns null, not a crash", () => {
    assert.equal(formatRelativeTime(null, NOW), null);
    assert.equal(formatRelativeTime(undefined, NOW), null);
    assert.equal(formatRelativeTime("", NOW), null);
  });

  test("an invalid date string returns null rather than 'Invalid Date'", () => {
    assert.equal(formatRelativeTime("not a date", NOW), null);
  });

  test("under a minute ago is 'just now'", () => {
    assert.equal(formatRelativeTime(NOW.toISOString(), NOW), "just now");
    assert.equal(formatRelativeTime(minutesAgo(0.5), NOW), "just now");
  });

  test("a timestamp slightly in the future (clock skew) is clamped to 'just now', not negative", () => {
    const future = new Date(NOW.getTime() + 5000).toISOString();
    assert.equal(formatRelativeTime(future, NOW), "just now");
  });

  test("minutes ago, singular and plural", () => {
    assert.equal(formatRelativeTime(minutesAgo(1), NOW), "1 minute ago");
    assert.equal(formatRelativeTime(minutesAgo(5), NOW), "5 minutes ago");
    assert.equal(formatRelativeTime(minutesAgo(59), NOW), "59 minutes ago");
  });

  test("hours ago, singular and plural", () => {
    assert.equal(formatRelativeTime(hoursAgo(1), NOW), "1 hour ago");
    assert.equal(formatRelativeTime(hoursAgo(3), NOW), "3 hours ago");
    assert.equal(formatRelativeTime(hoursAgo(23), NOW), "23 hours ago");
  });

  test("days ago, singular and plural, up to a week", () => {
    assert.equal(formatRelativeTime(daysAgo(1), NOW), "1 day ago");
    assert.equal(formatRelativeTime(daysAgo(3), NOW), "3 days ago");
    assert.equal(formatRelativeTime(daysAgo(6), NOW), "6 days ago");
  });

  test("a week or older falls back to an actual date, not '1 week ago'", () => {
    const result = formatRelativeTime(daysAgo(7), NOW);
    assert.notEqual(result, "7 days ago");
    assert.match(result, /\d/); // contains a day number
  });

  test("never claims a future action — no 'in X' phrasing for any input", () => {
    for (const iso of [minutesAgo(5), hoursAgo(2), daysAgo(3), daysAgo(30)]) {
      assert.doesNotMatch(formatRelativeTime(iso, NOW), /^in /i);
    }
  });
});
