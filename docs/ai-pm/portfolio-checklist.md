# Portfolio Artifacts — Status

Tracks the five artifacts a complete SquadPay portfolio submission needs.
Marks what exists today vs. what's prepared-but-not-yet-produced — no
artifact below is claimed as finished unless it actually is.

| # | Artifact | Status | Where |
|---|---|---|---|
| 1 | **Working demo** | ✅ Exists — the product runs today (`npm run dev`), full flow works including AI extraction, both guardrail layers, and manual fallback | This repository |
| 2 | **Loom walkthrough** (problem → scan → extraction → review → split → payment request) | ❌ Not recorded | Not fabricated — record once the product is in a state worth walking through on camera; script should follow `case-study.md` §1–2's problem/before-after framing |
| 3 | **Evaluation sheet** (15-receipt baseline, metrics, failure analysis) | ✅ Exists | [`eval/ANALYSIS.md`](../../eval/ANALYSIS.md), [`eval/results/summary.csv`](../../eval/results/summary.csv) (spreadsheet-importable) |
| 4 | **User validation** (real feedback + iteration evidence) | ❌ Not conducted | Plan exists at [`user-validation-plan.md`](user-validation-plan.md); results section intentionally does not exist yet — will be added as `user-validation-results.md` only after real sessions run |
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
