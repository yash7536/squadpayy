# Baseline Evaluation Analysis

**Run date:** 2026-09-13. **Dataset:** 15 real, publicly-sourced receipts
(see [`dataset/sources.json`](dataset/sources.json)). **Model:**
`gemini-3.6-flash`. **This document describes the original baseline run
only** — the numbers below are untouched and unchanged since that run.
A second real evaluation has since been completed; see **§7** at the end
of this document for where to find it. Every figure in §1–§6 below is
read directly from [`results/summary.json`](results/summary.json) and the
15 per-receipt result files from that original run — nothing here is
projected, adjusted, or re-run to look better. See
`docs/ai-pm/decision-log.md` for what was and wasn't changed as a result.

## 1. Baseline results

| Metric | Result |
|---|---|
| Receipts attempted | 15 |
| Successfully extracted | 11 |
| Extraction failures | 4 (1 API/transient, 3 schema validation) |
| Item extraction accuracy (avg) | 84% |
| Quantity accuracy (avg) | 100% |
| Price accuracy (avg) | 91% |
| Tax accuracy rate | 73% |
| Total accuracy rate | 91% |
| Complete receipt accuracy ("fully correct") | 33% (5/15) |
| Reconciliation success rate | 100% (11/11 successfully-extracted) |

**Fully correct:** receipt-03, receipt-04, receipt-05, receipt-09, receipt-13.

This is a 15-receipt sample, not a statistically representative benchmark.
It was designed to surface failure *modes*, not to produce a defensible
accuracy percentage — see **Limitations**, `eval/README.md`.

## 2. Failure modes found (all real, all reproduced from `eval/results/`)

| # | Receipt | Category | What happened |
|---|---|---|---|
| 1 | receipt-07 | `timeout_transient_failure` | Gemini 429 rate-limit; 2 internal retries exhausted |
| 2 | receipt-08 | `malformed_response` | Discount represented as a negative item amount — schema rejected it |
| 3 | receipt-12 | `malformed_response` | Same pattern — coupon line, negative amount |
| 4 | receipt-14 | `malformed_response` | Discount represented as a negative `taxAndService` — schema rejected it |
| 5 | receipt-01 | `incorrect_item_name` | AI dropped a trailing menu-code digit from the item name |
| 6 | receipt-02 | `incorrect_item_name` | AI autocorrected a misspelling on the printed receipt to proper spelling, and introduced a typo of its own |
| 7 | receipt-06 | `incorrect_tax` | AI correctly rolled a gratuity into `taxAndService` (as its own prompt instructs) — ground truth's `tax` field only captures the printed "Sales Tax" line, so this is a **data-model mismatch, not a real AI error** |
| 8 | receipt-10 | `incorrect_item_name` | Character-level misreads on heavily abbreviated POS text ("2"→"Z", inserted letter) |
| 9 | receipt-11 | `incorrect_tax` | VAT-inclusive European pricing — AI correctly got the total, reported tax as 0 |
| 10 | receipt-15 | `incorrect_price`, `incorrect_tax`, `incorrect_total` | **1000× scale error** — thousands separator misread as decimal point |

## 3. Risk severity

Severity is about **consequence to a real split/payment**, not about how
far a metric is from 100%.

| Failure mode | Severity | Why |
|---|---|---|
| Uniform scale/unit misread (receipt-15) | 🔴 **High** | Could silently change what someone is asked to pay by orders of magnitude, in either direction, with reconciliation showing green |
| Schema-rejected discount (08/12/14) | 🟡 Medium | No wrong number is ever calculated — extraction fails closed — but a misleading "just try again" message wastes the user's time and erodes trust in the product |
| API/transient failure (07) | 🟢 Low | Infrastructure, not a correctness issue; already has retry + a clear "try again" message |
| Character-level name misreads (01, 02, 10) | 🟢 Low | Item *names* being slightly wrong doesn't change anyone's amount owed — annoying, not dangerous |
| Ground-truth/schema mismatch on tax (06) | 🟢 Low (methodology issue, not a product bug) | The AI's total was correct; this is our evaluation's own field definition being narrower than what the AI was asked to report |
| VAT-inclusive locale mismatch (11) | 🟡 Medium, but low real-world likelihood | Wrong tax semantics for a real French receipt, but SquadPay's actual users are in India — see `decision-log.md` Phase 4 |

## 4. Guardrail mapping — what catches what

