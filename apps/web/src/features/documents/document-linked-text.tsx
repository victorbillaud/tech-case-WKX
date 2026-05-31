import { useMemo, useState } from "react";

import { cn } from "@repo/ui/lib/utils";

import { DocumentViewerDrawer } from "./document-viewer-drawer.js";

interface DocumentLinkedTextProps {
  period: string;
  text: string;
  documentIds: Set<string>;
  documentPaths?: Map<string, string>;
  className?: string;
}

export function DocumentLinkedText({
  period,
  text,
  documentIds,
  documentPaths,
  className,
}: DocumentLinkedTextProps) {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const segments = useMemo(
    () => splitTextByDocumentIds(text, documentIds),
    [text, documentIds],
  );

  return (
    <>
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            return <span key={index}>{segment.value}</span>;
          }

          const path = documentPaths?.get(segment.value);
          const label = path
            ? path.split("/").pop() ?? segment.value
            : segment.value.slice(0, 8);

          return (
            <button
              key={`${segment.value}-${index}`}
              type="button"
              className={cn(
                "text-primary font-medium underline underline-offset-2",
                "hover:text-primary/80",
              )}
              title={path ?? segment.value}
              onClick={() => setActiveDocId(segment.value)}
            >
              {segment.matchKind === "exhibit" ? `exhibit ${label}` : label}
            </button>
          );
        })}
      </span>

      <DocumentViewerDrawer
        period={period}
        docId={activeDocId}
        sourcePath={
          activeDocId ? documentPaths?.get(activeDocId) : undefined
        }
        onOpenChange={(open) => {
          if (!open) setActiveDocId(null);
        }}
      />
    </>
  );
}

type TextSegment =
  | { type: "text"; value: string }
  | { type: "doc"; value: string; matchKind: "exhibit" | "id" };

function splitTextByDocumentIds(
  text: string,
  documentIds: Set<string>,
): TextSegment[] {
  if (documentIds.size === 0) {
    return [{ type: "text", value: text }];
  }

  const ids = [...documentIds].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(exhibit\\s+)(${ids.map(escapeRegExp).join("|")})|\\b(${ids.map(escapeRegExp).join("|")})\\b`,
    "gi",
  );

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, index) });
    }

    if (match[1] && match[2]) {
      segments.push({ type: "text", value: match[1] });
      segments.push({
        type: "doc",
        value: match[2],
        matchKind: "exhibit",
      });
    } else if (match[3]) {
      segments.push({
        type: "doc",
        value: match[3],
        matchKind: "id",
      });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
