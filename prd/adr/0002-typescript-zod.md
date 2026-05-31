# ADR-0002 — TypeScript + Zod for schemas & validation

**Status:** accepted

## Context

The stack is open-ended. We need a single language for the ingestion pipeline,
the agent orchestration, and the verifier, plus a way to validate messy external
inputs and (importantly) the **structured output of the LLM**.

## Decision

Use **TypeScript** as the implementation language and **Zod** as the single
source of truth for all schemas (canonical model, recon output, lint report).

## Rationale

- One language across ingestion + agent + verifier; strong typing matches a
  software-engineering evaluation.
- Zod gives runtime validation **and** static types (`z.infer`) from one
  definition — no drift between types and validators.
- Zod schemas double as the **structured-output contract** for the LLM: the
  model is asked to produce JSON that must parse against the schema, so a
  malformed/hallucinated shape fails fast at the boundary.
- Discriminated unions (`z.discriminatedUnion`) model the document taxonomy
  cleanly.

## Consequences

- Money/Decimal needs explicit handling (no native decimal) — see
  [ADR-0009](./0009-money-as-integer-cents.md).
- We adopt a Zod-first workflow: define the schema, derive the type, validate at
  every layer boundary.
- Runtime, API framework, LLM client, and project layout are settled in
  [ADR-0010](./0010-tech-stack-monorepo.md): Node.js, Turborepo, a Hono backend,
  the OpenAI SDK, and a shared `@repo/domain` package.
