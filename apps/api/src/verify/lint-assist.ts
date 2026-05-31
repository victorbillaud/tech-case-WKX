import type { ChatCompletionMessageParam } from "openai/resources";
import { z } from "zod";

import type { Reconciliation, Transaction } from "@repo/domain";
import { formatMoney } from "@repo/domain";

import { createStructured, renderPrompt } from "../llm/index.js";

const SpecificityResult = z.object({
  specific: z.boolean(),
  reason: z.string(),
});

const VarianceExplanationResult = z.object({
  adequate: z.boolean(),
  reason: z.string(),
});

const EstimateMethodologyResult = z.object({
  documented: z.boolean(),
  reason: z.string(),
});

export async function checkSpecificity(text: string) {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: renderPrompt("lint/specificity/system_prompt.njk") },
    {
      role: "user",
      content: renderPrompt("lint/specificity/user_prompt.njk", { text }),
    },
  ];
  return createStructured(messages, SpecificityResult, "lint_specificity");
}

export async function checkVarianceExplanation(recon: Reconciliation) {
  const { rollforward, variance } = recon;
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: renderPrompt("lint/variance_explanation/system_prompt.njk"),
    },
    {
      role: "user",
      content: renderPrompt("lint/variance_explanation/user_prompt.njk", {
        varianceSummary: {
          deltaAmount: formatMoney(variance.deltaAmount),
          priorBalance: formatMoney(variance.priorBalance),
          currentBalance: formatMoney(variance.currentBalance),
          isMaterial: variance.isMaterial,
        },
        rollforwardSummary: {
          ties: rollforward.ties,
          unexplainedDifference: formatMoney(rollforward.unexplainedDifference),
        },
        drivers: variance.drivers.map((driver) => ({
          label: driver.label,
          amount: formatMoney(driver.amount),
          explanation: driver.explanation,
          evidenceDocIds: driver.evidenceDocIds,
        })),
        narrative: recon.narrative,
      }),
    },
  ];
  return createStructured(
    messages,
    VarianceExplanationResult,
    "lint_variance_explanation",
  );
}

export async function checkEstimateMethodology(
  recon: Reconciliation,
  estimateTxns: Transaction[],
) {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: renderPrompt("lint/estimate_methodology/system_prompt.njk"),
    },
    {
      role: "user",
      content: renderPrompt("lint/estimate_methodology/user_prompt.njk", {
        transactions: estimateTxns.map((t) => ({
          reference: t.reference,
          description: t.description,
        })),
        narrative: recon.narrative,
        completeness: recon.completeness,
      }),
    },
  ];
  return createStructured(
    messages,
    EstimateMethodologyResult,
    "lint_estimate_methodology",
  );
}
