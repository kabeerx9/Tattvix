import type { LucideIcon } from "lucide-react";
import { cn } from "@tattvix/ui/lib/utils";
import { Button } from "@tattvix/ui/components/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@tattvix/ui/components/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api";

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="truncate text-[22px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {meta ? (
          <p className="truncate text-sm text-subtle-foreground">{meta}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
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
          tone === "accent" ? "bg-muted text-muted-foreground" : "bg-muted text-foreground",
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
 * Shared confirmation dialog for consequential actions (checkout, revoking
 * consent, removing access). Use this instead of `window.confirm` and
 * instead of hand-rolled inline confirm states, so destructive actions share
 * one interruption grammar. The dialog is controlled; `pending` disables
 * both buttons while the mutation runs.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep as is",
  onConfirm,
  pending = false,
  tone = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

/** One bordered strip of KPIs separated by vertical dividers (never separate cards). */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-border overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x">
      {children}
    </div>
  );
}

export function Kpi({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-tint text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 leading-tight">{label}</span>
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      {detail ? (
        <p className="mt-2 text-xs leading-relaxed text-subtle-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  icon: Icon,
  meta,
  actions,
}: {
  title: string;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border-soft px-5 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {meta ? <span className="text-sm text-subtle-foreground tabular-nums">{meta}</span> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** A section inside a Panel. Consecutive sections are divided by a soft hairline. */
export function PanelSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-border-soft px-5 py-5 [&+&]:border-t", className)}>
      {children}
    </div>
  );
}

/** Plain inline facts (label over value). No borders or cells. */
export function FactsRow({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-wrap gap-x-10 gap-y-4">{children}</dl>;
}

export function Fact({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-subtle-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium tabular-nums">
        {value}
        {detail ? (
          <span className="ml-1.5 font-normal text-subtle-foreground">{detail}</span>
        ) : null}
      </dd>
    </div>
  );
}

const statusPillTones = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-destructive-tint text-destructive",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof statusPillTones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusPillTones[tone],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
