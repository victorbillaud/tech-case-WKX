import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { ChatCompletionMessageParam } from "openai/resources";

import {
  type Anomaly,
  type CategoryBreakdown,
  type LintReport,
  type Reconciliation,
  ReconciliationDraft,
  type Rollforward,
  VarianceAnalysis,
} from "@repo/domain";

import type { CanonicalStore } from "../ingestion/types.js";
import { createStructured, renderPrompt } from "../llm/index.js";
import { periodFolderName, priorPeriod } from "./period.js";
import {
  formatCategoriesForPrompt,
  formatRollforwardForPrompt,
  formatVarianceForPrompt,
} from "./prompt-facts.js";
import type { VarianceFacts } from "./types.js";

const EXEMPLAR_MAX_CHARS = 4000;
const EVIDENCE_SNIPPET_CHARS = 800;

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const dataRoot = path.resolve(apiRoot, "..", "..", "data");

function loadExemplar(account: string, period: string): string {
  const folder = path.join(
    dataRoot,
    "prior_reconciliations",
    periodFolderName(priorPeriod(period)),
  );

  try {
    const files = readdirSync(folder).filter(
      (f) => f.startsWith(`${account}_`) && f.endsWith(".md"),
    );
    if (files.length === 0) return "";
    const content = readFileSync(path.join(folder, files[0]!), "utf8");
    return content.slice(0, EXEMPLAR_MAX_CHARS);
  } catch {
    return "";
  }
}

function buildEvidence(
  store: CanonicalStore,
  variance: VarianceFacts,
  anomalies: Anomaly[],
): Array<{ docId: string; excerpt: string }> {
  const docIds = new Set<string>();

  for (const driver of variance.drivers) {
    for (const id of driver.evidenceDocIds) docIds.add(id);
  }

  for (const anomaly of anomalies) {
    for (const ref of anomaly.references) {
      if (ref.startsWith("doc_") || ref.includes("-")) {
        const doc = store.documents().find((d) => d.docId === ref);
        if (doc) docIds.add(doc.docId);
      }
      for (const doc of store.references.docsForReference(ref)) {
        docIds.add(doc.docId);
      }
    }
  }

  return [...docIds].map((docId) => {
    const doc = store.documents().find((d) => d.docId === docId);
    const excerpt = doc
      ? doc.raw.replace(/\s+/g, " ").trim().slice(0, EVIDENCE_SNIPPET_CHARS)
      : "";
    return { docId, excerpt };
  });
}

function mergeDriverExplanations(
  variance: VarianceFacts,
  explanations: Array<{ label: string; explanation: string }>,
): VarianceFacts["drivers"] {
  const byLabel = new Map(explanations.map((e) => [e.label, e.explanation]));

  return variance.drivers.map((driver) => ({
    ...driver,
    explanation:
      byLabel.get(driver.label) ??
      explanations.find((e) => driver.label.includes(e.label))?.explanation ??
      driver.explanation,
  }));
}

function collectExhibits(
  drivers: VarianceFacts["drivers"],
  anomalies: Anomaly[],
): string[] {
  const ids = new Set<string>();
  for (const driver of drivers) {
    for (const id of driver.evidenceDocIds) ids.add(id);
  }
  for (const anomaly of anomalies) {
    for (const ref of anomaly.references) {
      if (storeLooksLikeDocId(ref)) ids.add(ref);
    }
  }
  return [...ids];
}

function storeLooksLikeDocId(ref: string): boolean {
  return !/^(AP|JE|INV|IC|REV|REF|EXP|PO)-/i.test(ref);
}

export interface DraftInput {
  account: string;
  period: string;
  rollforward: Rollforward;
  categories: CategoryBreakdown[];
  variance: VarianceFacts;
  anomalies: Anomaly[];
  store: CanonicalStore;
  lintFailures?: LintReport["results"];
}

async function callDraftLlm(input: DraftInput): Promise<ReconciliationDraft> {
  const exemplar = loadExemplar(input.account, input.period);
  const evidence = buildEvidence(input.store, input.variance, input.anomalies);
  const lintFailures =
    input.lintFailures?.filter((r) => r.status === "fail") ?? [];

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: renderPrompt("draft/system_prompt.njk") },
    {
      role: "user",
      content: renderPrompt("draft/user_prompt.njk", {
        account: input.account,
        period: input.period,
        rollforward: formatRollforwardForPrompt(input.rollforward),
        categories: formatCategoriesForPrompt(input.categories),
        variance: formatVarianceForPrompt(input.variance),
        anomalies: input.anomalies,
        evidence,
        exemplar,
        lintFailures: lintFailures.length > 0 ? lintFailures : undefined,
      }),
    },
  ];

  return createStructured(messages, ReconciliationDraft, "reconciliation_draft");
}

export function assembleReconciliation(
  input: DraftInput,
  draft: ReconciliationDraft,
): Reconciliation {
  const drivers = mergeDriverExplanations(
    input.variance,
    draft.driverExplanations,
  );

  const confirmationDocIds = input.store.references
    .docsForAccount(input.account)
    .map((d) => d.docId);

  const variance = VarianceAnalysis.parse({
    priorBalance: input.variance.priorBalance,
    currentBalance: input.variance.currentBalance,
    deltaAmount: input.variance.deltaAmount,
    deltaPct: input.variance.deltaPct,
    isMaterial: input.variance.isMaterial,
    drivers,
    priorPeriodComparison: input.variance.priorPeriodComparison,
  });

  const exhibits = collectExhibits(drivers, input.anomalies);

  return {
    account: input.account,
    period: input.period,
    rollforward: input.rollforward,
    categories: input.categories,
    variance,
    completeness: {
      ...draft.completeness,
      confirmationDocIds,
    },
    riskAssessment: draft.riskAssessment,
    anomalies: input.anomalies,
    exhibits,
    narrative: draft.narrative,
    preparer: "agent",
    reviewer: null,
    status: "draft",
  };
}

export async function draftReconciliation(
  input: DraftInput,
): Promise<Reconciliation> {
  const draft = await callDraftLlm(input);
  return assembleReconciliation(input, draft);
}
