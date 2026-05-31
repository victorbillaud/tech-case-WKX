# Implementation Patterns (reference: `mochi-model-generator`)

> Reusable engineering patterns lifted from a sibling production TypeScript repo
> (Maki's `mochi-model-generator`) and adapted to this PoC. Scope of this doc:
> **env management, the OpenAI client wrapper, and prompt management with
> Nunjucks.** These are implementation conventions, not new product decisions —
> they operationalize [ADR-0010](./adr/0010-tech-stack-monorepo.md) (OpenAI SDK +
> Zod) and [ADR-0004](./adr/0004-deterministic-core-llm-narrative.md) (LLM writes
> prose only).
>
> The reference repo and ours share the same stack (TypeScript ESM, Zod v4,
> `openai` SDK, Nunjucks for prompts), so these patterns port directly.

## Why borrow from this repo

`mochi-model-generator` is a CLI/MCP tool that turns structured input into
LLM-generated artifacts validated against schemas — structurally the same
problem as our Layer 2 (canonical objects → LLM prose → validated
`Reconciliation`). Three patterns are worth copying verbatim:

| Pattern | What it gives us | Where we use it |
|---------|------------------|-----------------|
| **Zod-validated env** | Fail-fast config, typed `env` object, prod-only constraints | `apps/api` startup |
| **Single OpenAI client wrapper** | One place for model config, structured outputs, error logging | every LLM call in Layer 1 + 2 |
| **Nunjucks prompt files + `renderPrompt`** | Prompts as versioned `.njk` files, not inline strings | classify / categorize / draft prompts |

---

## 1. Environment management — Zod-validated, fail-fast

**Pattern:** a single `env.ts` module parses `process.env` through a Zod schema
at import time. Invalid config throws *before* any request runs, with a
pretty-printed error. Everything downstream imports the typed `env` object — no
raw `process.env` access anywhere else.

Key moves from the reference repo:

- `z.enum([...])` for `NODE_ENV` with a `.default("development")`.
- `.refine(...)` for **conditional, environment-dependent requirements**
  (e.g. a token that is only mandatory in production).
- `z.prettifyError()` + `throw` so a misconfigured deploy dies loudly at boot.
- Secrets are loaded via Node's native `--env-file .env` flag (see scripts
  below), not `dotenv`.

Adapted to our PoC:

```ts
// apps/api/src/env.ts
import { z } from "zod";

const schemaEnv = z
  .object({
    NODE_ENV: z.enum(["development", "production"]).default("development"),

    // Required for the LLM steps (categorize, draft, doc extraction).
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_MODEL: z.string().default("gpt-5.4"),

    // Offline path: when "true", skip network and use fixtures so the
    // deterministic core stays demoable without a key (see ADR-0010).
    USE_FIXTURES: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .refine(
    (v) => v.USE_FIXTURES || v.OPENAI_API_KEY.length > 0,
    {
      message: "OPENAI_API_KEY is required unless USE_FIXTURES=true",
      path: ["OPENAI_API_KEY"],
    },
  );

const result = schemaEnv.safeParse(process.env);

if (!result.success) {
  console.error(z.prettifyError(result.error));
  throw new Error("Invalid environment variables");
}

export const env = result.data;
```

`package.json` scripts use Node's built-in env loading (no `dotenv` dependency):

```jsonc
{
  "scripts": {
    "dev": "tsx watch --env-file .env src/server.ts",
    "start": "node --env-file .env dist/server.js"
  }
}
```

**Takeaways for us**

- One `env.ts`; never read `process.env` elsewhere.
- The `.refine` is the place to encode our **`USE_FIXTURES` ↔ key** rule, keeping
  the offline demo path honest.
- Throw on boot — a recon tool that silently runs with a bad config is worse than
  one that won't start.

---

## 2. The OpenAI client wrapper — one module, structured outputs

**Pattern:** a single `openai.ts` instantiates the client once from `env`, and
exposes thin typed helpers. Every feature imports the helper; nobody touches the
raw SDK. This centralizes model selection, `response_format`, reasoning effort,
and error logging — and is the natural seam for the fixtures/offline path.

