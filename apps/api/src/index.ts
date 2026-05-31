import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { Period } from "@repo/domain";

import { env } from "./env.js";
import { ingestionRoutes } from "./ingestion/index.js";
import { reconciliationRoutes } from "./reconciliation/index.js";
import { verifyRoutes } from "./verify/index.js";
import { getPromptsDir, renderPrompt } from "./llm/index.js";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "close-assistant-api",
    env: env.NODE_ENV,
    periodExample: Period.parse("2025-12"),
    promptsDir: getPromptsDir(),
  });
});

app.get("/health/prompts", (c) => {
  const rendered = renderPrompt("classify/user_prompt.njk", {
    filename: "example.txt",
    mime: "text/plain",
    headChars: 1500,
    head: "From: user@example.com",
  });

  return c.text(rendered);
});

app.route("/", ingestionRoutes);
app.route("/", reconciliationRoutes);
app.route("/", verifyRoutes);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
