# Layer 2 — Reconciliation agent (in practice)

> Consumes the canonical store for **one account + period** and produces a **draft
> `Reconciliation`** (typed, not free text) for Layer 3 to verify and a human to
> approve.
>
> Decisions driving this doc ([ADR-0011](./adr/0011-layer2-orchestration.md)):
> a **deterministic pipeline** with bounded LLM calls; **LLM-first categorization**
> with **code-recomputed sums**; **drafting via OpenAI structured outputs** bound
> to a **prose-only** Zod schema (code owns every number); **cross-doc anomalies**
> via targeted extraction + code compare.

## Goal & output

**Input:** `account` (e.g. `"24100"`), `period` (e.g. `"2025-12"`), and the
`CanonicalStore` from Layer 1.
**Output:** a `Reconciliation` with `status: "draft"`, `preparer: "agent"`,
`reviewer: null` — handed to Layer 3.

```
account + period + CanonicalStore
   └─► [a] tie-out ─► [b] categorize ─► [c] variance ─► [d] anomalies ─► [e] draft ─► Reconciliation(draft)
```

Lives in `apps/api`; types from `@repo/domain`. The numeric stages (a–d) never
call an LLM for arithmetic; only [b], [d], [e] call OpenAI, each for a bounded job.

## The HTTP entrypoint (Hono)

```
POST /periods/:period/accounts/:account/reconcile
   → 200 Reconciliation (status: "draft")

POST /periods/:period/accounts/:account/redraft   (Layer 3 correction loop)
   → body: LintReport   → re-runs [e] only, with the failures as guidance
```

The orchestrator is a plain function callable without HTTP (testing).

## Pipeline stages

### [a] Tie-out — deterministic

Build the rollforward from authoritative balances + the period's transactions.

```ts
function tieOut(account: string, period: string, s: CanonicalStore): Rollforward {
  const begin = s.balance(account, priorPeriod(period))!.balance;   // natural sign
  const glEnd = s.balance(account, period)!.balance;
  const txns  = s.transactions({ account, period });

  const additions = sumCents(txns.filter(t => t.direction === "addition").map(t => t.signedAmount));
  const reductions = sumCents(txns.filter(t => t.direction === "reduction").map(t => Math.abs(t.signedAmount)));
  const endComputed = begin + additions - reductions;

  return {
    beginningBalance: begin, additions, reductions,
    endingBalance: endComputed, glBalance: glEnd,
    ties: endComputed === glEnd,
    unexplainedDifference: (glEnd - endComputed) as Money,
  };
}
```

> **No plugs.** The GL is a *sample* (`data/README.md`), so it may not tie exactly.
> We record `unexplainedDifference` honestly and let the linter flag it — we never
> invent a balancing entry (Rule 1.3). This is a feature, not a bug.

### [b] Categorize — LLM-first, code sums

One structured-output call labels each transaction; **code does the grouping and
the sums**.

```ts
// LLM output schema (Zod) — labels only, no amounts.
const CategoryLabels = z.object({
  labels: z.array(z.object({
    reference: z.string(),
    category: AccrualCategory,        // closed enum → model can't invent a bucket
  })),
});

async function categorize(txns: Transaction[]): Promise<CategoryBreakdown[]> {
  const { labels } = await openai.parse(CategoryLabels, promptFrom(txns)); // ref → category
  const byRef = new Map(labels.map(l => [l.reference, l.category]));
  // code assigns + sums; the model never returns a total
  return groupAndSum(txns, byRef);   // → CategoryBreakdown[] (amount summed in cents)
}
```

- Additions are grouped into `AccrualCategory` (Professional Services, Cloud,
  Facilities, Contractor, Travel, Compensation & Bonus, Other).
- Reductions get a light split (payments vs reversals) by description; full
  reduction categorization is deferred.

### [c] Investigate variance — deterministic + retrieval

```ts
function investigate(account, period, roll, s): VarianceFacts {
  const prior = s.balance(account, priorPeriod(period))!.balance;
  const delta = roll.glBalance - prior;
  const isMaterial = Math.abs(delta) > 50_000_00 ||
                     Math.abs(delta / prior) > 0.10;          // Rule 2.1
  // drivers = biggest categories + flagged transactions, each with linked docs
  const drivers = pickDrivers(roll, s).map(d => ({
    label: d.label, amount: d.amount,
    evidenceDocIds: s.references.docsForReference(d.reference).map(x => x.docId),
  }));
  return { prior, current: roll.glBalance, delta, isMaterial, drivers, trend: sixMonthTrend(...) };
}
```

- Each material driver is pre-linked to its supporting document(s) via the
  `ReferenceIndex` — so the draft step writes *grounded* explanations.
- **Prior-period comparison:** prior month + a 6-month trend from
  `account_balances`. **Prior-year (Rule 2.3) is unavailable** (data is Jul–Dec
  only) → recorded as a known gap; the linter reports it as `needs_data`.

