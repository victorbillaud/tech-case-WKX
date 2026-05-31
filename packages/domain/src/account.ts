import { z } from "zod";

import { Money, Period } from "./money.js";

export const AccountType = z.enum([
  "Asset",
  "Liability",
  "Equity",
  "Revenue",
  "Expense",
]);

export const RiskLevel = z.enum(["Low", "Medium", "High"]);

export const AccountCategory = z.enum([
  "Cash",
  "AR",
  "Inventory",
  "Prepaid",
  "Fixed Assets",
  "Intangibles",
  "Revenue",
  "Tax",
  "Intercompany",
  "AP",
  "Payroll",
  "Accruals",
  "Leases",
  "Debt",
  "Equity",
  "COGS",
  "Sales",
  "R&D",
  "G&A",
]);

export const ReconciliationFrequency = z.enum([
  "Daily",
  "Monthly",
  "Quarterly",
  "Annually",
]);

export const Account = z.object({
  number: z.string(),
  name: z.string(),
  type: AccountType,
  category: AccountCategory,
  reconciliationFrequency: ReconciliationFrequency,
  preparer: z.string(),
  reviewer: z.string(),
  riskLevel: RiskLevel,
  description: z.string().optional(),
});
export type Account = z.infer<typeof Account>;

export const AccountBalance = z.object({
  account: z.string(),
  period: Period,
  balance: Money,
});
export type AccountBalance = z.infer<typeof AccountBalance>;
