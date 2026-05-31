# ADR-0007 — Link documents ↔ transactions by shared references

**Status:** accepted

## Context

Jake/Jessica spend the majority of their time hunting for the document that
supports a given GL line. The data already contains natural join keys: GL
transactions carry a `reference` (`AP-28502`, `JE-12501`, `INV-12401`) and a
vendor/description; supporting documents mention the same references and vendors.

## Decision

At ingestion, build a **`ReferenceIndex`**: `reference → documents[]` and
`vendor → documents[]`. Canonical documents store `relatedReferences` and
`relatedAccounts`; transactions are matched to documents through this index.

## Rationale

- Makes **grounding** cheap: when the agent processes a transaction it already
  has the supporting document, so every claim/number can cite a source.
- Eliminates the "20 minutes to find the PDF" problem the interviews describe.
- Enables **cross-document anomaly detection** — e.g. the bonus memo (amount read
  from its raw text) says ~$14M while `Transaction(JE-12501).signedAmount` is
  $1.9M → raise an `Anomaly`. (See [ADR-0006](./0006-rules-linter-verifier.md) and
  the anomalies in the data.)

## Consequences

- Matching is primarily exact-key (reference) with vendor/amount/date as
  secondary signals; ambiguous matches carry lower confidence.
- The index is the backbone of both retrieval (for drafting) and verification.
- Documents with no resolvable link are still ingested but flagged as
  unlinked (a completeness signal in itself).
