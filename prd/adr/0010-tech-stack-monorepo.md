# ADR-0010 — Tech stack & monorepo structure

**Status:** accepted

## Context

[ADR-0002](./0002-typescript-zod.md) settled on TypeScript + Zod but deferred the
concrete runtime, API framework, LLM client, and project layout. We need those
fixed before scaffolding.

## Decision

- **Monorepo with Turborepo.** A single workspace, task orchestration/caching via
  `turbo`.
- **One app for now: a backend API built with [Hono](https://hono.dev/).** No
  frontend app in the PoC; the demo is served/driven through the API.
- **The canonical data model lives in a shared package** consumed by the app
  (and any future package). Working name: `@repo/domain`.
- **All LLM requests go through the official OpenAI SDK** (`openai`), using
  **structured outputs validated against our Zod schemas** (via
  `openai/helpers/zod`), so model output parses into canonical types or fails at
  the boundary.

## Proposed layout (high level)

```
.
├── apps/
│   └── api/                 # Hono backend (the only app for now)
├── packages/
│   └── domain/              # @repo/domain — Zod schemas + Money helpers
├── turbo.json
├── package.json             # workspaces root
└── tsconfig.base.json
```

- `@repo/domain` holds the canonical model (see [../data-model.md](../data-model.md))
  and the `Money` helper ([ADR-0009](./0009-money-as-integer-cents.md)). Later it
  may also host the linter rules and the ingestion contracts; for now: the data
  model.
- `apps/api` depends on `@repo/domain` and owns ingestion, the agent
  orchestration, the linter execution, and HTTP routes.

## Rationale

- **Turborepo** keeps the door open for more apps/packages (a web UI, a CLI, a
  separate `linter` package) without restructuring, matching the CFO's
  "design for scale" point — while we still ship only one app today.
- **Hono** is lightweight, TypeScript-first, and runtime-agnostic (Node now,
  edge later) — minimal ceremony for a PoC API.
- **A shared `@repo/domain` package** enforces [ADR-0003](./0003-canonical-data-model-as-contract.md):
  the model is a real, importable contract, not types duplicated per app.
- **OpenAI SDK + Zod structured outputs** operationalizes
  [ADR-0004](./0004-deterministic-core-llm-narrative.md): the LLM returns typed
  JSON we validate; it never returns free-form numbers we trust blindly.

## Consequences

- Node.js runtime for `apps/api`. Package manager + test runner are an
  implementation detail (default: pnpm workspaces; revisit if needed).
- One OpenAI client wrapper in `apps/api` centralizes model config, retries, and
  schema-bound calls.
- `OPENAI_API_KEY` is required configuration; the build plan must keep an offline
  path (fixtures) so the deterministic core is demoable without network.
