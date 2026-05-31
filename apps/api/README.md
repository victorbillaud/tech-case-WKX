# TechCorp Close Assistant — API

Hono backend for the month-end close PoC.

## Scripts

From the repo root:

```bash
pnpm install
pnpm build
pnpm dev
```

Copy env and adjust:

```bash
cp apps/api/.env.example apps/api/.env
```

## Generic libs (`src/`)

| Module | Role |
|--------|------|
| `env.ts` | Zod-validated config, fail-fast at boot |
| `llm/openai.ts` | `createChatInference` — single OpenAI client |
| `llm/structured.ts` | `createStructured` — Zod-bound structured outputs |
| `llm/template.ts` | `renderPrompt` — Nunjucks `.njk` templates |
| `prompts/` | Versioned prompt files per pipeline step |

Layer 1–3 routes are documented in `prd/layer-*.md`.

## Endpoints

- `GET /health` — liveness + config snapshot
- `GET /health/prompts` — smoke-test Nunjucks rendering
