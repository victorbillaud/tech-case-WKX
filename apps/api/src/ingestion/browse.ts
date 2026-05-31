import { formatMoney, type SupportingDocument } from "@repo/domain";

import { getStore } from "./store.js";

function summarizeDocument(doc: SupportingDocument) {
  return {
    docId: doc.docId,
    docType: doc.docType,
    sourcePath: doc.sourcePath,
  };
}

const DOCUMENT_EXCERPT_CHARS = 240;

export function listStoreTransactions(
  period: string,
  account?: string,
  txnPeriod?: string,
) {
  const store = getStore(period);
  if (!store) return null;

  return store.transactions({
    account,
    period: txnPeriod ?? period,
  });
}

export function listStoreDocuments(period: string) {
  const store = getStore(period);
  if (!store) return null;

  return store.documents().map((doc) => ({
    docId: doc.docId,
    docType: doc.docType,
    sourcePath: doc.sourcePath,
    relatedReferences: doc.relatedReferences,
    relatedAccounts: doc.relatedAccounts,
    excerpt: doc.raw.replace(/\s+/g, " ").trim().slice(0, DOCUMENT_EXCERPT_CHARS),
  }));
}

export function getStoreDocument(period: string, docId: string) {
  const store = getStore(period);
  if (!store) return null;

  const doc = store.documents().find((item) => item.docId === docId);
  if (!doc) return null;

  return {
    docId: doc.docId,
    docType: doc.docType,
    sourcePath: doc.sourcePath,
    relatedReferences: doc.relatedReferences,
    relatedAccounts: doc.relatedAccounts,
    raw: doc.raw,
  };
}

export function getStoreAccountDetail(period: string, account: string) {
  const store = getStore(period);
  if (!store) return null;

  const meta = store.account(account);
  if (!meta) return null;

  const balances = store.balancesForAccount(account);
  const periodBalance = store.balance(account, period);
  const periodTransactions = store.transactions({ account, period });
  const periodReferences = new Set(
    periodTransactions.map((txn) => txn.reference.toUpperCase()),
  );

  const documentsMentioningAccount = store
    .references.docsForAccount(account)
    .map((doc) => ({
      ...summarizeDocument(doc),
      matchesPeriodTransactions: doc.relatedReferences.some((ref) =>
        periodReferences.has(ref.toUpperCase()),
      ),
    }));

  const supportByDoc = new Map<
    string,
    { doc: SupportingDocument; matchedReferences: string[] }
  >();
  for (const txn of periodTransactions) {
    for (const doc of store.references.docsForReference(txn.reference)) {
      const existing = supportByDoc.get(doc.docId);
      if (existing) {
        if (!existing.matchedReferences.includes(txn.reference)) {
          existing.matchedReferences.push(txn.reference);
        }
      } else {
        supportByDoc.set(doc.docId, {
          doc,
          matchedReferences: [txn.reference],
        });
      }
    }
  }

  const transactionSupportDocuments = [...supportByDoc.values()].map(
    ({ doc, matchedReferences }) => ({
      ...summarizeDocument(doc),
      matchedReferences,
    }),
  );

  const referencesWithoutSupport = [
    ...new Set(
      periodTransactions
        .filter(
          (txn) =>
            store.references.docsForReference(txn.reference).length === 0,
        )
        .map((txn) => txn.reference),
    ),
  ];

  return {
    account: meta,
    periodBalance: periodBalance
      ? {
          period: periodBalance.period,
          balance: formatMoney(periodBalance.balance),
        }
      : null,
    balances: balances.map((bal) => ({
      period: bal.period,
      balance: formatMoney(bal.balance),
    })),
    documentsMentioningAccount,
    transactionSupportDocuments,
    referencesWithoutSupport,
    transactionCount: periodTransactions.length,
  };
}
