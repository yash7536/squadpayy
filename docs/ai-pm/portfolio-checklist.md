# Portfolio Artifacts — Status

Tracks the five artifacts a complete SquadPay portfolio submission needs.
Marks what exists today vs. what's prepared-but-not-yet-produced — no
artifact below is claimed as finished unless it actually is.

| # | Artifact | Status | Where |
|---|---|---|---|
| 1 | **Working demo** | ✅ Exists — **live in production** at [squadpayy.vercel.app](https://squadpayy.vercel.app), full flow smoke-tested against the real deployment (AI extraction, both guardrail layers, manual fallback, split calculation, WhatsApp request, mobile) | Production URL + this repository |
| 2 | **Loom walkthrough** (problem → scan → extraction → review → split → payment request) | ❌ Not recorded | Not fabricated — record once ready to walk through on camera; script should follow `case-study.md` §1–2's problem/before-after framing, now against the live production URL |
| 3 | **Evaluation sheet** (15-receipt baseline, metrics, failure analysis) | ✅ Exists — baseline **and** second real evaluation run | [`eval/ANALYSIS.md`](../../eval/ANALYSIS.md), [`eval/results/summary.csv`](../../eval/results/summary.csv), [`eval/results-run-2/summary.csv`](../../eval/results-run-2/summary.csv) (spreadsheet-importable) |
| 4 | **User validation** (real feedback + iteration evidence) | ✅ Conducted — small-sample exploratory round | [`user-validation-plan.md`](user-validation-plan.md) (design) + [`user-validation-results.md`](user-validation-results.md) (actual observations) |
| 5 | **Case study** (problem → hypothesis → decisions → AI workflow → evaluation → failures → guardrails → iteration → learnings) | ✅ Exists | [`case-study.md`](case-study.md) |

## What "done" means for the two missing artifacts

**Loom demo** — done when it's a real screen recording of the real product,
not a script read over a mockup. Suggested structure (5 sections,
2–3 minutes total): the problem in one sentence → scan a receipt live →
show the review screen with both guardrails (ideally trigger one on
purpose, e.g. by editing a value to break reconciliation, to demonstrate
the layer actually works rather than narrating it) → confirm the split →
show the WhatsApp request draft.

**User validation** — done when `user-validation-plan.md` has actually
been executed with 5–10 real people and the results are written up
honestly, friction points included, in a new dated results document —
not edited into the plan document itself, so the plan-before/results-after
distinction stays visible to a reader.

## Honesty check for whoever reviews this before publishing

Before presenting this project as portfolio-complete, confirm:
- [ ] Every accuracy number quoted anywhere traces to `eval/results/`.
- [ ] Nothing claims real user feedback that wasn't actually collected.
- [ ] The Loom, if made, shows the actual product, not a redesigned mockup.
- [ ] `business-hypotheses.md`'s hypotheses are still labeled as
      hypotheses, not results, unless `user-validation-plan.md` has
      actually been executed.
