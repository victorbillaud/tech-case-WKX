import type {
  Account,
  AccountBalance,
  SupportingDocument,
  Transaction,
} from "@repo/domain";

import { InMemoryReferenceIndex } from "./reference-index.js";
import type { CanonicalStore, IngestionReport, ReferenceIndex } from "./types.js";

export class InMemoryCanonicalStore implements CanonicalStore {
  readonly period: string;
  references: ReferenceIndex;

  private accountsByNumber = new Map<string, Account>();
  private balancesByKey = new Map<string, AccountBalance>();
  private allTransactions: Transaction[] = [];
  private allDocuments: SupportingDocument[] = [];

  constructor(period: string) {
    this.period = period;
    this.references = new InMemoryReferenceIndex([]);
  }

  setAccounts(accounts: Account[]): void {
    for (const account of accounts) {
      this.accountsByNumber.set(account.number, account);
    }
  }

  addBalances(balances: AccountBalance[]): void {
    for (const balance of balances) {
      this.balancesByKey.set(`${balance.account}|${balance.period}`, balance);
    }
  }

  addTransactions(transactions: Transaction[]): void {
    this.allTransactions.push(...transactions);
  }

  setDocuments(documents: SupportingDocument[]): void {
    this.allDocuments = documents;
    this.references = new InMemoryReferenceIndex(documents);
  }

  accounts(): Account[] {
    return [...this.accountsByNumber.values()];
  }

  account(number: string): Account | undefined {
    return this.accountsByNumber.get(number);
  }

  balance(account: string, period: string): AccountBalance | undefined {
    return this.balancesByKey.get(`${account}|${period}`);
  }

  balancesForAccount(account: string): AccountBalance[] {
    return [...this.balancesByKey.values()]
      .filter((balance) => balance.account === account)
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  balanceCount(): number {
    return this.balancesByKey.size;
  }

  transactions(filter?: { account?: string; period?: string }): Transaction[] {
    return this.allTransactions.filter((t) => {
      if (filter?.account && t.account !== filter.account) return false;
      if (filter?.period && !t.postDate.startsWith(filter.period)) return false;
      return true;
    });
  }

  documents(): SupportingDocument[] {
    return this.allDocuments;
  }
}

const registry = new Map<string, InMemoryCanonicalStore>();
const reports = new Map<string, IngestionReport>();

export function setStore(store: InMemoryCanonicalStore): void {
  registry.set(store.period, store);
}

export function getStore(period: string): InMemoryCanonicalStore | undefined {
  return registry.get(period);
}

export function setIngestionReport(report: IngestionReport): void {
  reports.set(report.period, report);
}

export function patchIngestionUnclassified(
  period: string,
  unclassified: IngestionReport["unclassified"],
): void {
  const report = reports.get(period);
  if (report) {
    reports.set(period, { ...report, unclassified });
  }
}

/** Latest ingestion report for a period, or null if nothing ingested yet. */
export function getIngestionReport(period: string): IngestionReport | null {
  const store = getStore(period);
  if (!store) return null;

  const cached = reports.get(period);
  if (cached) return cached;

  return {
    period,
    counts: {
      accounts: store.accounts().length,
      balances: store.balanceCount(),
      transactions: store.transactions().length,
      documents: store.documents().length,
    },
    unclassified: store
      .documents()
      .filter((d) => d.docType === null)
      .map((d) => ({ docId: d.docId, filename: d.sourcePath })),
    warnings: [],
    errors: [],
  };
}