### [d] Detect anomalies — deterministic flags + cross-doc extract/compare

```ts
// 1) deterministic: lift Layer-1 transaction flags into anomalies
//    keyword_plug → critical; keyword_adjustment / round_number / over_100k / manual_je → warning

// 2) cross-doc: extract an amount from a linked doc, compare in code
const DocAmount = z.object({ amount: Money, note: z.string() });

async function crossDocCheck(t: Transaction, doc: SupportingDocument): Promise<Anomaly | null> {
  const { amount } = await openai.parse(DocAmount, extractPrompt(doc.raw)); // LLM reads text
  if (amount !== Math.abs(t.signedAmount)) {            // exact match required
    return { kind: "memo_vs_gl_mismatch", severity: "critical",
             message: `Doc ${doc.docId} states ${fmt(amount)} vs GL ${t.reference} ${fmt(t.signedAmount)}`,
             references: [t.reference, doc.docId] };
  }
  return null;
}
```

This is the flagship: the bonus calc memo states **~$14M** while `JE-12501` posts
**$1.9M** → a `critical` anomaly. The LLM only *reads* the number; **code decides**
it's a mismatch. We require an **exact match** — any difference surfaces an
anomaly for the human to accept or reject (favoring surfacing over silent
suppression, consistent with "flag, don't resolve").

### [e] Draft narrative — OpenAI structured output, prose only

The model receives already-computed facts + grounding excerpts + the approved Nov
recon as a style exemplar, and returns **only prose**, validated by Zod.

```ts
// LLM output schema — NO Money fields. Code owns all numbers.
const ReconciliationDraft = z.object({
  narrative: z.string(),
  driverExplanations: z.array(z.object({ label: z.string(), explanation: z.string() })),
  completeness: z.object({ proceduresPerformed: z.array(z.string()), result: z.string() }),
  riskAssessment: z.object({ risksIdentified: z.array(z.string()), mitigatingControls: z.array(z.string()) }),
});

const draft = await openai.parse(ReconciliationDraft, draftPrompt({
  rollforward, categories, varianceFacts, anomalies, exemplar: novRecon, evidence,
}));

// Code assembles the FINAL object: computed numbers + LLM prose.
const recon: Reconciliation = Reconciliation.parse({
  account, period,
  rollforward, categories,
  variance: { ...varianceFacts, drivers: mergeExplanations(varianceFacts.drivers, draft.driverExplanations) },
  completeness: draft.completeness,
  riskAssessment: draft.riskAssessment,
  anomalies,
  exhibits: usedDocIds,
  narrative: draft.narrative,
  preparer: "agent", reviewer: null, status: "draft",
});
```

This is how we use **OpenAI structured outputs with Zod** while honoring ADR-0004:
the LLM's schema simply has no numeric fields to get wrong.

## What the agent does NOT decide

It **flags, it does not resolve**. Accounting treatment, cutoff calls (e.g. the
Accenture Nov-work-booked-in-Dec item), and whether an anomaly is acceptable are
surfaced for the human reviewer in Layer 3. This is the human-in-the-loop / SOX
boundary.

## How the 24100 December slice flows through

- **[a]** begin $3,100,000 (Nov) + additions − reductions vs GL end $3,500,000.
- **[b]** the $1.9M bonus → `Compensation & Bonus`; Accenture/Deloitte →
  `Professional Services`; AWS → `Cloud Infrastructure`; etc.
- **[c]** Δ +$400,000 (12.9%) → material; drivers linked to Accenture SOW, Deloitte
  invoice, AWS e-mail, bonus memo.
- **[d]** bonus memo ($14M) vs GL ($1.9M) → critical anomaly; `true-up`/`adjustment`
  JEs flagged.
- **[e]** grounded narrative drafted in the approved Nov style → `Reconciliation`.

## Build vs defer (PoC)

- **Build:** the pipeline orchestrator, deterministic tie-out, LLM categorization
  + code sums, variance + `ReferenceIndex` retrieval, deterministic flag→anomaly
  mapping, cross-doc extract/compare, structured-output drafting, final assembly +
  `Reconciliation.parse` validation.
- **Defer:** full reduction categorization, automatic cutoff detection,
  multi-account, prior-year comparison (no data), and the correction loop itself
  (Layer 3 owns it — we expose the `redraft` entrypoint only).

## Resolved decisions

- Deterministic pipeline; categorize LLM-first with code-summed totals.
- Drafting = OpenAI structured outputs against a **prose-only** Zod schema.
- Cross-doc anomalies = targeted LLM extraction + code compare, **exact-match**
  (any difference raises an `Anomaly`).
- **Preparer = `"agent"`**; segregation of duties (Rule 6.1) is satisfied by the
  human reviewer in Layer 3.
- **Reductions** use the light **payments vs reversals** split (deterministic, by
  description), mirroring the approved Nov recon; full per-category reduction
  breakdown stays deferred.
