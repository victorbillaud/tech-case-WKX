import type { Reconciliation } from "@/shared/api/types.js";

const TRANSACTION_REF = /^(AP|JE|EXP|INV|IC|REV|REF|PO)-/i;

export function collectDocumentIds(reconciliation: Reconciliation): Set<string> {
  const ids = new Set<string>();

  for (const docId of reconciliation.exhibits) {
    ids.add(docId);
  }

  for (const docId of reconciliation.completeness.confirmationDocIds) {
    ids.add(docId);
  }

  for (const driver of reconciliation.variance.drivers) {
    for (const docId of driver.evidenceDocIds) {
      ids.add(docId);
    }
  }

  for (const anomaly of reconciliation.anomalies) {
    for (const ref of anomaly.references) {
      if (!TRANSACTION_REF.test(ref)) {
        ids.add(ref);
      }
    }
  }

  return ids;
}

export function buildDocumentPathIndex(
  documents: Array<{ docId: string; sourcePath: string }>,
): Map<string, string> {
  return new Map(documents.map((doc) => [doc.docId, doc.sourcePath]));
}
