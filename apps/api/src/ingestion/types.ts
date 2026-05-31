import { z } from "zod";

import {
  type Account,
  type AccountBalance,
  DocType,
  type SupportingDocument,
  type Transaction,
} from "@repo/domain";

/** A raw uploaded file, before any classification or parsing. */
export interface RawFile {
  filename: string;
  mime: string;
  text: string;
}

/** A GL transaction before sign/flag normalization (Layer 1 [3]). */
export type RawTransaction = Omit<
  Transaction,
  "signedAmount" | "direction" | "category" | "flags"
>;

/** What a file is: a known structured source, or a (possibly untyped) document. */
export type SourceKind =
  | "gl_transactions"
  | "account_balances"
  | "chart_of_accounts"
  | { document: z.infer<typeof DocType> | null };

/**
 * The classifier's structured output. Kept as a flat object (not a union) so it
 * maps cleanly onto OpenAI structured outputs. `docType` is only meaningful when
 * `kind === "document"`, and is `null` when the model can't determine the type.
 */
export const ClassificationOutput = z.object({
  kind: z.enum([
    "gl_transactions",
    "account_balances",
    "chart_of_accounts",
    "document",
  ]),
  docType: DocType.nullable(),
  rationale: z.string(),
});
export type ClassificationOutput = z.infer<typeof ClassificationOutput>;

export interface Classification {
  kind: SourceKind;
  rationale?: string;
}

export interface Classifier {
  classify(file: RawFile): Promise<Classification>;
}

export interface ReferenceIndex {
  docsForReference(reference: string): SupportingDocument[];
  docsForVendor(vendor: string): SupportingDocument[];
  docsForAccount(account: string): SupportingDocument[];
}

export interface CanonicalStore {
  period: string;
  accounts(): Account[];
  account(number: string): Account | undefined;
  balance(account: string, period: string): AccountBalance | undefined;
  transactions(filter?: { account?: string; period?: string }): Transaction[];
  documents(): SupportingDocument[];

  references: ReferenceIndex;
}

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
