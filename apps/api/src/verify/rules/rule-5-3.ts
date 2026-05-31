import { checkEstimateMethodology } from "../lint-assist.js";
import { type RuleContext, type RuleDefinition, ruleResult } from "../types.js";

const ESTIMATE_PATTERN = /estimate|estimated|accrual.*aws|aws.*accrual/i;

export const rule53: RuleDefinition = {
  id: "5.3",
  title: "Accruals estimation methodology",
  severity: "medium",
  autoFixable: true,
  async check(recon, ctx) {
    const estimateTxns = ctx.transactions.filter(
      (t) =>
        ESTIMATE_PATTERN.test(t.description) ||
        t.reference === "JE-12415",
    );

    if (estimateTxns.length === 0) {
      return ruleResult(rule53, "pass", "No estimated accruals in scope.");
    }

    const assist = await checkEstimateMethodology(recon, estimateTxns);
    if (!assist.documented) {
      return ruleResult(
        rule53,
        "fail",
        assist.reason || "Estimated accruals lack documented methodology.",
      );
    }

    return ruleResult(
      rule53,
      "pass",
      "Estimation methodology is documented for accrual estimates.",
    );
  },
};
