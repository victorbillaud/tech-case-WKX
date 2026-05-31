import type { Reconciliation } from "@repo/domain";

import { type RuleDefinition, ruleResult } from "../types.js";

export const rule12: RuleDefinition = {
  id: "1.2",
  title: "Transaction completeness",
  severity: "high",
  autoFixable: false,
  check(recon) {
    const { rollforward } = recon;
    const netChange =
      rollforward.additions - rollforward.reductions;
    const expectedEnd = rollforward.beginningBalance + netChange;
    const ok = expectedEnd === rollforward.endingBalance;
    return ruleResult(
      rule12,
      ok ? "pass" : "fail",
      ok
        ? "Transaction rollforward sums to computed ending balance."
        : "Transaction additions/reductions do not sum to computed ending balance.",
    );
  },
};
