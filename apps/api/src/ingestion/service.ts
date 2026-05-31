import {
  type Account,
  type AccountBalance,
  SupportingDocument,
  type Transaction,
} from "@repo/domain";
import ksuid from "ksuid";

import { describeError, tryParse } from "../utils/error.js";
import { OpenAiClassifier } from "./classifier.js";
import { normalizeBalance, normalizeTransaction } from "./normalize.js";
import { parseBalances, parseChart, parseGl } from "./parsers.js";
import { extractLinks } from "./reference-index.js";
import {
  InMemoryCanonicalStore,
  getStore,
  patchIngestionUnclassified,
  setIngestionReport,
  setStore,
} from "./store.js";
import type {
  Classification,
  Classifier,
  IngestionReport,
  RawFile,
  SourceKind,
} from "./types.js";

interface ClassifiedFile {
  file: RawFile;
  kind: SourceKind;
}

interface IngestContext {
  store: InMemoryCanonicalStore;
  warnings: string[];
  errors: string[];
  /** Populated after phase 1; used for balance/GL normalization and document linking. */
  knownAccounts: Set<string>;
}

function isStructuredKind(
  kind: SourceKind,
): kind is "chart_of_accounts" | "account_balances" | "gl_transactions" {
  return typeof kind === "string";
}

function filesOfKind(
  classified: ClassifiedFile[],
  kind: "chart_of_accounts" | "account_balances" | "gl_transactions",
): RawFile[] {
  return classified
    .filter((item) => item.kind === kind)
    .map((item) => item.file);
}

function documentFiles(classified: ClassifiedFile[]): ClassifiedFile[] {
  return classified.filter((item) => !isStructuredKind(item.kind));
}

function docTypeOf(kind: SourceKind): SupportingDocument["docType"] {
  if (typeof kind === "object") return kind.document;
  return null;
}

/**
 * Layer 1 orchestrator: classify → parse → normalize → link → validate+store.
 * Callable without HTTP. The classifier is injected so it can be faked in tests.
 */
export async function ingestPeriod(
  period: string,
  files: RawFile[],
  classifier: Classifier = new OpenAiClassifier(),
): Promise<IngestionReport> {
  const ctx: IngestContext = {
    store: new InMemoryCanonicalStore(period),
    warnings: [],
    errors: [],
    knownAccounts: new Set(),
  };

  const classified = await classifyFiles(files, classifier, ctx.errors);

  // Explicit pipeline order — each phase depends on the ones before it:
  //   1. chart      → account types for sign normalization
  //   2. balances   → needs chart
  //   3. gl         → needs chart
  //   4. documents  → needs knownAccounts for link extraction
  ingestChartPhase(filesOfKind(classified, "chart_of_accounts"), ctx);
  ingestBalancesPhase(filesOfKind(classified, "account_balances"), ctx);
  ingestGlPhase(filesOfKind(classified, "gl_transactions"), ctx);
  const { documents, unclassified } = ingestDocumentsPhase(
    documentFiles(classified),
    ctx,
  );

  ctx.store.setDocuments(documents);
  setStore(ctx.store);

  const report: IngestionReport = {
    period,
    counts: {
      accounts: ctx.store.accounts().length,
      balances: ctx.store.balanceCount(),
      transactions: ctx.store.transactions().length,
      documents: documents.length,
    },
    unclassified,
    warnings: ctx.warnings,
    errors: ctx.errors,
  };
  setIngestionReport(report);

  return report;
}

async function classifyFiles(
  files: RawFile[],
  classifier: Classifier,
  errors: string[],
): Promise<ClassifiedFile[]> {
  return Promise.all(
    files.map(async (file) => {
      try {
        const result: Classification = await classifier.classify(file);
        return { file, kind: result.kind };
      } catch (err) {
        errors.push(`classify ${file.filename}: ${describeError(err)}`);
        return { file, kind: { document: null } as SourceKind };
      }
    }),
  );
}

/** Phase 1 — chart of accounts (must run before all other phases). */
function ingestChartPhase(files: RawFile[], ctx: IngestContext): void {
  const accounts: Account[] = [];
  for (const file of files) {
    try {
      accounts.push(...parseChart(file.text));
    } catch (err) {
      ctx.errors.push(`parse chart ${file.filename}: ${describeError(err)}`);
    }
  }
  ctx.store.setAccounts(accounts);
  ctx.knownAccounts = new Set(accounts.map((a) => a.number));
}