The reference repo's wrapper (`createChatInference`) takes messages + model +
options, calls `chat.completions.create`, and **throws on empty choice/content**
so a malformed response can't slip through as `undefined`:

```ts
// apps/api/src/llm/openai.ts
import { OpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatModel,
  ReasoningEffort,
  ResponseFormatJSONSchema,
  ResponseFormatText,
} from "openai/resources";
import { env } from "../env.js";

export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

type ResponseFormat = ResponseFormatText | ResponseFormatJSONSchema;

interface ChatInferenceOptions {
  response_format?: ResponseFormat;
  reasoning_effort?: ReasoningEffort;
}

export async function createChatInference(
  messages: ChatCompletionMessageParam[],
  model: ChatModel,
  options: ChatInferenceOptions = {},
): Promise<string> {
  const { response_format, reasoning_effort } = options;

  try {
    const result = await openai.chat.completions.create({
      model,
      messages,
      response_format,
      reasoning_effort,
    });

    const content = result.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content returned from OpenAI");
    }
    return content;
  } catch (error) {
    console.error("OpenAI inference failed", { model, messages });
    throw error;
  }
}
```

### 2a. Structured outputs (two flavors observed)

The reference repo binds output to a **hand-written JSON Schema** with
`strict: true`, then `JSON.parse`s the string and validates by shape:

```ts
const json = await createChatInference(messages, env.OPENAI_MODEL, {
  response_format: {
    type: "json_schema",
    json_schema: { name: "transaction_category", strict: true, schema: mySchema },
  },
});
const parsed = JSON.parse(json) as CategoryResult;
```

**Our improvement (per [ADR-0010](./adr/0010-tech-stack-monorepo.md)):** drive
structured outputs **from our Zod schemas** via `openai/helpers/zod`, so model
output parses into canonical types or fails at the boundary — no separate
JSON-Schema duplication:

```ts
// apps/api/src/llm/structured.ts
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { openai } from "./openai.js";
import { env } from "../env.js";

export async function createStructured<T extends z.ZodTypeAny>(
  messages: ChatCompletionMessageParam[],
  schema: T,
  name: string,
): Promise<z.infer<T>> {
  const completion = await openai.chat.completions.parse({
    model: env.OPENAI_MODEL,
    messages,
    response_format: zodResponseFormat(schema, name),
  });
  const parsed = completion.choices[0]?.message.parsed;
  if (!parsed) throw new Error(`No parsed output for ${name}`);
  return parsed; // already a validated z.infer<T>
}
```

This is exactly the boundary [ADR-0004](./adr/0004-deterministic-core-llm-narrative.md)
wants: the LLM returns a **prose-only** schema (`narrative`, `explanation`,
`AccrualCategory` label), and **code owns every `Money` field**. The wrapper is
where that contract is enforced.

**Takeaways for us**

- One client instance, one `createChatInference` + one `createStructured` helper.
- Prefer the **Zod-bound** variant over hand-written JSON Schema — single source
  of truth with `@repo/domain`.
- Throw on empty/unparseable output; log `model` + `messages` on failure.
- The wrapper is the single seam to add: fixtures (offline), retries, and cost
  logging — without touching call sites.

---

## 3. Prompt management — Nunjucks `.njk` files + `renderPrompt`

**Pattern:** prompts are **files on disk** (`.njk` templates), not string
literals in code. A single `template.ts` configures one Nunjucks environment and
exposes `renderPrompt(name, ctx)`. Call sites build `messages` arrays by
rendering a `system_prompt.njk` + `user_prompt.njk` pair.

### 3a. The environment + helper

The reference `template.ts`, with the settings worth copying:

```ts
// apps/api/src/llm/template.ts
import nunjucks from "nunjucks";
import path from "node:path";
import { env as appEnv } from "../env.js";

const nunjucksEnv = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(path.join(process.cwd(), "src", "prompts"), {
    noCache: appEnv.NODE_ENV === "development", // hot-reload prompts in dev
    watch: false,
  }),
  {
    autoescape: false,        // prompts are text, not HTML
    throwOnUndefined: true,   // a missing var fails loudly, never renders "undefined"
    trimBlocks: true,
    lstripBlocks: true,
  },
);

// Filters that make prompts readable
nunjucksEnv.addFilter("json", (v: unknown, spaces = 2) => JSON.stringify(v, null, spaces));
nunjucksEnv.addFilter("oneLine", (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim());

export function renderPrompt(name: string, ctx?: Record<string, unknown>): string {
  return nunjucksEnv.render(name, ctx).replace(/\r\n/g, "\n").trim() + "\n";
}
```

