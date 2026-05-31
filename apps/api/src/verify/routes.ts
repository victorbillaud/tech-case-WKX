import { Hono } from "hono";

import { ApprovalInput, Period } from "@repo/domain";

import { ndjsonStream } from "../utils/ndjson-stream.js";
import type { VerifyProgressEvent } from "./progress.js";
import {
  approve,
  ApproveError,
  getLintReport,
  verifyWithCorrectionLoop,
  VerifyError,
} from "./service.js";

export const verifyRoutes = new Hono();

verifyRoutes.get("/periods/:period/accounts/:account/lint", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const account = c.req.param("account");
  const report = getLintReport(period.data, account);
  if (!report) {
    return c.json(
      { error: `no lint report for account ${account} in period ${period.data}` },
      404,
    );
  }

  return c.json(report);
});

verifyRoutes.post("/periods/:period/accounts/:account/verify", async (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const account = c.req.param("account");

  try {
    const { lintReport } = await verifyWithCorrectionLoop(account, period.data);
    return c.json(lintReport);
  } catch (error) {
    if (error instanceof VerifyError) {
      return c.json({ error: error.message }, 400);
    }
    throw error;
  }
});

verifyRoutes.post(
  "/periods/:period/accounts/:account/verify/stream",
  (c) => {
    const period = Period.safeParse(c.req.param("period"));
    if (!period.success) {
      return c.json({ error: "period must be YYYY-MM" }, 400);
    }

    const account = c.req.param("account");

    return ndjsonStream<VerifyProgressEvent>(async (write) => {
      await verifyWithCorrectionLoop(account, period.data, {
        onProgress: write,
      });
    });
  },
);

verifyRoutes.post("/periods/:period/accounts/:account/approve", async (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const account = c.req.param("account");
  const parsed = ApprovalInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "body must include reviewer, role, comments" }, 400);
  }

  try {
    const record = await approve(account, period.data, parsed.data);
    return c.json(record);
  } catch (error) {
    if (error instanceof VerifyError) {
      return c.json({ error: error.message }, 400);
    }
    if (error instanceof ApproveError) {
      return c.json({ error: error.message }, 403);
    }
    throw error;
  }
});
