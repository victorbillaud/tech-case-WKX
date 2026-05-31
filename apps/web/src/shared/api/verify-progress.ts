import type { LintReport, Reconciliation, RuleResult } from "@repo/domain";

export type VerifyProgressEvent =
  | {
      type: "lint_pass";
      pass: number;
      status: "started" | "done";
      totalRules: number;
      ruleIds?: string[];
    }
  | {
      type: "rule_done";
      pass: number;
      ruleId: string;
      status: RuleResult["status"];
      completed: number;
      total: number;
    }
  | { type: "redraft"; iteration: 1 | 2; status: "started" | "done" }
  | { type: "complete"; lintReport: LintReport; reconciliation: Reconciliation }
  | { type: "error"; message: string };

export type RuleCheckStatus = RuleResult["status"] | "pending" | "running";

export type VerifyPipelineStepStatus = "pending" | "running" | "done";

export interface VerifyPipelineStep {
  id: string;
  label: string;
  status: VerifyPipelineStepStatus;
}

export interface VerifyProgressState {
  pass: number;
  phase: "idle" | "linting" | "redrafting" | "done";
  redraftIteration: 0 | 1 | 2;
  totalRules: number;
  completedRules: number;
  ruleStatuses: Record<string, RuleCheckStatus>;
  steps: VerifyPipelineStep[];
}

export const INITIAL_VERIFY_PROGRESS: VerifyProgressState = {
  pass: 0,
  phase: "idle",
  redraftIteration: 0,
  totalRules: 0,
  completedRules: 0,
  ruleStatuses: {},
  steps: [],
};

function lintStepId(pass: number): string {
  return `lint-${pass}`;
}

function lintStepLabel(pass: number): string {
  return pass === 1 ? "Lint pass 1" : `Lint pass ${pass} (re-check)`;
}

function redraftStepId(iteration: number): string {
  return `redraft-${iteration}`;
}

function markRunningStepsDone(
  steps: VerifyPipelineStep[],
): VerifyPipelineStep[] {
  return steps.map((step) =>
    step.status === "running" ? { ...step, status: "done" } : step,
  );
}

function upsertStep(
  steps: VerifyPipelineStep[],
  id: string,
  label: string,
  status: VerifyPipelineStepStatus,
): VerifyPipelineStep[] {
  const existing = steps.find((step) => step.id === id);
  if (existing) {
    return steps.map((step) =>
      step.id === id ? { ...step, label, status } : step,
    );
  }
  return [...steps, { id, label, status }];
}

function pendingRuleStatuses(ruleIds: string[]): Record<string, RuleCheckStatus> {
  return Object.fromEntries(ruleIds.map((ruleId) => [ruleId, "pending"]));
}

export function applyVerifyProgressEvent(
  state: VerifyProgressState,
  event: VerifyProgressEvent,
): VerifyProgressState {
  if (event.type === "lint_pass") {
    if (event.status === "started") {
      const ruleStatuses = event.ruleIds
        ? pendingRuleStatuses(event.ruleIds)
        : {};

      return {
        ...state,
        pass: event.pass,
        phase: "linting",
        totalRules: event.totalRules,
        completedRules: 0,
        ruleStatuses,
        steps: upsertStep(
          markRunningStepsDone(state.steps),
          lintStepId(event.pass),
          lintStepLabel(event.pass),
          "running",
        ),
      };
    }

    return {
      ...state,
      phase: "linting",
      steps: upsertStep(
        state.steps,
        lintStepId(event.pass),
        lintStepLabel(event.pass),
        "done",
      ),
    };
  }

  if (event.type === "rule_done") {
    return {
      ...state,
      pass: event.pass,
      completedRules: event.completed,
      totalRules: event.total,
      ruleStatuses: {
        ...state.ruleStatuses,
        [event.ruleId]: event.status,
      },
    };
  }

  if (event.type === "redraft") {
    if (event.status === "started") {
      return {
        ...state,
        phase: "redrafting",
        redraftIteration: event.iteration,
        completedRules: 0,
        ruleStatuses: {},
        steps: upsertStep(
          markRunningStepsDone(state.steps),
          redraftStepId(event.iteration),
          `Auto-correction ${event.iteration}`,
          "running",
        ),
      };
    }

    return {
      ...state,
      phase: "linting",
      steps: upsertStep(
        state.steps,
        redraftStepId(event.iteration),
        `Auto-correction ${event.iteration}`,
        "done",
      ),
    };
  }

  if (event.type === "complete") {
    return {
      ...state,
      phase: "done",
      steps: markRunningStepsDone(state.steps).map((step) => ({
        ...step,
        status: "done",
      })),
    };
  }

  return state;
}

export function countRuleStatuses(
  ruleStatuses: Record<string, RuleCheckStatus>,
): { pending: number; done: number; failed: number } {
  let pending = 0;
  let done = 0;
  let failed = 0;

  for (const status of Object.values(ruleStatuses)) {
    if (status === "pending" || status === "running") {
      pending += 1;
      continue;
    }
    done += 1;
    if (status === "fail") failed += 1;
  }

  return { pending, done, failed };
}
