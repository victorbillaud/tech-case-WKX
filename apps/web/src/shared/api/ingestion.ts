import { apiFetch, ApiError } from "./client.js";
import type {
  ClassifyResolution,
  ClassifyResult,
  IngestionReport,
  StoreAccountDetail,
  StoreDocumentDetail,
  StoreDocumentSummary,
} from "./types.js";
import type { Transaction } from "@repo/domain";

export async function fetchIngestionReport(
  period: string,
): Promise<IngestionReport | null> {
  try {
    return await apiFetch<IngestionReport>(`/periods/${period}/ingestion`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function ingestPeriod(
  period: string,
  files: File[],
): Promise<IngestionReport> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }

  return apiFetch<IngestionReport>(`/periods/${period}/ingest`, {
    method: "POST",
    body: form,
  });
}

export async function resolveClassifications(
  period: string,
  resolutions: ClassifyResolution[],
): Promise<ClassifyResult> {
  return apiFetch<ClassifyResult>(`/periods/${period}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resolutions),
  });
}

export async function fetchStoreTransactions(
  period: string,
  account: string,
): Promise<Transaction[]> {
  const response = await apiFetch<{
    transactions: Transaction[];
  }>(`/periods/${period}/store/transactions?account=${encodeURIComponent(account)}`);
  return response.transactions;
}

export async function fetchStoreDocuments(
  period: string,
): Promise<StoreDocumentSummary[]> {
  const response = await apiFetch<{ documents: StoreDocumentSummary[] }>(
    `/periods/${period}/store/documents`,
  );
  return response.documents;
}

export async function fetchStoreDocument(
  period: string,
  docId: string,
): Promise<StoreDocumentDetail | null> {
  try {
    const response = await apiFetch<{ document: StoreDocumentDetail }>(
      `/periods/${period}/store/documents/${encodeURIComponent(docId)}`,
    );
    return response.document;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function fetchStoreAccountDetail(
  period: string,
  account: string,
): Promise<StoreAccountDetail | null> {
  try {
    return await apiFetch<StoreAccountDetail>(
      `/periods/${period}/store/accounts/${encodeURIComponent(account)}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
