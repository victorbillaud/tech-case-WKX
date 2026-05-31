import { useParams } from "@tanstack/react-router";

import { RunReconPanel } from "@/features/reconcile/run-recon-panel.js";
import { useReconcile, useReconciliation } from "@/shared/hooks/use-reconcile.js";

export function ReconcilePage() {
  const { period } = useParams({ from: "/periods/$period/reconcile" });
  const { data: reconciliation } = useReconciliation(period);
  const reconcile = useReconcile(period);

  return (
    <RunReconPanel
      period={period}
      reconciliation={reconciliation ?? undefined}
      progress={reconcile.progress}
      onRun={() => reconcile.mutate()}
      isPending={reconcile.isPending}
      error={reconcile.error}
    />
  );
}
