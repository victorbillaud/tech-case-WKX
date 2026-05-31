# How the three layers work

> **Companion to [`PRODUCT.md`](PRODUCT.md).** Same system, explained in plain
> language: what each layer does, step by step, and how the pipelines connect.

---

## The big picture

Think of three jobs on the way to an approved reconciliation:

| Layer | One-line job | Input | Output |
|-------|--------------|-------|--------|
| **1 — Ingestion** | Clean up uploaded files | Raw CSVs, memos, emails… | A validated **data store** for the period |
| **2 — Reconciliation** | Build the draft report | Account + period + data store | A typed **Reconciliation** (draft) |
| **3 — Verify & approve** | Quality-check and sign off | Draft + data store | **LintReport** → human **approval** |

Layers 2 and 3 never open raw files. They only read objects from Layer 1 — that
boundary is what keeps the system trustworthy.

> **Alternatives considered**
>
> - **Single chat agent** that reads raw files and writes the recon in one shot —
>   simpler to build, but hard to audit, easy to hallucinate numbers, and Sarah's
>   quality rules can't run deterministically on the output.
> - **Layered pipeline with a shared data model** (what we built) — more moving
>   parts, but each stage is testable and the linter can gate approval on facts
>   computed in code.

```
  YOU upload files          SYSTEM prepares draft           YOU review & approve
 ┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
 │ Layer 1         │       │ Layer 2             │       │ Layer 3             │
 │ Ingestion       │──────►│ Reconciliation      │──────►│ Verify + Approve    │
 │                 │       │ agent               │       │                     │
 │ "Make it clean" │       │ "Write the recon"   │       │ "Is it good enough?"│
 └─────────────────┘       └─────────────────────┘       └─────────────────────┘
         │                           │                           │
         ▼                           ▼                           ▼
   Canonical store            Reconciliation (draft)      LintReport + approved recon
   (transactions,             rollforward, variance,       (or blocked if critical
    documents, balances)      narrative, anomalies…)       rules fail)
```

---

## Layer 1 — Ingestion

**Job:** Turn a folder of messy period files into clean, linked data the rest of
the system can trust.

**When it runs:** You upload files in the **Ingest** step (`POST …/ingest`).

**What you get back:** An ingestion report — counts, warnings, and a list of
**unclassified** documents that need a human label.

### Pipeline (5 steps)

```
upload → classify → parse → normalize → link → store
```

| Step | What happens | Code or AI? |
|------|--------------|-------------|
| **Receive** | Read each uploaded file (CSV, txt, md…) | Code |
| **Classify** | Decide: is this GL data, balances, chart of accounts, or a supporting doc (invoice, memo, email…)? | AI — returns a type, or **`null` if unsure** |
| **Parse** | GL/balances/chart → structured rows; supporting docs → stored text + metadata | Code (CSVs); text kept as-is for docs |
| **Normalize** | Fix signs (liabilities positive), compute debit/credit direction, flag suspicious lines (>$100K, “plug”, manual JE…) | Code only — amounts in **integer cents** |
| **Link** | Scan documents for references (AP-, JE-, INV-…) and vendors; build an index so each transaction can find its evidence | Code |

> **Alternatives considered — classification**
>
> - **Header-signature shortcuts** for the three known CSVs (match column names,
>   skip the LLM) — faster and free, but another code path to maintain.
> - **LLM for every file** (what we built) — uniform, no hand-maintained rules;
>   acceptable cost for a PoC-sized upload batch.

> **Alternatives considered — reference linking**
>
> This step is the backbone of grounding for Layer 2. We chose **exact reference
> matching** (regex on AP-/JE-/INV- tokens) because it is auditable and the case
> data contains natural join keys. It misses implicit links (e.g. a SOW that
> supports a line by vendor name but never mentions `AP-28502`).
>
> A production evolution would likely be **tiered**:
>
> 1. **Exact match** (current) — auto-link, high confidence
> 2. **Heuristics** — vendor + amount + date proximity
> 3. **LLM suggestions** — propose links from context, **human confirms** (same
>    pattern as unclassified docs: never guess silently)
>
> Vendor indexing (`docsForVendor`) is designed in but **deferred** in the PoC.

### Human step (when needed)

If the classifier is not sure about a file, it sets `docType: null`. Those files
show up in the **Unclassified** queue in the UI. You pick the type; the system
re-links and stores — **it never guesses silently**.

### What's in the store after ingestion

