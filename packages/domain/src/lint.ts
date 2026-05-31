import { z } from "zod";

import { Period } from "./money.js";

export const RuleSeverity = z.enum(["critical", "high", "medium", "low"]);

export const RuleStatus = z.enum([
  "pass",
  "fail",
  "not_applicable",
  "needs_human",
  "not_implemented",
]);

export const RuleResult = z.object({
  ruleId: z.string(),
  title: z.string(),
  severity: RuleSeverity,
  status: RuleStatus,
  message: z.string(),
  autoFixable: z.boolean(),
});
export type RuleResult = z.infer<typeof RuleResult>;

export const LintReport = z.object({
  account: z.string(),
  period: Period,
  results: z.array(RuleResult),
  score: z.number(),
  approvable: z.boolean(),
});
export type LintReport = z.infer<typeof LintReport>;

export const ApprovalInput = z.object({
  reviewer: z.string(),
  role: z.string(),
  comments: z.string(),
});
export type ApprovalInput = z.infer<typeof ApprovalInput>;

export const ApprovalRecord = ApprovalInput.extend({
  approvedAt: z.string().datetime(),
});
export type ApprovalRecord = z.infer<typeof ApprovalRecord>;
