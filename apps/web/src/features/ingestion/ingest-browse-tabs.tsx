import { useState, type ReactNode } from "react";

import { formatMoney } from "@repo/domain";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn } from "@repo/ui/lib/utils";

import { ClassifyQueue } from "@/features/ingestion/classify-queue.js";
import { IngestionReportView } from "@/features/ingestion/ingestion-report-view.js";
import type {
  ClassifyResolution,
  IngestionReport,
  StoreDocumentSummary,
} from "@/shared/api/types.js";
import { POC_ACCOUNT } from "@/shared/constants.js";
import {
  useStoreAccount,
  useStoreDocuments,
  useStoreTransactions,
} from "@/shared/hooks/use-ingest.js";

type IngestTab =
  | "overview"
  | "transactions"
  | "documents"
  | "account"
  | "unclassified";

const TABS: { id: IngestTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "documents", label: "Documents" },
  { id: "account", label: "Account & balances" },
  { id: "unclassified", label: "Unclassified" },
];

interface IngestBrowseTabsProps {
  period: string;
  report: IngestionReport;
  onResolveClassifications: (resolutions: ClassifyResolution[]) => void;
  isClassifyPending: boolean;
}

export function IngestBrowseTabs({
  period,
  report,
  onResolveClassifications,
  isClassifyPending,
}: IngestBrowseTabsProps) {
  const [tab, setTab] = useState<IngestTab>("overview");
  const unclassifiedCount = report.unclassified.length;

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Ingested data"
      >
        {TABS.map((item) => (
          <Button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            variant={tab === item.id ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === "unclassified" && unclassifiedCount > 0 && (
              <Badge variant="warning" className="ml-1.5">
                {unclassifiedCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {tab === "overview" && <IngestionReportView report={report} />}
      {tab === "transactions" && (
        <TransactionsTab period={period} account={POC_ACCOUNT} />
      )}
      {tab === "documents" && <DocumentsTab period={period} />}
      {tab === "account" && (
        <AccountTab period={period} account={POC_ACCOUNT} />
      )}
      {tab === "unclassified" && (
        <ClassifyQueue
          items={report.unclassified}
          onResolve={onResolveClassifications}
          isPending={isClassifyPending}
        />
      )}
    </div>
  );
}

function TransactionsTab({
  period,
  account,
}: {
  period: string;
  account: string;
}) {
  const { data: transactions, isLoading, error } = useStoreTransactions(
    period,
    account,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>GL transactions</CardTitle>
        <CardDescription>
          Account {account} · period {period} — normalized canonical rows from
          ingested GL export.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading transactions…</p>
        )}
        {error && (
          <p className="text-destructive text-sm">{error.message}</p>
        )}
        {transactions && transactions.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No transactions found for this account and period.
          </p>
        )}
        {transactions && transactions.length > 0 && (
          <div className="max-h-[32rem] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Flags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.reference}>
                    <TableCell className="font-medium">{txn.reference}</TableCell>
                    <TableCell className="max-w-48 truncate">
                      {txn.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {txn.category ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(txn.signedAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {txn.flags.length === 0 ? (
                          <span className="text-muted-foreground text-xs">—</span>
                        ) : (
                          txn.flags.map((flag) => (
                            <Badge key={flag} variant="outline" className="text-[10px]">
                              {flag}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsTab({ period }: { period: string }) {
  const { data: documents, isLoading, error } = useStoreDocuments(period);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Supporting documents</CardTitle>
        <CardDescription>
          Links are extracted at ingest by matching AP/JE/INV references and chart
          account numbers in document text — not by filename or topic.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading documents…</p>
        )}
        {error && (
          <p className="text-destructive text-sm">{error.message}</p>
        )}
        {documents && documents.length === 0 && (
          <p className="text-muted-foreground text-sm">No documents ingested.</p>
        )}
        {documents && documents.length > 0 && (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.docId} className="rounded-md border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">{doc.sourcePath}</p>
                    <p className="text-muted-foreground font-mono text-xs">
                      {doc.docId}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DocumentLinkStatus doc={doc} />
                    <Badge variant={doc.docType ? "secondary" : "warning"}>
                      {doc.docType ?? "Unclassified"}
                    </Badge>
                  </div>
                </div>
                {(doc.relatedReferences.length > 0 ||
                  doc.relatedAccounts.length > 0) && (
                  <dl className="text-muted-foreground mt-2 space-y-1 text-xs">
                    {doc.relatedReferences.length > 0 && (
                      <div>
                        <dt className="font-medium text-foreground">
                          GL references
                        </dt>
                        <dd>{doc.relatedReferences.join(", ")}</dd>
                      </div>
                    )}
                    {doc.relatedAccounts.length > 0 && (
                      <div>
                        <dt className="font-medium text-foreground">
                          Account mentions
                        </dt>
                        <dd>{doc.relatedAccounts.join(", ")}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {doc.excerpt && (
                  <p className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">
                    {doc.excerpt}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentLinkStatus({ doc }: { doc: StoreDocumentSummary }) {
  const hasRefs = doc.relatedReferences.length > 0;
  const hasAccounts = doc.relatedAccounts.length > 0;

  if (!hasRefs && !hasAccounts) {
    return (
      <Badge variant="warning" className="text-[10px]">
        No GL links extracted
      </Badge>
    );
  }

  if (hasAccounts && !hasRefs) {
    return (
      <Badge variant="outline" className="text-[10px]">
        Account mention only
      </Badge>
    );
  }

  return null;
}

function AccountTab({
  period,
  account,
}: {
  period: string;
  account: string;
}) {
  const { data: detail, isLoading, error } = useStoreAccount(period, account);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Account {account}
          {detail && ` — ${detail.account.name}`}
        </CardTitle>
        <CardDescription>
          Chart metadata, monthly balances, and how ingested documents connect to
          this account (by account mention vs transaction reference).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="text-muted-foreground text-sm">Loading account…</p>
        )}
        {error && (
          <p className="text-destructive text-sm">{error.message}</p>
        )}
        {detail && (
          <>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <MetaItem label="Type" value={detail.account.type} />
              <MetaItem label="Category" value={detail.account.category} />
              <MetaItem label="Risk" value={detail.account.riskLevel} />
              <MetaItem
                label={`Balance (${period})`}
                value={detail.periodBalance?.balance ?? "—"}
              />
              <MetaItem
                label="Transactions in period"
                value={String(detail.transactionCount)}
              />
              <MetaItem
                label="Txn support docs"
                value={String(detail.transactionSupportDocuments.length)}
              />
              <MetaItem
                label="Mention account"
                value={String(detail.documentsMentioningAccount.length)}
              />
            </dl>

            {detail.balances.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Balance history</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.balances.map((row) => (
                      <TableRow key={row.period}>
                        <TableCell
                          className={cn(
                            row.period === period && "font-medium",
                          )}
                        >
                          {row.period}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {row.balance}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <AccountDocumentSection
              title="Transaction support"
              description={`Documents that cite the same AP/JE reference as a ${period} transaction on this account.`}
            >
              {detail.transactionSupportDocuments.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    No ingested document cites any reference from this period&apos;s{" "}
                    {detail.transactionCount} transactions. Reconciliation uses
                    exact reference matching — a relevant email or invoice still
                    won&apos;t link unless its text contains tokens like{" "}
                    <span className="font-mono">JE-12215</span>.
                  </p>
                  {detail.referencesWithoutSupport.length > 0 && (
                    <p className="text-muted-foreground text-xs">
                      <span className="font-medium text-foreground">
                        Unlinked refs ({detail.referencesWithoutSupport.length}
                        ):
                      </span>{" "}
                      {detail.referencesWithoutSupport.join(", ")}
                    </p>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {detail.transactionSupportDocuments.map((doc) => (
                    <li
                      key={doc.docId}
                      className="rounded-md border px-3 py-2 text-xs"
                    >
                      <p className="font-medium">{doc.sourcePath}</p>
                      <p className="text-muted-foreground mt-0.5">
                        Matches: {doc.matchedReferences.join(", ")}
                        {doc.docType ? ` · ${doc.docType}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </AccountDocumentSection>

            {detail.documentsMentioningAccount.length > 0 && (
              <AccountDocumentSection
                title="Documents mentioning this account"
                description={`Text contains account ${account}. May include prior recons or other periods.`}
              >
                <ul className="space-y-2">
                  {detail.documentsMentioningAccount.map((doc) => (
                    <li
                      key={doc.docId}
                      className="rounded-md border px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{doc.sourcePath}</p>
                        {!doc.matchesPeriodTransactions && (
                          <Badge variant="outline" className="text-[10px]">
                            No {period} txn match
                          </Badge>
                        )}
                      </div>
                      {doc.docType && (
                        <p className="text-muted-foreground mt-0.5">
                          {doc.docType}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </AccountDocumentSection>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AccountDocumentSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
