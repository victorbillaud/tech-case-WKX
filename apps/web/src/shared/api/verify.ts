import type { ApprovalInput, ApprovalRecord, LintReport } from "@repo/domain";

import { apiFetch, ApiError } from "./client.js";
import { API_BASE } from "../constants.js";
import { fetchNdjsonStream } from "./ndjson-stream.js";
import type { VerifyProgressEvent } from "./verify-progress.js";

export async function getLintReport(
  period: string,
  account: string,
): Promise<LintReport | null> {
  try {
    return await apiFetch<LintReport>(
      `/periods/${period}/accounts/${account}/lint`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function verifyReconciliation(
  period: string,
  account: string,
): Promise<LintReport> {
  return apiFetch<LintReport>(
    `/periods/${period}/accounts/${account}/verify`,
    { method: "POST" },
  );
}

export async function verifyReconciliationStream(
  period: string,
  account: string,
  onEvent: (event: VerifyProgressEvent) => void,
): Promise<LintReport> {
  return fetchNdjsonStream<VerifyProgressEvent, LintReport>(
    `${API_BASE}/periods/${period}/accounts/${account}/verify/stream`,
    { method: "POST" },
    onEvent,
    {
      isComplete: (event) => event.type === "complete",
      getResult: (event) => {
        if (event.type !== "complete") {
          throw new Error("Unexpected event type");
        }
        return event.lintReport;
      },
      isError: (event) => event.type === "error",
      getErrorMessage: (event) =>
        event.type === "error" ? event.message : "",
      missingResultMessage: "Verify stream ended without a lint report",
    },
  );
}

export async function approveReconciliation(
  period: string,
  account: string,
  input: ApprovalInput,
): Promise<ApprovalRecord> {
  return apiFetch<ApprovalRecord>(
    `/periods/${period}/accounts/${account}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}
