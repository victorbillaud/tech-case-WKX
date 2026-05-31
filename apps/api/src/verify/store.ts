import type { ApprovalRecord, LintReport } from "@repo/domain";

const lintCache = new Map<string, LintReport>();
const approvalCache = new Map<string, ApprovalRecord>();

function key(period: string, account: string): string {
  return `${period}|${account}`;
}

export function setLintReport(
  period: string,
  account: string,
  report: LintReport,
): void {
  lintCache.set(key(period, account), report);
}

export function getLintReport(
  period: string,
  account: string,
): LintReport | undefined {
  return lintCache.get(key(period, account));
}

export function setApprovalRecord(
  period: string,
  account: string,
  record: ApprovalRecord,
): void {
  approvalCache.set(key(period, account), record);
}

export function getApprovalRecord(
  period: string,
  account: string,
): ApprovalRecord | undefined {
  return approvalCache.get(key(period, account));
}
