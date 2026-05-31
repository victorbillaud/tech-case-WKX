# Layer 3 — Verifier (rules linter) + human approval (in practice)

> Takes a draft `Reconciliation` from Layer 2, runs the **rules linter**, drives a
> **bounded auto-correction loop**, and records a **human approval** (the SOX
> payoff). The linter is also usable standalone — it is the embedded "Option B".
>
> Decisions ([ADR-0006](./adr/0006-rules-linter-verifier.md),
> [ADR-0012](./adr/0012-correction-loop-and-approval.md)): a **high-signal subset**
> of rules implemented fully (rest registered as `not_implemented`/`needs_human`);
> **mostly deterministic** checks with a **few LLM-assisted** ones (still
> structured); **bounded auto-correction (N = 2)**; a **real `/approve` endpoint**
> with an audit trail enforcing reviewer ≠ preparer (Rule 6.1).

## Goal & output

**Input:** a draft `Reconciliation` + the `CanonicalStore` (some rules need the
raw data, e.g. ">$50K has support", "segregation" reads the chart).
**Output:** a `LintReport`, an improved draft (after the loop), and — once a human
signs off — an `approved` `Reconciliation` + audit record.

```
draft Reconciliation
   └─► verify ─► (autoFixable fails & i<2 ? redraft→verify : ·) ─► present ─► human /approve
```

Lives in `apps/api`; types from `@repo/domain`.

## Entrypoints (Hono)

```
POST /periods/:period/accounts/:account/verify    → LintReport (lint current draft)
POST /periods/:period/accounts/:account/approve    body: { reviewer, role, comments }
   → enforces reviewer ≠ preparer + authority ≥ risk; status → "approved" + audit record
```

The Layer 2 `reconcile` flow calls verify + the bounded loop internally before
returning, so the human usually sees an already-improved draft + its `LintReport`.

## The rule abstraction

One function per rule, a pure function of the recon plus the data it needs.

```ts
interface RuleContext {
  account: Account;                 // risk level, preparer/reviewer expectations
  transactions: Transaction[];
  references: ReferenceIndex;
  documents: SupportingDocument[];
}

interface Rule {
  id: string;                       // "1.1"
  title: string;
  severity: RuleSeverity;
  autoFixable: boolean;             // can a re-draft plausibly fix it?
  check(recon: Reconciliation, ctx: RuleContext): RuleResult | Promise<RuleResult>;
}                                   // → { ruleId, title, severity, status, message, autoFixable }
```

`status` is `pass | fail | not_applicable | needs_human | not_implemented`
(data-model §5). Only a `fail` at `critical` blocks approval.

## Rules implemented in the PoC (high-signal subset)

| Rule | Checks | How | Severity | autoFix |
|---|---|---|---|---|
| 1.1 Rollforward ties | `rollforward.ties && unexplainedDifference == 0` | deterministic | critical | no (data fact) |
| 1.2 Txn completeness | Σ transactions == net balance change | deterministic | high | no |
| 1.3 No plugs | no `keyword_plug` flags; no plug language in narrative | deterministic | critical | no |
| 2.1 Material variance explained | if `variance.isMaterial` → drivers present w/ substantive explanations | deterministic + LLM-assist | high | yes |
| 2.2 No vague phrases | explanations avoid banned phrases / are specific | **LLM-assist** + regex | medium | yes |
| 3.2 >$50K support | every txn >$50K has a linked exhibit/evidence doc | deterministic (ReferenceIndex) | high | partial* |
| 4.1 Completeness procedures | `completeness.proceduresPerformed` non-empty + result | deterministic | high | yes |
| 5.3 Estimate methodology | estimated accruals (e.g. AWS) document method + source | LLM-assist | medium | yes |
| 6.1 Segregation | reviewer ≠ preparer; authority ≥ risk | deterministic | critical | no** |
| 7.1 Required sections | all required sections present & non-empty | deterministic | medium | yes |
| 8.2 Unusual items flagged | every flagged txn appears in anomalies/driver narrative | deterministic | medium | yes |

