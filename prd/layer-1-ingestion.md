# Layer 1 — Ingestion (in practice)

> How the ingestion layer actually works. It turns whatever is uploaded for a
> period into **validated canonical objects** (see [data-model.md](./data-model.md))
> stored behind a repository, so Layers 2–3 never touch a raw file.
>
> Decisions driving this doc: real **Hono multipart upload** (many individual
> files, no zip); **in-memory store behind a repository interface**; a single
> **OpenAI classifier** that returns a type **or `null`** when unsure — `null`
> documents go to a **human-resolve** queue (no heuristic tier, no numeric
> confidence/threshold); **liabilities normalized to positive**. (Updates
> [ADR-0005](./adr/0005-document-classification-pipeline.md) /
> [ADR-0008](./adr/0008-poc-scope-single-account.md).)

## Goal & output

**Input:** a set of files for one period (the case's `data/` content, uploaded).
**Output:** a populated `CanonicalStore` for that period + an `IngestionReport`.

```
upload ─► [0] receive ─► [1] classify ─► [2] parse ─► [3] normalize ─► [4] link ─► [5] validate+store
                                                                                         │
                                                                          CanonicalStore + IngestionReport
```

Lives in `apps/api`; all types come from `@repo/domain` ([ADR-0010](./adr/0010-tech-stack-monorepo.md)).

## The HTTP entrypoint (Hono)

```
POST /periods/:period/ingest        multipart/form-data: many individual files
   → 200 IngestionReport             { counts, unclassified[], warnings[], errors[] }

POST /periods/:period/classify      resolve the human-fallback queue
   → body: { docId, docType }[]      (re-runs parse→link→store for those docs)
```

- Files are uploaded as individual parts (no zip in the PoC). We classify from
  **filename + file head**, not folder structure.
- The handler does no business logic: it builds `RawFile[]` and calls the
  ingestion service. Ingestion is callable without HTTP (testing, future CLI).

## Pipeline stages

### [0] Receive & stage

Parse the request into a list of raw files; decode text payloads (UTF-8).

```ts
interface RawFile {
  filename: string;  // "deloitte_audit_q4.txt"
  mime: string;      // "text/csv", "text/plain", ...
  text: string;      // decoded contents (PoC inputs are all text/csv/md/txt)
}
```

### [1] Classify — OpenAI classifier (type or `null`)

Decide each file's nature: a **known structured source** (GL / balances / chart)
or a **supporting document** of some `DocType`. One mechanism, no heuristic tier.

```ts
type SourceKind =
  | "gl_transactions" | "account_balances" | "chart_of_accounts"
  | { document: DocType | null };   // null = supporting doc, type undetermined

interface Classification { kind: SourceKind; rationale?: string }

interface Classifier {
  classify(file: RawFile): Promise<Classification>;
}
```

1. **OpenAI classifier (only mechanism):** a single structured-output call returns
   `{ kind, rationale }` from the filename + file head, validated against the
   `SourceKind`/`DocType` schema so the model can't invent a type. When it can't
   determine a document's type, it returns `{ document: null }` — there is **no
   numeric confidence**.
2. **Escalate on `null`:** a document with `docType: null` *is* the human-fallback
   signal — it appears in the report's `unclassified[]` and the user resolves it
   via `POST /classify`. We **never guess silently**.

> Trade-off noted: routing the three structured CSVs through the LLM is uniform
> and avoids hand-maintained heuristics, at the cost of a model call per file. If
> CSV misclassification ever bites, a header-signature shortcut for the known
> CSVs is the obvious escape hatch — deliberately left out for now.

### [2] Parse / extract — by kind

```ts
interface SourceParser {
  parseChart(file: RawFile): Account[];
  parseBalances(file: RawFile): AccountBalance[];      // wide → long
  parseGl(file: RawFile): RawTransaction[];            // pre-normalization
}
```

- **Known CSVs** are parsed deterministically into typed rows. `account_balances`
  is pivoted from wide (one column per month) to long (one `AccountBalance` per
  account per period).
- **Supporting documents** become a `SupportingDocument`: keep `raw` text + set
  `docType` (or `null` if escalated) and `sourcePath`. No per-type field
  extraction (deferred, data-model §3) — the agent reads `raw` later.

### [3] Normalize — deterministic, the important part

Two normalizations make all downstream math intuitive and exact.

**a) Transaction sign & direction** (needs the account `type` from the chart):

```ts
// Credit-normal accounts increase on a credit; debit-normal on a debit.
const CREDIT_NORMAL = new Set(["Liability", "Equity", "Revenue"]);

function normalize(t: RawTransaction, acct: Account): Transaction {
  const signed = CREDIT_NORMAL.has(acct.type)
    ? t.credit - t.debit          // liability ↑ on credit
    : t.debit - t.credit;         // asset/expense ↑ on debit
  return {
    ...t,
    signedAmount: signed as Money,
    direction: signed >= 0 ? "addition" : "reduction",
    flags: deriveFlags(t, signed),       // round_number, over_100k, keyword_*, manual_je
    category: null,                       // set later by the categorizer (Layer 2)
  };
}
```

