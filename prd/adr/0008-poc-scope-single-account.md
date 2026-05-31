# ADR-0008 — PoC scope: one account, end-to-end

**Status:** accepted

## Context

The case is a 1-day PoC and explicitly rewards "depth and end-to-end clarity on
one problem" over "superficial coverage of many." The biggest risk is
gold-plating the ingestion/classification layer and having no generated
reconciliation to demo.

## Decision

Deliver a **complete vertical slice for a single account: 24100 — Accrued
Expenses** (ingest → normalize → categorize → draft → lint → human approval). The
data model is **designed for** arbitrary documents, multi-account, multi-entity,
and forecasting, but those are **not built**.

## Rationale

- **24100** has the richest material: a rejected Oct recon (anti-pattern), an
  approved Nov recon (gold standard), the Dec target, Jessica's abandoned draft
  (the "before"), high transaction volume, and the bonus anomaly ($14M vs $1.9M).
- A working end-to-end slice with metrics beats a broad-but-shallow system.

## Consequences

- **Build for real:** Zod schemas, deterministic CSV parsers (GL/balances/chart),
  the `ReferenceIndex`, the rollforward/tie-out, the linter, one LLM drafting step,
  a real Hono upload endpoint, and the OpenAI classifier with human fallback (see
  [layer-1-ingestion.md](../layer-1-ingestion.md)).
- **Mock / build-light, with real interface shape:** no upload UI (API only), the
  human-classification fallback is an endpoint not a UI, and documents keep raw
  text instead of per-type structured extraction.
- The write-up states the trade-off explicitly: "designed for the general case,
  implemented for the data we were given."
- Extending to a second account (e.g. 18200 Intercompany) is a stretch goal, not
  a commitment.
