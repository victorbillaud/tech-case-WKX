import type {
  Account,
  Reconciliation,
  RuleResult,
  SupportingDocument,
  Transaction,
} from "@repo/domain";

import type { ReferenceIndex } from "../ingestion/types.js";

export interface ApproveContext {
  reviewer: string;
  role: string;
}

export interface RuleContext {
  account: Account;
  period: string;
  transactions: Transaction[];
  references: ReferenceIndex;
  documents: SupportingDocument[];
  pass: number;
}

export interface RuleDefinition {
  id: string;
  title: string;
  severity: RuleResult["severity"];
  autoFixable: boolean;
  check: (
    recon: Reconciliation,
    ctx: RuleContext,
    approveContext?: ApproveContext,
  ) => Promise<RuleResult> | RuleResult;
}

export function ruleResult(
  rule: Pick<RuleDefinition, "id" | "title" | "severity" | "autoFixable">,
  status: RuleResult["status"],
  message: string,
): RuleResult {
  return {
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    status,
    message,
    autoFixable: rule.autoFixable,
  };
}
