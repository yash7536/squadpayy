# SquadPay AI — Product Decision Log

**Status:** Sections A–C below were written after the first real
15-receipt Gemini evaluation (see
[`eval/results/summary.json`](../../eval/results/summary.json) and
[`eval/ANALYSIS.md`](../../eval/ANALYSIS.md)). Section D was added after a
full product-readiness audit that inspected the actual implementation
(not just documentation) end to end. Every number cited anywhere in this
document is from the actual evaluation run or actual code — nothing is
projected or estimated.

**Ground rule for this whole document:** an imperfect score is not
automatically a bug. The question for every finding below is *"does this
materially affect a real user's trust, their bill split, or a payment
request,"* not *"did the eval find something less than 100%."*

---

## A. P0 — must fix before portfolio demo

These are the only two findings that directly touch financial correctness
or user trust, and both were fixed in this pass.

### A1. No guardrail against a uniform scale/unit misread (receipt-15)

- **Finding:** Gemini read a receipt's "28.182" as the float 28.182
  instead of 28,182 (a thousands separator misread as a decimal point).
  Every number came out exactly 1000× too small, and because the error was
  applied uniformly, items + tax still summed to the total —
  `reconciled: true`.
- **Why P0:** This is the one failure mode in the whole evaluation that
  could produce a materially wrong split with **no warning shown to the
  user at all**. Reconciliation, the app's one existing safety check,
  structurally cannot catch it (it only checks the AI's arithmetic against
  itself, not against reality). A 100×/1000× error in the *other*
  direction (too large, not too small) would be genuinely costly and
  embarrassing to whoever gets asked to pay.
- **Decision:** Add a second, independent, deterministic guardrail layer —
  not a confidence model — that flags implausible numbers directly. See
  [`guardrail-architecture.md`](guardrail-architecture.md) and
  `lib/domain/anomaly-detection.ts`.
- **Fixed this pass:** Yes — `unusual_precision` check (flags any amount
  with more than 2 decimal places — no real currency SquadPay handles is
  ever quoted that precisely) and `suspiciously_low_total` /
  `non_positive_total` checks.

### A2. Discount/coupon receipts fail with a misleading generic message

- **Finding:** 3 of 15 receipts (08, 12, 14) failed extraction because
  Gemini tried to represent a discount as a negative number, which the
  schema correctly rejects. Before this pass, that fell into the same
  generic bucket as "Couldn't read that receipt right now. Try again or
  enter the total manually" — with a **"Try again" button that would fail
  identically every time**, since the same photo produces the same schema
  violation.
- **Why P0:** Telling a user to retry something that cannot succeed is a
  credibility problem for the product and a real (small) waste of their
  time on every occurrence — not a financial-correctness bug (the
  extraction correctly fails closed, calculates nothing, and blocks
  progress), but directly a **user-trust and AI-workflow-credibility**
  issue, which is explicitly in scope for P0.
- **Decision:** Give this failure its own honest message and stop
  offering to retry it. See Phase 3 below for why we are *not* trying to
  make discounts work instead.
- **Fixed this pass:** Yes — `isUnsupportedNegativeValueError()` in
  `lib/gemini/extract.ts`, a distinct branch in
  `app/api/receipts/scan/route.ts`, and the client now actually reads the
  API's `retryable` flag (it silently ignored it before — the "Try again"
  button showed unconditionally for every error, a pre-existing gap this
  fix also closes for every other error case, not just this one).

### A3. Three more error branches had the same `retryable` gap as A2 — found in the follow-up audit, fixed

A2's fix only covered the discount case. A full audit of every failure
branch in `route.ts` against the same rule found the no-file,
wrong-file-type, and file-too-large branches had the identical problem:
no `retryable` field at all, so "Try again" showed for an error
guaranteed to reproduce on the same file. Fixed the same way, with tests.
Full detail: §D1 below.

---

## B. P1 — high-value AI PM improvements (documented, not all built this pass)

Ranked by how directly they'd improve trust in the AI workflow, not by
effort.

