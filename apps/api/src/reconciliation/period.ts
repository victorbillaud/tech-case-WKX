import type { Money } from "@repo/domain";
import { formatMoney } from "@repo/domain";

import type { CanonicalStore } from "../ingestion/types.js";

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

/** YYYY-MM → prior month YYYY-MM. */
export function priorPeriod(period: string): string {
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (month === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** YYYY-MM → folder name like `november_2025`. */
export function periodFolderName(period: string): string {
  const [yearStr, monthStr] = period.split("-");
  const monthIndex = Number(monthStr) - 1;
  return `${MONTH_NAMES[monthIndex]}_${yearStr}`;
}

/** Six months ending at `period` (inclusive), oldest first. */
export function sixMonthPeriods(period: string): string[] {
  const periods: string[] = [];
  let current = period;
  for (let i = 0; i < 6; i++) {
    periods.unshift(current);
    current = priorPeriod(current);
  }
  return periods;
}

/** Build a trend summary from account balances. */
export function sixMonthTrend(
  account: string,
  period: string,
  store: CanonicalStore,
): string {
  const periods = sixMonthPeriods(period);
  const parts = periods
    .map((p) => {
      const bal = store.balance(account, p);
      if (!bal) return null;
      return `${p}: ${formatMoney(bal.balance)}`;
    })
    .filter((x): x is string => x !== null);

  if (parts.length === 0) {
    return "No balance history available.";
  }

  return parts.join("; ");
}

export function deltaPct(delta: Money, prior: Money): number {
  if (prior === 0) return delta === 0 ? 0 : 1;
  return delta / prior;
}
