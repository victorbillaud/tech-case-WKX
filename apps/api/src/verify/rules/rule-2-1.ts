import type { Reconciliation } from "@repo/domain";

import { checkVarianceExplanation } from "../lint-assist.js";
import { type RuleDefinition, ruleResult } from "../types.js";

const MIN_WORDS = 50;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const rule21: RuleDefinition = {
  id: "2.1",
  title: "Material variance explained",
  severity: "high",
  autoFixable: true,
  async check(recon) {
    if (!recon.variance.isMaterial) {
      return ruleResult(rule21, "pass", "Variance is not material.");
    }

    if (recon.variance.drivers.length === 0) {
      return ruleResult(
        rule21,
        "fail",
        "Material variance requires documented drivers.",
      );
    }

    const weakDrivers = recon.variance.drivers.filter(
      (d) => wordCount(d.explanation) < MIN_WORDS,
    );
    if (weakDrivers.length > 0 || recon.variance.isMaterial) {
      const assist = await checkVarianceExplanation(recon);
      if (!assist.adequate) {
        return ruleResult(
          rule21,
          "fail",
          assist.reason || "Material variance drivers lack substantive explanations.",
        );
      }
    }

    return ruleResult(
      rule21,
      "pass",
      "Material variance is explained with substantive drivers.",
    );
  },
};
