import type { Reconciliation } from "@repo/domain";

import { type RuleContext, type RuleDefinition, ruleResult } from "../types.js";

const PLUG_PATTERN = /\bplug\b|to balance|to tie|balancing/i;

export const rule13: RuleDefinition = {
  id: "1.3",
  title: "No unexplained plugs",
  severity: "critical",
  autoFixable: false,
  check(recon, ctx) {
    const plugFlags = ctx.transactions.filter((t) =>
      t.flags.includes("keyword_plug"),
    );
    const plugNarrative = PLUG_PATTERN.test(recon.narrative);
    const ok = plugFlags.length === 0 && !plugNarrative;
    return ruleResult(
      rule13,
      ok ? "pass" : "fail",
      ok
        ? "No plug language or keyword_plug flags detected."
        : `Plug indicators found (${plugFlags.length} flagged txns${plugNarrative ? ", narrative" : ""}).`,
    );
  },
};
