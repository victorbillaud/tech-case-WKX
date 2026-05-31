import { useState } from "react";

import type { RuleResult } from "@repo/domain";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

import type { LintReport } from "@/shared/api/types.js";
import {
  countRuleStatuses,
  type VerifyProgressState,
} from "@/shared/api/verify-progress.js";

interface LintReportViewProps {
  report: LintReport | null | undefined;
  progress: VerifyProgressState;
  onVerify: () => void;
  isPending: boolean;
  error: Error | null;
}

export function getBlockingRules(report: LintReport): RuleResult[] {
  return report.results.filter(
    (result) => result.status === "fail" && result.severity === "critical",
  );
}

export function formatBlockingApprovalReason(report: LintReport): string {
  const blocking = getBlockingRules(report);
  if (blocking.length === 0) {
    return "Critical rule failures block approval.";
  }

  const labels = blocking.map((rule) => `${rule.ruleId} (${rule.title})`);
  return `Resolve critical failures before approval: ${labels.join(", ")}.`;
}

export function LintReportView({
  report,
  progress,
  onVerify,
  isPending,
  error,
}: LintReportViewProps) {
  const [showDeferredRules, setShowDeferredRules] = useState(false);
  const showProgress = isPending || progress.phase !== "idle";

  const blockingRules = report ? getBlockingRules(report) : [];
  const deferredRuleCount = report
    ? report.results.filter(
        (result) =>
          result.status === "not_implemented" ||
          result.status === "not_applicable",
      ).length
    : 0;
  const activeRules = report
    ? report.results
        .filter(
          (result) =>
            showDeferredRules ||
            (result.status !== "not_implemented" &&
              result.status !== "not_applicable"),
        )
        .sort(compareRuleResults)
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rules linter</CardTitle>
          <CardDescription>
            Layer 3: rules linter with bounded auto-correction (up to 2 redrafts).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button disabled={isPending} onClick={onVerify}>
            {isPending ? "Verifying…" : "Run linter"}
          </Button>

          {showProgress && (
            <VerifyProgressPanel progress={progress} isPending={isPending} />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTitle>Verification failed</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {report && blockingRules.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>
                {blockingRules.length === 1
                  ? `Blocked by rule ${blockingRules[0]!.ruleId}`
                  : `Blocked by ${blockingRules.length} critical rules`}
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {blockingRules.map((rule) => (
                    <li key={rule.ruleId}>{rule.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle>Lint report</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Score {report.score}</Badge>
              <Badge variant={report.approvable ? "success" : "destructive"}>
                {report.approvable ? "Approvable" : "Blocked"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!showDeferredRules && deferredRuleCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeferredRules(true)}
              >
                Show {deferredRuleCount} deferred framework rules
              </Button>
            )}
            {showDeferredRules && deferredRuleCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeferredRules(false)}
              >
                Hide deferred framework rules
              </Button>
            )}

            <ul className="space-y-2">
              {activeRules.map((result) => (
                <RuleResultItem key={result.ruleId} result={result} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleResultItem({ result }: { result: RuleResult }) {
  const [expanded, setExpanded] = useState(false);
  const status = ruleStatusBadge(result.status);
  const severity = severityBadge(result.severity);
  const isLongMessage = result.message.length > 180;
  const showMessage = result.status !== "pass";

  return (
    <li
      className={cn(
        "rounded-md border p-3",
        result.status === "fail" && "border-destructive/30 bg-destructive/5",
        result.status === "needs_human" && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {result.ruleId} — {result.title}
        </p>
        <div className="flex shrink-0 flex-wrap gap-1">
          <Badge variant={severity.variant}>{severity.label}</Badge>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      {showMessage && (
        <div className="mt-2 space-y-1">
          <p
            className={cn(
              "text-muted-foreground text-xs leading-relaxed break-words",
              isLongMessage && !expanded && "line-clamp-3",
            )}
          >
            {result.message}
          </p>
          {isLongMessage && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Show less" : "Show full explanation"}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

const RULE_STATUS_ORDER: Record<RuleResult["status"], number> = {
  fail: 0,
  needs_human: 1,
  pass: 2,
  not_applicable: 3,
  not_implemented: 4,
};

function compareRuleResults(a: RuleResult, b: RuleResult): number {
  const statusDiff = RULE_STATUS_ORDER[a.status] - RULE_STATUS_ORDER[b.status];
  if (statusDiff !== 0) return statusDiff;
  return a.ruleId.localeCompare(b.ruleId, undefined, { numeric: true });
}

function VerifyProgressPanel({
  progress,
  isPending,
}: {
  progress: VerifyProgressState;
  isPending: boolean;
}) {
  const { pending, done, failed } = countRuleStatuses(progress.ruleStatuses);
  const progressPct =
    progress.totalRules > 0
      ? Math.round((progress.completedRules / progress.totalRules) * 100)
      : 0;

  const ruleEntries = Object.entries(progress.ruleStatuses).sort(
    ([idA, statusA], [idB, statusB]) => {
      const aPending = statusA === "pending" || statusA === "running";
      const bPending = statusB === "pending" || statusB === "running";
      if (aPending !== bPending) return aPending ? 1 : -1;
      return idA.localeCompare(idB, undefined, { numeric: true });
    },
  );

  const headline = getVerifyHeadline(progress, isPending);

  return (
    <div className="space-y-4 rounded-md border p-3">
      {progress.steps.length > 0 && (
        <ol className="space-y-2">
          {progress.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-2 text-sm">
              <VerifyStepIndicator status={step.status} />
              <span
                className={cn(
                  step.status === "running" && "font-medium",
                  step.status === "done" && "text-muted-foreground",
                  step.status === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              <VerifyStepBadge status={step.status} />
            </li>
          ))}
        </ol>
      )}

      {progress.phase === "linting" && progress.pass > 0 && (
        <div className="space-y-2 border-t pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{headline}</p>
            {isPending && (
              <Badge variant="outline">
                {progress.completedRules}/{progress.totalRules}
              </Badge>
            )}
          </div>

          {progress.totalRules > 0 && (
            <>
              <div
                className="bg-muted h-2 overflow-hidden rounded-full"
                role="progressbar"
                aria-valuenow={progress.completedRules}
                aria-valuemin={0}
                aria-valuemax={progress.totalRules}
                aria-label={`Lint pass ${progress.pass} progress`}
              >
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {isPending
                  ? pending > 0
                    ? `${done} checked · ${pending} in progress`
                    : "Finishing lint pass…"
                  : `${done} rules checked${failed > 0 ? ` · ${failed} failed` : ""}`}
              </p>
            </>
          )}
        </div>
      )}

      {progress.phase === "redrafting" && (
        <p className="text-muted-foreground border-t pt-3 text-xs">
          Re-drafting narrative to address auto-fixable rule failures…
        </p>
      )}

      {ruleEntries.length > 0 && progress.phase !== "redrafting" && (
        <ul className="max-h-48 space-y-1 overflow-y-auto border-t pt-3 text-xs">
          {ruleEntries.map(([ruleId, status]) => (
            <li key={ruleId} className="flex items-center gap-2">
              <RuleStatusDot status={status} />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  (status === "pending" || status === "running") &&
                    "text-muted-foreground",
                )}
              >
                {ruleId}
              </span>
              <RuleStatusLabel status={status} />
            </li>
          ))}
        </ul>
      )}

      {progress.phase === "done" && !isPending && (
        <p className="text-muted-foreground border-t pt-3 text-xs">
          Verification complete.
        </p>
      )}
    </div>
  );
}

function getVerifyHeadline(
  progress: VerifyProgressState,
  isPending: boolean,
): string {
  const passLabel =
    progress.pass === 1
      ? "Lint pass 1"
      : `Lint pass ${progress.pass} (after auto-correction ${progress.pass - 1})`;

  if (!isPending && progress.phase === "done") {
    return `${passLabel} complete`;
  }

  return isPending ? `${passLabel} — checking rules…` : passLabel;
}

function VerifyStepIndicator({
  status,
}: {
  status: VerifyProgressState["steps"][number]["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
        status === "pending" && "border-muted-foreground/30",
        status === "running" && "border-primary bg-primary/10 text-primary",
        status === "done" && "border-emerald-600 bg-emerald-600 text-white",
      )}
      aria-hidden
    >
      {status === "done" ? "✓" : status === "running" ? "…" : ""}
    </span>
  );
}

function VerifyStepBadge({
  status,
}: {
  status: VerifyProgressState["steps"][number]["status"];
}) {
  if (status === "pending") return null;

  return (
    <Badge variant={status === "running" ? "default" : "secondary"}>
      {status === "running" ? "Running" : "Done"}
    </Badge>
  );
}

function RuleStatusDot({ status }: { status: RuleCheckStatus }) {
  return (
    <span
      className={cn(
        "inline-flex size-3 shrink-0 rounded-full border",
        status === "pending" && "border-muted-foreground/30",
        status === "running" && "border-primary bg-primary/20",
        status === "pass" && "border-emerald-600 bg-emerald-600",
        status === "fail" && "border-destructive bg-destructive",
        status === "needs_human" && "border-amber-500 bg-amber-500",
        status !== "pass" &&
          status !== "fail" &&
          status !== "needs_human" &&
          status !== "pending" &&
          status !== "running" &&
          "border-muted-foreground/40",
      )}
      aria-hidden
    />
  );
}

function RuleStatusLabel({ status }: { status: RuleCheckStatus }) {
  const label = formatProgressStatus(status);
  const variant =
    status === "pass"
      ? "success"
      : status === "fail"
        ? "destructive"
        : status === "needs_human"
          ? "warning"
          : status === "pending" || status === "running"
            ? "outline"
            : "secondary";

  return (
    <Badge variant={variant} className="shrink-0">
      {label}
    </Badge>
  );
}

type RuleCheckStatus = VerifyProgressState["ruleStatuses"][string];

function formatProgressStatus(
  status: VerifyProgressState["ruleStatuses"][string],
): string {
  switch (status) {
    case "pass":
      return "Pass";
    case "fail":
      return "Fail";
    case "needs_human":
      return "Needs review";
    case "not_applicable":
      return "N/A";
    case "not_implemented":
      return "Not implemented";
    case "pending":
      return "Pending";
    case "running":
      return "Running";
  }
}

function ruleStatusBadge(status: RuleResult["status"]): {
  variant: "success" | "destructive" | "warning" | "outline" | "secondary";
  label: string;
} {
  switch (status) {
    case "pass":
      return { variant: "success", label: "Pass" };
    case "fail":
      return { variant: "destructive", label: "Fail" };
    case "needs_human":
      return { variant: "warning", label: "Needs review" };
    case "not_applicable":
      return { variant: "outline", label: "N/A" };
    case "not_implemented":
      return { variant: "secondary", label: "Not implemented" };
  }
}

function severityBadge(severity: RuleResult["severity"]): {
  variant: "destructive" | "warning" | "outline" | "secondary";
  label: string;
} {
  switch (severity) {
    case "critical":
      return { variant: "destructive", label: "Critical" };
    case "high":
      return { variant: "warning", label: "High" };
    case "medium":
      return { variant: "outline", label: "Medium" };
    case "low":
      return { variant: "secondary", label: "Low" };
  }
}
