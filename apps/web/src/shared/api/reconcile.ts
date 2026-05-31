import type { Reconciliation } from "@repo/domain";

import { apiFetch, ApiError } from "./client.js";
import { API_BASE } from "../constants.js";
import { fetchNdjsonStream } from "./ndjson-stream.js";
import type { ReconcileProgressEvent } from "./reconcile-progress.js";

export async function getReconciliation(
  period: string,
  account: string,
): Promise<Reconciliation | null> {
  try {
    return await apiFetch<Reconciliation>(
      `/periods/${period}/accounts/${account}/reconciliation`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function reconcileAccount(
  period: string,
  account: string,
): Promise<Reconciliation> {
  return apiFetch<Reconciliation>(
    `/periods/${period}/accounts/${account}/reconcile`,
    { method: "POST" },
  );
}

export async function reconcileAccountStream(
  period: string,
  account: string,
  onEvent: (event: ReconcileProgressEvent) => void,
): Promise<Reconciliation> {
  return fetchNdjsonStream<ReconcileProgressEvent, Reconciliation>(
    `${API_BASE}/periods/${period}/accounts/${account}/reconcile/stream`,
    { method: "POST" },
    onEvent,
    {
      isComplete: (event) => event.type === "complete",
      getResult: (event) =>
        event.type === "complete" ? event.reconciliation : (undefined as never),
      isError: (event) => event.type === "error",
      getErrorMessage: (event) =>
        event.type === "error" ? event.message : "",
      missingResultMessage: "Reconciliation stream ended without a result",
    },
  );
}

export async function redraftReconciliation(
  period: string,
  account: string,
  lintReport: unknown,
): Promise<Reconciliation> {
  return apiFetch<Reconciliation>(
    `/periods/${period}/accounts/${account}/redraft`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lintReport),
    },
  );
}
