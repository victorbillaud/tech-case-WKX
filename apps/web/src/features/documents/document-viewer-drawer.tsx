import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";

import { useStoreDocument } from "@/shared/hooks/use-ingest.js";

interface DocumentViewerDrawerProps {
  period: string;
  docId: string | null;
  sourcePath?: string;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewerDrawer({
  period,
  docId,
  sourcePath,
  onOpenChange,
}: DocumentViewerDrawerProps) {
  const { data: document, isLoading, error } = useStoreDocument(period, docId);

  const path = document?.sourcePath ?? sourcePath ?? "Supporting document";
  const title = path.split("/").pop() ?? path;

  return (
    <Sheet open={Boolean(docId)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col sm:max-w-3xl lg:max-w-[min(56rem,90vw)]"
      >
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="truncate pr-8">{title}</SheetTitle>
          {docId && (
            <SheetDescription className="font-mono text-xs">
              {docId}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
          {isLoading && (
            <p className="text-muted-foreground text-sm">Loading document…</p>
          )}
          {error && (
            <p className="text-destructive text-sm">{error.message}</p>
          )}
          {document && (
            <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {document.raw}
            </pre>
          )}
          {!isLoading && !error && !document && docId && (
            <p className="text-muted-foreground text-sm">Document not found.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
