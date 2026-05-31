import { POC_ACCOUNT } from "../constants.js";

export const queryKeys = {
  period: (period: string) => ["period", period] as const,
  ingestion: (period: string) => ["period", period, "ingestion"] as const,
  reconciliation: (period: string, account = POC_ACCOUNT) =>
    ["period", period, "reconciliation", account] as const,
  lint: (period: string, account = POC_ACCOUNT) =>
    ["period", period, "lint", account] as const,
  storeTransactions: (period: string, account = POC_ACCOUNT) =>
    ["period", period, "store", "transactions", account] as const,
  storeDocuments: (period: string) =>
    ["period", period, "store", "documents"] as const,
  storeDocument: (period: string, docId: string) =>
    ["period", period, "store", "document", docId] as const,
  storeAccount: (period: string, account = POC_ACCOUNT) =>
    ["period", period, "store", "account", account] as const,
};
