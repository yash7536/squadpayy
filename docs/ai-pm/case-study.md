# SquadPay — Case Study

*Making settling shared expenses less awkward.*

This document is the portfolio narrative: the problem, the product
decisions, where AI fits, how it was evaluated, what actually failed, and
what was (and wasn't) done about it. Every claim about evaluation results
is sourced from [`eval/ANALYSIS.md`](../../eval/ANALYSIS.md) and
[`eval/results/`](../../eval/results/) — nothing here is a projection.

## Product requirements, at a glance

A compact PRD-shaped summary — the rest of this document is the narrative
version of the same thing.

- **Problem:** groups who split shared costs do the tedious transcription/
  math by hand, and the payment ask is socially awkward, so it's delayed
  or skipped.
- **Target user:** friends/roommates/trip groups who already split costs
  informally (see §1).
- **Goals:** remove the tedious 80% (line-item transcription, tax math)
  with AI; keep the human as the final authority over every number; never
  let AI output become a financial action without review.
- **Non-goals (explicit):** general accounting/expense-tracking, discount/
  adjustment modeling beyond "fail safely," multi-currency support,
  moving money (SquadPay only ever *requests* payment).
- **Core requirement:** every AI-extracted value must be editable, and any
  value that looks internally inconsistent (reconciliation) or implausible
  (anomaly detection) must be flagged in plain language before the split
  is calculated. See [`guardrail-architecture.md`](guardrail-architecture.md).
- **Success criteria:** defined as hypotheses, not yet measured — see
  [`business-hypotheses.md`](business-hypotheses.md).

## 1. Real user problem

**Who this is for:** groups of friends who regularly split shared costs —
dinners, trips, rent, groceries — and end up doing the accounting
themselves, usually badly, usually on a phone calculator or a group chat
full of half-remembered numbers.

**The actual pain:**
- Splitting the *bill* is the easy 20%. Reading every line item off a
  receipt, working out who had what, applying tax/service proportionally,
  and getting the arithmetic right by hand is the tedious 80%.
- Asking friends to pay you back is socially awkward, so it gets delayed,
  softened into a vague "whenever works," or skipped entirely — which is
  its own cost (money not actually collected, or a friendship quietly
  taxed by unspoken resentment).
- Manual follow-up ("hey, did you see my message?") is the most
  uncomfortable part of the whole process, and it falls entirely on
  whoever fronted the bill.

**Why the current process (a calculator, a notes app, a mental tally)
actually sucks:** it's slow, it's error-prone under real conditions (a
loud restaurant, a phone at 11pm, someone who's had a drink), and it puts
100% of the social discomfort of "so, about the money" on one person with
zero tooling to make that ask feel normal.

## 2. Before vs. after

**Before — what people do manually today:**
1. Someone photographs or keeps the receipt.
2. They (or someone) manually reads every item, works out subtotal/tax,
   and figures out who owes what — usually approximated, rarely exact.
3. They send a payment request as a text message, worded carefully to not
   sound demanding.
4. If no one responds, they follow up manually, again, awkwardly.

**After — what SquadPay changes:**
1. Scan the receipt (or enter the bill manually — always available,
   never required to use AI).
2. AI extracts merchant, items, quantities, tax, and total into an
   editable form — the tedious transcription step, done automatically.
3. The user reviews and corrects anything wrong, informed by two
   independent automatic checks that flag suspicious values before the
   user even has to think to look for them.
4. SquadPay calculates the exact split — deterministic arithmetic, zero
   AI involvement at this step (`lib/domain/split-engine.ts`).
5. A WhatsApp payment request is drafted and ready to send — SquadPay
   requests, it never moves money.

**Where AI actually reduces friction:** step 2 only — the transcription
and arithmetic-setup work nobody enjoys doing by hand. AI does not decide
who owes what (that's deterministic code, step 4), does not decide
whether a number is trustworthy (that's two separate deterministic
guardrail layers, not the AI grading its own homework), and does not send
anything on the user's behalf without them confirming it first.

## 3. AI workflow

```
Input:            a receipt photo
AI processing:    Gemini (gemini-3.6-flash) extracts merchant, line
                   items, quantities, tax, and total as structured JSON
Structured output: zod-validated (lib/gemini/schema.ts) — malformed
                   responses are rejected before anything downstream
                   trusts them
Evaluation/validation: two independent deterministic layers —
                   reconciliation (does the AI's own math agree with
                   itself?) and anomaly detection (does the number look
                   plausible at all?) — see guardrail-architecture.md
Human review:      every extracted field is visible and editable; any
                   guardrail flag is shown in plain language with the
                   specific reason
Final action:      the user explicitly confirms before SquadPay
                   calculates the split or a payment request is drafted
```

Full detail: [`guardrail-architecture.md`](guardrail-architecture.md).

## 4. Evaluation

**How we know the AI output is good (or isn't):** a 15-receipt baseline
evaluation, run once for real against `gemini-3.6-flash`, scored by
deterministic field-level comparison against manually-verified ground
truth — not by asking the AI to grade itself, and not by eyeballing a few
demo runs. Full methodology: [`eval/README.md`](../../eval/README.md).

**What matters:** item/quantity/price/tax/total accuracy individually
(a receipt can be "close" in some fields and wrong in others — averaging
them into one score would hide that), whether extraction fails outright,
and — the metric that actually matters most for user trust — whether the
one existing safety check (reconciliation) would have caught a real
mistake.

**What the 15-receipt evaluation revealed** (see
[`eval/ANALYSIS.md`](../../eval/ANALYSIS.md) for the full breakdown):
- 11 of 15 receipts extracted successfully; 4 failed (1 rate-limit, 3
  schema-rejected discounts).
- Item accuracy 84%, quantity 100%, price 91%, tax 73%, total 91% —
  averaged over the 11 successful extractions.
- Only 33% (5/15) were "fully correct" by the strict bar (every field
  exact, both guardrail layers clean) — a real number, reported plainly,
  not softened.
- **Reconciliation succeeded on 100% of extractions — including the one
  receipt where the AI was provably wrong by 1000×.** This is the
  evaluation's central finding, not a footnote.

## 5. Failure modes

See [`eval/ANALYSIS.md`](../../eval/ANALYSIS.md) §2–3 for the full,
severity-ranked table. Summary of what can go wrong, and how dangerous
each actually is:

- **Dangerous:** a uniform scale/unit misread (receipt-15) — every number
  wrong by the same large factor, internally consistent, invisible to the
  one existing check.
- **Acceptable, product-handled correctly already:** an unreadable photo,
  a transient API failure, a discount the schema can't represent — all
  three fail *closed* (nothing gets calculated wrong; the user is routed
  to manual entry).
- **Low-stakes:** item-name transcription slips (a dropped digit, an
  autocorrected spelling, an abbreviated-text misread) — annoying, but
  doesn't change anyone's amount owed, and is exactly what the editable
  review screen exists to catch.
- **Caused by our own schema, not the model:** receipt-06's "wrong tax" is
  the AI correctly following its own prompt (rolling gratuity into
  `taxAndService`) against a ground-truth field that only captures the
  printed "tax" line. A finding about the evaluation's own definitions,
  not a model defect.

## 6. Guardrails + fallback

**What happens when AI is uncertain or wrong:** SquadPay doesn't ask the
AI whether it's uncertain — there's no reliable confidence signal to ask
for (see `lib/gemini/schema.ts`'s own comment on why a fabricated
confidence score was rejected earlier in this project). Instead, two
independent deterministic checks run on the *output*: reconciliation
(internal consistency) and anomaly detection (plausibility). Either can
stop the user and ask them to look, with a specific, plain-language reason
— never "AI is uncertain," never a raw error code.

**When automation stops:** any schema validation failure, any
reconciliation mismatch, any anomaly flag. **When the user is asked to
review:** always, for every extraction, by design — these checks add
*more* signal about what to look at, they don't replace the review step
that already existed.

**The manual fallback:** always available, never a second-class path.
Clearing every AI-extracted item and typing a total is a fully supported
flow, not an error state — this was true before the evaluation and is
exactly where the schema-rejected-discount case routes to.

## 7. Business / user value

No fabricated numbers here — see
[`business-hypotheses.md`](business-hypotheses.md) for the full list of
measurable hypotheses this product should eventually validate at scale.

**What friction this is designed to remove:** manual line-item
transcription, manual tax/split arithmetic, and the social awkwardness of
initiating a payment ask (a WhatsApp-ready request is a lower-friction ask
than a bespoke message).

**Real-user validation (12 known people, exploratory — see
[`user-validation-results.md`](user-validation-results.md) for full
detail and caveats):**
- 9/12 participants showed hesitation around asking friends to repay
  shared expenses — direct confirmation the underlying problem (§1) is
  real.
- Participants used SquadPay to identify forgotten or outstanding amounts
  and request payment — the observed value was surfacing money people had
  stopped tracking, not the receipt scan itself.
- In the older UI (since fixed), 6/12 found adding dishes or people
  somewhat unclear and 4/12 needed direct help; 8/12 said they'd use
  SquadPay again.
- All 12/12 participants expected integrated UPI/payment functionality
  for smoother payment completion — the most consistent single piece of
  feedback, logged and deliberately deferred (see Product decisions,
  below, and `decision-log.md`).
- 10/12 said they would check the AI-extracted receipt data before
  relying on it, and 3/12 reported an extraction issue where not all
  dishes were added.

This is exploratory evidence from a small sample, not a market
conclusion — no completion rate, satisfaction score, or adoption number is
reported because none was measured with enough rigor to state honestly.

**Why someone would actually use it:** because the tedious 80% (reading a
receipt, doing the math) is handled for them, while they keep full control
over the part that actually matters to them (whether the numbers are
right) — a claim this document can make credibly *because* the evaluation
and guardrail work above exists to back it, not because it sounds good.

## 8. Iteration — what this pass actually did

1. Ran the first real, unmodified-baseline evaluation (15 receipts, one
   Gemini call each, results preserved untouched in `eval/results/`).
2. Read every result and every raw AI output, not just the summary
   numbers.
3. Separated what was *found* from what was *worth fixing* —
   `decision-log.md`'s P0/P1/P2 split, explicitly rejecting the instinct
   to fix everything the evaluation surfaced.
4. Built exactly two production changes, both directly traceable to a
   specific evaluated failure: an anomaly-detection guardrail layer
   (receipt-15) and an honest failure message for schema-rejected
   discounts (receipts 08/12/14) — with the pre-existing "Try again
   always shows" gap fixed as a direct consequence, since the new failure
   case needed it.
5. Did not touch the extraction model, its retry logic, the reconciliation
   layer, or any unrelated page.
6. Did not re-run the evaluation to check whether the score improved —
   that requires an explicit new authorized run, deliberately kept
   separate from "did we ship a fix."

## Limitations, stated plainly

- 15 receipts is a failure-mode-discovery sample, not a statistically
  powered benchmark — see `eval/README.md`'s own Limitations section.
- No real user has used this product yet. Every claim in this document
  about *why* someone would use SquadPay is a hypothesis to validate
  (§7), not a measured result.
- The two new guardrail checks have unit tests against real captured data
  (including receipt-15's exact numbers) and were manually verified end to
  end in the live review UI using that same real data — but neither has
  yet fired from an actual *live* Gemini call end to end. That specific
  confirmation requires the next authorized evaluation run.

## Status update — both prior "next steps" are now done

1. ✅ **Second real Gemini evaluation, completed** (assembled across two
   API-key sessions due to free-tier quota limits — see
   [`eval/ANALYSIS.md`](../../eval/ANALYSIS.md) §7). Confirmed the new
   guardrails behave correctly against **live** model output, not just
   simulated/cached data: `detectAnomalies()` correctly flags a fresh
   receipt-15 extraction, and `isUnsupportedNegativeValueError()` was
   verified against a real `ZodError` from the real production schema.
   No regressions found on any of the 15 receipts versus baseline.
2. ✅ **Small-sample user validation, completed** — see
   [`user-validation-results.md`](user-validation-results.md). Confirmed
   the core problem is real (9/12 known participants showed hesitation
   around repayment follow-up) and confirmed the most requested next
   feature (UPI/GPay integration, expected by all 12) — deliberately not
   built reactively off one round of feedback; see Product Decisions above
   and `decision-log.md`.
3. **The product has since been deployed** to the existing production
   infrastructure (GitHub `squadpayy` → Vercel auto-deploy →
   `squadpayy.vercel.app`), smoke-tested against the live URL — receipt
   scan, both guardrail layers, item/equal splitting, WhatsApp payment
   request generation, and mobile viewport all confirmed working in
   production, not just locally.

## Next steps, in priority order

1. **Record the Loom walkthrough** against the now-live production URL —
   the product is deployed, evaluated (twice), and validated with real
   users, so this no longer needs a re-record later.
2. **Evaluate UPI/GPay integration** as a scoped, separate decision — the
   single most consistent piece of real user feedback (§ Real-user
   validation). Not started; needs its own problem/decision/evaluation
   pass, not a reactive addition.
3. Everything in `decision-log.md`'s P1 list remains open and
   un-prioritized against each other until enough real production usage
   accumulates to suggest which one actually matters.
4. A larger (beyond 5–10 person) user validation round, once there's a
   live URL to point real testers at directly instead of a local build.
