# Real User Validation — Results

**Status: conducted.** This is the results document referenced as "not yet
executed" in [`user-validation-plan.md`](user-validation-plan.md) — that
plan describes the intended design; this document reports what was
actually observed. Treat this as **small-sample exploratory validation**,
not a statistically powered study — same caveat as the 15-receipt AI
evaluation, and for the same reason: the value here is surfacing real
friction points, not producing a defensible percentage.

## What was observed

- **6 participants showed hesitation around asking friends to repay
  shared expenses.** This is the core social friction SquadPay is built
  around (see `case-study.md` §1) — direct, firsthand confirmation that
  the problem is real, not assumed.
- **Participants used SquadPay to identify forgotten or outstanding
  amounts and request payment.** The core value observed wasn't "scanning
  a receipt is neat" — it was surfacing money that had been forgotten
  about and turning that into an actual request. Matches the product
  insight in `case-study.md`: the core value is reducing friction around
  *settlement and follow-up*, not receipt scanning for its own sake.
- **2 participants initially lacked confidence in how SquadPay could
  help and needed a demonstration.** The value proposition wasn't
  immediately self-evident from the product alone for everyone — a real
  onboarding/first-impression gap, not a technical one.
- **3 participants found the workflow helpful.**
- **3 participants requested GPay/UPI integration for smoother payment
  completion.** The most consistent, specific piece of feedback across
  the sample — see `decision-log.md`'s deferred-scope entries and
  `case-study.md`'s Next Steps for why this is a deliberate future
  decision, not something added reactively here.

## What this does and does not tell us

**Does:** the underlying problem (awkward repayment follow-up) is real
and recognizable to real people; SquadPay's core loop was usable enough
for people to complete it and articulate specific, actionable feedback;
payment-completion (not extraction or splitting) is where people most
wanted less friction.

**Does not:** this is not evidence of adoption, retention, satisfaction
at scale, or business impact. No completion-rate percentage, no
time-to-complete average, and no NPS-style score is reported here because
none of that was measured with enough participants (or rigor) to state
honestly — seeing "6 participants" and "3 participants" as exact counts,
not "50%" or "60%," is deliberate: turning 6 people into a percentage
implies a sample size this small does not support.

## Product response

- The repeated ask for UPI/GPay integration is **noted and deferred**,
  not built reactively off one round of feedback — see `decision-log.md`
  and `case-study.md` Next Steps. SquadPay's job stays receipt → split →
  review → request; a payment-completion integration is a meaningfully
  larger scope decision than this validation round justifies on its own.
- The onboarding-confidence gap (2 participants) is logged as a real,
  specific finding worth another look — not fixed here, since "do a demo"
  working around it isn't evidence the product itself needs to change
  yet; more sessions would clarify whether this is a pattern or noise
  from n=2.

## Limitations

Small sample, single round, no controlled comparison, no quantitative
timing or completion-rate data captured this round. See
`case-study.md`'s own Limitations section — this file doesn't repeat it,
it points to it, so there's one place these caveats live and stay
consistent.
