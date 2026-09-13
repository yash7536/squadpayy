# SquadPay — AI Guardrail Architecture

**Core principle: AI output never directly becomes a financial action. The
user is always the last step before a number is split or a payment is
requested.**

## The pipeline

```
RECEIPT IMAGE
     │
     ▼
AI EXTRACTION            lib/gemini/extract.ts — Gemini reads the photo,
     │                   returns structured JSON. This is the ONLY step
     │                   that calls a model. Nothing downstream re-asks
     │                   Gemini anything, including whether its own
     │                   output is correct.
     ▼
SCHEMA VALIDATION        lib/gemini/schema.ts (zod) — rejects a response
     │                   that doesn't even have the right shape (wrong
     │                   types, a negative amount, etc.) before it's ever
     │                   trusted. This is a hard stop, not a warning —
     │                   see "Discounts" below for what happens when this
     │                   fires (3 of 15 receipts in the baseline eval).
     ▼
DETERMINISTIC VALIDATION lib/domain/reconciliation.ts — does the AI's OWN
     │  ("does it add up?")  items + tax equal its OWN reported total?
     │                   100% of successfully-extracted receipts in the
     │                   baseline passed this. That is NOT the same as
     │                   100% correct — see "Anomaly / risk checks" below.
     ▼
ANOMALY / RISK CHECKS    lib/domain/anomaly-detection.ts — does the
     │  ("does it look right?") number itself look plausible, independent
     │                   of whether it's internally consistent? Catches
     │                   the class of error reconciliation structurally
     │                   cannot: a uniform scale/unit misread (receipt-15).
     ▼
HUMAN REVIEW             The receipt-review screen (BillDetailsForm,
     │                   LineItemsList, ReconciliationNotice,
     │                   AnomalyNotice). Every AI-extracted field is
     │                   visible and editable. Warnings explain, in plain
     │                   language, why the user is being asked to look
     │                   twice — never "AI is uncertain," always the
     │                   specific thing that looks off.
     ▼
USER CONFIRMATION        The user explicitly continues past any warning
     │                   ("Continue anyway") or edits the flagged value
     │                   until it clears. Nothing proceeds silently.
     ▼
SPLIT CALCULATION        lib/domain/split-engine.ts — pure arithmetic,
     │                   zero AI involvement, unit-tested independently
     │                   of anything upstream. Whatever the user confirmed
     │                   is what gets split — exactly, not "the AI's best
     │                   guess."
     ▼
PAYMENT REQUEST          WhatsApp nudge — a request, never a transfer.
                         SquadPay never moves money; see the existing
                         in-app copy ("SquadPay only requests payment — it
                         never moves money itself").
```

Every arrow above is a real, separately-testable boundary in the codebase
today — not an aspirational diagram. The two new boxes added this pass are
**Anomaly / risk checks** and a corrected **Schema validation → Human
review** handoff for the discount case (previously that handoff produced a
misleading message — see `decision-log.md`, A2).

## Why two separate deterministic layers, not one

| | Reconciliation | Anomaly detection |
|---|---|---|
| Question it answers | Does the AI's own math agree with itself? | Does the number look plausible at all? |
| Reference point | The AI's own reported total | Fixed, human-reasoned thresholds (2 decimal places, ₹10 floor) |
| What it catches | The AI stating inconsistent numbers (e.g. items don't sum to its total) | A uniformly-wrong-but-self-consistent extraction (receipt-15's 1000× scale error) |
| What it misses | A uniformly-wrong extraction that's internally consistent | An internally-inconsistent AI output that happens to look individually plausible |
| Baseline result | 100% success (11/11 successfully-extracted receipts) | Would have caught receipt-15, the one case reconciliation missed |

**The one sentence worth remembering from the whole evaluation:**
*reconciliation validates internal arithmetic, not semantic correctness.*
Receipt-15 is the concrete, real proof: Gemini's numbers agreed with each
other perfectly (28.182 + 2.818 = 31, `reconciled: true`) while being
exactly 1000× wrong. Two independent layers, checking two different
things, is the actual guardrail — not a stronger version of one layer.

## What the anomaly layer checks, and why each check is there

All three checks live in `lib/domain/anomaly-detection.ts`. Every one is a
plain deterministic rule, not a model, and every one traces to a specific
question from this evaluation:

| Check | Rule | Motivated by |
|---|---|---|
| `unusual_precision` | Any item amount, tax, or total has more than 2 decimal places | receipt-15 exactly: 28.182 is not a real rupee/dollar/euro amount |
| `non_positive_total` | Total is ≤ 0 | Degenerate extraction — nothing to split |
| `suspiciously_low_total` | Total < ₹10 with at least one item | No realistic shared-bill-split scenario totals under this; conservative floor, comfortably below the cheapest real receipt in the eval set (receipt-01, ₹10.95) |

Checks that were considered and **not** built, with reasoning, are in
`decision-log.md`'s P2 section — most importantly a "no tax detected"
check, rejected because receipt-13 in this exact dataset legitimately has
no tax, which would make the warning wrong often enough to teach users to
ignore it.

## What the UI must never say

Per instruction, and because it would be dishonest given what these checks
actually are: the product never claims "AI is 100% confident" (there is no
confidence signal — see `lib/gemini/schema.ts`'s own comment on why a
fabricated confidence number was rejected during an earlier phase of this
project) and never claims a passed check means "verified correct." The
actual copy shipped this pass:

- Reconciliation mismatch: *"Extracted items don't add up to the receipt
  total"* — states the specific fact, not a verdict.
- Anomaly flag: *"Some receipt values look unusual"* + the specific
  reason (e.g. *"The total looks unusually low for a receipt with 3
  items — please double-check the amounts before continuing"*).
- Discount/adjustment failure: *"This receipt includes a discount or
  adjustment SquadPay can't total automatically yet. Enter the bill
  manually below to keep your split accurate."* — names the actual
  limitation instead of a generic retry prompt.

Every message answers "why are we stopping you," in one sentence, in
plain language — never "anomaly detected," "schema validation failed," or
any other implementation detail leaking into user-facing copy.

## Stopping points — when does the product actually block the user?

| Layer | Blocks progress? | Recoverable how? |
|---|---|---|
| Schema validation fails (incl. discount case) | Yes — extraction returns no usable data | Manual entry (always available) |
| Reconciliation mismatch | Yes, until dismissed | Edit the flagged item/tax, or explicit "Continue anyway" |
| Anomaly flag | Yes, until dismissed | Edit the flagged value, or explicit "Continue anyway" |
| Both reconciled and anomaly-clean | No | — |

"Continue anyway" is a deliberate design choice, not a loophole: Gemini's
own *reported* total can occasionally be the wrong number even when the
*items* are right (the reconciliation notice exists precisely because
Gemini's stated total isn't trusted as ground truth either — see
`lib/domain/reconciliation.ts`'s docstring). The user, not the AI, is the
authority on their own receipt. Blocking forever would be worse product
design than trusting the human in the loop once they've explicitly looked.
