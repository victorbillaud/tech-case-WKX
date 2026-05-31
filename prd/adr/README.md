# Architecture Decision Records

Each ADR captures **one decision**: its context, the choice, and the
consequences. Format is lightweight (MADR-ish). Status is one of
`proposed` / `accepted` / `superseded`.

| ID | Decision | Status |
|----|----------|--------|
| [0001](./0001-focus-option-a-recon-assistant.md) | Focus on Option A: reconciliation assistant | accepted |
| [0002](./0002-typescript-zod.md) | TypeScript + Zod for schemas & validation | accepted |
| [0003](./0003-canonical-data-model-as-contract.md) | A canonical data model is the contract between layers | accepted |
| [0004](./0004-deterministic-core-llm-narrative.md) | Deterministic core; LLM only writes prose | accepted |
| [0005](./0005-document-classification-pipeline.md) | Classify docs: OpenAI classifier returns type or null → human fallback | accepted |
| [0006](./0006-rules-linter-verifier.md) | Encode the 35+ rules as a deterministic linter | accepted |
| [0007](./0007-reference-based-linking.md) | Link docs ↔ transactions by shared references | accepted |
| [0008](./0008-poc-scope-single-account.md) | PoC scope: one account, end-to-end | accepted |
| [0009](./0009-money-as-integer-cents.md) | Represent money as integer cents | accepted |
| [0010](./0010-tech-stack-monorepo.md) | Tech stack: Turborepo + Hono API + OpenAI SDK + shared `@repo/domain` | accepted |
| [0011](./0011-layer2-orchestration.md) | Layer 2 orchestration: deterministic pipeline + bounded LLM calls | accepted |
| [0012](./0012-correction-loop-and-approval.md) | Layer 3: bounded correction loop (N=2) + recorded human approval | accepted |
