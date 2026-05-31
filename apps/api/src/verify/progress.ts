import type { LintReport, Reconciliation, RuleResult } from "@repo/domain";

import type { ProgressHandler } from "../utils/progress.js";

export type VerifyProgressEvent =
  | {
      type: "lint_pass";
      pass: number;
      status: "started" | "done";
      totalRules: number;
      ruleIds?: string[];
    }
  | {
      type: "rule_done";
      pass: number;
      ruleId: string;
      status: RuleResult["status"];
      completed: number;
      total: number;
    }
  | { type: "redraft"; iteration: 1 | 2; status: "started" | "done" }
  | { type: "complete"; lintReport: LintReport; reconciliation: Reconciliation }
  | { type: "error"; message: string };

export type VerifyProgressHandler = ProgressHandler<VerifyProgressEvent>;
