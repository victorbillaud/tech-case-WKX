import type { ChatCompletionMessageParam } from "openai/resources";

import {
  type Anomaly,
  formatMoney,
  Money,
  type Transaction,
  TransactionFlag,
} from "@repo/domain";
import type { z } from "zod";

import type { CanonicalStore } from "../ingestion/types.js";
import { createStructured, renderPrompt } from "../llm/index.js";
import type { ReconcileProgressHandler } from "./progress.js";
import { emitProgress } from "./progress.js";
import { DocAmount } from "./types.js";

const FLAG_SEVERITY: Record<
  z.infer<typeof TransactionFlag>,
  Anomaly["severity"] | null
> = {
  keyword_plug: "critical",
  keyword_adjustment: "warning",
  round_number: "warning",
  over_100k: "warning",
  manual_je: "warning",
};

function flagAnomalies(txns: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const txn of txns) {
    for (const flag of txn.flags) {
      const severity = FLAG_SEVERITY[flag];
      if (!severity) continue;

      anomalies.push({
        kind: `flag_${flag}`,
        severity,
        message: `Transaction ${txn.reference} flagged: ${flag} — ${txn.description}`,
        references: [txn.reference],
      });
    }
  }

  return anomalies;
}

async function extractDocAmount(
  reference: string,
  raw: string,
): Promise<{ amount: number; note: string }> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: renderPrompt("extract_doc_amount/system_prompt.njk"),
    },
    {
      role: "user",
      content: renderPrompt("extract_doc_amount/user_prompt.njk", {
        reference,
        raw,
      }),
    },
  ];

  return createStructured(messages, DocAmount, "doc_amount");
}

async function crossDocAnomalies(
  accountTransactions: Transaction[],
  store: CanonicalStore,
  handler?: ReconcileProgressHandler,
): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = [];
  const seen = new Set<string>();

  const pairs: Array<{ txn: Transaction; docId: string; raw: string }> = [];

  for (const txn of accountTransactions) {
    const docs = store.references.docsForReference(txn.reference);
    for (const doc of docs) {
      const key = `${txn.reference}|${doc.docId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ txn, docId: doc.docId, raw: doc.raw });
    }
  }

  for (let i = 0; i < pairs.length; i++) {
    const { txn, docId, raw } = pairs[i]!;
    emitProgress(handler, {
      type: "anomaly_check",
      current: i + 1,
      total: pairs.length,
      reference: txn.reference,
    });

    const { amount, note } = await extractDocAmount(txn.reference, raw);
    const glAmount = Math.abs(txn.signedAmount);

    if (amount !== glAmount) {
      anomalies.push({
        kind: "memo_vs_gl_mismatch",
        severity: "critical",
        message: `Doc ${docId} states ${formatMoney(Money.parse(amount))} vs GL ${txn.reference} ${formatMoney(Money.parse(glAmount))}. ${note}`,
        references: [txn.reference, docId],
      });
    }
  }

  return anomalies;
}

export async function detectAnomalies(
  account: string,
  period: string,
  store: CanonicalStore,
  handler?: ReconcileProgressHandler,
): Promise<Anomaly[]> {
  const accountTransactions = store.transactions({ account, period });
  const flaggedAnomalies = flagAnomalies(accountTransactions);
  const crossDocumentAnomalies = await crossDocAnomalies(
    accountTransactions,
    store,
    handler,
  );
  return [...flaggedAnomalies, ...crossDocumentAnomalies];
}
