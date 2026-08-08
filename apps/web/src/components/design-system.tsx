import type { LucideIcon } from "lucide-react";
import { cn } from "@tattvix/ui/lib/utils";
import { Card } from "@tattvix/ui/components/card";
import { Button } from "@tattvix/ui/components/button";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="app-kicker">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p></div>{action}</header>;
}

export function Surface({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn("app-surface gap-0 py-0", className)}>{children}</Card>;
}

export function MetricCard({ icon: Icon, label, value, detail }: { icon: LucideIcon; label: string; value: string; detail: string }) {
  return <Surface className="flex items-center gap-4 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold tracking-tight">{value}</p><p className="truncate text-xs text-muted-foreground">{detail}</p></div></Surface>;
}

/**
 * Shared empty-state grammar: icon in a softly tinted square, a one-line
 * heading, a short explanation, and an optional single action. Use this
 * instead of hand-rolling the same icon+heading+description markup per
 * screen (see docs/design-system.md "Empty states").
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "muted",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "muted" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("grid place-items-center gap-4 p-8 text-center sm:p-12", className)}>
      <span
        className={cn(
          "grid size-12 place-items-center rounded-xl",
          tone === "accent" ? "bg-accent text-primary" : "bg-muted text-foreground",
        )}
      >
        <Icon className="size-6" />
      </span>
      <div className="max-w-md">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * Shared failed-query state for TanStack Router `errorComponent`s. Wired as
 * the router's `defaultErrorComponent` (see main.tsx) so a broken loader
 * anywhere in the app gets a designed retry screen instead of an unstyled
 * crash. Routes with a more specific failure mode (e.g. the public QR
 * landing page) can still set their own `errorComponent` to override this.
 */
export function RouteErrorState({
  error,
  reset,
  title = "This page could not load",
  description,
}: {
  error: unknown;
  reset: () => void;
  title?: string;
  description?: string;
}) {
  const queryClient = useQueryClient();
  const message =
    description ??
    (error instanceof ApiError
      ? error.message
      : "Check your connection, then try again.");

  function retry() {
    queryClient.invalidateQueries();
    reset();
  }

  return (
    <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
        <Button className="mt-6" onClick={retry}>
          <RefreshCw />
          Try again
        </Button>
      </div>
    </div>
  );
}
