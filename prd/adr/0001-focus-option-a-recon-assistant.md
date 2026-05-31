# ADR-0001 — Focus on Option A: reconciliation assistant

**Status:** accepted

## Context

The case lets us pick the pain point. Three directions emerged from the
interviews:

- **A. Variance investigation + reconciliation drafting** (Sarah & Jake's #1 ask).
- **B. A reconciliation "linter" / quality verifier** (attacks Sarah's 30–40%
  rejection rate).
- **C. Day-20 flash forecasting** (Michael's strategic ask).

Constraints: 1-day PoC, depth over breadth, must be demoable, must keep humans in
control (SOX).

## Decision

Build **Option A**, with **Option B (the linter) as the verification layer inside
it**. Forecasting (C) is acknowledged in the write-up as the strategic extension
but not built.

## Rationale

- The provided data fits A best: approved Nov recons (gold standard), a rejected
  Oct recon (anti-pattern), the Dec target period, the rules rubric, and scattered
  supporting docs that map onto GL transactions.
- A has a concrete, verifiable "before/after" (Jessica's abandoned draft → a
  clean generated recon) and objective metrics (lint score, time).
- C is higher-ceiling but the data is thin (6 months of balances, one month of
  P&L detail) and hard to make convincing/verifiable in a day.
- Folding B into A gives objective quality scoring for the demo.

## Consequences

- We need a deterministic rollforward, a categorizer, a retrieval/linking step,
  an LLM drafting step, and a rules linter.
- The write-up must explicitly address the Sarah-vs-Michael tension rather than
  ignore the forecasting ask.
