import type { Reconciliation } from "@repo/domain";

import { type RuleDefinition, ruleResult } from "../types.js";

export const rule41: RuleDefinition = {
  id: "4.1",
  title: "Completeness procedures required",
  severity: "high",
  autoFixable: true,
  check(recon) {
    const { completeness } = recon;
    const ok =
      completeness.proceduresPerformed.length > 0 &&
      completeness.result.trim().length > 0;
    return ruleResult(
      rule41,
      ok ? "pass" : "fail",
      ok
        ? "Completeness procedures and result are documented."
        : "Completeness procedures or result is missing.",
    );
  },
};
