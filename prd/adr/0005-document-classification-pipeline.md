# ADR-0005 — Classify documents: OpenAI classifier → human fallback

**Status:** accepted (supersedes the earlier heuristics-first proposal)

## Context

To ingest an uploaded file we first need its **nature**: a known structured
source (GL / balances / chart) or a **supporting document** of some `DocType`
(invoice, e-mail, memo, contract, ...). The user uploads many individual files
for a period (no zip, so no folder hint). We must avoid silent misclassification
without maintaining a pile of brittle heuristics.

## Decision

A **two-tier classifier with graceful degradation**:

1. **OpenAI classifier (primary)** — one structured-output call per file, from
   filename + file head, returning `{ kind, rationale }` validated against the
   `SourceKind`/`DocType` schema. The model returns a concrete type **or `null`**
   when it can't determine a document's type. There is **no numeric confidence**.
2. **Human fallback** — a `null` type is stored as `docType: null` and sent to a
   human-resolve queue (`POST /periods/:period/classify`) instead of being guessed.

We dropped the earlier heuristic tier: dropping zip removed the folder signal
that made heuristics strong, and a single mechanism is simpler to reason about.

## Rationale

- One uniform mechanism, no hand-coded pattern set to maintain.
- The LLM handles the long tail (vague filenames, mixed content) out of the box.
- The human fallback means we **never guess silently** — important for an
  audit-grade system and aligned with human-in-the-loop.
- Trade-off: a model call per file (including the structured CSVs). Acceptable at
  this volume; a header-signature shortcut for the known CSVs is the escape hatch
  if needed.

## Consequences

- The taxonomy is kept **small and closed** (see the `DocType` enum) to keep
  classification tractable.
- For the PoC, the heuristic + OpenAI classifier are real; the human fallback is
  an API endpoint (`POST /periods/:period/classify`), not a UI. See
  [layer-1-ingestion.md](../layer-1-ingestion.md) for the concrete pipeline.
- Classification routes a file to either a deterministic CSV parser or the
  raw-text `SupportingDocument` path (no per-type extraction in the PoC).
- An escalated document is stored with **`docType: null`** — that null is the
  human-fallback signal. There is no confidence anywhere: the classifier emits a
  type or `null` directly.