/** Phase 2 — account balances (depends on phase 1 for sign normalization). */
function ingestBalancesPhase(files: RawFile[], ctx: IngestContext): void {
  for (const file of files) {
    const balances: AccountBalance[] = [];
    for (const raw of tryParse(
      () => parseBalances(file.text),
      `parse ${file.filename}`,
      ctx.errors,
    )) {
      const account = ctx.store.account(raw.account);
      if (!account) {
        ctx.warnings.push(`balance for unknown account ${raw.account}`);
      }
      try {
        balances.push(normalizeBalance(raw, account));
      } catch (err) {
        ctx.errors.push(
          `balance ${raw.account} ${raw.period}: ${describeError(err)}`,
        );
      }
    }
    ctx.store.addBalances(balances);
  }
}

/** Phase 3 — GL transactions (depends on phase 1 for sign normalization). */
function ingestGlPhase(files: RawFile[], ctx: IngestContext): void {
  const unknownReported = new Set<string>();
  for (const file of files) {
    const transactions: Transaction[] = [];
    for (const raw of tryParse(
      () => parseGl(file.text),
      `parse ${file.filename}`,
      ctx.errors,
    )) {
      const account = ctx.store.account(raw.account);
      if (!account && !unknownReported.has(raw.account)) {
        ctx.warnings.push(`transaction(s) for unknown account ${raw.account}`);
        unknownReported.add(raw.account);
      }
      try {
        transactions.push(normalizeTransaction(raw, account));
      } catch (err) {
        ctx.errors.push(`transaction ${raw.reference}: ${describeError(err)}`);
      }
    }
    ctx.store.addTransactions(transactions);
  }
}

/** Phase 4 — supporting documents + reference linking (depends on phase 1). */
function ingestDocumentsPhase(
  classified: ClassifiedFile[],
  ctx: IngestContext,
): {
  documents: SupportingDocument[];
  unclassified: { docId: string; filename: string }[];
} {
  const documents: SupportingDocument[] = [];
  const unclassified: { docId: string; filename: string }[] = [];

  for (const { file, kind } of classified) {
    const docId = ksuid.randomSync().string;
    const { references, accounts: relatedAccounts } = extractLinks(
      `${file.filename}\n${file.text}`,
      ctx.knownAccounts,
    );

    try {
      const doc = SupportingDocument.parse({
        docId,
        docType: docTypeOf(kind),
        sourcePath: file.filename,
        raw: file.text,
        relatedReferences: references,
        relatedAccounts,
      });
      documents.push(doc);

      if (doc.docType === null) {
        unclassified.push({ docId, filename: file.filename });
      }
      if (references.length === 0 && relatedAccounts.length === 0) {
        ctx.warnings.push(`document ${file.filename} has no resolvable reference`);
      }
    } catch (err) {
      ctx.errors.push(`document ${file.filename}: ${describeError(err)}`);
    }
  }

  return { documents, unclassified };
}

/**
 * Resolve the human-fallback queue: set `docType` for previously-`null`
 * documents. (No re-parse needed — linking doesn't depend on docType.)
 */
export function resolveClassifications(
  period: string,
  resolutions: { docId: string; docType: SupportingDocument["docType"] }[],
): { updated: number; unclassified: { docId: string; filename: string }[] } | null {
  const store = getStore(period);
  if (!store) return null;

  const byId = new Map(store.documents().map((d) => [d.docId, d]));
  let updated = 0;
  const next: SupportingDocument[] = store.documents().map((doc) => {
    const match = resolutions.find((r) => r.docId === doc.docId);
    if (match && byId.has(doc.docId)) {
      updated += 1;
      return { ...doc, docType: match.docType };
    }
    return doc;
  });
  store.setDocuments(next);

  const unclassified = next
    .filter((d) => d.docType === null)
    .map((d) => ({ docId: d.docId, filename: d.sourcePath }));
  patchIngestionUnclassified(period, unclassified);

  return {
    updated,
    unclassified,
  };
}
