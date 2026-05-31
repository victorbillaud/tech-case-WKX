import type {
  Account,
  ApprovalInput,
  LintReport,
  Reconciliation,
  SupportingDocument,
} from "@repo/domain";

export interface IngestionReport {
  period: string;
  counts: {
    accounts: number;
    balances: number;
    transactions: number;
    documents: number;
  };
  unclassified: { docId: string; filename: string }[];
  warnings: string[];
  errors: string[];
}

export interface ClassifyResolution {
  docId: string;
  docType: SupportingDocument["docType"];
}

export interface ClassifyResult {
  updated: number;
  unclassified: { docId: string; filename: string }[];
}

export type { ApprovalInput, LintReport, Reconciliation };

export interface StoreDocumentSummary {
  docId: string;
  docType: SupportingDocument["docType"];
  sourcePath: string;
  relatedReferences: string[];
  relatedAccounts: string[];
  excerpt: string;
}

export interface StoreDocumentDetail extends StoreDocumentSummary {
  raw: string;
}

export interface StoreAccountDocumentSummary {
  docId: string;
  docType: SupportingDocument["docType"];
  sourcePath: string;
}

export interface StoreAccountDetail {
  period: string;
  account: Account;
  periodBalance: { period: string; balance: string } | null;
  balances: { period: string; balance: string }[];
  /** Documents whose text mentions this account number. */
  documentsMentioningAccount: (StoreAccountDocumentSummary & {
    matchesPeriodTransactions: boolean;
  })[];
  /** Documents linked via AP/JE/… refs shared with period transactions. */
  transactionSupportDocuments: (StoreAccountDocumentSummary & {
    matchedReferences: string[];
  })[];
  /** Period transaction refs with no ingested document citing that ref. */
  referencesWithoutSupport: string[];
  transactionCount: number;
}
