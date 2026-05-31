# ADR-0011 — Reconciliation orchestration & LLM boundaries (Layer 2)

**Status:** accepted

## Context

The case asks for an "agent-based system." Layer 2 turns canonical objects into a
draft `Reconciliation`. We must balance that framing against SOX-grade
auditability ([ADR-0004](./0004-deterministic-core-llm-narrative.md)): numbers
must be exact and reproducible, and a human signs off.

## Decision

**A deterministic pipeline with bounded LLM calls at fixed steps** — not an
autonomous tool-calling agent.

Stages: `tie-out → categorize → investigate variance → detect anomalies → draft`.
Within that fixed plan:

1. **Categorization is LLM-first:** the model labels each transaction with an
   `AccrualCategory`; **code recomputes every per-category sum**. The model never
   produces a total.
2. **Drafting uses OpenAI structured outputs bound to a Zod schema**, but that
   schema contains **only prose fields** (narrative, per-driver explanations,
   completeness/risk text). **Code owns every `Money`/numeric field** and
   assembles the final `Reconciliation`.
3. **Cross-doc anomalies use targeted extraction:** an LLM call pulls an amount
   from a document's raw text; **code compares** it to the GL figure and raises an
   `Anomaly` (e.g. bonus memo ~$14M vs GL `JE-12501` $1.9M).

## Rationale

- A fixed plan is **reproducible and auditable** — each step's inputs/outputs are
  inspectable, which an autonomous agent's free-form trajectory is not.
- Every numeric result is computed in code, so correctness is unit-testable, not
  a function of model sampling.
- The LLM is used precisely where it is strong: labeling, prose, and reading
  unstructured documents — never arithmetic.
- "Structured outputs + Zod, prose-only schema" gives us schema-validated model
  output **and** the determinism guarantee at once.

## Consequences

- We define a narrow `ReconciliationDraft` schema (prose subset) for the LLM call,
  distinct from the full `Reconciliation` that code assembles.
- The agent **flags, it does not resolve**: accounting treatment, cutoff calls,
  and anomaly acceptance are surfaced for the human (Layer 3).
- The Layer 3 correction loop re-invokes the `draft` step with lint feedback; the
  numeric stages need not re-run.
- Trade-off: less "autonomous" than a tool-calling agent, by design. If broader
  autonomy is ever needed, individual steps can expose tools without changing the
  outer contract.