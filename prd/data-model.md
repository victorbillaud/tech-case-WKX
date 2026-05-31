# Canonical Data Model

> Expressed in **Zod**. These schemas are the **contract** between ingestion
> (Layer 1) and the consumers (agent + linter). Downstream code only ever sees
> these types — never a raw CSV row or e-mail.
>
> This is the high-level shape. Field-level refinements, error messages, and
> `superRefine` validations come during implementation.

## Conventions

- **Money** is stored as **integer minor units (cents)**, never a float, to keep
  arithmetic exact. See [ADR-0009](./adr/0009-money-as-integer-cents.md). We model
  it as a branded type so cents can't be confused with a plain number.
- **Sign** is normalized at ingestion: regardless of debit/credit and account
  type, every transaction carries a `signedAmount` (effect on the balance) and a
  `direction` (`addition` | `reduction`). See
  [ADR-0004](./adr/0004-deterministic-core-llm-narrative.md).
- **Period** is an ISO month string `YYYY-MM` (e.g. `"2025-12"`).

```ts
import { z } from "zod";

// Money in integer cents, branded so it's not mixed with raw numbers.
export const Money = z.number().int().brand<"Cents">();
export type Money = z.infer<typeof Money>;

export const Period = z.string().regex(/^\d{4}-\d{2}$/); // "2025-12"
```

## 1. Reference data (the stable skeleton)

```ts
export const AccountType = z.enum([
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
]);

export const RiskLevel = z.enum(["Low", "Medium", "High"]);

// Closed, authoritative set from chart_of_accounts.csv — the balance-sheet / P&L
// grouping of an account. NOT the same as a transaction's rollforward category.
export const AccountCategory = z.enum([
  "Cash", "AR", "Inventory", "Prepaid", "Fixed Assets", "Intangibles",
  "Revenue", "Tax", "Intercompany", "AP", "Payroll", "Accruals", "Leases",
  "Debt", "Equity", "COGS", "Sales", "R&D", "G&A",
]);

export const ReconciliationFrequency = z.enum([
  "Daily", "Monthly", "Quarterly", "Annually",
]);

// chart_of_accounts.csv
export const Account = z.object({
  number: z.string(),                 // "24100"
  name: z.string(),
  type: AccountType,
  category: AccountCategory,          // balance-sheet grouping (authoritative)
  reconciliationFrequency: ReconciliationFrequency,
  preparer: z.string(),
  reviewer: z.string(),
  riskLevel: RiskLevel,
  description: z.string().optional(),
});
export type Account = z.infer<typeof Account>;

// account_balances.csv — authoritative beginning/ending balances
export const AccountBalance = z.object({
  account: z.string(),
  period: Period,
  balance: Money,                     // sign normalized to account type
});
export type AccountBalance = z.infer<typeof AccountBalance>;
```

## 2. Transactions (the core)

```ts
export const TransactionDirection = z.enum(["addition", "reduction"]);

// Flags raised deterministically at ingestion (Rule 8.2, 1.3, ...)
export const TransactionFlag = z.enum([
  "round_number",        // e.g. exactly $50K / $100K
  "manual_je",           // Manual JE vs system-generated
  "over_100k",           // > $100,000
  "keyword_adjustment",  // "true-up" / "adjustment" / "correction"
  "keyword_plug",        // "plug" / "to balance" / "to tie"  (SOX red flag)
]);

// Rollforward sub-grouping used to build the reconciliation. This is
// ACCOUNT-TYPE-SPECIFIC and distinct from Account.category. Each account type
// owns its taxonomy; the PoC implements the Accrued Expenses (24100) one,
// derived from the approved Nov recon + the SOP example.
export const AccrualCategory = z.enum([
  "Professional Services",
  "Cloud Infrastructure",
  "Facilities & Utilities",
  "Contractor Services",
  "Travel & Entertainment",
  "Compensation & Bonus",
  "Other Accruals",
]);

// The only taxonomy today. Generalizing = a registry keyed by account type,
// surfaced here as z.union([AccrualCategory, IntercompanyCategory, ...]).
export const TransactionCategory = AccrualCategory;

// One GL line, normalized.
export const Transaction = z.object({
  txnDate: z.string().date(),
  postDate: z.string().date(),
  account: z.string(),
  description: z.string(),
  reference: z.string(),              // "AP-28502", "JE-12501" — join key
  debit: Money,
  credit: Money,
  source: z.string(),                 // "AP System", "Manual JE", ...
  enteredBy: z.string(),
  department: z.string(),

  // derived at ingestion (deterministic):
  signedAmount: Money,                // real effect on the balance
  direction: TransactionDirection,
  category: TransactionCategory.nullable(), // set by the categorizer (account-scoped)
  flags: z.array(TransactionFlag).default([]), // incl. "manual_je"
});
export type Transaction = z.infer<typeof Transaction>;
```

## 3. Supporting documents (one simple shape)

A document is its source, type, **raw text**, and the **link keys** that attach it
to GL transactions/accounts. The agent reads the raw text and extracts whatever a
given step needs at drafting time — so we don't model per-type fields here.

