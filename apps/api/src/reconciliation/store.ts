import type { Reconciliation } from "@repo/domain";

const cache = new Map<string, Reconciliation>();

function key(period: string, account: string): string {
  return `${period}|${account}`;
}

export function setReconciliation(
  period: string,
  account: string,
  recon: Reconciliation,
): void {
  cache.set(key(period, account), recon);
}

export function getReconciliation(
  period: string,
  account: string,
): Reconciliation | undefined {
  return cache.get(key(period, account));
}
