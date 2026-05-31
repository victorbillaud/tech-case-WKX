import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

import { PeriodLayout } from "./period-layout.js";
import { RootLayout } from "./root-layout.js";
import { DEFAULT_PERIOD } from "../shared/constants.js";
import { IngestPage } from "../routes/ingest-page.js";
import { ReconcilePage } from "../routes/reconcile-page.js";
import { ReviewPage } from "../routes/review-page.js";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({
      to: "/periods/$period/ingest",
      params: { period: DEFAULT_PERIOD },
    });
  },
});

const periodRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/periods/$period",
  component: PeriodLayout,
});

const ingestRoute = createRoute({
  getParentRoute: () => periodRoute,
  path: "/ingest",
  component: IngestPage,
});

const reconcileRoute = createRoute({
  getParentRoute: () => periodRoute,
  path: "/reconcile",
  component: ReconcilePage,
});

const reviewRoute = createRoute({
  getParentRoute: () => periodRoute,
  path: "/review",
  component: ReviewPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  periodRoute.addChildren([ingestRoute, reconcileRoute, reviewRoute]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
