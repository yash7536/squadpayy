# Real User Validation Plan

**Status: not yet conducted.** This is the plan, not the results. No users
have been recruited, no sessions run, no feedback collected. Nothing in
this document is a finding — it's a test design, written before the test,
so the eventual results can be reported against a plan decided in advance
rather than a narrative fitted after the fact.

## Goal

Answer one question with real evidence: *can a real person use SquadPay to
split a shared restaurant bill, and where do they actually get stuck?*

## Participants

5–10 people who plausibly split bills with friends/roommates regularly.
No professional-tester requirement — the target user is anyone who's ever
been the one person in a group chat doing the math.

## Task

Single core task, given with minimal instruction (the point is to see
where the product itself explains or fails to explain, not to coach
people through it):

> "Here's a photo of a restaurant receipt. Use SquadPay to split it with
> two friends and get a payment request ready to send."

## What to measure

| Measure | How |
|---|---|
| Task completion | Did they reach a sent (or ready-to-send) payment request without facilitator intervention? |
| Time to complete | Timestamp start (receipt provided) to finish (request sent/ready) |
| Correction count | How many fields they edited on the review screen, and which ones |
| Confusion points | Where they paused, asked a question, or visibly hesitated — noted by an observer, timestamped against the flow step |
| Understanding of AI review | After the task: "What did you think SquadPay was checking when it showed you that screen?" — open-ended, not multiple choice |
| Trust in extracted values | After the task: "How confident were you that the numbers SquadPay pulled from the receipt were correct?" (1–5) + why |
| Whether they actually sent the request | Observed directly, not self-reported |

## Qualitative capture

For each session: think-aloud notes during the task, plus the two
post-task questions above verbatim. Look specifically for:
- Anyone treating a reconciliation or anomaly warning as "the app is
  broken" rather than "something needs a second look" — a sign the copy
  needs work, not the logic.
- Anyone not noticing a warning at all — a sign it needs more visual
  weight, not more words.
- Anyone confused about *why* a field is editable — a sign the "you're in
  control" framing isn't landing.

## What happens after

The eventual case study update should read, verbatim in spirit:

> "N people tested it → these were the recurring friction points → I
> changed Y → the next test showed Z."

That sentence cannot be written honestly until the test has actually run.
Until then, `case-study.md` and `business-hypotheses.md` correctly say
"not yet measured" wherever this would apply, and should keep saying so
until this plan is executed.

## Explicit non-goals for this round

- Not testing item-by-item vs. equal-split mode preference — out of scope
  for a first read on the core flow.
- Not testing the manual-entry-only path (no receipt scan) — same reason.
- Not a statistically powered study. 5–10 people surfaces friction points,
  it does not produce a defensible completion-rate percentage — same
  caveat as the 15-receipt AI evaluation, stated for the same reason.
