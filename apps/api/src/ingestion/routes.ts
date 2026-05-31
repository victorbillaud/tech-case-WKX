import { Hono } from "hono";
import { z } from "zod";

import { DocType, Period } from "@repo/domain";

import { ingestPeriod, resolveClassifications } from "./service.js";
import {
  getStoreAccountDetail,
  getStoreDocument,
  listStoreDocuments,
  listStoreTransactions,
} from "./browse.js";
import { getIngestionReport } from "./store.js";
import type { RawFile } from "./types.js";

const ResolveBody = z.array(
  z.object({ docId: z.string(), docType: DocType.nullable() }),
);

export const ingestionRoutes = new Hono();

/** GET /periods/:period/ingestion — latest ingestion report (rehydrate UI). */
ingestionRoutes.get("/periods/:period/ingestion", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const report = getIngestionReport(period.data);
  if (!report) {
    return c.json({ error: `no ingested data for period ${period.data}` }, 404);
  }

  return c.json(report);
});

/** POST /periods/:period/ingest — multipart upload of many files. */
ingestionRoutes.post("/periods/:period/ingest", async (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const body = await c.req.parseBody({ all: true });
  const files: RawFile[] = [];
  for (const value of Object.values(body)) {
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item instanceof File) {
        files.push({
          filename: item.name,
          mime: item.type,
          text: await item.text(),
        });
      }
    }
  }

  if (files.length === 0) {
    return c.json({ error: "no files uploaded" }, 400);
  }

  const report = await ingestPeriod(period.data, files);
  return c.json(report);
});

/** POST /periods/:period/classify — resolve the human-fallback queue. */
ingestionRoutes.post("/periods/:period/classify", async (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const parsed = ResolveBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "body must be { docId, docType }[]" }, 400);
  }

  const result = resolveClassifications(period.data, parsed.data);
  if (!result) {
    return c.json({ error: `no ingested data for period ${period.data}` }, 404);
  }

  return c.json(result);
});

/** GET /periods/:period/store/transactions — canonical GL transactions. */
ingestionRoutes.get("/periods/:period/store/transactions", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const account = c.req.query("account");
  const txnPeriod = c.req.query("txnPeriod");
  const transactions = listStoreTransactions(
    period.data,
    account,
    txnPeriod ?? undefined,
  );

  if (!transactions) {
    return c.json({ error: `no ingested data for period ${period.data}` }, 404);
  }

  return c.json({ period: period.data, account: account ?? null, transactions });
});

/** GET /periods/:period/store/documents — classified supporting documents. */
ingestionRoutes.get("/periods/:period/store/documents", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const documents = listStoreDocuments(period.data);
  if (!documents) {
    return c.json({ error: `no ingested data for period ${period.data}` }, 404);
  }

  return c.json({ period: period.data, documents });
});

/** GET /periods/:period/store/documents/:docId — single document with full text. */
ingestionRoutes.get("/periods/:period/store/documents/:docId", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const docId = c.req.param("docId");
  const document = getStoreDocument(period.data, docId);
  if (!document) {
    return c.json(
      { error: `document ${docId} not found for period ${period.data}` },
      404,
    );
  }

  return c.json({ period: period.data, document });
});

/** GET /periods/:period/store/accounts/:account — account metadata and balances. */
ingestionRoutes.get("/periods/:period/store/accounts/:account", (c) => {
  const period = Period.safeParse(c.req.param("period"));
  if (!period.success) {
    return c.json({ error: "period must be YYYY-MM" }, 400);
  }

  const account = c.req.param("account");
  const detail = getStoreAccountDetail(period.data, account);
  if (!detail) {
    return c.json(
      { error: `account ${account} not found for period ${period.data}` },
      404,
    );
  }

  return c.json({ period: period.data, ...detail });
});
