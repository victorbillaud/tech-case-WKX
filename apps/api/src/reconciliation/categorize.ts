import type { ChatCompletionMessageParam } from "openai/resources";

import {
  AccrualCategory,
  CategoryBreakdown,
  formatMoney,
  sumMoney,
  type Transaction,
  TransactionCategory,
} from "@repo/domain";
import type { z } from "zod";

type TransactionCategoryValue = z.infer<typeof TransactionCategory>;

import { createStructured, renderPrompt } from "../llm/index.js";
import { CategoryLabels } from "./types.js";

const REVERSAL_PATTERN = /reversal|reverse/i;

function summarizeDescriptions(descriptions: string[]): string {
  const unique = [...new Set(descriptions.map((d) => d.trim()))];
  if (unique.length <= 2) return unique.join("; ");
  return `${unique.slice(0, 2).join("; ")} (+${unique.length - 2} more)`;
}

function groupAdditions(
  txns: Transaction[],
  byRef: Map<string, TransactionCategoryValue>,
): CategoryBreakdown[] {
  const groups = new Map<
    string,
    { refs: string[]; amounts: typeof txns[0]["signedAmount"][]; descriptions: string[] }
  >();

  for (const txn of txns) {
    const category =
      byRef.get(txn.reference) ?? AccrualCategory.enum["Other Accruals"];
    const existing = groups.get(category);
    if (existing) {
      existing.refs.push(txn.reference);
      existing.amounts.push(txn.signedAmount);
      existing.descriptions.push(txn.description);
    } else {
      groups.set(category, {
        refs: [txn.reference],
        amounts: [txn.signedAmount],
        descriptions: [txn.description],
      });
    }
  }

  return [...groups.entries()].map(([category, group]) =>
    CategoryBreakdown.parse({
      category,
      amount: sumMoney(group.amounts),
      transactionRefs: group.refs,
      description: summarizeDescriptions(group.descriptions),
    }),
  );
}

function groupReductions(txns: Transaction[]): CategoryBreakdown[] {
  const payments: Transaction[] = [];
  const reversals: Transaction[] = [];

  for (const txn of txns) {
    if (REVERSAL_PATTERN.test(txn.description)) {
      reversals.push(txn);
    } else {
      payments.push(txn);
    }
  }

  const breakdowns: CategoryBreakdown[] = [];

  if (payments.length > 0) {
    breakdowns.push(
      CategoryBreakdown.parse({
        category: "Other Accruals",
        amount: sumMoney(
          payments.map((t) => Math.abs(t.signedAmount) as typeof t.signedAmount),
        ),
        transactionRefs: payments.map((t) => t.reference),
        description: "Payments on prior accruals",
      }),
    );
  }

  if (reversals.length > 0) {
    breakdowns.push(
      CategoryBreakdown.parse({
        category: "Other Accruals",
        amount: sumMoney(
          reversals.map(
            (t) => Math.abs(t.signedAmount) as typeof t.signedAmount,
          ),
        ),
        transactionRefs: reversals.map((t) => t.reference),
        description: "Accrual reversals",
      }),
    );
  }

  return breakdowns;
}

export async function categorize(
  txns: Transaction[],
): Promise<CategoryBreakdown[]> {
  const additions = txns.filter((t) => t.direction === "addition");
  const reductions = txns.filter((t) => t.direction === "reduction");

  const byRef = new Map<string, TransactionCategoryValue>();

  if (additions.length > 0) {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: renderPrompt("categorize/system_prompt.njk"),
      },
      {
        role: "user",
        content: renderPrompt("categorize/user_prompt.njk", {
          transactions: additions.map((t) => ({
            reference: t.reference,
            description: t.description,
            amount: formatMoney(t.signedAmount),
            direction: t.direction,
          })),
        }),
      },
    ];

    const { labels } = await createStructured(
      messages,
      CategoryLabels,
      "category_labels",
    );

    for (const label of labels) {
      byRef.set(label.reference, label.category);
    }
  }

  return [
    ...groupAdditions(additions, byRef),
    ...groupReductions(reductions),
  ].sort((a, b) => b.amount - a.amount);
}
