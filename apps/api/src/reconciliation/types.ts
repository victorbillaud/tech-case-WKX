import { z } from "zod";

import { AccrualCategory, Money } from "@repo/domain";

export const CategoryLabels = z.object({
  labels: z.array(
    z.object({
      reference: z.string(),
      category: AccrualCategory,
      justification: z.string(),
    }),
  ),
});
export type CategoryLabels = z.infer<typeof CategoryLabels>;

/** LLM output for cross-doc amount extraction. */
export const DocAmount = z.object({
  amount: Money,
  note: z.string(),
});
export type DocAmount = z.infer<typeof DocAmount>;

/** Intermediate facts for variance (before LLM explanations). */
export interface VarianceFacts {
  priorBalance: z.infer<typeof Money>;
  currentBalance: z.infer<typeof Money>;
  deltaAmount: z.infer<typeof Money>;
  deltaPct: number;
  isMaterial: boolean;
  drivers: Array<{
    label: string;
    amount: z.infer<typeof Money>;
    explanation: string;
    evidenceDocIds: string[];
  }>;
  priorPeriodComparison: string | null;
}
