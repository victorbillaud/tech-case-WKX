import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

import type { Reconciliation } from "@/shared/api/types.js";
import {
  RECONCILE_STAGES,
  STAGE_LABELS,
  type ReconcileProgressState,
} from "@/shared/api/reconcile-progress.js";
import { ReconciliationReportView } from "./reconciliation-report-view.js";

interface RunReconPanelProps {
  period: string;
  reconciliation: Reconciliation | undefined;
  progress: ReconcileProgressState;
  onRun: () => void;
  isPending: boolean;
  error: Error | null;
}

export function RunReconPanel({
  period,
  reconciliation,
  progress,
  onRun,
  isPending,
  error,
}: RunReconPanelProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Run reconciliation agent</CardTitle>
          <CardDescription>
            Layer 2: tie-out → categorize → variance → anomalies → draft.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(isPending || reconciliation) && (
            <ReconcileProgressList progress={progress} isPending={isPending} />
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-3">
          <Button disabled={isPending} onClick={onRun}>
            {isPending ? "Running…" : "Generate draft"}
          </Button>
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertTitle>Reconciliation failed</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      {reconciliation && (
        <ReconciliationReportView period={period} reconciliation={reconciliation} />
      )}
    </div>
  );
}

function ReconcileProgressList({
  progress,
  isPending,
}: {
  progress: ReconcileProgressState;
  isPending: boolean;
}) {
  return (
    <ol className="space-y-2">
      {RECONCILE_STAGES.map((stage) => {
        const status = progress.stages[stage];
        const isAnomaliesStage = stage === "anomalies";
        const showDocCheck =
          isAnomaliesStage &&
          isPending &&
          status === "running" &&
          progress.anomalyCheck !== null;

        return (
          <li key={stage} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <StageIndicator status={status} />
              <span
                className={cn(
                  status === "running" && "font-medium",
                  status === "done" && "text-muted-foreground",
                )}
              >
                {STAGE_LABELS[stage]}
              </span>
              <StageBadge status={status} />
            </div>
            {showDocCheck && progress.anomalyCheck && (
              <p className="text-muted-foreground pl-6 text-xs">
                Checking {progress.anomalyCheck.reference} (
                {progress.anomalyCheck.current}/{progress.anomalyCheck.total})
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StageIndicator({ status }: { status: "pending" | "running" | "done" }) {
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

function StageBadge({ status }: { status: "pending" | "running" | "done" }) {
  if (status === "pending") return null;

  return (
    <Badge variant={status === "running" ? "default" : "secondary"}>
      {status === "running" ? "Running" : "Done"}
    </Badge>
  );
}