**b) Balance sign** — store the account's natural side (liabilities positive), so
the rollforward reads like the approved recons (`24100`: begin **$3,100,000** →
end **$3,500,000**):

```ts
const natural = CREDIT_NORMAL.has(acct.type) ? -raw : raw; // CSV liabilities are negative
```

> Contra accounts (Allowance, Accumulated Depreciation) are a known edge case;
> flagged for later, not needed for the 24100 slice.

**Flags** (tunable thresholds, all deterministic):

```ts
function deriveFlags(t: RawTransaction, signed: number): TransactionFlag[] {
  const f: TransactionFlag[] = [];
  if (t.source === "Manual JE") f.push("manual_je");
  if (Math.abs(signed) > 100_000_00) f.push("over_100k");
  if (Math.abs(signed) % 50_000_00 === 0 && signed !== 0) f.push("round_number");
  if (/true-?up|adjustment|correction/i.test(t.description)) f.push("keyword_adjustment");
  if (/\bplug\b|to balance|to tie|balancing/i.test(t.description)) f.push("keyword_plug");
  return f;
}
```

### [4] Link — build the ReferenceIndex

The grounding backbone ([ADR-0007](./adr/0007-reference-based-linking.md)). Scan
each document's `raw` + `filename` for reference tokens and account numbers, then
index them.

```ts
const REF_PATTERNS = /\b(AP|JE|INV|IC|REV|REF|EXP|PO)[-#\s]?\d+\b/gi;

interface ReferenceIndex {
  docsForReference(ref: string): SupportingDocument[];   // "AP-28502" → [invoice]
  docsForVendor(vendor: string): SupportingDocument[];   // "Accenture" → [SOW, invoice]
  docsForAccount(account: string): SupportingDocument[]; // "24100" → [...]
}
```

For each document we set `relatedReferences` / `relatedAccounts`. A transaction's
`reference` then resolves to its supporting docs in O(1). Documents with **no**
resolvable link are kept but surfaced in the report (an unlinked doc is itself a
signal).

### [5] Validate & store

Every object is `schema.parse(...)`-d at the boundary; failures become structured
warnings/errors rather than throwing the whole batch away. Valid objects go into
the in-memory store, exposed behind an interface so a DB can replace it later.

```ts
interface CanonicalStore {
  accounts(): Account[];
  balance(account: string, period: string): AccountBalance | undefined;
  transactions(filter?: { account?: string; period?: string }): Transaction[];
  documents(): SupportingDocument[];
  references: ReferenceIndex;
}

interface IngestionReport {
  period: string;
  counts: Record<string, number>;          // accounts, balances, transactions, documents
  unclassified: { docId: string; filename: string }[]; // docs with docType === null
  warnings: string[];                        // e.g. "doc X has no resolvable reference"
  errors: string[];                          // schema validation failures
}
```

## We ingest the whole period, reconcile one account

GL is **double-entry**: every transaction is two rows sharing a `reference` (one
debit leg, one credit leg). We ingest **all** legs/accounts (it's tiny and cheap),
then Layer 2 filters `transactions({ account: "24100" })`. Ingesting everything is
what lets cross-account checks work later (e.g. the EMEA→APAC reclass `JE-12455`
touches both `18200` and `18210`).

## How the actual case data flows through

| Source file | Classified as | Becomes |
|---|---|---|
| `chart_of_accounts.csv` | `chart_of_accounts` | `Account[]` |
| `account_balances.csv` | `account_balances` | `AccountBalance[]` (wide→long, sign-normalized) |
| `gl_transactions/december_2025.csv` | `gl_transactions` | `Transaction[]` (signed, flagged) |
| `invoices/deloitte_audit_q4.txt` | `invoice` | `SupportingDocument` (refs: AP-28712) |
| `contracts/accenture_sow_erp_project.txt` | `contract` | `SupportingDocument` (vendor: Accenture) |
| `emails/aws_accrual_confirmation.txt` | `email` | `SupportingDocument` (acct 80700/24100) |
| `calculation_memos/bonus_accrual_dec2025.txt` | `calculation_memo` | `SupportingDocument` (refs: JE-12501) |
| `slack_conversations/…` , `analysis_attempts/…` | `null` (no matching type → user may classify) | `SupportingDocument` |

## Build vs defer (PoC)

- **Build:** the Hono upload endpoint (many files), the OpenAI classifier + the
  `/classify` human-resolve endpoint, the 3 deterministic CSV parsers, sign/flag
  normalization, the `ReferenceIndex`, Zod validation, the in-memory store +
  `IngestionReport`.
- **Defer:** zip upload, per-`DocType` structured extraction, PDF/OCR, a persistent
  DB, a real upload UI, contra-account sign handling, and a header-signature
  shortcut for the known CSVs.

## Resolved decisions

- **Classifier returns a type or `null`** — no numeric confidence/threshold; a
  `null` docType is the human-resolve signal.
- **Many individual files** — no zip in the PoC; classify from filename + head.
