import { useMemo } from "react";

import { formatMoney, type Money } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Separator } from "@repo/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { cn } from "@repo/ui/lib/utils";

import type { Reconciliation } from "@/shared/api/types.js";
import {
  buildDocumentPathIndex,
  collectDocumentIds,
} from "@/features/documents/collect-document-ids.js";
import { DocumentLinkedText } from "@/features/documents/document-linked-text.js";
import { useStoreDocuments } from "@/shared/hooks/use-ingest.js";

interface ReconciliationReportViewProps {
  period: string;
  reconciliation: Reconciliation;
  className?: string;
  /** Sticky review pane: fixed card height, scroll body inside. */
  constrained?: boolean;
}

export function ReconciliationReportView({
  period,
  reconciliation,
  className,
  constrained = false,
}: ReconciliationReportViewProps) {
  const { rollforward, variance, anomalies, completeness, riskAssessment } =
    reconciliation;
  const { data: documents } = useStoreDocuments(period);
  const documentIds = useMemo(() => {
    const ids = collectDocumentIds(reconciliation);
    for (const doc of documents ?? []) {
      ids.add(doc.docId);
    }
    return ids;
  }, [reconciliation, documents]);
  const documentPaths = buildDocumentPathIndex(documents ?? []);

  const statusVariant =
    reconciliation.status === "approved"
      ? "success"
      : reconciliation.status === "submitted"
        ? "warning"
        : "outline";

  return (
    <Card
      className={cn(
        "flex flex-col",
        constrained && "max-h-[calc(100svh-8rem)]",
        className,
      )}
    >
      <CardHeader className="shrink-0 gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Month-end reconciliation</CardTitle>
            <CardDescription>
              Account {reconciliation.account} · {reconciliation.period}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant} className="capitalize">
              {reconciliation.status}
            </Badge>
            <Badge variant={rollforward.ties ? "success" : "destructive"}>
              {rollforward.ties ? "Ties to GL" : "Does not tie"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "space-y-6",
          constrained && "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
        )}
      >
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Rollforward</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <RollforwardRow label="Beginning balance" value={rollforward.beginningBalance} />
              <RollforwardRow label="Additions" value={rollforward.additions} />
              <RollforwardRow label="Reductions" value={rollforward.reductions} />
              <RollforwardRow
                label="Ending (computed)"
                value={rollforward.endingBalance}
                emphasized
              />
              <RollforwardRow label="GL ending balance" value={rollforward.glBalance} emphasized />
              {!rollforward.ties && (
                <RollforwardRow
                  label="Unexplained difference"
                  value={rollforward.unexplainedDifference}
                  emphasized
                  destructive
                />
              )}
            </TableBody>
          </Table>
        </section>

        {variance.drivers.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Variance drivers</h3>
            <ul className="space-y-3">
              {variance.drivers.map((driver) => (
                <li
                  key={driver.label}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{driver.label}</p>
                    <p className="shrink-0 font-medium">
                      {formatMoney(driver.amount)}
                    </p>
                  </div>
                  {driver.explanation && (
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      <DocumentLinkedText
                        period={period}
                        text={driver.explanation}
                        documentIds={documentIds}
                        documentPaths={documentPaths}
                      />
                    </p>
                  )}
                  {driver.evidenceDocIds.length > 0 && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Evidence:{" "}
                      {driver.evidenceDocIds.map((docId, index) => (
                        <span key={docId}>
                          {index > 0 && ", "}
                          <DocumentLinkedText
                            period={period}
                            text={docId}
                            documentIds={documentIds}
                            documentPaths={documentPaths}
                          />
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {reconciliation.narrative && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Narrative</h3>
            <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
              <DocumentLinkedText
                period={period}
                text={reconciliation.narrative}
                documentIds={documentIds}
                documentPaths={documentPaths}
              />
            </p>
          </section>
        )}

        {anomalies.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium">
              Anomalies ({anomalies.length})
            </h3>
            <ul className="space-y-2">
              {anomalies.map((anomaly, index) => (
                <li
                  key={`${anomaly.kind}-${index}`}
                  className="rounded-md border p-3 text-sm"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <AnomalySeverityBadge severity={anomaly.severity} />
                    <span className="text-muted-foreground text-xs">
                      <DocumentLinkedText
                        period={period}
                        text={anomaly.references.join(", ")}
                        documentIds={documentIds}
                        documentPaths={documentPaths}
                      />
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    <DocumentLinkedText
                      period={period}
                      text={anomaly.message}
                      documentIds={documentIds}
                      documentPaths={documentPaths}
                    />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Separator />

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Completeness</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              <DocumentLinkedText
                period={period}
                text={completeness.result}
                documentIds={documentIds}
                documentPaths={documentPaths}
              />
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Risk assessment</h3>
            <ul className="text-muted-foreground space-y-1 text-xs leading-relaxed">
              {riskAssessment.risksIdentified.slice(0, 3).map((risk) => (
                <li key={risk}>
                  •{" "}
                  <DocumentLinkedText
                    period={period}
                    text={risk}
                    documentIds={documentIds}
                    documentPaths={documentPaths}
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="text-muted-foreground text-xs">
          Preparer: {reconciliation.preparer}
          {reconciliation.reviewer
            ? ` · Reviewer: ${reconciliation.reviewer}`
            : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function RollforwardRow({
  label,
  value,
  emphasized = false,
  destructive = false,
}: {
  label: string;
  value: Money;
  emphasized?: boolean;
  destructive?: boolean;
}) {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell
        className={cn(
          "text-right",
          emphasized && "font-medium",
          destructive && "text-destructive",
        )}
      >
        {formatMoney(value)}
      </TableCell>
    </TableRow>
  );
}

function AnomalySeverityBadge({
  severity,
}: {
  severity: "info" | "warning" | "critical";
}) {
  const variant =
    severity === "critical"
      ? "destructive"
      : severity === "warning"
        ? "warning"
        : "outline";

  return (
    <Badge variant={variant} className="capitalize">
      {severity}
    </Badge>
  );
}
