import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";

import type { IngestionReport } from "@/shared/api/types.js";

interface IngestionReportViewProps {
  report: IngestionReport;
}

export function IngestionReportView({ report }: IngestionReportViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingestion report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead className="text-right">Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(report.counts).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="capitalize">{key}</TableCell>
                <TableCell className="text-right font-medium">{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {report.warnings.length > 0 && (
          <Alert>
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {report.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {report.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertTitle>Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {report.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
