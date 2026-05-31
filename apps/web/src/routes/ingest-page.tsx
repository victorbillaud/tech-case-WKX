import { useParams } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";

import { IngestBrowseTabs } from "@/features/ingestion/ingest-browse-tabs.js";
import { UploadPanel } from "@/features/ingestion/upload-panel.js";
import { useClassify, useIngest, useIngestionReport } from "@/shared/hooks/use-ingest.js";

export function IngestPage() {
  const { period } = useParams({ from: "/periods/$period/ingest" });
  const { data: report } = useIngestionReport(period);
  const ingest = useIngest(period);
  const classify = useClassify(period);

  return (
    <div className="space-y-6">
      <UploadPanel
        onUpload={(files) => ingest.mutate(files)}
        isPending={ingest.isPending}
      />

      {ingest.error && (
        <Alert variant="destructive">
          <AlertTitle>Ingestion failed</AlertTitle>
          <AlertDescription>{ingest.error.message}</AlertDescription>
        </Alert>
      )}

      {report && (
        <IngestBrowseTabs
          period={period}
          report={report}
          onResolveClassifications={(resolutions) => classify.mutate(resolutions)}
          isClassifyPending={classify.isPending}
        />
      )}
    </div>
  );
}