- **Accounts** — chart of accounts (type, risk level…)
- **Balances** — beginning/ending balance per account per month
- **Transactions** — every GL line, signed and flagged
- **Documents** — invoices, memos, emails… with raw text
- **Reference index** — “JE-12501 → bonus memo”, “AP-28712 → Deloitte invoice”

We ingest the **whole period** (all accounts), then Layer 2 focuses on one account
(e.g. 24100). That keeps cross-account checks possible later.

> **Alternatives considered — storage**
>
> - **In-memory store** (PoC) — zero setup, resets on restart.
> - **Persistent DB** (production) — same `CanonicalStore` interface; swap the
>   implementation without touching Layers 2–3.

**Code:** [`apps/api/src/ingestion/`](apps/api/src/ingestion/)

---

## Layer 2 — Reconciliation agent

**Job:** For one account and one period, produce a complete draft reconciliation —
numbers from code, narrative from AI.

**When it runs:** You click **Generate draft** (`POST …/reconcile`).

**What you get back:** A `Reconciliation` object with status `draft` and
`preparer: "agent"`.

### Pipeline (5 stages)

```
tie-out → categorize → variance → anomalies → draft
```

| Stage | What happens | Code or AI? |
|-------|--------------|-------------|
| **Tie-out** | Build the rollforward: beginning balance + additions − reductions = ending balance. Compare to GL balance. If they don't match, record the gap — **no invented plug entries**. | Code only |
| **Categorize** | Label each transaction (Professional Services, Cloud, Bonus…); group and **sum by category in code** | AI labels; **code sums** |
| **Variance** | Compare to prior month; flag material changes; attach linked evidence docs to each driver | Code + reference index |
| **Anomalies** | Flag suspicious transactions; cross-check memo amounts vs GL (e.g. bonus memo says $14M, JE posts $1.9M) | Code for flags; AI reads doc amounts; **code compares** |
| **Draft** | Write narrative, variance explanations, completeness and risk sections — using November's approved recon as a style guide | AI — **prose only**; all numbers injected from prior stages |

The model never chooses balances or totals. It only writes text around facts
already computed.

> **Alternatives considered**
>
> - **Rule-based categorization** (keyword rules on description/vendor) — cheap
>   and deterministic, but brittle on edge cases and new vendors.
> - **LLM labels + code sums** (what we built) — model handles judgment; totals
>   stay exact in code.
>
> - **LLM extracts amounts from memos with fuzzy tolerance** — could reduce false
>   anomalies when rounding differs; we chose **exact match** to favor surfacing
>   over silent suppression (bonus memo $14M vs JE $1.9M is the flagship demo).
>
> - **LLM drafts numbers too** — one schema, simpler prompt; rejected because a
>   wrong balance in prose is an audit finding. Prose-only schema keeps the trust
>   boundary crisp.

### What the agent deliberately does *not* do

It **surfaces** problems (tie-out breaks, memo mismatches, vague drivers) — it does
**not** decide accounting treatment or override data. Those calls stay with the
human reviewer.

**Code:** [`apps/api/src/reconciliation/`](apps/api/src/reconciliation/)

---

## Layer 3 — Verify & approve

**Job:** Run TechCorp's quality rules on the draft, auto-fix wording where possible,
then let a qualified human sign off (or block approval if critical rules fail).

**When it runs:** **Verify** (`POST …/verify`) then **Approve** (`POST …/approve`).

**What you get back:** A `LintReport` (pass/fail per rule, score, approvable flag)
and, after approval, an audit record (who, when, comments).

### Pipeline

```
lint draft → (auto-fixable failures? → redraft → lint again) × up to 2 → present to human → approve
```

| Step | What happens | Code or AI? |
|------|--------------|-------------|
| **Lint** | Run ~26 registered rules; **11 actively enforced** in the PoC (rest stubbed as N/A or deferred) | Mostly code; a few rules use AI to judge prose quality |
| **Auto-redraft** | If fixable rules fail (vague language, thin explanations, missing sections), re-run **only the draft stage** with lint feedback — max **2 passes** | AI rewrites prose; numbers unchanged |
| **Present** | Show lint cards in the UI; reviewer reads the improved draft | — |
| **Approve** | Record reviewer name, role, comments; enforce **reviewer ≠ preparer**; block if any **critical** rule still fails | Code |

### Rule types (simplified)