`docType` is **`null`** when the classifier can't determine the type — that null
is itself the human-fallback signal (the user then selects a type), so there's no
separate `confidence` field.

```ts
export const DocType = z.enum([
  "invoice",
  "contract",
  "email",
  "calculation_memo",
  "report",      // e.g. AP aging
]);

export const SupportingDocument = z.object({
  docId: z.string(),
  docType: DocType.nullable(),            // null = unclassified → user selects
  sourcePath: z.string(),
  raw: z.string(),                        // original text — also the audit trail
  relatedReferences: z.array(z.string()), // ["AP-28502"] → Transaction.reference
  relatedAccounts: z.array(z.string()),   // ["24100"]
});
export type SupportingDocument = z.infer<typeof SupportingDocument>;
```

> **Deferred (not PoC):** per-type structured extraction — `InvoiceDoc`,
> `EmailDoc`, `CalcMemoDoc`, ... as a `z.discriminatedUnion("docType", ...)`.
> Useful for stronger typing later, but it's pure explanation tax for the demo:
> grounding and the bonus anomaly only need raw text + link keys.

## 4. Reconciliation output (also typed, so the linter can read it)

The agent emits this object; the linter validates it against the rules; the
human approves it. It is **not** free text.

```ts
export const Rollforward = z.object({
  beginningBalance: Money,
  additions: Money,
  reductions: Money,
  endingBalance: Money,
  glBalance: Money,
  ties: z.boolean(),                  // endingBalance === glBalance (Rule 1.1)
  unexplainedDifference: Money,       // must be 0; never a "plug" (Rule 1.3)
});

export const CategoryBreakdown = z.object({
  category: TransactionCategory,      // same taxonomy as Transaction.category
  amount: Money,
  transactionRefs: z.array(z.string()),
  description: z.string(),
});

export const VarianceDriver = z.object({
  label: z.string(),
  amount: Money,
  explanation: z.string(),            // specific, not "normal business activity"
  evidenceDocIds: z.array(z.string()),
});

export const VarianceAnalysis = z.object({
  priorBalance: Money,
  currentBalance: Money,
  deltaAmount: Money,
  deltaPct: z.number(),
  isMaterial: z.boolean(),            // Rule 2.1
  drivers: z.array(VarianceDriver),
  priorPeriodComparison: z.string().nullable(),
});

export const CompletenessSection = z.object({
  proceduresPerformed: z.array(z.string()),
  confirmationDocIds: z.array(z.string()), // department-head e-mails (Rule 4.2)
  result: z.string(),                       // "No material unrecorded liabilities"
});

export const RiskSection = z.object({
  risksIdentified: z.array(z.string()),     // completeness, cutoff, valuation, ...
  mitigatingControls: z.array(z.string()),
});

export const Anomaly = z.object({
  kind: z.string(),                   // "memo_vs_gl_mismatch", "cutoff", ...
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),                // "Bonus memo $14M vs GL JE-12501 $1.9M"
  references: z.array(z.string()),
});

export const ReconStatus = z.enum(["draft", "submitted", "approved"]);

export const Reconciliation = z.object({
  account: z.string(),
  period: Period,
  rollforward: Rollforward,
  categories: z.array(CategoryBreakdown),
  variance: VarianceAnalysis,
  completeness: CompletenessSection,
  riskAssessment: RiskSection,
  anomalies: z.array(Anomaly).default([]),
  exhibits: z.array(z.string()).default([]), // docIds used as evidence
  narrative: z.string(),              // the human-readable write-up (LLM prose)
  preparer: z.string(),
  reviewer: z.string().nullable(),
  status: ReconStatus,
});
export type Reconciliation = z.infer<typeof Reconciliation>;
```

## 5. Lint result (verifier output)

```ts
export const RuleSeverity = z.enum(["critical", "high", "medium", "low"]);

// "pass"/"fail" are checked outcomes; the rest mean "not evaluated" and never
// block approval (e.g. a rule N/A to this account, or not built in the PoC).
export const RuleStatus = z.enum([
  "pass", "fail", "not_applicable", "needs_human", "not_implemented",
]);

export const RuleResult = z.object({
  ruleId: z.string(),                 // "1.1", "2.1", ...
  title: z.string(),
  severity: RuleSeverity,
  status: RuleStatus,
  message: z.string(),
  autoFixable: z.boolean(),           // drives the correction loop
});

export const LintReport = z.object({
  account: z.string(),
  period: Period,
  results: z.array(RuleResult),
  score: z.number(),                  // 0..100, indicative quality
  approvable: z.boolean(),            // false if any critical rule has status "fail"
});
export type LintReport = z.infer<typeof LintReport>;
```

## Entity map

```
Account ──┐
          ├─ keyed by account number
AccountBalance ──┘

Transaction ──reference/vendor──► SupportingDocument
     │                                   │
     └──────────► Reconciliation ◄────────┘ (as exhibits / evidence)
                       │
                       ▼
                  LintReport
```
