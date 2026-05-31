import type {
  ApprovalInput,
  ApprovalRecord,
  LintReport,
  Reconciliation,
} from "@repo/domain";

import { getStore } from "../ingestion/store.js";
import {
  getReconciliation,
  setReconciliation,
} from "../reconciliation/store.js";
import { redraft, ReconcileError } from "../reconciliation/service.js";
import { emitProgress } from "../utils/progress.js";
import { buildRuleContext } from "./context.js";
import type { VerifyProgressHandler } from "./progress.js";
import { hasAutoFixableFailures, runAllRules } from "./registry.js";
import { scoreResults } from "./score.js";
import {
  getApprovalRecord,
  getLintReport,
  setApprovalRecord,
  setLintReport,
} from "./store.js";
import type { ApproveContext } from "./types.js";

export class VerifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VerifyError";
  }
}

export class ApproveError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "ApproveError";
    this.status = status;
  }
}

function requireReconciliation(
  period: string,
  account: string,
): Reconciliation {
  const recon = getReconciliation(period, account);
  if (!recon) {
    throw new VerifyError(
      `no draft reconciliation for account ${account} in period ${period}`,
    );
  }
  return recon;
}

export async function lint(
  recon: Reconciliation,
  account: string,
  period: string,
  pass: number,
  handler?: VerifyProgressHandler,
  approveContext?: ApproveContext,
): Promise<LintReport> {
  const ctx = buildRuleContext(account, period, pass);
  const results = await runAllRules(recon, ctx, handler, approveContext);
  const scored = scoreResults(account, period, results);
  return {
    account,
    period,
    results,
    ...scored,
  };
}

export async function verifyWithCorrectionLoop(
  account: string,
  period: string,
  handler?: VerifyProgressHandler,
): Promise<{ lintReport: LintReport; reconciliation: Reconciliation }> {
  if (!getStore(period)) {
    throw new VerifyError(`no ingested data for period ${period}`);
  }

  let recon = requireReconciliation(period, account);
  let pass = 1;
  let report = await lint(recon, account, period, pass, handler);

  for (let i = 0; i < 2 && hasAutoFixableFailures(report.results); i++) {
    const iteration = (i + 1) as 1 | 2;
    emitProgress(handler, { type: "redraft", iteration, status: "started" });
    recon = await redraft(account, period, report);
    emitProgress(handler, { type: "redraft", iteration, status: "done" });
    pass += 1;
    report = await lint(recon, account, period, pass, handler);
  }

  setReconciliation(period, account, recon);
  setLintReport(period, account, report);
  emitProgress(handler, {
    type: "complete",
    lintReport: report,
    reconciliation: recon,
  });

  return { lintReport: report, reconciliation: recon };
}

export async function approve(
  account: string,
  period: string,
  input: ApprovalInput,
): Promise<ApprovalRecord> {
  const recon = requireReconciliation(period, account);
  const cachedReport = getLintReport(period, account);
  if (!cachedReport) {
    throw new VerifyError(
      `no lint report for account ${account} in period ${period}; run verify first`,
    );
  }

  const approveContext: ApproveContext = {
    reviewer: input.reviewer,
    role: input.role,
  };
  const report = await lint(recon, account, period, 1, undefined, approveContext);

  if (!report.approvable) {
    throw new ApproveError(
      "Reconciliation has critical rule failures and cannot be approved.",
    );
  }

  const segregation = report.results.find((r) => r.ruleId === "6.1");
  if (segregation?.status === "fail") {
    throw new ApproveError(segregation.message);
  }

  const record: ApprovalRecord = {
    reviewer: input.reviewer,
    role: input.role,
    comments: input.comments,
    approvedAt: new Date().toISOString(),
  };

  setReconciliation(period, account, {
    ...recon,
    reviewer: input.reviewer,
    status: "approved",
  });
  setLintReport(period, account, report);
  setApprovalRecord(period, account, record);

  return record;
}

export { getLintReport, getApprovalRecord };
