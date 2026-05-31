import { Hono } from "hono";

import { LintReport, Period } from "@repo/domain";

import { ndjsonStream } from "../utils/ndjson-stream.js";
import type { ReconcileProgressEvent } from "./progress.js";
import {
  reconcile,
  ReconcileError,
  redraft,
  TieOutError,
} from "./service.js";
import { getReconciliation } from "./store.js";

export const reconciliationRoutes = new Hono();

/** GET /periods/:period/accounts/:account/reconciliation — cached draft. */
reconciliationRoutes.get(
  "/periods/:period/accounts/:account/reconciliation",
  (c) => {
    const period = Period.safeParse(c.req.param("period"));
    if (!period.success) {
      return c.json({ error: "period must be YYYY-MM" }, 400);
    }

    const account = c.req.param("account");
    const recon = getReconciliation(period.data, account);
    if (!recon) {
      return c.json(
        {
          error: `no reconciliation for account ${account} in period ${period.data}`,
        },
        404,
      );
    }

    return c.json(recon);
  },
);

/** POST /periods/:period/accounts/:account/reconcile — run Layer 2 pipeline. */
reconciliationRoutes.post(
  "/periods/:period/accounts/:account/reconcile",
  async (c) => {
    const period = Period.safeParse(c.req.param("period"));
    if (!period.success) {
      return c.json({ error: "period must be YYYY-MM" }, 400);
    }

    const account = c.req.param("account");

    try {
      const recon = await reconcile(account, period.data);
      return c.json(recon);
    } catch (error) {
      if (error instanceof TieOutError || error instanceof ReconcileError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

/** POST /periods/:period/accounts/:account/reconcile/stream — NDJSON progress stream. */
reconciliationRoutes.post(
  "/periods/:period/accounts/:account/reconcile/stream",
  (c) => {
    const period = Period.safeParse(c.req.param("period"));
    if (!period.success) {
      return c.json({ error: "period must be YYYY-MM" }, 400);
    }

    const account = c.req.param("account");

    return ndjsonStream<ReconcileProgressEvent>(async (write) => {
      await reconcile(account, period.data, {
        onProgress: write,
      });
    });
  },
);

/** POST /periods/:period/accounts/:account/redraft — re-run draft step only. */
reconciliationRoutes.post(
  "/periods/:period/accounts/:account/redraft",
  async (c) => {
    const period = Period.safeParse(c.req.param("period"));
    if (!period.success) {
      return c.json({ error: "period must be YYYY-MM" }, 400);
    }

    const account = c.req.param("account");
    const parsed = LintReport.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "body must be a LintReport" }, 400);
    }

    try {
      const recon = await redraft(account, period.data, parsed.data);
      return c.json(recon);
    } catch (error) {
      if (error instanceof ReconcileError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);
