import { z } from "zod";

import { Money, Period } from "./money.js";
import { TransactionCategory } from "./transaction.js";

export const Rollforward = z.object({
  beginningBalance: Money,
  additions: Money,
  reductions: Money,
  endingBalance: Money,
  glBalance: Money,
  ties: z.boolean(),
  unexplainedDifference: Money,
});
export type Rollforward = z.infer<typeof Rollforward>;

export const CategoryBreakdown = z.object({
  category: TransactionCategory,
  amount: Money,
  transactionRefs: z.array(z.string()),
  description: z.string(),
});
export type CategoryBreakdown = z.infer<typeof CategoryBreakdown>;

export const VarianceDriver = z.object({
  label: z.string(),
  amount: Money,
  explanation: z.string(),
  evidenceDocIds: z.array(z.string()),
});
export type VarianceDriver = z.infer<typeof VarianceDriver>;

export const VarianceAnalysis = z.object({
  priorBalance: Money,
  currentBalance: Money,
  deltaAmount: Money,
  deltaPct: z.number(),
  isMaterial: z.boolean(),
  drivers: z.array(VarianceDriver),
  priorPeriodComparison: z.string().nullable(),
});
export type VarianceAnalysis = z.infer<typeof VarianceAnalysis>;

export const CompletenessSection = z.object({
  proceduresPerformed: z.array(z.string()),
  confirmationDocIds: z.array(z.string()),
  result: z.string(),
});
export type CompletenessSection = z.infer<typeof CompletenessSection>;

export const RiskSection = z.object({
  risksIdentified: z.array(z.string()),
  mitigatingControls: z.array(z.string()),
});
export type RiskSection = z.infer<typeof RiskSection>;

export const Anomaly = z.object({
  kind: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  message: z.string(),
  references: z.array(z.string()),
});
export type Anomaly = z.infer<typeof Anomaly>;

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
  exhibits: z.array(z.string()).default([]),
  narrative: z.string(),
  preparer: z.string(),
  reviewer: z.string().nullable(),
  status: ReconStatus,
});
export type Reconciliation = z.infer<typeof Reconciliation>;

/** Prose-only fields the LLM may emit (ADR-0011). */
export const ReconciliationDraft = z.object({
  narrative: z.string(),
  driverExplanations: z.array(
    z.object({
      label: z.string(),
      explanation: z.string(),
    }),
  ),
  completeness: CompletenessSection,
  riskAssessment: RiskSection,
});
export type ReconciliationDraft = z.infer<typeof ReconciliationDraft>;
