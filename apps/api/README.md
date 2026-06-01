# TechCorp Close Assistant — API

[Hono](https://hono.dev/) backend for the month-end close PoC. It implements three
layers — ingestion, reconciliation, and verify/approve — with **deterministic
math in TypeScript** and **LLM calls only where judgment or prose is needed**.

See [`../../LAYERS.md`](../../LAYERS.md) for the full pipeline narrative and
[`../../prd/layer-*.md`](../../prd/) for design detail.

## Quick start

From the **repo root**:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # set OPENAI_API_KEY
pnpm dev                                 # API (3000) + web via Turbo
```

API only:

```bash
cd apps/api
cp .env.example .env
pnpm dev
```

Production build:

```bash
pnpm build
pnpm start   # runs dist/index.js with --env-file .env
```

Default URL: `http://localhost:3000`

## Environment

Validated at boot via Zod (`src/env.ts`). Missing or invalid values exit before
the server listens.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | yes | — | OpenAI API key for classify, categorize, draft, lint assist, doc amount extraction |
| `OPENAI_MODEL` | no | `gpt-5.4-mini-2026-03-17` | Model id for all structured/chat calls |
| `PORT` | no | `3000` | HTTP listen port |
| `NODE_ENV` | no | `development` | `development` or `production` |

## PoC scope

- **Period:** `YYYY-MM` (e.g. `2025-12`)
- **Account:** `24100` (Accrued Expenses) — single-account end-to-end per ADR-0008
- **Storage:** in-memory per process (re-ingest after restart)

Layers 2 and 3 read only the **canonical store** produced by Layer 1; they never
open raw uploads.

## Architecture

```
src/
├── index.ts              # Hono app, health routes, mount layer routers
├── env.ts                # Zod-validated config
├── llm/                  # OpenAI client, structured outputs, Nunjucks prompts
├── prompts/              # Versioned .njk templates per pipeline step
├── ingestion/          # Layer 1 — upload, classify, parse, normalize, link
├── reconciliation/     # Layer 2 — tie-out → categorize → variance → anomalies → draft
├── verify/             # Layer 3 — rules linter, LLM assist, redraft loop, approve
└── utils/                # NDJSON streaming, shared errors
```

### Layer 1 — Ingestion (`src/ingestion/`)

Pipeline: **upload → classify → parse → normalize → link → store**

| Step | Role |
|------|------|
| Classify | LLM assigns file type (GL, balances, chart, supporting doc) or `null` for human queue |
| Parse / normalize | Code: CSV → rows; signs, flags, integer cents |
| Link | `ReferenceIndex`: `JE-12501` ↔ supporting memos, vendor hints |
| Store | Per-period `CanonicalStore` + ingestion report |

### Layer 2 — Reconciliation (`src/reconciliation/`)

Pipeline: **tie-out → categorize → variance → anomalies → draft**

| Stage | Role |
|-------|------|
| Tie-out | Rollforward; compare to GL balance (no invented plugs) |
| Categorize | LLM labels; **code sums** by category |
| Variance | MoM drivers, materiality, evidence doc ids |
| Anomalies | Transaction flags + memo amount vs GL (LLM reads doc, code compares) |
| Draft | LLM prose only; numbers injected from prior stages |

### Layer 3 — Verify (`src/verify/`)

Deterministic rules (`verify/rules/`) plus optional LLM lint assist. Can trigger
**redraft** (re-run draft step with lint context). Approval gated on lint outcome.

## Shared LLM utilities (`src/llm/`)

| Module | Role |
|--------|------|
| `openai.ts` | Single OpenAI client |
| `structured.ts` | `createStructured` — Zod-bound JSON outputs |
| `template.ts` | `renderPrompt` — Nunjucks `.njk` under `src/prompts/` |

## HTTP API

All period params must match `YYYY-MM`. Account routes use chart account numbers
(e.g. `24100`).

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness + config snapshot |
| `GET` | `/health/prompts` | Smoke-test Nunjucks render |

### Layer 1 — Ingestion

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/periods/:period/ingest` | Multipart file upload; run full ingest pipeline |
| `GET` | `/periods/:period/ingestion` | Latest ingestion report (UI rehydrate) |
| `POST` | `/periods/:period/classify` | Resolve unclassified docs — body: `{ docId, docType }[]` |
| `GET` | `/periods/:period/store/transactions` | Canonical transactions (`?account`, `?txnPeriod`) |
| `GET` | `/periods/:period/store/documents` | Document summaries + link metadata |
| `GET` | `/periods/:period/store/documents/:docId` | Full document text |
| `GET` | `/periods/:period/store/accounts/:account` | Account metadata, balances, linked docs |

### Layer 2 — Reconciliation

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/periods/:period/accounts/:account/reconciliation` | Cached draft `Reconciliation` |
| `POST` | `/periods/:period/accounts/:account/reconcile` | Run full Layer 2 pipeline |
| `POST` | `/periods/:period/accounts/:account/reconcile/stream` | Same pipeline; **NDJSON** progress events |
| `POST` | `/periods/:period/accounts/:account/redraft` | Re-run draft only; body: `LintReport` |

### Layer 3 — Verify & approve

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/periods/:period/accounts/:account/lint` | Cached lint report |
| `POST` | `/periods/:period/accounts/:account/verify` | Rules + correction loop → `LintReport` |
| `POST` | `/periods/:period/accounts/:account/verify/stream` | Same; **NDJSON** progress |
| `POST` | `/periods/:period/accounts/:account/approve` | Sign-off; body: `ApprovalInput` |

### Streaming

`/reconcile/stream` and `/verify/stream` return newline-delimited JSON events
(`src/utils/ndjson-stream.ts`) for live UI progress (stage status, anomaly checks,
rule results).

## Types

Request/response shapes live in [`@repo/domain`](../../packages/domain/) and are
shared with the web app. The API validates inputs with the same Zod schemas.

## Related docs

- [`../../LAYERS.md`](../../LAYERS.md) — how the three layers connect
- [`../../PRODUCT.md`](../../PRODUCT.md) — product overview
- [`../../prd/architecture.md`](../../prd/architecture.md) — system design
- [`../../prd/adr/`](../../prd/adr/) — architecture decision records
