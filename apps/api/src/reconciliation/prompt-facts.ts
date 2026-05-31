import {
  formatMoney,
  type CategoryBreakdown,
  type Rollforward,
} from "@repo/domain";

import type { VarianceFacts } from "./types.js";

export function formatRollforwardForPrompt(rollforward: Rollforward) {
  return {
    beginningBalance: formatMoney(rollforward.beginningBalance),
    additions: formatMoney(rollforward.additions),
    reductions: formatMoney(rollforward.reductions),
    endingBalance: formatMoney(rollforward.endingBalance),
    glBalance: formatMoney(rollforward.glBalance),
    ties: rollforward.ties,
    unexplainedDifference: formatMoney(rollforward.unexplainedDifference),
  };
}

export function formatCategoriesForPrompt(categories: CategoryBreakdown[]) {
  return categories.map((c) => ({
    category: c.category,
    amount: formatMoney(c.amount),
    transactionRefs: c.transactionRefs,
    description: c.description,
  }));
}

export function formatVarianceForPrompt(variance: VarianceFacts) {
  return {
    priorBalance: formatMoney(variance.priorBalance),
    currentBalance: formatMoney(variance.currentBalance),
    deltaAmount: formatMoney(variance.deltaAmount),
    deltaPct: `${(variance.deltaPct * 100).toFixed(1)}%`,
    isMaterial: variance.isMaterial,
    drivers: variance.drivers.map((d) => ({
      label: d.label,
      amount: formatMoney(d.amount),
      explanation: d.explanation,
      evidenceDocIds: d.evidenceDocIds,
    })),
    priorPeriodComparison: variance.priorPeriodComparison,
  };
}
