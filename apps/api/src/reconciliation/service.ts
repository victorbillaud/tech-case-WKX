import type { LintReport, Reconciliation } from "@repo/domain";

import { getStore } from "../ingestion/store.js";
import type { CanonicalStore } from "../ingestion/types.js";
import { detectAnomalies } from "./anomalies.js";
import { categorize } from "./categorize.js";
import { draftReconciliation } from "./draft.js";
import {
  emitProgress,
  type ReconcileProgressHandler,
  runStage,
} from "./progress.js";
import { getReconciliation, setReconciliation } from "./store.js";
import { tieOut, TieOutError } from "./tie-out.js";
import { investigateVariance } from "./variance.js";

export class ReconcileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReconcileError";
  }
}

function requireStore(period: string): CanonicalStore {
  const store = getStore(period);
  if (!store) {
    throw new ReconcileError(`no ingested data for period ${period}`);
  }
  return store;
}

export async function reconcile(
  account: string,
  period: string,
  handler?: ReconcileProgressHandler,
): Promise<Reconciliation> {
  const store = requireStore(period);

  const rollforward = await runStage("tie-out", handler, () =>
    tieOut(account, period, store),
  );

  const accountTransactions = store.transactions({ account, period });

  const categories = await runStage("categorize", handler, () =>
    categorize(accountTransactions),
  );

  const variance = await runStage("variance", handler, () =>
    Promise.resolve(
      investigateVariance(
        account,
        period,
        rollforward,
        categories,
        store,
      ),
    ),
  );

  const anomalies = await runStage("anomalies", handler, () =>
    detectAnomalies(account, period, store, handler),
  );

  const recon = await runStage("draft", handler, () =>
    draftReconciliation({
      account,
      period,
      rollforward,
      categories,
      variance,
      anomalies,
      store,
    }),
  );

  setReconciliation(period, account, recon);
  emitProgress(handler, { type: "complete", reconciliation: recon });
  return recon;
}

export async function redraft(
  account: string,
  period: string,
  lintReport: LintReport,
  existing?: Reconciliation,
): Promise<Reconciliation> {
  const store = requireStore(period);
  const prior = existing ?? getReconciliation(period, account);

  if (!prior) {
    throw new ReconcileError(
      `no draft reconciliation for account ${account} in period ${period}`,
    );
  }

  const recon = await draftReconciliation({
    account,
    period,
    rollforward: prior.rollforward,
    categories: prior.categories,
    variance: {
      priorBalance: prior.variance.priorBalance,
      currentBalance: prior.variance.currentBalance,
      deltaAmount: prior.variance.deltaAmount,
      deltaPct: prior.variance.deltaPct,
      isMaterial: prior.variance.isMaterial,
      drivers: prior.variance.drivers.map((d) => ({
        ...d,
        explanation: "",
      })),
      priorPeriodComparison: prior.variance.priorPeriodComparison,
    },
    anomalies: prior.anomalies,
    store,
    lintFailures: lintReport.results,
  });

  setReconciliation(period, account, recon);
  return recon;
}

export { TieOutError };
