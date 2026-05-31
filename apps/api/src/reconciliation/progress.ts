import type { Reconciliation } from "@repo/domain";

import { emitProgress, runStep } from "../utils/progress.js";

export const RECONCILE_STAGES = [
  "tie-out",
  "categorize",
  "variance",
  "anomalies",
  "draft",
] as const;

export type ReconcileStage = (typeof RECONCILE_STAGES)[number];

export type ReconcileProgressEvent =
  | { type: "stage"; stage: ReconcileStage; status: "started" | "done" }
  | {
      type: "anomaly_check";
      current: number;
      total: number;
      reference: string;
    }
  | { type: "complete"; reconciliation: Reconciliation }
  | { type: "error"; message: string };

export interface ReconcileProgressHandler {
  onProgress?(event: ReconcileProgressEvent): void;
}

export { emitProgress };

export async function runStage<T>(
  stage: ReconcileStage,
  handler: ReconcileProgressHandler | undefined,
  run: () => Promise<T> | T,
): Promise<T> {
  return runStep(stage, handler, run);
}
