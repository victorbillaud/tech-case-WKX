import { authorityMeets } from "../authority.js";
import { type ApproveContext, type RuleDefinition, ruleResult } from "../types.js";

export const rule61: RuleDefinition = {
  id: "6.1",
  title: "Preparer and reviewer segregation",
  severity: "critical",
  autoFixable: false,
  check(recon, ctx, approveContext) {
    if (!approveContext) {
      return ruleResult(
        rule61,
        "needs_human",
        "Awaiting human reviewer for segregation of duties.",
      );
    }

    if (approveContext.reviewer === recon.preparer) {
      return ruleResult(
        rule61,
        "fail",
        "Reviewer must differ from preparer (Rule 6.1).",
      );
    }

    if (!authorityMeets(approveContext.role, ctx.account.riskLevel)) {
      return ruleResult(
        rule61,
        "fail",
        `Reviewer role "${approveContext.role}" does not meet required authority for ${ctx.account.riskLevel} risk account.`,
      );
    }

    return ruleResult(rule61, "pass", "Segregation of duties satisfied.");
  },
};
