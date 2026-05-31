import type { Reconciliation } from "@repo/domain";

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

export type StageStatus = "pending" | "running" | "done";

export interface ReconcileProgressState {
  stages: Record<ReconcileStage, StageStatus>;
  anomalyCheck: { current: number; total: number; reference: string } | null;
}

export const INITIAL_RECONCILE_PROGRESS: ReconcileProgressState = {
  stages: {
    "tie-out": "pending",
    categorize: "pending",
    variance: "pending",
    anomalies: "pending",
    draft: "pending",
  },
  anomalyCheck: null,
};

export function applyReconcileProgressEvent(
  state: ReconcileProgressState,
  event: ReconcileProgressEvent,
): ReconcileProgressState {
  if (event.type === "stage") {
    return {
      ...state,
      stages: {
        ...state.stages,
        [event.stage]: event.status === "started" ? "running" : "done",
      },
      anomalyCheck:
        event.stage === "anomalies" && event.status === "done"
          ? null
          : state.anomalyCheck,
    };
  }

  if (event.type === "anomaly_check") {
    return {
      ...state,
      anomalyCheck: {
        current: event.current,
        total: event.total,
        reference: event.reference,
      },
    };
  }

  return state;
}

export const STAGE_LABELS: Record<ReconcileStage, string> = {
  "tie-out": "Tie-out rollforward",
  categorize: "Categorize transactions",
  variance: "Investigate variance",
  anomalies: "Detect anomalies",
  draft: "Draft narrative",
};
