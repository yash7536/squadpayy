# Real User Validation — Results

**Status: conducted.** This is the results document referenced as "not yet
executed" in [`user-validation-plan.md`](user-validation-plan.md) — that
plan describes the intended design; this document reports what was
actually observed, across 12 known people who tested SquadPay. Treat this
as **small-sample exploratory validation**, not a statistically powered
study — same caveat as the 15-receipt AI evaluation, and for the same
reason: the value here is surfacing real friction points, not producing a
defensible percentage.

## What was observed

- **9/12 participants found asking friends for repayment an issue.**
  This is the core social friction SquadPay is built around (see
  `case-study.md` §1) — direct, firsthand confirmation that the problem is
  real, not assumed. Reasons given included concern that friends might get
  offended, friends saying they'd already paid for something previously,
  and friends saying they didn't have money at the moment.
- **Before SquadPay, 3/12 said they'd otherwise use other apps or ask
  friends to pay directly**; others described friends paying back later
  (including in cash) or hesitating to ask depending on the person and
  situation.
- **What was useful (signals may overlap, not summed): 3/12 pointed to
  reminders to pay, 2/12 to AI bill scanning, 4/12 to the ease of adding
  dishes/amounts among selected people, and 3/12 to the simple UI.** The
  core value observed wasn't "scanning a receipt is neat" on its own —
  matches the product insight in `case-study.md` that the value is
  reducing friction around *settlement and follow-up*, not receipt
  scanning for its own sake.
- **In the older UI (since fixed), 6/12 found adding dishes or people
  somewhat unclear, 1/12 found it confusing because it didn't behave like
  a typical payment app, 4/12 needed direct help, and 3/12 needed to work
  out the item-level splitting interaction** — others figured it out
  themselves.
- **Asked what they'd change (since applied to the current visual
  design), 4/12 said nothing, 4/12 wanted a more minimal visual treatment,
  and 4/12 mentioned the logo.**
- **All 12/12 participants expected integrated UPI/payment functionality
  for smoother payment completion.** The most consistent, specific piece
  of feedback across the sample — see `decision-log.md`'s deferred-scope
  entries and `case-study.md`'s Next Steps for why this is a deliberate
  future decision, not something added reactively here.
- **10/12 said they would check the AI-extracted receipt data before
  relying on it** — a review habit, not a statement that participants
  distrusted AI.
- **3/12 reported an extraction issue where not all dishes were added.**
- **8/12 said they would use SquadPay again; 4/12 were fine without it.**

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
honestly — reporting fractions like "9/12" and "3/12" out of 12 known
people, not "75%" or "25%," is deliberate: turning a group this size into
a percentage implies a rigor this round doesn't support, and overlapping
categories (like "what was useful") are reported separately rather than
summed.

## Product response

- The repeated ask for UPI/GPay integration — now confirmed by all 12
  participants — is **noted and deferred**, not built reactively off one
  round of feedback — see `decision-log.md` and `case-study.md` Next
  Steps. SquadPay's job stays receipt → split → review → request; a
  payment-completion integration is a meaningfully larger scope decision
  than this validation round justifies on its own.
- The older-UI usability issues (adding dishes/people, the item-level
  splitting interaction) that this validation round surfaced were
  addressed in the current UI rather than left open.
- The visual-design feedback (a more minimal treatment, the logo) was
  likewise carried into the current visual design.

## Limitations

Small sample (12 known people), single round, no controlled comparison,
no quantitative timing or completion-rate data captured this round. See
`case-study.md`'s own Limitations section — this file doesn't repeat it,
it points to it, so there's one place these caveats live and stay
consistent.