1. **Long item names truncate in the review screen** (found in the
   follow-up audit, §D2 below) — a real legibility issue in the
   human-review step, not fixed this pass because a proper fix needs a
   small layout change (`<input>` can't wrap text), not a one-liner.
2. **Distinguish reconciliation from correctness in the UI copy.**
   Today's reconciliation banner text is already honest ("don't add up to
   the receipt total"), but nothing in the product currently tells a user
   *"this passed our checks" is not the same as "this is definitely
   right."* Worth a copy pass once there's a concrete UI moment for it —
   not done this pass, to avoid touching a page not already in scope.
3. **Currency/locale sanity check** (receipt-11). Not built this pass —
   see Phase 4 decision below for the full reasoning; the short version is
   it needs a schema/prompt change for a genuinely rare edge case for
   SquadPay's actual (Indian) user base.
4. **A visible "what SquadPay checked" summary** once a receipt passes
   both guardrail layers cleanly — currently the product is silent when
   everything's fine (no banner), which is consistent with how
   reconciliation already worked and avoids clutter, but a portfolio
   reviewer specifically evaluating "human-in-the-loop design" may want to
   see the positive case surfaced too. Deliberately deferred — see P2.

## C. P2 — do not fix now

- **Direct UPI/GPay payment integration.** The single most-requested
  feature from real user validation (3 of the sample —
  `user-validation-results.md`), explicitly deferred anyway. SquadPay's
  job is receipt → split → review → **request** payment; it never moves
  money itself, and that boundary is deliberate (see
  `guardrail-architecture.md`'s "AI output never directly becomes a
  financial action" principle — the same discipline applies to the
  product's own scope, not just the AI). A payment-completion integration
  is a materially larger scope and liability surface (real money movement,
  a payment provider integration, its own compliance/security review) than
  one round of qualitative feedback justifies building reactively. Worth a
  dedicated future decision, not a bolt-on here.
- **A dedicated "no tax detected" warning.** Considered and rejected:
  receipt-13 in this exact evaluation set *legitimately* has no tax line,
  so this check would cry wolf on a real, valid receipt. A warning that's
  wrong often enough to ignore is worse than no warning — it trains users
  to dismiss every warning, including the ones that matter. Would need
  real usage data (not 15 receipts) before this is worth building.
- **Full currency/locale detection + multi-currency support.** SquadPay is
  for Indian users splitting bills in ₹. Building real internationalization
  for 2 of 15 evaluation receipts (both intentionally sourced from foreign
  datasets to stress-test locale assumptions, not representative of real
  usage) would be solving a problem SquadPay's actual users don't have.
  See Phase 4 below.
- **Expanding the schema to model discounts/service charges as first-class
  fields.** Considered directly in Phase 3 below and explicitly rejected —
  turns a bill-splitter into a lightweight accounting system, which is
  scope creep by definition per this task's own instructions.
- **A confidence-score / ML-based anomaly model.** Explicitly out of
  scope — every check that shipped this pass is a one-sentence,
  human-readable deterministic rule. A statistical model trained on 15
  receipts would be false precision, not rigor.
- **Redesigning the review UI's layout.** Every change this pass reuses
  the exact visual pattern already established for
  `ReconciliationNotice` — same tokens, same interaction model, same
  "Continue anyway" contract. A new component, not a new layout.
- **Rerunning the 15-receipt evaluation to "improve the score."** Not
  authorized yet, and would defeat the purpose — the point of this baseline
  was to find real failure modes once, honestly, not to iterate against
  the same 15 receipts until the number looks better.

---

## Phase 3 — Discounts and negative values: the product decision

Receipts 08, 12, and 14 all include a discount or coupon. Gemini's
extraction schema has no field for that, so on all three, Gemini
improvised — twice representing the discount as a negative-amount line
item, once as a negative `taxAndService` — and all three attempts were
correctly rejected by schema validation. Three receipts, three different
improvised (and all invalid) representations: no consistent strategy on
the model's part either.

**Options considered:**

1. *Explicitly support discounts as a first-class schema field.*
   Rejected. This is the accounting-platform trap the task explicitly
   warned against. SquadPay's job is receipt → split → review → request
   payment, not modeling every possible line-item adjustment a receipt
   might contain (discounts, service charges, rounding, tips — Chelokababi,
   receipt-06, already shows gratuity has the exact same "no field for
   this" problem). Adding one field invites adding the next one.
2. *Silently drop the discount and total the pre-discount items.*
   Rejected outright — this is exactly "silently calculate the wrong
   split," which the task explicitly forbids. A user would be asked to pay
   more than the receipt actually says.
3. **Fail safely and push to manual entry — chosen.** The schema already,
   correctly, refuses to accept a value it can't safely represent. The
   product gap was only that this failure looked identical to a generic
   "something went wrong, try again" — which this pass fixed (A2 above).
   No new field, no new automation attempt. When SquadPay can't safely
   total a receipt automatically, it says so specifically and gets out of
   the way for manual entry, which was already a fully-working path before
   this evaluation even started.

This is the smallest change that makes the product honest about a real
limitation, without expanding its job description.

---

## Phase 4 — Locale / currency: the product decision

Receipts 11 (Paris, EUR, VAT-inclusive pricing) and 15 (Indonesia, IDR,
"." as a thousands separator) both come from receipts intentionally
sourced outside SquadPay's actual target market, specifically to see what
happens when the extraction prompt's assumptions (additive, exclusive tax;
"." as a decimal point) don't hold.

- Receipt-15's failure is **already caught** by the new
  `unusual_precision` anomaly check (A1) — not because it's a currency
  check, but because the resulting numbers are implausibly precise
  regardless of why.
- Receipt-11's failure (tax reported as 0, because VAT was already
  included in item prices) is **not** caught by anything shipped this
  pass. Catching it specifically would require either asking Gemini to
  report a detected currency/locale (a real prompt and schema change) or
  inferring locale from something else — both genuine engineering effort
  for a case that's rare for SquadPay's actual users.

**Decision:** Do not build currency/locale detection this pass. SquadPay
is explicitly for Indian users splitting bills in ₹; a user photographing
a French or Indonesian receipt is not a real scenario worth engineering
against today. This is a documented, deliberate scope boundary (P2 above),
not an oversight — revisit only if real usage data ever shows this
actually happening.

---

## D. Findings from the full product-readiness audit

A systematic pass through the actual implementation — every failure
branch of `app/api/receipts/scan/route.ts`, both guardrail layers live in
the browser against real captured data, and the review screen at mobile
(375px) and desktop (1440px) viewports. Two real findings, handled
differently on purpose.

### D1. Three error branches never set `retryable` — P0, fixed

Auditing every failure category against the rule *"there must never be a
'Try again' for an error guaranteed to fail again"* found that the
no-file, wrong-file-type, and file-too-large branches in `route.ts` never
included a `retryable` field at all. Combined with the client-side
`retryable` read added earlier this project (which defaults to `true`
when the field is absent), this meant "Try again" was shown for errors
where retrying the *identical* file is deterministically pointless — the
exact bug class the earlier discount-message fix was meant to eliminate,
just missed in three other branches at the time. Fixed: all three now
explicitly set `retryable: false`, with a test for each
(`route.test.ts`).

### D2. Long item names truncate in the review screen — P1, deliberately not fixed this pass

Found by actually testing the review screen with a long item name at both
375px and 1440px viewports (not assumed): the item-name field truncates
before the end of the visible text, at both sizes — this is a layout
constraint (the review card's column width, not viewport width), and
existed structurally the moment quantity/price inputs were added
alongside the name field (`LineItemsList.tsx`), even though the
truncation styling itself predates this project's changes.

**Why this doesn't block use:** the underlying value is never wrong —
clicking into the field shows/edits the full text via normal input
scrolling, and nothing about the split calculation is affected. This is a
legibility issue in a human-review step, not a correctness or trust
issue.

**Why it's not fixed this pass:** `<input>` elements cannot wrap text
(a hard HTML constraint — this isn't a CSS oversight), so a real fix
means restructuring the item row's layout (e.g. stacking quantity/price
below the name on narrow columns), which is a genuine, if small, layout
change to an existing, working component — not a one-line fix. Given the
explicit instruction not to redesign the product, and that this doesn't
create a financial-correctness or trust problem, it's logged here as a
real, evidence-based P1 rather than force-fixed under time pressure.
**Next time this component is touched for any reason, fix this then.**
