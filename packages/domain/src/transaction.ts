import { z } from "zod";

import { Money } from "./money.js";

export const TransactionDirection = z.enum(["addition", "reduction"]);

export const TransactionFlag = z.enum([
  "round_number",
  "manual_je",
  "over_100k",
  "keyword_adjustment",
  "keyword_plug",
]);

export const AccrualCategory = z.enum([
  "Professional Services",
  "Cloud Infrastructure",
  "Facilities & Utilities",
  "Contractor Services",
  "Travel & Entertainment",
  "Compensation & Bonus",
  "Other Accruals",
]);

export const TransactionCategory = AccrualCategory;

export const Transaction = z.object({
  txnDate: z.string().date(),
  postDate: z.string().date(),
  account: z.string(),
  description: z.string(),
  reference: z.string(),
  debit: Money,
  credit: Money,
  source: z.string(),
  enteredBy: z.string(),
  department: z.string(),
  signedAmount: Money,
  direction: TransactionDirection,
  category: TransactionCategory.nullable(),
  flags: z.array(TransactionFlag).default([]),
});
export type Transaction = z.infer<typeof Transaction>;
