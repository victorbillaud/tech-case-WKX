import { ReconcileError } from "../reconciliation/service.js";
import { getStore } from "../ingestion/store.js";
import type { RuleContext } from "./types.js";

export function buildRuleContext(
  account: string,
  period: string,
  pass: number,
): RuleContext {
  const store = getStore(period);
  if (!store) {
    throw new ReconcileError(`no ingested data for period ${period}`);
  }

  const chartAccount = store.account(account);
  if (!chartAccount) {
    throw new ReconcileError(`unknown account ${account}`);
  }

  return {
    account: chartAccount,
    period,
    transactions: store.transactions({ account, period }),
    references: store.references,
    documents: store.documents(),
    pass,
  };
}
