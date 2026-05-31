# PRD — Month-End Close Assistant

> Technical case (founding/software engineer). This folder holds our product &
> architecture decisions **before** we write code. Stack: **TypeScript + Zod**,
> a **Turborepo** monorepo with a **Hono** backend, the **OpenAI SDK** for all
> LLM calls, and a shared **`@repo/domain`** package for the data model
> (see [ADR-0010](./adr/0010-tech-stack-monorepo.md)).

## TL;DR

We are building an **agent-assisted reconciliation system** for TechCorp's
month-end close. The agent does the "detective work" the accounting team
(Jake/Jessica) does by hand — categorize GL transactions, build the rollforward,
retrieve supporting documents, draft the reconciliation narrative — then a
**deterministic rules linter** verifies the output before a human approves it.

This is **Option A** of the directions we evaluated (see
[ADR-0001](./adr/0001-focus-option-a-recon-assistant.md)).

## Design pillars

1. **Deterministic core, LLM only for prose.** Numbers are computed in code and
   never invented by the model. See [ADR-0004](./adr/0004-deterministic-core-llm-narrative.md).
2. **A canonical data model is the contract** between messy inputs and the agent.
   The agent never sees a raw CSV or e-mail. See
   [ADR-0003](./adr/0003-canonical-data-model-as-contract.md).
3. **Everything is grounded.** Every number/claim links back to a transaction or
   a document via shared references. See
   [ADR-0007](./adr/0007-reference-based-linking.md).
4. **Human-in-the-loop & auditable.** The system drafts and verifies; a qualified
   human signs off (SOX). Uncertain steps fall back to a human.

## Documents

| Doc | Purpose |
|-----|---------|
| [architecture.md](./architecture.md) | High-level pipeline & layers (ingestion → agent → verifier) |
| [layer-1-ingestion.md](./layer-1-ingestion.md) | Ingestion layer in practice (upload → classify → parse → normalize → link → store) |
| [layer-2-reconciliation-agent.md](./layer-2-reconciliation-agent.md) | Reconciliation agent in practice (tie-out → categorize → variance → anomalies → draft) |
| [layer-3-verifier-approval.md](./layer-3-verifier-approval.md) | Rules linter + bounded correction loop + human approval (audit trail) |
| [data-model.md](./data-model.md) | Canonical data model, expressed as Zod schemas |
| [implementation-patterns.md](./implementation-patterns.md) | Env, OpenAI client, Nunjucks prompts (scaffolding reference) |
| [adr/](./adr/) | Architecture Decision Records — the *why* behind each choice |
| [implementation-patterns.md](./implementation-patterns.md) | Reference patterns (from mochi-model-generator) for scaffolding |

## Scope for the PoC (1 day)

- **In:** end-to-end slice on **one account (24100 — Accrued Expenses)**:
  ingest → normalize → categorize → draft recon → lint → human approval.
- **Designed-for, not built:** arbitrary document ingestion, multi-account,
  multi-entity, forecasting. The data model is designed to extend there; the
  implementation targets the data we were given.
- See [ADR-0008](./adr/0008-poc-scope-single-account.md).

## Status

Pre-development. High-level only — pipeline + data model. Implementation details
(class interfaces, prompts, UI) come later.
