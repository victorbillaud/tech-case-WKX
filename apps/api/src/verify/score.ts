import type { LintReport, RuleResult } from "@repo/domain";

const WEIGHTS = { critical: 40, high: 15, medium: 5, low: 1 } as const;

export function scoreResults(
  account: string,
  period: string,
  results: RuleResult[],
): Pick<LintReport, "score" | "approvable"> {
  const penalty = results
    .filter((r) => r.status === "fail")
    .reduce((total, r) => total + WEIGHTS[r.severity], 0);

  const approvable = !results.some(
    (r) => r.status === "fail" && r.severity === "critical",
  );

  return {
    score: Math.max(0, 100 - penalty),
    approvable,
  };
}
