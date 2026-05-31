import { Link, useMatchRoute } from "@tanstack/react-router";

import { Button } from "@repo/ui/components/button";
import { Separator } from "@repo/ui/components/separator";

const STEPS = [
  { to: "/periods/$period/ingest" as const, label: "Ingest" },
  { to: "/periods/$period/reconcile" as const, label: "Reconcile" },
  { to: "/periods/$period/review" as const, label: "Review" },
] as const;

export function WorkflowStepper({ period }: { period: string }) {
  const matchRoute = useMatchRoute();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {STEPS.map((step, index) => {
        const isActive = Boolean(
          matchRoute({ to: step.to, params: { period }, fuzzy: false }),
        );

        return (
          <div key={step.to} className="flex items-center gap-2">
            {index > 0 && (
              <Separator orientation="vertical" className="hidden h-6 sm:block" />
            )}
            <Button variant={isActive ? "default" : "outline"} size="sm" asChild>
              <Link to={step.to} params={{ period }}>
                {step.label}
              </Link>
            </Button>
          </div>
        );
      })}
    </nav>
  );
}
