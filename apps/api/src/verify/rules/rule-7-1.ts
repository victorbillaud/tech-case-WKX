import type { Reconciliation } from "@repo/domain";

import { type RuleDefinition, ruleResult } from "../types.js";

export const rule71: RuleDefinition = {
  id: "7.1",
  title: "Required sections present",
  severity: "medium",
  autoFixable: true,
  check(recon) {
    const missing: string[] = [];
    if (!recon.rollforward) missing.push("rollforward");
    if (!recon.variance) missing.push("variance");
    if (recon.completeness.proceduresPerformed.length === 0) {
      missing.push("completeness procedures");
    }
    if (!recon.riskAssessment.risksIdentified.length) {
      missing.push("risk assessment");
    }
    if (!recon.narrative.trim()) missing.push("narrative");

    const ok = missing.length === 0;
    return ruleResult(
      rule71,
      ok ? "pass" : "fail",
      ok
        ? "All required reconciliation sections are present."
        : `Missing sections: ${missing.join(", ")}.`,
    );
  },
};
