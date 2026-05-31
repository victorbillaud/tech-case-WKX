# Month-End Close Assistant — What We Built

A **5-minute read** for anyone joining the project: the business context, what the
product does, how it works, and where to look in the repo.

---

## The problem

TechCorp closes its books every month under SOX controls. For each balance-sheet
account, an accountant must:

1. Prove the rollforward ties (beginning balance + activity = ending balance).
2. Explain material month-over-month variances with **specific** supporting evidence.
3. Flag unusual items and document completeness procedures.
4. Write a reconciliation narrative that passes controller review.

Today this is slow and fragile. Jessica abandoned a December draft for account
**24100 (Accrued Expenses)**. Sarah (Controller) rejects **30–40%** of
reconciliations for vague language, missing support, or arithmetic that does not
tie. The detective work — matching GL lines to invoices, memos, and e-mails — is
mostly manual.

We built an **agent-assisted reconciliation system** that does that detective work,
drafts the recon, **lints against TechCorp's quality rubric** (~35 rules in
[`data/rules_and_constraints.md`](data/rules_and_constraints.md); **11 enforced**
in the PoC, remainder stubbed as N/A or deferred), and leaves final sign-off to
a qualified human.

---

## What the product is

A three-step workflow for one account and one period:

| Step | What you do | What the system does |
|------|-------------|----------------------|
| **Ingest** | Upload period files (GL CSV, balances, supporting docs) | Classify, parse, normalize, and link documents to transaction references |
| **Reconcile** | Click “Generate draft” | Tie out, categorize activity, explain variances, detect cross-doc anomalies, draft the narrative |
| **Review** | Run verify, read lint results, approve | Lint against quality rules, auto-redraft fixable issues, block approval when critical rules fail |

The output is not a chat answer — it is a typed **`Reconciliation`** object:
rollforward, variance drivers, anomalies, completeness, risk assessment, and
narrative. Balances and rollforward arithmetic are computed in code; the LLM
handles classification, transaction labeling, prose drafting, and quality lint —
never inventing amounts or sums.

**PoC scope:** account **24100**, period **2025-12**, using the case study data.
The architecture extends to more accounts; the demo focuses on depth over breadth.

---

## How it works (three layers)

```
  Raw files          Canonical store           Draft + lint           Human ✓
 ┌──────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────┐
 │ CSV, txt │ ingest│ Transactions │ agent │ Reconciliation│ verify│ Approved │
 │ memos…   │──────►│ Documents    │──────►│ + LintReport  │──────►│ recon    │
 └──────────┘       │ Balances     │       └──────────────┘       └──────────┘
                    └──────────────┘
     Layer 1              shared contract              Layer 2 + 3
```

For a plain-language walkthrough of each layer and its pipeline steps, see
[`LAYERS.md`](LAYERS.md).

### Layer 1 — Ingestion

Turns messy uploads into a **canonical data model** (`@repo/domain`).

- **Deterministic parsers** for GL, balances, and chart of accounts — amounts are
  exact, stored as integer cents.
- **LLM classifier** for supporting documents: returns a document type or `null`
  when unsure. Unclassified files go to a human queue — we never guess silently.
- **Reference linking**: AP-, JE-, INV- references and vendor names index which
  documents support which transactions.

The agent and linter never read raw CSV or PDF text. They only see validated objects.

### Layer 2 — Reconciliation agent

Deterministic pipeline with bounded LLM calls:

1. **Tie-out** — build rollforward; record honestly if sample GL data does not tie
   (no invented “plug” entries).
2. **Categorize** — LLM labels each transaction; code groups and sums by accrual
   category.
3. **Variance** — surface material drivers; attach linked evidence documents.
4. **Anomalies** — cross-check narrative claims vs documents (e.g. memo amount ≠ JE).
5. **Draft** — LLM fills the reconciliation structure using a **prose-only** schema;
   numbers come from prior stages, not from the model.

November’s approved reconciliation is used as a style exemplar in the draft prompt.

### Layer 3 — Verifier + approval

Encodes TechCorp’s reconciliation quality rubric as a **rules linter** (26 rules
registered; **11 actively enforced**, 15 stubbed with explicit `not_implemented` /
`not_applicable` status):

- **Deterministic rules** — rollforward ties, no plugs, large transactions have
  support, required sections present, segregation of duties.
