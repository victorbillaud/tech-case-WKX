import { type RuleContext, type RuleDefinition, ruleResult } from "../types.js";

const THRESHOLD = 50_000_00;

export const rule32: RuleDefinition = {
  id: "3.2",
  title: "Supporting evidence threshold",
  severity: "high",
  autoFixable: true,
  check(recon, ctx) {
    const largeTxns = ctx.transactions.filter(
      (t) => Math.abs(t.signedAmount) > THRESHOLD,
    );

    if (largeTxns.length === 0) {
      return ruleResult(rule32, "pass", "No transactions exceed $50K threshold.");
    }

    const missing: string[] = [];
    const needsHuman: string[] = [];

    for (const txn of largeTxns) {
      const docs = ctx.references.docsForReference(txn.reference);
      if (docs.length === 0) {
        needsHuman.push(txn.reference);
        continue;
      }
      const inExhibits = docs.some((d) => recon.exhibits.includes(d.docId));
      if (!inExhibits) {
        missing.push(txn.reference);
      }
    }

    if (needsHuman.length > 0) {
      return ruleResult(
        rule32,
        "needs_human",
        `Transactions >$50K without supporting documents: ${needsHuman.join(", ")}.`,
      );
    }

    if (missing.length > 0) {
      return ruleResult(
        rule32,
        "fail",
        `Transactions >$50K with unlinked support: ${missing.join(", ")}.`,
      );
    }

    return ruleResult(rule32, "pass", "All >$50K transactions have linked support.");
  },
};
