import { Outlet, useParams } from "@tanstack/react-router";

import { Separator } from "@repo/ui/components/separator";

import { WorkflowStepper } from "./stepper.js";

export function PeriodLayout() {
  const { period } = useParams({ from: "/periods/$period" });

  return (
    <div className="mx-auto flex min-h-svh max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Month-end close
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Account 24100 · {period}
        </h1>
      </header>

      <WorkflowStepper period={period} />
      <Separator />
      <Outlet />
    </div>
  );
}
