import { Link, useParams } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";

import { ReconciliationReportView } from "@/features/reconcile/reconciliation-report-view.js";
import { ApproveForm } from "@/features/review/approve-form.js";
import {
  formatBlockingApprovalReason,
  LintReportView,
} from "@/features/review/lint-report-view.js";
import { useReconciliation } from "@/shared/hooks/use-reconcile.js";
import { useApprove, useLintReport, useVerify } from "@/shared/hooks/use-verify.js";

export function ReviewPage() {
  const { period } = useParams({ from: "/periods/$period/review" });
  const { data: reconciliation } = useReconciliation(period);
  const { data: lintReport } = useLintReport(period);
  const verify = useVerify(period);
  const approve = useApprove(period);

  const approveBlocked =
    !lintReport || (lintReport && !lintReport.approvable);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="min-h-0 lg:sticky lg:top-6">
        {reconciliation ? (
          <ReconciliationReportView
            period={period}
            reconciliation={reconciliation}
            constrained
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>No draft yet</CardTitle>
              <CardDescription>
                Generate a reconciliation on the Reconcile step before reviewing
                the month-end report.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/periods/$period/reconcile" params={{ period }}>
                  Go to Reconcile
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-6">
        {!reconciliation && (
          <Alert>
            <AlertTitle>Run reconcile first</AlertTitle>
            <AlertDescription>
              The linter verifies a cached draft. Generate the report on the
              Reconcile step, then return here to lint and approve.
            </AlertDescription>
          </Alert>
        )}

        <LintReportView
          report={lintReport}
          progress={verify.progress}
          onVerify={() => verify.mutate()}
          isPending={verify.isPending}
          error={verify.error}
        />

        <ApproveForm
          onApprove={(input) => approve.mutate(input)}
          isPending={approve.isPending}
          isSuccess={approve.isSuccess}
          error={approve.error}
          disabled={approveBlocked}
          disabledReason={
            !lintReport
              ? "Run the linter before approving."
              : !lintReport.approvable
                ? formatBlockingApprovalReason(lintReport)
                : undefined
          }
        />
      </section>
    </div>
  );
}