| Kind | Examples | Can auto-fix? |
|------|----------|---------------|
| **Math & data** | Rollforward ties, no plug keywords, large txns have support | No — these are facts |
| **Prose quality** | No vague phrases, material variances explained, estimate methodology documented | Yes — triggers redraft |
| **Process** | Required sections present, segregation of duties at approval | Sections: yes; SoD: checked at approve |

A **critical fail** (e.g. rollforward doesn't tie) sets `approvable: false` —
approval is blocked. For December 24100, the sample GL intentionally does not tie,
so the demo correctly shows a blocked approval.

> **Alternatives considered**
>
> - **Human-only correction** — reviewer edits prose in the UI; no auto-redraft.
>   Safer for high-stakes accounts, but doesn't address Sarah's 30–40% rejections
>   for fixable wording issues.
> - **Unbounded redraft loop** — keep calling the LLM until all rules pass; risk
>   of cost blow-up and over-polished text that masks real gaps.
> - **Bounded auto-redraft (N = 2)** (what we built) — fixes language-level issues
>   cheaply, then hands off; data failures (tie-out, missing support) are never
>   patched away.
>
> - **Soft approval** — allow sign-off with warnings; rejected for SOX — critical
>   rule failures hard-block `approvable`.

**Code:** [`apps/api/src/verify/`](apps/api/src/verify/)

---

## End-to-end: one account, one period

This is the full path for the PoC demo (24100, December 2025):

```
1. INGEST
   Upload data/ folder files
   → canonical store populated
   → fix any unclassified docs in the UI

2. RECONCILE
   Generate draft for 24100
   → tie-out (may show unexplained difference)
   → categories, variance drivers with doc links
   → anomalies (e.g. bonus memo vs JE mismatch)
   → narrative drafted

3. VERIFY
   Run linter + up to 2 auto-redrafts
   → LintReport with pass/fail cards

4. APPROVE
   Different reviewer signs off
   → succeeds only if no critical failures
   → audit trail recorded
```

### UI step → API → layer

| UI step | API endpoint | Layer |
|---------|--------------|-------|
| Upload files | `POST /periods/:period/ingest` | 1 |
| Classify a doc | `POST /periods/:period/classify` | 1 |
| Browse data | `GET /periods/:period/store/…` | 1 |
| Generate draft | `POST /periods/:period/accounts/:account/reconcile` | 2 |
| Verify | `POST /periods/:period/accounts/:account/verify` | 3 |
| Approve | `POST /periods/:period/accounts/:account/approve` | 3 |

---

## Where the LLM is used (and where it isn't)

| Task | LLM? | Why |
|------|------|-----|
| Parse CSV amounts | No | Must be exact |
| Classify uploaded files | Yes | Filename + content are ambiguous |
| Tie-out / rollforward math | No | SOX-critical arithmetic |
| Label transaction categories | Yes | Judgment; sums still computed in code |
| Pick variance drivers & link docs | No | Retrieval from reference index; LLM-assisted linking is a planned tier-3 upgrade |
| Extract amount from a memo | Yes | Reads unstructured text |
| Compare memo vs GL | No | Code decides match/mismatch |
| Draft narrative | Yes | Prose only — no numeric fields in schema |
| Lint vague phrasing | Yes | Language quality judgment |
| Approve / block approval | No | Deterministic rules + human action |

---

## PoC boundaries (per layer)

| Layer | Built for demo | Deferred |
|-------|----------------|----------|
| **1** | CSV + text upload, classifier, reference linking (exact refs), in-memory store | PDF/OCR, zip upload, persistent DB, vendor/heuristic/LLM linking tiers |
| **2** | Full 5-stage pipeline for 24100 | Multi-account, prior-year variance, auto cutoff detection, fuzzy anomaly matching |
| **3** | 11 rules + correction loop + approval + audit record | Remaining rubric rules, persistent audit log, human-only edit path |

---

## Further reading

- [`PRODUCT.md`](PRODUCT.md) — product overview and demo script
- [`prd/layer-1-ingestion.md`](prd/layer-1-ingestion.md) — Layer 1 implementation detail
- [`prd/layer-2-reconciliation-agent.md`](prd/layer-2-reconciliation-agent.md) — Layer 2 implementation detail
- [`prd/layer-3-verifier-approval.md`](prd/layer-3-verifier-approval.md) — Layer 3 implementation detail
- [`data/rules_and_constraints.md`](data/rules_and_constraints.md) — full quality rubric
- [`prd/adr/0007-reference-based-linking.md`](prd/adr/0007-reference-based-linking.md) — linking decision and consequences
