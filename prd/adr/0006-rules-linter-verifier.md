# ADR-0006 — Encode the 35+ rules as a deterministic linter

**Status:** accepted

## Context

`data/rules_and_constraints.md` defines 35+ verifiability rules with severities
(CRITICAL/HIGH/MEDIUM/LOW). Sarah rejects 30–40% of recons on first pass —
usually for quality/story/backup issues these rules describe. This rubric is
effectively a spec for a grader.

## Decision

Implement a **deterministic verifier** ("linter"): one function per rule,
returning `{ ruleId, severity, passed, message, autoFixable }`. Aggregate into a
`LintReport` with a score and an `approvable` flag (false if any critical fails).
The linter runs on the typed `Reconciliation` object after the agent drafts it.

## Rationale

- Turns a subjective review into objective, repeatable checks — the basis for a
  compelling before/after demo (Jessica's draft scores low, generated recon
  scores high).
- Deterministic = explainable and testable; no black box, which Sarah requires.
- Provides the signal for an automated **correction loop**: `autoFixable`
  failures (e.g. vague variance, missing prior-period comparison) are sent back
  to the agent to re-draft.

## Consequences

- Some rules are fully checkable from data (1.1 tie-out, 6.1 segregation, 8.2
  unusual-item flags); a few subjective ones (2.2 generic-phrase detection) are
  **LLM-assisted** but still return a structured `RuleResult`.
- Each result carries a **`RuleStatus`** (`pass`/`fail`/`not_applicable`/
  `needs_human`/`not_implemented`); only a `fail` at `critical` blocks approval.
  Rules that can't be evaluated are reported, never silently passed.
- **PoC coverage** is a high-signal subset implemented fully; the remaining rules
  are registered and reported as `not_implemented`/`not_applicable` (see
  [layer-3-verifier-approval.md](../layer-3-verifier-approval.md)).
- The linter is reusable on its own — it is the embedded Option B.
