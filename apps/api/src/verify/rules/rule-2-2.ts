import type { Reconciliation } from "@repo/domain";

import { checkSpecificity } from "../lint-assist.js";
import { type RuleDefinition, ruleResult } from "../types.js";

const BANNED = [
  /normal business activity/i,
  /various transactions/i,
  /miscellaneous items/i,
  /due to timing differences(?!\s+(?:for|on|with|between|related to))/i,
  /flagged for size/i,
  /should be supported/i,
  /requires follow-up/i,
  /related vendor invoice or receipt evidence/i,
  /\bmanual estimate\b(?!.*(?:based|using|from|per|calculated|run-?rate|source|methodology))/i,
];

export const rule22: RuleDefinition = {
  id: "2.2",
  title: "Specific vs generic explanations",
  severity: "medium",
  autoFixable: true,
  async check(recon) {
    const text = [
      recon.narrative,
      ...recon.variance.drivers.map((d) => d.explanation),
    ].join("\n");

    for (const pattern of BANNED) {
      if (pattern.test(text)) {
        return ruleResult(
          rule22,
          "fail",
          `Generic or prohibited phrase detected in reconciliation prose.`,
        );
      }
    }

    const assist = await checkSpecificity(text);
    if (!assist.specific) {
      return ruleResult(rule22, "fail", assist.reason);
    }

    return ruleResult(rule22, "pass", "Explanations are specific and substantive.");
  },
};
