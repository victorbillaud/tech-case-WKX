# ADR-0012 — Correction loop & human approval (Layer 3)

**Status:** accepted

## Context

The linter ([ADR-0006](./0006-rules-linter-verifier.md)) produces a `LintReport`.
Two things must happen next: fixable quality issues should be improved
automatically, and a qualified human must sign off (SOX). We need to decide how
aggressive the auto-fix is and what "approval" concretely records.

## Decision

1. **Bounded automatic correction loop.** After verification, failing rules that
   are `autoFixable` (e.g. vague variance, missing prior-period note, missing
   section) trigger a re-draft — **only the `draft` step re-runs** (numeric stages
   are untouched, per [ADR-0011](./0011-layer2-orchestration.md)) — up to **N = 2**
   iterations. Then the result is presented to the human **regardless** of
   remaining non-critical issues. Non-autofixable failures (e.g. a genuinely
   missing supporting document) are surfaced, not faked.
2. **Human approval is a real, recorded action.** `POST /approve` requires a
   `reviewer` (name + role), enforces **reviewer ≠ preparer** and reviewer
   authority ≥ the account's risk level (Rule 6.1), records `{reviewer, role,
   timestamp, comments}`, and flips `status → approved`. Rules 6.1/6.2 are
   re-evaluated at this point (they cannot pass earlier, when `reviewer` is null).

## Rationale

- Auto-fixing the cheap, language-level issues is exactly where Sarah's 30–40%
  rejections come from — closing them before human review is the core value.
- Bounding to N = 2 prevents loops/cost blow-ups and avoids the model "polishing"
  forever; diminishing returns after a couple of passes.
- A recorded approval is the SOX payoff ("a qualified human reviewed and signed
  off") and makes the audit trail demonstrable.

## Consequences

- The `reconcile` flow is: draft → verify → (redraft → verify)×≤2 → present.
- Segregation rules return `needs_human` pre-approval and `pass`/`fail` after.
- We add a small `Approval`/audit record (in-memory for the PoC) alongside the
  `Reconciliation`; a persistent audit log is deferred.
- A reviewer authority directory (role ≥ required) is minimal in the PoC (role
  passed in and compared to the account's `riskLevel`).