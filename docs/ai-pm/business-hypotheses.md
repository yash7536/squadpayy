# Business / User Value — Hypotheses to Validate

**None of the numbers below are measured yet.** This document exists to
define *what SquadPay should eventually measure* to know whether it
actually delivers value — not to claim it already does. Every line is
phrased as a hypothesis, not a result. Do not quote anything here as an
achieved outcome; nothing has been validated with real users at the time
of writing (see `user-validation-plan.md` for how that will happen).

## Why hypotheses, not metrics-already-hit

It would be easy to write "SquadPay saves users 5 minutes per split" —
and it would be fabricated. No timing study has been run. This document
is the honest alternative: name exactly what would need to be true, and
exactly how it would be measured, so a future evaluation has a real target
instead of a vague "make it better."

## Product hypotheses to validate

| # | Hypothesis | How it would be measured |
|---|---|---|
| H1 | Time to create a split is lower with AI-assisted extraction than fully manual entry | Timed task, both conditions, same receipt, real users |
| H2 | A majority of real-world receipts (not the curated 15-receipt eval set) process successfully without manual fallback | % of scans that reach a reviewable state vs. % that fail to manual entry, tracked over real usage |
| H3 | Most successful AI extractions require only minor correction, not a full manual redo | Count of field edits (item name/qty/price/tax) per accepted split |
| H4 | A meaningful share of AI-extracted values are accepted without any edit | % of splits where the user changes zero fields before confirming |
| H5 | Payment requests get sent, not just created | % of completed splits where a WhatsApp request is actually sent, vs. abandoned after calculation |
| H6 | Users complete the full flow (receipt → sent request) at a reasonable rate | Completion rate from "upload/scan started" to "payment request sent" |
| H7 | Users trust the extracted values enough to act on them without re-verifying against the physical receipt | Direct question in user testing (see `user-validation-plan.md`) — not inferable from usage data alone |
| H8 | The two new guardrail layers (reconciliation + anomaly detection) reduce incorrect splits reaching the payment-request step, relative to having neither | Requires either a controlled before/after comparison or, at minimum, tracking how often each layer actually fires in real usage |

## What would falsify these

Being explicit about failure conditions, not just success conditions,
because a hypothesis that can't be wrong isn't useful:

- If H3/H4 show most extractions need heavy correction, the AI step isn't
  actually reducing the tedious-80%-of-the-work problem this product is
  built around — that would be a signal to revisit prompt quality or the
  extraction schema, not just the guardrails.
- If H7 comes back low (people don't trust the numbers even when they're
  right), the guardrail UI itself may be *reducing* trust by looking
  alarming too often — worth checking false-positive rate on the anomaly
  checks specifically (the "no tax detected" check was rejected pre-
  emptively for exactly this risk — see `decision-log.md`).
- If H5/H6 are low even when extraction quality is fine, the problem isn't
  the AI at all — it's somewhere else in the flow (the ask itself is still
  socially awkward, or the UI has friction unrelated to AI).

## Explicitly not claimed anywhere in this project

- "Users saved N minutes." (H1, unmeasured)
- "X% of users prefer SquadPay to manual splitting." (never asked)
- Any specific adoption, retention, or revenue number. (no users yet)

If any of these appear elsewhere in this repository's documentation
without a citation to an actual measurement, that's a documentation bug —
flag it.
