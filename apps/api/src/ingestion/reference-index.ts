import type { SupportingDocument } from "@repo/domain";

import type { ReferenceIndex } from "./types.js";

const REF_PATTERN = /\b(AP|JE|INV|IC|REV|REF|EXP|PO)[-#\s]?(\d+)\b/gi;
const ACCOUNT_PATTERN = /\b(\d{5})\b/g;

/** Canonical reference token, e.g. "AP-28502" (uppercase, dash-separated). */
function normalizeReference(prefix: string, digits: string): string {
  return `${prefix.toUpperCase()}-${digits}`;
}

/**
 * Extract reference tokens (AP-…, JE-…) and known account numbers from a
 * document's raw text + filename. `knownAccounts` constrains the 5-digit match
 * so arbitrary numbers don't masquerade as accounts.
 */
export function extractLinks(
  text: string,
  knownAccounts: Set<string>,
): { references: string[]; accounts: string[] } {
  const references = new Set<string>();
  for (const match of text.matchAll(REF_PATTERN)) {
    references.add(normalizeReference(match[1], match[2]));
  }

  const accounts = new Set<string>();
  for (const match of text.matchAll(ACCOUNT_PATTERN)) {
    if (knownAccounts.has(match[1])) accounts.add(match[1]);
  }

  return { references: [...references], accounts: [...accounts] };
}

/**
 * O(1) lookups from a reference token or account number to the documents that
 * mention it (ADR-0007). Vendor matching is deferred for the PoC.
 */
export class InMemoryReferenceIndex implements ReferenceIndex {
  private byReference = new Map<string, SupportingDocument[]>();
  private byAccount = new Map<string, SupportingDocument[]>();

  constructor(documents: SupportingDocument[]) {
    for (const doc of documents) {
      for (const reference of doc.relatedReferences) {
        push(this.byReference, reference.toUpperCase(), doc);
      }
      for (const account of doc.relatedAccounts) {
        push(this.byAccount, account, doc);
      }
    }
  }

  docsForReference(reference: string): SupportingDocument[] {
    return this.byReference.get(reference.toUpperCase()) ?? [];
  }

  docsForVendor(): SupportingDocument[] {
    return []; // deferred (PoC)
  }

  docsForAccount(account: string): SupportingDocument[] {
    return this.byAccount.get(account) ?? [];
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const existing = map.get(key);
  if (existing) existing.push(value);
  else map.set(key, [value]);
}
