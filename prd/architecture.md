# Architecture — High Level

> Scope of this doc: the **pipeline** and the **layers**. No class interfaces,
> prompts, or file layout yet — those come once the data model is locked.

## The core idea

Three layers, each with a single responsibility, separated by the **canonical
data model** (see [data-model.md](./data-model.md)):

```
   MESSY INPUTS                  CANONICAL MODEL                CLEAN CONSUMERS
  ┌────────────────┐           ┌────────────────┐            ┌────────────────┐
  │ CSV (GL, bal.) │           │  typed objects │            │ Drafting agent │
  │ .txt / .md     │  ───────► │  (Zod-validated│  ────────► │ Rules linter   │
  │ e-mails, Slack │  ingest   │   contract)    │  consume   │ Human reviewer │
  │ memos, invoices│           │                │            │                │
  └────────────────┘           └────────────────┘            └────────────────┘
       LAYER 1                                                    LAYER 2 + 3
```

Why this shape: the agent and the linter never touch a raw file. Swapping a
source (SAP, Salesforce, a scanned PDF) only touches Layer 1. See
[ADR-0003](./adr/0003-canonical-data-model-as-contract.md).

## Layer 1 — Ingestion (mostly deterministic)

Turns whatever the user uploads for a period into validated canonical objects.

```
[1] UPLOAD        user drops all documents for a period (a folder)
       │
       ▼
[2] CLASSIFY      decide each file's nature (source CSV or document type)
   ├─ OpenAI classifier  one structured-output call → a type, or null when unsure
   └─ human fallback      null → store docType: null; user selects it later
       │
       ▼
[3] EXTRACT       turn each source into canonical objects
   ├─ deterministic   CSV parsers for GL / balances / chart of accounts → typed
   └─ text docs       keep raw text + link keys (references/accounts); docType may be null
                      (per-type field extraction is deferred — see data-model §3)
       │
       ▼
[4] NORMALIZE     write to canonical model
   ├─ sign normalization        debit/credit → signed_amount + direction
   ├─ derived flags             round number, manual JE, keyword, >$100K
   └─ LINK by reference         AP-…, JE-…, INV-… and vendor → ReferenceIndex
       │
       ▼
   Canonical store (validated)  ← the only thing downstream layers see
```

Key principles:

- **Backbone is deterministic.** GL / balances / chart are parsed by code, not
  an LLM. The numbers must be exact. See
  [ADR-0004](./adr/0004-deterministic-core-llm-narrative.md).
- **Classification degrades gracefully.** The OpenAI classifier returns a type or
  `null`; a `null` becomes a human task. We never guess silently. See
  [ADR-0005](./adr/0005-document-classification-pipeline.md).
- **Linking is the unlock.** A `ReferenceIndex` maps `reference → documents` and
  `vendor → documents`, so when the agent looks at a transaction it already has
  the supporting document in hand. See
  [ADR-0007](./adr/0007-reference-based-linking.md).

## Layer 2 — Reconciliation agent

Consumes canonical objects for one account + period and produces a typed
`Reconciliation` (not free text).

```
Account + Period + Transactions + Balances + linked Documents
       │
       ▼
[a] TIE-OUT (deterministic)
    begin + Σ additions − Σ reductions = end ?   (Rule 1.1, must be exact)
       │
       ▼
[b] CATEGORIZE (LLM labels, code sums)
    LLM tags each transaction with an AccrualCategory; code groups + sums
       │
       ▼
[c] INVESTIGATE VARIANCE
    month/month delta → material? surface big/unusual items, attach the
    linked document for each, compare to prior periods
       │
       ▼
[d] DETECT ANOMALIES (deterministic + cross-doc)
    e.g. bonus memo says $14M but GL JE-12501 = $1.9M → Anomaly
       │
       ▼
[e] DRAFT NARRATIVE (LLM)
    fill the approved reconciliation structure from already-validated facts
    → the model writes prose, it never computes numbers
       │
       ▼
   Reconciliation (typed object)
```

## Layer 3 — Verifier (the rules linter) + human

Encodes the 35+ rules from `data/rules_and_constraints.md` as deterministic
checks. See [ADR-0006](./adr/0006-rules-linter-verifier.md).

```
Reconciliation
       │
       ▼
[i]  RUN RULES        one function per rule → status + severity + message
[ii] SCORE            a critical "fail" blocks; high/medium/low inform quality
[iii] CORRECTION LOOP autoFixable fails → re-draft (bounded N=2), then to human
       │
       ▼
   Verified Reconciliation + report
       │
       ▼
   HUMAN reviewer (≠ preparer) reviews, edits, APPROVES  → audit trail
```

## Data flow summary

```
raw files ──ingest──► canonical store ──► agent ──► Reconciliation ──► linter ──► human ✓
                            ▲                                              │
                            └─────────── correction loop ◄────────────────┘
```

## What we deliberately leave out of the PoC

See [ADR-0008](./adr/0008-poc-scope-single-account.md). In short: real upload UI,
generic document parsing, multi-account/entity, and forecasting are **designed
for** (the model extends to them) but **not built** in the 1-day slice.
