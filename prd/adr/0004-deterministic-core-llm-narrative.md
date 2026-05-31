# ADR-0004 — Deterministic core; the LLM only writes prose

**Status:** accepted

## Context

This is accounting under SOX. Sarah's explicit fear is "confident wrong answers."
A reconciliation that ties to the wrong number, or invents an amount, is worse
than useless — it's an audit finding.

## Decision

**All numbers are computed by deterministic code; the LLM never computes or
chooses a number.** The model receives already-validated facts (rollforward,
categories, variance figures, linked documents) and only **writes the narrative**
around them. Sign normalization, the rollforward tie-out, materiality thresholds,
anomaly detection, and the rules linter are all deterministic.

## Rationale

- Numeric correctness is non-negotiable and must be reproducible/auditable.
- LLMs are strong at prose and weak/unreliable at arithmetic over many rows.
- Keeps the trust boundary crisp: if a number is wrong, it's a code bug we can
  unit-test, not a stochastic model output.

## Consequences

- The categorizer may use the LLM for *labeling/grouping*, but the *sums* per
  category are recomputed in code.
- The recon output schema separates computed fields (e.g. `rollforward`,
  `variance.deltaAmount`) from prose (`narrative`, driver `explanation`).
- Anything the LLM asserts in prose should be backed by a referenced fact; the
  linter checks for specificity and evidence.