- **LLM-assisted rules** — material variance explanations are substantive; banned
  vague phrases; estimate methodology documented.
- **Auto-fixable rules** (7 in PoC) — vague phrasing, missing sections, thin
  variance explanations; trigger re-draft before human review.

When fixable rules fail, the system **re-drafts** (up to 2 passes) with lint
feedback, then presents results to the reviewer. A **critical fail** blocks
approval — intentionally so for December 24100, where the sample GL does not tie.

Approval records who signed off, enforces reviewer ≠ preparer, and writes an audit
trail.

---

## Design principles (why it is trustworthy)

1. **Deterministic core, bounded LLM elsewhere.** Rollforward and sums are code;
   the model classifies, labels, drafts prose, and lints language — it never
   invents balances or plugs gaps.
2. **Canonical model as contract.** Swap SAP for CSV by changing ingestion only.
3. **Everything grounded.** Variance drivers cite transaction references and
   document IDs; in the UI, those IDs link to the source file.
4. **Human in the loop.** The agent prepares; a qualified human approves under SOX.

These are expanded in [`prd/adr/`](prd/adr/) if you want the decision history.

---

## What you can demo

1. **Ingest** the December data folder → browse transactions, documents, and balances;
   resolve any unclassified docs in the human queue.
2. **Reconcile** account 24100 → watch the pipeline progress; read the draft report
   with variance drivers (e.g. Compensation & Bonus ~$1.97M with JE references) and
   evidence linked by reference index (AP-/JE-/INV-).
3. **Click document links** in the narrative to open supporting memos in a viewer.
4. **Verify** → see lint cards (pass / fail / severity); watch auto-redraft fix up to
   7 language-level rules (vague phrasing, thin explanations) in ≤2 passes.
5. **Approve** → blocked when lint is not approvable (e.g. rollforward tie-out fail);
   succeeds when rules pass and a different reviewer approves.

**PoC outcomes:** detective work (reference linking, categorization, anomaly flags)
runs end-to-end; Sarah-style rejections for vague language are addressed before
human review via the correction loop; December correctly blocks approval when the
sample GL does not tie.

---

## Repo map

| Path | Role |
|------|------|
| [`packages/domain/`](packages/domain/) | Shared Zod schemas: Transaction, Document, Reconciliation, LintReport |
| [`apps/api/`](apps/api/) | Hono API — ingestion, reconcile, verify, approve |
| [`apps/api/src/ingestion/`](apps/api/src/ingestion/) | Layer 1 pipeline |
| [`apps/api/src/reconciliation/`](apps/api/src/reconciliation/) | Layer 2 orchestration |
| [`apps/api/src/verify/`](apps/api/src/verify/) | Layer 3 rules linter + correction loop |
| [`apps/web/`](apps/web/) | React UI — Ingest → Reconcile → Review stepper |
| [`prd/`](prd/) | Product & architecture docs (deeper than this file) |
| [`data/`](data/) | Case study inputs: GL, prior recons, supporting docs, rules rubric |

**Stack:** TypeScript monorepo (Turborepo) — Hono API, React UI, Zod schemas in
`@repo/domain`, OpenAI structured outputs for classification and drafting.

**Run locally:** install deps, set `OPENAI_API_KEY` in `apps/api/.env`, then start
API and web (see [`apps/api/README.md`](apps/api/README.md)).

---

## What we deliberately did not build (yet)

Multi-account close, generic PDF ingestion, forecasting, and production persistence
are **designed for** in the data model but out of PoC scope. The write-up treats
forecasting as the strategic extension (CFO ask) while delivering reconciliation
quality (Controller ask) first.

---

## Further reading

- [`LAYERS.md`](LAYERS.md) — each layer explained simply (pipelines, code vs AI, API map)
- [`prd/architecture.md`](prd/architecture.md) — pipeline diagram and layer boundaries
- [`prd/layer-1-ingestion.md`](prd/layer-1-ingestion.md) — upload → classify → link
- [`prd/layer-2-reconciliation-agent.md`](prd/layer-2-reconciliation-agent.md) — agent stages
- [`prd/layer-3-verifier-approval.md`](prd/layer-3-verifier-approval.md) — rules & approval
- [`data/rules_and_constraints.md`](data/rules_and_constraints.md) — full quality rubric
