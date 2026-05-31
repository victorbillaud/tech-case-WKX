import nunjucks from "nunjucks";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatMoney, type Money } from "@repo/domain";

import { env } from "../env.js";

const apiRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const promptsDir = path.join(apiRoot, "src", "prompts");

const nunjucksEnv = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(promptsDir, {
    noCache: env.NODE_ENV === "development",
    watch: false,
  }),
  {
    autoescape: false,
    throwOnUndefined: true,
    trimBlocks: true,
    lstripBlocks: true,
  },
);

nunjucksEnv.addFilter("json", (value: unknown, spaces = 2) =>
  JSON.stringify(value, null, spaces),
);

nunjucksEnv.addFilter("oneLine", (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim(),
);

nunjucksEnv.addFilter("money", (value: unknown) =>
  typeof value === "number" ? formatMoney(value as Money) : String(value ?? ""),
);

export function renderPrompt(
  name: string,
  context?: Record<string, unknown>,
): string {
  return nunjucksEnv.render(name, context).replace(/\r\n/g, "\n").trim() + "\n";
}

export function getPromptsDir(): string {
  return promptsDir;
}
