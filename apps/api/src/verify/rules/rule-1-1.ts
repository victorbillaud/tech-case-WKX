import type { Reconciliation } from "@repo/domain";

import { type RuleDefinition, ruleResult } from "../types.js";

export const rule11: RuleDefinition = {
  id: "1.1",
  title: "Rollforward ties",
  severity: "critical",
  autoFixable: false,
  check(recon) {
    const { rollforward } = recon;
    const ok =
      rollforward.ties && rollforward.unexplainedDifference === 0;
    return ruleResult(
      rule11,
      ok ? "pass" : "fail",
      ok
        ? "Rollforward ties to GL ending balance."
        : `Rollforward does not tie (unexplained difference).`,
    );
  },
};
