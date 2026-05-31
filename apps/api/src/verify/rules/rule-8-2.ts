import type { Reconciliation } from "@repo/domain";

import { type RuleContext, type RuleDefinition, ruleResult } from "../types.js";

export const rule82: RuleDefinition = {
  id: "8.2",
  title: "Unusual items flagged",
  severity: "medium",
  autoFixable: true,
  check(recon, ctx) {
    const flagged = ctx.transactions.filter((t) => t.flags.length > 0);
    if (flagged.length === 0) {
      return ruleResult(rule82, "pass", "No flagged transactions in period.");
    }

    const prose = [
      recon.narrative,
      ...recon.anomalies.map((a) => a.message),
      ...recon.variance.drivers.map((d) => `${d.label} ${d.explanation}`),
    ].join("\n");

    const unmentioned = flagged.filter(
      (t) => !prose.includes(t.reference),
    );

    if (unmentioned.length > 0) {
      return ruleResult(
        rule82,
        "fail",
        `Flagged transactions not addressed in narrative/anomalies: ${unmentioned.map((t) => t.reference).join(", ")}.`,
      );
    }

    return ruleResult(
      rule82,
      "pass",
      "All flagged transactions appear in anomalies or narrative.",
    );
  },
};