The two settings that matter most:

- **`throwOnUndefined: true`** — if a prompt references `{{ account.code }}` and
  we forgot to pass `account`, it throws instead of silently injecting
  `undefined` into a prompt that decides accounting categorization. This is the
  prompt-layer equivalent of the env fail-fast.
- **`autoescape: false`** — we're producing prompt text, not HTML; escaping would
  corrupt JSON/markdown we embed.
- **`noCache` in dev** — edit a `.njk` and re-run without rebuilding.
- The **`json` filter** is the workhorse: it serializes canonical objects
  (transactions, balances, linked docs) straight into the prompt.

### 3b. Directory convention

The reference repo nests prompts **by feature**, with a `system_prompt.njk` /
`user_prompt.njk` pair per step. Mirror that for our pipeline steps:

```
apps/api/src/prompts/
├── classify/                  # Layer 1 — document classification
│   ├── system_prompt.njk
│   └── user_prompt.njk
├── categorize/                # Layer 2 — AccrualCategory labeling
│   ├── system_prompt.njk
│   └── user_prompt.njk
├── extract_doc_amount/        # Layer 2 — cross-doc anomaly extraction
│   ├── system_prompt.njk
│   └── user_prompt.njk
└── draft/                     # Layer 2 — narrative (prose-only)
    ├── system_prompt.njk
    └── user_prompt.njk
```

### 3c. Call-site shape

Every LLM step looks the same — render the pair, hand to the wrapper:

```ts
// apps/api/src/agent/categorize.ts
import type { ChatCompletionMessageParam } from "openai/resources";
import { renderPrompt } from "../llm/template.js";
import { createStructured } from "../llm/structured.js";
import { TransactionCategory } from "@repo/domain";

export async function categorizeTransaction(tx: CanonicalTransaction) {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: renderPrompt("categorize/system_prompt.njk") },
    {
      role: "user",
      content: renderPrompt("categorize/user_prompt.njk", { tx }),
    },
  ];

  // Zod-bound, prose/label-only output; code recomputes per-category sums.
  return createStructured(messages, TransactionCategory, "transaction_category");
}
```

A `user_prompt.njk` then renders canonical objects with the `json` filter:

```njk
{# categorize/user_prompt.njk #}
Categorize the following transaction into one AccrualCategory.

Transaction:
{{ tx | json }}

Return only the category label and a one-line justification. Do not compute totals.
```

**Takeaways for us**

- Prompts are reviewable, diffable files — prompt changes show up in PRs.
- `throwOnUndefined` makes missing context a hard error, not a silent wrong
  answer (directly serves Sarah's "confident wrong answers" fear).
- One render helper, one env; `system`/`user` pair per step keeps Layer 1 and 2
  steps uniform and easy to test (render → assert string).

---

## Summary: what to lift, what to change

| Area | Lift as-is | Change for our PoC |
|------|------------|--------------------|
| **Env** | `env.ts` Zod parse + `prettifyError` + throw; `--env-file` scripts | Add `USE_FIXTURES` refine for the offline path |
| **OpenAI** | Single client module; `createChatInference`; throw on empty output | Use **`zodResponseFormat`/`.parse`** bound to `@repo/domain` instead of hand-written JSON Schema |
| **Prompts** | One Nunjucks env; `renderPrompt`; `.njk` files per feature; `throwOnUndefined`, `autoescape:false`, `json` filter | Prompt dirs named after our pipeline steps (classify/categorize/extract/draft) |

> Not copied (out of scope for this doc but present in the reference repo and
> worth a later look): the `usecases/` + `context.ts` dependency-injection
> pattern (one workflow module shared by CLI and MCP), the filesystem
> `*Store` classes, and the MCP `runTool` success/error envelope.
