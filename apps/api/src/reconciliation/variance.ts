import { Money, type CategoryBreakdown, type Rollforward } from "@repo/domain";
import { formatMoney } from "@repo/domain";

import type { CanonicalStore } from "../ingestion/types.js";
import { deltaPct, priorPeriod, sixMonthTrend } from "./period.js";
import type { VarianceFacts } from "./types.js";

const MATERIAL_AMOUNT = 50_000_00;
const MATERIAL_PCT = 0.1;
const TOP_CATEGORY_DRIVERS = 3;

export function investigateVariance(
  account: string,
  period: string,
  rollforward: Rollforward,
  categories: CategoryBreakdown[],
  store: CanonicalStore,
): VarianceFacts {
  const prior = priorPeriod(period);
  const priorBal = store.balance(account, prior);
  if (!priorBal) {
    throw new Error(
      `missing prior balance for account ${account} in period ${prior}`,
    );
  }

  const priorBalance = priorBal.balance;
  const currentBalance = rollforward.glBalance;
  const deltaAmount = Money.parse(currentBalance - priorBalance);
  const pct = deltaPct(deltaAmount, priorBalance);
  const isMaterial =
    Math.abs(deltaAmount) > MATERIAL_AMOUNT ||
    Math.abs(pct) > MATERIAL_PCT;

  const additionCategories = categories
    .filter((c) => c.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, TOP_CATEGORY_DRIVERS);

  const flaggedTxns = store.transactions({ account, period }).filter(
    (t) => t.flags.length > 0,
  );

  const driverMap = new Map<
    string,
    { label: string; amount: typeof priorBalance; refs: string[] }
  >();

  for (const cat of additionCategories) {
    driverMap.set(cat.category, {
      label: cat.category,
      amount: cat.amount,
      refs: cat.transactionRefs,
    });
  }

  for (const txn of flaggedTxns) {
    const label = `${txn.reference} (${txn.description.slice(0, 40)})`;
    if (!driverMap.has(label)) {
      driverMap.set(label, {
        label,
        amount: Money.parse(Math.abs(txn.signedAmount)),
        refs: [txn.reference],
      });
    }
  }

  const drivers = [...driverMap.values()].map((d) => {
    const evidenceDocIds = new Set<string>();
    for (const ref of d.refs) {
      for (const doc of store.references.docsForReference(ref)) {
        evidenceDocIds.add(doc.docId);
      }
    }
    return {
      label: d.label,
      amount: d.amount,
      explanation: "",
      evidenceDocIds: [...evidenceDocIds],
    };
  });

  const trend = sixMonthTrend(account, period, store);
  const priorPeriodComparison = [
    `Prior month (${prior}) ending balance: ${formatMoney(priorBalance)}.`,
    `Current month (${period}) ending balance: ${formatMoney(currentBalance)}.`,
    `Month-over-month change: ${formatMoney(deltaAmount)} (${(pct * 100).toFixed(1)}%).`,
    `Six-month trend: ${trend}.`,
    "Prior-year comparison unavailable (data covers Jul–Dec 2025 only).",
  ].join(" ");

  return {
    priorBalance,
    currentBalance,
    deltaAmount,
    deltaPct: pct,
    isMaterial,
    drivers,
    priorPeriodComparison,
  };
}