\* *3.2 is auto-fixable only if a matching document exists to attach; otherwise it
returns `needs_human` (we never fabricate support).*
\*\* *6.1 returns `needs_human` pre-approval (reviewer is null) and is re-evaluated
at `/approve`.*

**Everything else** in `rules_and_constraints.md` is registered and returns
`not_applicable` (e.g. 5.1 intercompany, 5.2 deferred revenue, 5.4 prepaid for a
non-24100 account) or `not_implemented` (e.g. 2.3 prior-year — no data; 7.2
formatting) — so the framework is complete and honest without faking coverage.

## Scoring

```ts
function score(results: RuleResult[]): { score: number; approvable: boolean } {
  const W = { critical: 40, high: 15, medium: 5, low: 1 };
  const penalty = results
    .filter(r => r.status === "fail")
    .reduce((s, r) => s + W[r.severity], 0);
  const approvable = !results.some(r => r.status === "fail" && r.severity === "critical");
  return { score: Math.max(0, 100 - penalty), approvable };  // indicative only
}
```

`not_applicable` / `needs_human` / `not_implemented` never deduct. `approvable` is
a hard gate on critical failures; the numeric score is just a quality signal for
the before/after story.

## The bounded correction loop

```ts
async function reconcileAndVerify(account, period, store): Promise<{ recon; report }> {
  let recon = await draft(account, period, store);          // Layer 2 [a]–[e]
  let report = await lint(recon, ctx);
  for (let i = 0; i < 2 && hasAutoFixableFailures(report); i++) {
    recon = await redraft(recon, failures(report), store);  // re-runs ONLY [e]
    report = await lint(recon, ctx);
  }
  return { recon, report };   // present to human regardless of remaining non-critical issues
}
```

- Only the `draft` step re-runs; numeric stages are untouched ([ADR-0011](./adr/0011-layer2-orchestration.md)).
- Non-autofixable failures (missing real support, tie-out break) are **surfaced**,
  never patched away.

## Human approval (built) — the SOX payoff

```ts
// POST /approve  { reviewer, role, comments }
function approve(recon: Reconciliation, input: ApprovalInput, acct: Account) {
  if (input.reviewer === recon.preparer) throw Forbidden("reviewer must differ from preparer"); // 6.1
  if (!authorityMeets(input.role, acct.riskLevel)) throw Forbidden("insufficient authority");    // 6.1
  const audit = { reviewer: input.reviewer, role: input.role,
                  comments: input.comments, approvedAt: new Date().toISOString() };
  return { ...recon, reviewer: input.reviewer, status: "approved", audit };  // 6.1/6.2 re-evaluated
}
```

- `preparer: "agent"` (Layer 2) ≠ human `reviewer` ⇒ segregation satisfied.
- The audit record (`reviewer`, role, timestamp, comments, lint score) is the
  contemporaneous evidence "a qualified human reviewed and signed off." In-memory
  for the PoC; a persistent log is deferred.

## The before/after demo

The linter is standalone, so we can score the **October (poor) recon** — it should
fail exactly the rules Sarah flagged in real life (4.1 completeness missing, 2.2
vague variance, 8.2 unexplained large items) — against the **generated December
recon** (post-loop), which passes them. Concrete, objective evidence that the
system lifts "October quality" to "November quality."

## Build vs defer (PoC)

- **Build:** the rule registry + the ~10 subset rules, `RuleStatus`/scoring, the
  bounded loop, `/verify` and `/approve` endpoints, the in-memory audit record.
- **Defer:** the remaining ~25 rules' logic, a persistent audit log, a real
  reviewer-authority directory, formatting rules (7.2), and account-type-specific
  rules (5.1/5.2/5.4) beyond `not_applicable`.

## Resolved decisions

- High-signal subset implemented; rest registered as `not_applicable`/`not_implemented`.
- Mostly deterministic; 2.2/5.3 (and the specificity side of 2.1) are LLM-assisted
  but return structured `RuleResult`s.
- Correction loop is automatic and **bounded to N = 2**, then hands to the human.
- `/approve` is built, records an audit trail, and enforces reviewer ≠ preparer.
