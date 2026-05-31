# ADR-0003 — A canonical data model is the contract between layers

**Status:** accepted

## Context

Inputs are heterogeneous and messy: CSV exports (GL, balances, chart), e-mails,
Slack threads, calculation memos, contracts, invoices — in different formats and
of varying quality. The agent and the linter must not be coupled to any of these
formats.

## Decision

Define a **canonical, Zod-validated data model** (see
[../data-model.md](../data-model.md)) that sits between ingestion and the
consumers. Ingestion's job is to produce canonical objects; the agent and linter
**only ever read canonical objects**.

## Rationale

- **Separation of concerns:** parsing chaos is isolated in Layer 1.
- **Extensibility:** a new document type or source system (SAP, Salesforce, a
  scanned PDF) means adding/altering an extractor — consumers don't change. This
  directly answers the CFO's "design for 2x scale" point.
- **Testability:** the agent can be tested against mocked canonical objects;
  extractors can be tested without the agent.
- **A clean LLM boundary:** the model receives typed facts, not raw files, which
  reduces hallucination surface.

## Consequences

- An upfront modeling cost before any feature works end-to-end.
- We must normalize at ingestion (signs, money units, derived flags) so
  downstream code never re-derives them.
- The model is the artifact we iterate on first; everything else depends on it.
