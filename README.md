# SquadPay

**Making settling shared expenses less awkward.**

**Live:** [squadpayy.vercel.app](https://squadpayy.vercel.app)

Splitting the bill is easy. Asking friends to pay you back is awkward.
SquadPay handles the tedious part (reading a receipt, doing the tax math,
working out who owes what) so the only thing left is a low-friction
payment request — not a manual accounting chore.

This isn't presented as "an AI app." Gemini is one step in a five-step
product flow, sitting behind two independent guardrail layers and a
mandatory human review screen before anything it produces becomes a real
number someone gets asked to pay. The **full product/AI-PM case study** —
problem, decisions, evaluation, failure modes, guardrails, what shipped
and what deliberately didn't — is in
**[`docs/ai-pm/case-study.md`](docs/ai-pm/case-study.md)**.

## The core flow

```
Receipt photo (or manual entry, always available)
        │
        ▼
AI-assisted extraction — Gemini reads items, quantities, tax, total
        │
        ▼
Review — every field editable; two independent checks flag anything
         that doesn't add up or looks implausible, in plain language
        │
        ▼
Split — deterministic arithmetic, zero AI involvement at this step
        │
        ▼
Payment request — drafted for WhatsApp; SquadPay requests, never moves money
```

## Who this is for

Groups of friends, roommates, or trip companions who split shared costs
regularly and currently do the accounting by hand — a calculator, a notes
app, a mental tally — and find that asking people to actually pay up is
the most uncomfortable part of the whole process.

## AI, evaluated honestly

SquadPay's receipt extraction was evaluated against 15 real,
publicly-sourced receipts — not a curated demo set — and the results are
published as-is, including the failures:

- 11 of 15 receipts extracted successfully (4 failed: 1 rate-limit, 3
  receipts with discounts the schema correctly refuses to guess at).
- Averaged over successful extractions: 84% item accuracy, 100% quantity
  accuracy, 91% price accuracy, 73% tax accuracy, 91% total accuracy.
- Only 33% (5/15) were fully correct end-to-end by a strict bar.
- **The one finding that mattered most:** the evaluation's single
  existing safety check (reconciliation) reported "correct" on a receipt
  where every number was actually wrong by 1000× — because the error was
  applied uniformly, the AI's math agreed with itself while being
  completely wrong. That's why a second, independent, deterministic
  guardrail layer exists (`lib/domain/anomaly-detection.ts`) — reconciling
  arithmetic is not the same as being right.

A second real evaluation run has since completed too — same dataset, same
scoring, stored separately so the two never get conflated. No regressions,
no cherry-picking. Full breakdown, both runs: **[`eval/ANALYSIS.md`](eval/ANALYSIS.md)**.
Methodology, how to reproduce it, and its stated limitations:
**[`eval/README.md`](eval/README.md)**.

## What's real vs. what's a hypothesis

This is a working, deployed product with one small-sample user-validation
round behind it — not yet a product with measured business outcomes.
A first round of real user testing found the core problem is genuinely
felt (6 of the sample showed real hesitation around asking friends to
repay them) and surfaced the most-requested next feature (UPI/GPay
integration, deliberately deferred) — see
**[`docs/ai-pm/user-validation-results.md`](docs/ai-pm/user-validation-results.md)**.
Anything about adoption, retention, or measured time saved is still a
hypothesis, not a result — see
**[`docs/ai-pm/business-hypotheses.md`](docs/ai-pm/business-hypotheses.md)**.

## Project docs

| Doc | What's in it |
|---|---|
| [`docs/ai-pm/case-study.md`](docs/ai-pm/case-study.md) | The full portfolio narrative |
| [`docs/ai-pm/decision-log.md`](docs/ai-pm/decision-log.md) | P0/P1/P2 — what was fixed, what wasn't, and why |
| [`docs/ai-pm/guardrail-architecture.md`](docs/ai-pm/guardrail-architecture.md) | The layered AI-safety design, in full |
| [`docs/ai-pm/business-hypotheses.md`](docs/ai-pm/business-hypotheses.md) | Quantitative metrics to validate — explicitly not yet measured |
| [`docs/ai-pm/user-validation-plan.md`](docs/ai-pm/user-validation-plan.md) | The usability test design |
| [`docs/ai-pm/user-validation-results.md`](docs/ai-pm/user-validation-results.md) | What the first small-sample round actually found |
| [`docs/ai-pm/portfolio-checklist.md`](docs/ai-pm/portfolio-checklist.md) | Status of the 5 portfolio artifacts |
| [`eval/README.md`](eval/README.md) | Evaluation methodology, how to run it, its limitations |
| [`eval/ANALYSIS.md`](eval/ANALYSIS.md) | Baseline **and** second-run results, read and interpreted |

## Running it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example`
to `.env.local` and fill in Supabase + `GEMINI_API_KEY` to move past demo
mode — every value is optional in development; omitting any of them falls
back to a local mock store / mock receipt extraction so the UI stays fully
usable without external services.

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm test             # vitest — pure-logic tests only, zero API calls
npm run build         # next build
```

Receipt-OCR evaluation is a separate, explicit, developer-triggered
command (never run automatically — see `eval/README.md`'s API/quota-safety
section):

```bash
npm run eval:receipt -- receipt-01   # one receipt
npm run eval:receipts                # all 15
```

Built on Next.js (App Router), TypeScript, Tailwind v4, and Supabase.
