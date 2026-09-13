# Receipt OCR evaluation harness

A small, developer-only tool for answering one question with real evidence,
not opinion: **how good is SquadPay's Gemini receipt extraction, and where
does it actually fail?**

This is evaluation tooling, not a product feature. It does not change, wrap,
or duplicate the production extraction/reconciliation code — it calls it and
measures it.

> **New to this project? Start with the results, not the tooling.**
> [`ANALYSIS.md`](ANALYSIS.md) reads the actual baseline run (15 receipts,
> run 2026-09-13) and maps every failure found to what SquadPay's guardrails
> do and don't catch — that's the ~5-minute version of this whole
> directory. [`../docs/ai-pm/decision-log.md`](../docs/ai-pm/decision-log.md)
> then shows exactly which findings led to a production change (and,
> deliberately, which didn't). This README is the methodology reference for
> when you want to know *how* those numbers were produced, or want to run
> the evaluation yourself.

## Why evaluate this

SquadPay's receipt scan (`lib/gemini/extract.ts`) is what production users
rely on to avoid typing every line item by hand. "It looked fine in a demo"
isn't evidence. This harness produces a real, auditable answer: for a fixed
set of receipts with manually-verified correct values, exactly how often
does the AI get items, quantities, prices, tax, and totals right — and when
it doesn't, which specific way did it fail?

## Dataset: exactly 15 receipts

The dataset is the 15 receipt IDs listed in
[`dataset/manifest.ts`](dataset/manifest.ts) (`receipt-01` … `receipt-15`) —
that list is the single source of truth for "15"; `npm run eval:receipts`
iterates exactly it, not whatever files happen to exist on disk.

15 is small on purpose: enough to see patterns across receipt types
(itemized restaurant bills, thermal/faded receipts, handwritten totals,
multi-item grocery slips, etc.) without turning this into an unbounded
API-quota sink. See **Limitations** below for what 15 receipts can and
can't tell you.

### The 15 receipt photos

`eval/dataset/receipts/` is already populated with 15 images, sourced from
public, permissively-licensed receipt datasets/demo images — **not**
private/personal receipts. Full provenance (source URL, license, whether any
redaction was performed) for every one of them is in
[`dataset/sources.json`](dataset/sources.json). These files are meant to be
committed, same as ground truth and results — they're real portfolio
evidence with a documented paper trail, not a privacy risk.

If you want to swap any of them out (a different photo, or your own real
receipt for a private eval you won't publish), replace the file at
`eval/dataset/receipts/receipt-NN.<ext>` and update that receipt's
`imageFile` in its ground-truth JSON to match — any of `.jpg`, `.png`,
`.heic`, `.webp` work. If you do that with a personal receipt, gitignore
that specific file yourself before pushing; this harness doesn't assume
that for you.

## Ground truth: how to enter it

All 15 receipts already have ground truth filled in at
`eval/dataset/ground-truth/receipt-NN.json`, manually verified against each
receipt image (see each file's own `notes` field for edge cases specific to
that receipt). Ground truth is always entered this same way — **by reading
the actual receipt yourself, never by copying an AI extraction**:

```json
{
  "receiptId": "receipt-01",
  "imageFile": "receipt-01.jpg",
  "merchant": "Copper Kettle Café",
  "items": [
    { "name": "Cold Brew Concentrate", "quantity": 2, "unitPrice": 170, "lineTotal": 340 },
    { "name": "Avocado Sourdough Toast", "quantity": 2, "unitPrice": 280, "lineTotal": 560 }
  ],
  "tax": 90,
  "receiptTotal": 990,
  "status": "verified",
  "verifiedBy": "your name",
  "verifiedAt": "2026-09-12",
  "notes": "optional — anything worth flagging about this receipt"
}
```

Rules the loader enforces (`eval/lib/ground-truth.ts`):

- `unitPrice` is optional (omit it if the receipt only prints a line total)
  — `lineTotal` is always required, for every item. `lineTotal` may be
  negative — a real receipt in this dataset (receipt-12) prints a coupon as
  its own line, and this schema has no separate discount field (see
  receipt-12's `notes` and the **Scoring** section below).
- **`status` must be `"verified"`** before the receipt is included in any
  evaluation run. Every stub starts as `"unverified"` specifically so a
  template full of zeros can never accidentally be scored as if it were
  real data.
- The `imageFile` you name must actually exist under
  `eval/dataset/receipts/`.

A receipt missing ground truth, still `"unverified"`, or missing its image
is **skipped and reported as skipped** — never silently scored, never
counted as a pass or a fail.

## AI output: how it's captured

`eval/lib/run-evaluation.ts` calls the exact same production function the
app uses — `extractReceipt()` from `lib/gemini/extract.ts` — with the real
receipt photo. It does not call `lib/gemini/mock-fallback.ts` under any
circumstance, so mock data can never end up in an evaluation result. If
`GEMINI_API_KEY` isn't configured, the run is skipped with a clear message
instead of silently substituting anything.

Each captured outcome is cached to `eval/cache/ai-output/receipt-NN.json`
and includes:

- the normalized result (`items`, `quantity`, `amount`, `taxAndService`,
  `total`) — the same shape production code operates on,
- the schema-validated JSON object exactly as `extractReceipt()` returns it
  (see **"On 'raw' AI output"** below),
- or, on failure, the error message and failure category — never silently
  swapped for a "successful" placeholder.

### On "raw" AI output

We store the **schema-validated JSON object**, not Gemini's pre-validation
response text. Because the production call uses
`responseMimeType: "application/json"`, Gemini never returns markdown
fences or commentary to strip — the validated object is byte-for-byte the
same data, modulo zod's `null → undefined` normalization for two optional
fields. Capturing the literal pre-validation string would require a
**second** Gemini call per receipt purely to grab a copy that's
functionally identical, which directly conflicts with the API-quota-safety
goal of this harness — so we don't.

## Scoring: exact rules

All comparison logic is pure and deterministic —
[`eval/lib/scoring.ts`](lib/scoring.ts), unit-tested in
[`scoring.test.ts`](lib/scoring.test.ts) with zero API calls (these tests
run under the normal `npm test`).

**Item identification** — ground-truth items and AI items are paired by
name, not by array position (order differences must never look like
mismatches):

1. Every item name is normalized: lowercased, accents stripped, punctuation
   stripped, whitespace collapsed.
2. Pairing uses a **Dice coefficient** (bigram/2-letter overlap) similarity
   score between every ground-truth/AI name pair, then greedily assigns the
   highest-similarity pairs first, one-to-one, keeping only pairs scoring
   ≥ **0.5** (`ITEM_NAME_MATCH_THRESHOLD`). This threshold exists only to
   find "the same item" through OCR noise (e.g. "Cold Brew" vs "Cold Brew
   Concentrate") so quantity/price can still be compared — it is **not**
   what "item accuracy" measures.
3. **Item accuracy** itself requires an *exact* normalized name match (not
   just the 0.5 threshold): `(paired items with exact name match) / max(ground truth item count, AI item count)`.
   A missing item, an extra (hallucinated) item, or a paired-but-wrongly-named
   item all reduce this.

**Quantity accuracy** — exact integer equality, no tolerance:
`(paired items with quantity match) / (paired item count)`.

**Price / tax / total accuracy** — numeric match within a fixed ₹1
tolerance (`ITEM_PRICE_TOLERANCE` / `TAX_TOLERANCE` / `TOTAL_TOLERANCE` in
`scoring.ts`), the same tolerance philosophy as the app's own
`RECONCILIATION_TOLERANCE`. Tax and total are reported per-receipt as
pass/fail; price accuracy is a fraction over paired items.

**Reconciliation** — `reconcileReceipt()` from
[`lib/domain/reconciliation.ts`](../lib/domain/reconciliation.ts), the
exact production safety-check function, is run against **the AI's own
items + tax + total** — i.e. does Gemini's output internally add up? This
is deliberately **independent of ground truth**: it never uses the
manually-verified values, and ground truth is never derived from it. A
receipt where every field happens to match ground truth but the AI's own
numbers don't reconcile with each other is still not scored "fully
correct" — see the dedicated test for this in `scoring.test.ts`.

**"Fully correct" (Overall Pass/Fail)** — a receipt passes only when *all*
of: item accuracy = 100%, quantity accuracy = 100%, price accuracy = 100%,
tax within tolerance, total within tolerance, **and** the AI's own output
reconciles. Anything less is a fail, with the specific reason(s) recorded
in `failureCategories`.

## Failure categories

Recorded per receipt (an extraction failure gets exactly one; a completed
extraction can accumulate several field-level ones):

| Category | Meaning |
|---|---|
| `missing_item` | A ground-truth item has no AI counterpart |
| `extra_item` | An AI item has no ground-truth counterpart |
| `incorrect_item_name` | Item paired, but names don't match exactly |
| `incorrect_quantity` | Item paired, quantity doesn't match |
| `incorrect_price` | Item paired, price outside tolerance |
| `incorrect_tax` | Tax outside tolerance |
| `incorrect_total` | Total outside tolerance |
| `malformed_response` | Gemini's JSON didn't parse, or didn't match the extraction schema |
| `unreadable_receipt` | Extraction ran, but the photo wasn't a readable receipt at all |
| `api_failure` | Auth/configuration error (e.g. rejected API key) |
| `timeout_transient_failure` | Gemini reported overload/rate-limiting after its own retries were exhausted |
| `other` | Anything not covered above |

## Human review is a separate stage

The pipeline this harness measures is:

```
Receipt photo → Gemini extraction → structured output → deterministic evaluation → human review → reconciliation guardrail → corrected/fallback flow
```

This harness covers *deterministic evaluation* and *reconciliation*. It
does not replace human review of ground truth (you must verify each
receipt's true values yourself) or the in-app review/reconciliation UI real
users go through — those are already implemented in the product and are
exactly what this harness is checking the AI extraction step against.

## How to run it

**One receipt** (real API call unless already cached for that exact image):

```bash
npm run eval:receipt -- receipt-01
```

Force a fresh Gemini call even if a valid cache entry exists:

```bash
npm run eval:receipt -- receipt-01 --force
```

**All 15** (skips any receipt without verified ground truth + its image;
never runs automatically — you must invoke this yourself):

```bash
npm run eval:receipts
```

```bash
npm run eval:receipts -- --force
```

Calls are made sequentially with a short pause between them — this is a
quota-limited external API, not a throughput test.

**This command is never run by `npm test`, `npm run build`, `npm run dev`,
or any git hook.** It is a separate, explicit, developer-triggered workflow
by design (see API/quota safety below).

## Where results are stored

- `eval/cache/ai-output/receipt-NN.json` — the captured AI outcome for that
  receipt, keyed to the exact image (via a sha256 hash) so an unchanged
  photo never triggers a repeat Gemini call.
- `eval/results/receipt-NN.json` — that receipt's scored evaluation result.
- `eval/results/summary.json` — aggregate metrics across every receipt that
  was actually evaluated (with a `receiptsSkipped` list — a rate is only
  ever computed over receipts genuinely evaluated, never silently padded
  out to "15 of 15").
- `eval/results/summary.csv` — the same, in the column layout below.

## Moving results into a spreadsheet

`eval/results/summary.csv` is plain CSV with exactly these columns —
open it in Excel/Numbers, or paste it straight into Google Sheets
(File → Import → Upload, or paste after opening the file locally):

```
Receipt ID | Ground Truth Items | AI Items | Item Accuracy | Quantity Accuracy |
Price Accuracy | Tax Accuracy | Total Accuracy | Reconciled | Overall Pass/Fail |
Failure Category | Notes
```

## API / quota safety

- Evaluation is **never** part of `npm run dev`, `npm test`, or
  `npm run build` — it only runs when you explicitly type
  `npm run eval:receipt` or `npm run eval:receipts`.
- `mock-fallback.ts` is never imported by this harness — there is no code
  path that can substitute mock data for a real result.
- Every captured AI outcome is cached by receipt ID **and** the sha256 of
  the exact image bytes sent — re-running an evaluation (e.g. after fixing
  a typo in ground truth) reuses the cached outcome and recomputes scoring
  for free, with zero additional Gemini calls, unless the photo changed or
  `--force` is passed.
- `eval:receipt` evaluates one receipt; `eval:receipts` evaluates the fixed
  list of 15 — there's no "evaluate everything, including future receipts
  you haven't reviewed yet" mode.

## Limitations of a 15-receipt evaluation

Be honest about what this can and can't support:

- **Not statistically powered.** A 15-receipt sample gives a rough,
  directional read (e.g. "3 of 15 had a wrong tax figure"), not a
  tight confidence interval on a true error rate. Treat percentages as
  "here's what happened on these 15," not "this generalizes precisely."
- **Selection bias.** Whatever 15 receipts you happen to have on hand may
  not represent the full range of formats real users will photograph
  (different printers, languages, currencies, handwriting, lighting,
  crumpled paper). Note what you deliberately chose to cover (and didn't)
  when reporting results.
- **Point-in-time.** Gemini model behavior can change between calls/model
  versions. A result captured today isn't a permanent guarantee — re-run
  periodically, especially after any model or prompt change.
- **Tolerance choices are judgment calls.** The ₹1 tolerance and 0.5 name
  threshold are documented, fixed constants, not tuned against this
  specific dataset — but they are still a choice, not a law of physics.
  If you change them, the numbers change; say so when you report results.
