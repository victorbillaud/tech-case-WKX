import type { Reconciliation, RuleResult } from "@repo/domain";

import { describeError } from "../utils/error.js";
import { emitProgress } from "../utils/progress.js";
import type { VerifyProgressHandler } from "./progress.js";
import { rule11 } from "./rules/rule-1-1.js";
import { rule12 } from "./rules/rule-1-2.js";
import { rule13 } from "./rules/rule-1-3.js";
import { rule21 } from "./rules/rule-2-1.js";
import { rule22 } from "./rules/rule-2-2.js";
import { rule32 } from "./rules/rule-3-2.js";
import { rule41 } from "./rules/rule-4-1.js";
import { rule53 } from "./rules/rule-5-3.js";
import { rule61 } from "./rules/rule-6-1.js";
import { rule71 } from "./rules/rule-7-1.js";
import { rule82 } from "./rules/rule-8-2.js";
import { stubRules } from "./rules/stubs.js";
import type { ApproveContext, RuleContext, RuleDefinition } from "./types.js";

export const RULES: RuleDefinition[] = [
  rule11,
  rule12,
  rule13,
  rule21,
  rule22,
  rule32,
  rule41,
  rule53,
  rule61,
  rule71,
  rule82,
  ...stubRules,
];

async function safeCheck(
  rule: RuleDefinition,
  recon: Reconciliation,
  ctx: RuleContext,
  approveContext?: ApproveContext,
): Promise<RuleResult> {
  try {
    return await rule.check(recon, ctx, approveContext);
  } catch (error) {
    return {
      ruleId: rule.id,
      title: rule.title,
      severity: rule.severity,
      status: "fail",
      message: describeError(error),
      autoFixable: rule.autoFixable,
    };
  }
}

export async function runAllRules(
  recon: Reconciliation,
  ctx: RuleContext,
  handler?: VerifyProgressHandler,
  approveContext?: ApproveContext,
): Promise<RuleResult[]> {
  emitProgress(handler, {
    type: "lint_pass",
    pass: ctx.pass,
    status: "started",
    totalRules: RULES.length,
    ruleIds: RULES.map((rule) => rule.id),
  });

  let completed = 0;

  const results = await Promise.all(
    RULES.map(async (rule) => {
      const result = await safeCheck(rule, recon, ctx, approveContext);
      completed += 1;
      emitProgress(handler, {
        type: "rule_done",
        pass: ctx.pass,
        ruleId: rule.id,
        status: result.status,
        completed,
        total: RULES.length,
      });
      return result;
    }),
  );

  emitProgress(handler, {
    type: "lint_pass",
    pass: ctx.pass,
    status: "done",
    totalRules: RULES.length,
  });

  return results;
}

export function hasAutoFixableFailures(results: RuleResult[]): boolean {
  return results.some((r) => r.status === "fail" && r.autoFixable);
}