| Failure mode | Caught by schema validation? | Caught by reconciliation? | Caught by anomaly detection (new)? | Requires human review regardless? |
|---|---|---|---|---|
| Scale/unit misread (receipt-15) | No | **No** — this is the key finding | **Yes** (`unusual_precision`) | Yes |
| Negative-value discount (08/12/14) | **Yes** — hard stop | N/A (never reaches this stage) | N/A | Yes (manual entry) |
| Item name errors (01/02/10) | No | No (doesn't check names) | No (doesn't check names) | Yes — this is exactly what the editable review screen is for |
| Tax semantics mismatch (06, 11) | No | No (checks AI's own consistency, not semantics) | No | Yes |
| API/transient (07) | N/A | N/A | N/A | No — already retried automatically, then surfaced as a clear error |

**What reconciliation catches:** whether the AI's own items + tax equal
its own stated total. Nothing more. 100% of successfully-extracted
receipts passed this in the baseline.

**What reconciliation does NOT catch — the single most important finding
of this evaluation:** a uniformly-wrong extraction. Receipt-15 proves this
concretely: every number was misread by the same 1000× factor, so the
arithmetic stayed internally consistent (`reconciled: true`) while being
completely wrong. **Reconciliation validates internal arithmetic, not
semantic correctness.** This is why a second, independent layer
(`lib/domain/anomaly-detection.ts`) exists — see
`docs/ai-pm/guardrail-architecture.md`.

**What neither layer catches:** wrong item *names* (as opposed to wrong
numbers). Nothing in this evaluation found that as a financial-risk issue
— item names don't affect anyone's amount owed — but it's exactly why the
receipt-review screen makes every field editable rather than trusting
extraction silently.

## 5. Where human review is required

Every extraction, without exception, before it becomes a split — this was
true before this evaluation and remains true after it. What changed this
pass is *what the human is told to look at*: previously only reconciliation
mismatches were flagged; now anomaly flags (implausible numbers) are
flagged too, and a discount/adjustment failure gets an honest, specific
message instead of a misleading generic one.

## 6. What will be measured in the next evaluation

Not run yet — requires explicit authorization per the project's API-quota
safety rules (`eval/README.md`).

- Do the two new production changes (`isUnsupportedNegativeValueError`,
  `detectAnomalies`) behave correctly against the same 15 receipts,
  particularly receipt-15 (does the new anomaly layer actually flag it in
  the live UI, not just in unit tests) and receipts 08/12/14 (does the
  new message actually appear)?
- Whether receipt-06's tax discrepancy is confirmed as a ground-truth
  modeling limitation rather than a real extraction error, by inspecting
  the next run's raw output the same way this one was inspected.
- Whether accuracy numbers move at all — and if they do, by how much and
  in which metrics specifically. **Not to be compared informally; a
  before/after comparison is only meaningful once the new run is complete
  and both runs are read side by side, not from memory.**

## 7. Second real Gemini evaluation — completed, stored separately

**Label this precisely: a second real evaluation run, assembled across two
API-call sessions because of per-key quota limits — not a re-edit of the
baseline above, which remains exactly as originally recorded.**

- **Session 1** (first new key): fresh Gemini calls for receipts 01–06.
  Receipts 07–15 hit that key's daily quota (20 requests/day) before a
  single one of them got a real response — recorded honestly as
  `timeout_transient_failure`, not guessed at.
- **Session 2** (continuation, same or newer key): receipts 01–06 reused
  session 1's real cached output (confirmed via the harness's own
  `(cached AI output)` log line — zero repeat calls made, as required).
  Receipts 07–15 all received genuine fresh Gemini calls this session.
- **Result:** all 15 receipts now have real model output under this
  second run — stored at `eval/results-run-2/` and
  `eval/cache/ai-output-run-2/`, entirely separate from `eval/results/`
  and `eval/cache/ai-output/` (the original baseline, byte-for-byte
  unchanged — verified by checksum before and after both sessions).

For receipts 01–06, 09, 10: **the fresh output is byte-for-byte identical
to the original baseline extraction** — same merchant text (mostly; two
receipts show trivial capitalization/detail differences in the merchant
field only, which isn't a scored field), same items, same tax, same
total, same errors. Receipt-07, which never got a real response in the
baseline, succeeded this run and matched ground truth exactly. Receipts
08, 12, 14 reproduced the identical negative-value schema rejection
(same field, same array index for 08/12). Receipt-15 reproduced the
identical 1000× scale error, numeral for numeral. None of this is
projected — every claim above was diffed file-by-file, not eyeballed.

**Confirmed against real output, not just unit tests, for the first
time:** `detectAnomalies()` flags receipt-15's fresh extraction
(`unusual_precision`, naming the exact item and tax/service fields), and
`isUnsupportedNegativeValueError()` correctly classifies a real `ZodError`
thrown by the actual production schema for a negative-amount payload
shaped like receipts 08/12/14's real output. Both had previously only
been confirmed against captured/simulated data or mocks.
