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
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { ApiError } from "@/lib/api";
import { getInitials } from "@/lib/initials";

/**
 * Title (+ meta) on the left, actions on the right. On a phone the title
 * wraps rather than truncating (a hotel or organization name is the whole
 * point of the header) and the actions drop onto their own line and wrap,
 * so a header with several buttons never pushes the page sideways.
 */
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
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      {/* Titles wrap instead of truncating: long hotel names must stay readable on phones. */}
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="min-w-0 text-2xl leading-tight font-bold tracking-[-0.025em] wrap-anywhere md:text-[28px]">
          {title}
        </h1>
        {meta ? (
          <p className="min-w-0 text-sm text-subtle-foreground wrap-anywhere">{meta}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
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
    <div className="mx-auto grid min-h-[60svh] max-w-xl place-items-center px-5 text-center">
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

/**
 * One bordered strip of KPIs separated by dividers (never separate cards).
 * Below `lg` it wraps into a 2- or 3-column grid; every cell draws its own
 * right and bottom hairline and is pulled 1px outward, so the outer edges are
 * clipped by the strip's border and an odd count leaves a clean empty cell
 * instead of a floating number.
 */
export function KpiStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-border overflow-hidden rounded-card border border-border bg-card shadow-card max-lg:*:-mr-px max-lg:*:-mb-px max-lg:*:border-r max-lg:*:border-b max-lg:*:border-border-soft sm:grid-cols-3 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none lg:divide-x">
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
    <div className="min-w-0 p-4 sm:p-5">
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
        "overflow-hidden rounded-card border border-border bg-card shadow-card",
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
    // Wraps instead of truncating: below ~10rem for the title, actions drop to their own line.
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border-soft px-5 py-3">
      <div className="flex min-w-0 flex-[1_1_10rem] items-center gap-2">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
        <h2 className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{title}</h2>
        {meta ? <span className="shrink-0 text-sm text-subtle-foreground tabular-nums">{meta}</span> : null}
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

/**
 * A hotel photo (property cover or room type) that keeps its slot when the
 * hotel hasn't uploaded one: a quiet muted tile with a line icon, so photo-led
 * grids stay even. Photos are real hotel data only, never stock imagery.
 */
export function PhotoTile({
  url,
  icon: Icon,
  className,
  iconClassName,
}: {
  url?: string | null;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  return url ? (
    <img src={url} alt="" loading="lazy" decoding="async" className={cn("bg-muted object-cover", className)} />
  ) : (
    <div aria-hidden className={cn("grid place-items-center bg-muted text-subtle-foreground", className)}>
      <Icon className={cn("size-7", iconClassName)} strokeWidth={1.5} />
    </div>
  );
}

/**
 * Decorative photo strip under a guest-facing page header. Purely visual
 * (empty alt): it sets the mood, it never carries information.
 */
export function PageCover({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-muted", className)}>
      <img
        src={src}
        alt=""
        decoding="async"
        className="h-32 w-full object-cover sm:h-40"
      />
    </div>
  );
}

/** Initials in a neutral circle (people) or rounded square (places). We never store guest photos. */
const initialsAvatarSizes = {
  sm: "size-8 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
} as const;

export function InitialsAvatar({
  name,
  shape = "circle",
  size = "sm",
}: {
  name: string;
  shape?: "circle" | "square";
  size?: keyof typeof initialsAvatarSizes;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-muted font-semibold",
        initialsAvatarSizes[size],
        shape === "circle" ? "rounded-full" : "rounded-md text-muted-foreground",
      )}
    >
      {getInitials(name)}
    </span>
  );
}

/**
 * Hides row actions until the row is hovered or focused, but only on devices
 * with a fine pointer. Touch screens have no hover, so there the actions stay
 * visible instead of becoming invisible tap targets.
 */
export const rowActionsRevealClassName =
  "pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100";

/**
 * One list row: optional leading avatar/thumbnail, a title with an inline
 * status badge, a meta line, an optional trailing value, and optional
 * controls underneath. Long names wrap instead of being cut off, and
 * unbreakable strings (emails, slugs) break anywhere instead of pushing the
 * page sideways. Padding and dividers come from the container.
 */
export function ListRow({
  leading,
  title,
  badge,
  meta,
  trailing,
  children,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 text-sm font-medium wrap-anywhere">{title}</span>
            {badge}
          </div>
          {meta ? (
            <div className="mt-0.5 text-xs text-subtle-foreground tabular-nums wrap-anywhere">
              {meta}
            </div>
          ) : null}
        </div>
        {trailing ? (
          <div className="shrink-0 text-right text-sm tabular-nums">{trailing}</div>
        ) : null}
      </div>
      {children ? <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export type ResponsiveTableColumn<T> = {
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** CSS grid track, e.g. "80px" or "minmax(0,2fr)". Defaults to minmax(0,1fr). */
  width?: string;
  align?: "start" | "end";
  /** Keep the header for screen readers only (e.g. an actions column). */
  hideHeader?: boolean;
  className?: string;
};

export type ResponsiveTableRowProps = {
  className: string;
  style?: React.CSSProperties;
  role?: string;
  children: React.ReactNode;
};

/**
 * Container width at which the grid table replaces the stacked list. It is a
 * container query, not a viewport breakpoint: the same table can fill a page
 * on a laptop, sit beside an expanded sidebar on a tablet, or live in the
 * main column of a detail screen, and each needs its own switch point. Pick
 * the smallest size at which every column fits without sideways scrolling.
 * Class strings stay literal so Tailwind can see them.
 */
const tableSwitch = {
  lg: { table: "hidden @lg:block", list: "@lg:hidden" },
  xl: { table: "hidden @xl:block", list: "@xl:hidden" },
  "2xl": { table: "hidden @2xl:block", list: "@2xl:hidden" },
  "3xl": { table: "hidden @3xl:block", list: "@3xl:hidden" },
  "4xl": { table: "hidden @4xl:block", list: "@4xl:hidden" },
  "5xl": { table: "hidden @5xl:block", list: "@5xl:hidden" },
} as const;

/**
 * The one table pattern for staff and admin screens. A wide container gets a
 * dense grid table (muted header row, 44px rows, aligned columns). A narrow
 * one, a phone above all, gets a divided list where each record is a
 * `ListRow` from `mobileRow`, so nothing scrolls sideways and the facts that
 * matter stay readable. Printing always uses the table.
 *
 * Both layouts are in the DOM and switched with CSS: no JS media query, no
 * layout flash on load, and print works. The inactive one is
 * `display: none`, so assistive tech only meets one of them.
 *
 * `rowLink` makes the whole row the link, as the design system requires:
 * `rowLink={(stay, props) => <Link {...props} to="…" params={…} />}`.
 */
export function ResponsiveTable<T>({
  label,
  rows,
  getRowKey,
  columns,
  mobileRow,
  rowLink,
  rowFooter,
  switchAt = "2xl",
  rowClassName,
}: {
  label: string;
  rows: readonly T[];
  getRowKey: (row: T) => React.Key;
  columns: ResponsiveTableColumn<T>[];
  mobileRow: (row: T) => React.ReactNode;
  rowLink?: (row: T, props: ResponsiveTableRowProps) => React.ReactElement;
  /** Full-width content under a row in both layouts (e.g. a row error). */
  rowFooter?: (row: T) => React.ReactNode;
  switchAt?: keyof typeof tableSwitch;
  /** Extra classes for desktop rows, e.g. `min-h-[52px]` for ledgers. */
  rowClassName?: string;
}) {
  const gridTemplateColumns = columns
    .map((column) => column.width ?? "minmax(0,1fr)")
    .join(" ");
  const alignClassName = (column: ResponsiveTableColumn<T>) =>
    column.align === "end" ? "justify-self-end text-right" : undefined;
  const interactiveClassName = rowLink
    ? "hover:bg-muted/50 active:bg-muted/70 outline-none focus-visible:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    : undefined;

  return (
    <div className="@container">
      <div className={cn(tableSwitch[switchAt].table, "overflow-x-auto print:block")}>
        <div role="table" aria-label={label} className="text-sm">
          <div role="rowgroup">
            <div
              role="row"
              className="grid h-11 items-center gap-4 bg-muted px-5 text-xs text-subtle-foreground"
              style={{ gridTemplateColumns }}
            >
              {columns.map((column, index) => (
                <span key={index} role="columnheader" className={alignClassName(column)}>
                  {column.hideHeader ? <span className="sr-only">{column.header}</span> : column.header}
                </span>
              ))}
            </div>
          </div>
          <div role="rowgroup">
            {rows.map((row) => {
              const rowProps: ResponsiveTableRowProps = {
                role: "row",
                style: { gridTemplateColumns },
                className: cn(
                  "group grid min-h-11 items-center gap-4 px-5 py-2",
                  interactiveClassName,
                  rowClassName,
                ),
                children: columns.map((column, index) => (
                  <span
                    key={index}
                    role="cell"
                    className={cn("min-w-0", alignClassName(column), column.className)}
                  >
                    {column.cell(row)}
                  </span>
                )),
              };
              const footer = rowFooter?.(row);
              return (
                <div key={getRowKey(row)} className="border-t border-border-soft">
                  {rowLink ? rowLink(row, rowProps) : <div {...rowProps} />}
                  {footer ? <div className="px-5 pb-3">{footer}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ul aria-label={label} className={cn(tableSwitch[switchAt].list, "print:hidden")}>
        {rows.map((row) => {
          const itemProps: ResponsiveTableRowProps = {
            className: cn("group block px-5 py-3", interactiveClassName),
            children: mobileRow(row),
          };
          const footer = rowFooter?.(row);
          return (
            <li key={getRowKey(row)} className="border-t border-border-soft">
              {rowLink ? rowLink(row, itemProps) : <div {...itemProps} />}
              {footer ? <div className="px-5 pb-3">{footer}</div> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Filters above a list: stacked full-width controls on a phone, one wrapping
 * row from `sm` up. Give controls `sm:w-[…]` widths; on a phone they fill
 * the row.
 */
export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:flex sm:flex-wrap sm:items-end", className)}>
      {children}
    </div>
  );
}

/**
 * Large page title (30–34px) for top-level staff pages. On a phone it
 * collapses into a compact sticky bar once it scrolls out of view, the way
 * native apps do; from `md` up it is just a big heading under the top nav.
 */
export function LargeTitle({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    // Collapse once the title has passed under the 48px compact bar.
    const observer = new IntersectionObserver(
      ([entry]) => setCollapsed(!entry!.isIntersecting),
      { rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        className="large-title-bar sticky top-0 z-20 -mx-4 -mt-4 -mb-8 bg-background/95 backdrop-blur sm:-mx-8 md:hidden"
        data-collapsed={collapsed ? "" : undefined}
        aria-hidden
      >
        <div className="flex h-12 items-center justify-center px-14">
          <p className="large-title-bar-text truncate text-[15px] font-semibold">{title}</p>
        </div>
      </div>
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em] wrap-anywhere md:text-[34px]">
            {title}
          </h1>
          {meta ? <p className="mt-1.5 text-[15px] text-muted-foreground wrap-anywhere">{meta}</p> : null}
          <div ref={sentinel} aria-hidden className="h-px" />
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
    </>
  );
}

/** Section heading inside a page: 22px title, optional grey line and trailing action. */
export function SectionTitle({
  title,
  meta,
  action,
  className,
}: {
  title: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
        {meta ? <p className="mt-0.5 text-sm text-muted-foreground">{meta}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type BottomTabBarItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  /** Render the tab as a link (e.g. a router `Link`); otherwise it is a button. */
  render?: (props: { className: string; children: React.ReactNode; "aria-current"?: "page" }) => React.ReactElement;
  onClick?: () => void;
};

/**
 * Mobile bottom tab bar (below `md`): outline icons with labels, the active
 * tab teal with a filled icon. Pads itself above the home indicator. Pages
 * under it need `pb-[calc(var(--tab-bar-height)+env(safe-area-inset-bottom,0px)+24px)]`.
 */
export function BottomTabBar({ items, label }: { items: BottomTabBarItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      data-bottom-tab-bar=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pr-[env(safe-area-inset-right,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] backdrop-blur md:hidden"
    >
      <ul
        className="mx-auto grid h-(--tab-bar-height) max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const className = cn(
            "press grid h-full place-content-center justify-items-center gap-1 text-[11px] outline-none focus-visible:bg-muted",
            item.isActive ? "font-semibold text-primary" : "text-muted-foreground",
          );
          const children = (
            <>
              <Icon
                aria-hidden
                className="size-6"
                strokeWidth={item.isActive ? 2.1 : 1.6}
                fill={item.isActive ? "currentColor" : "none"}
                fillOpacity={item.isActive ? 0.16 : 0}
              />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </>
          );
          return (
            <li key={item.key} className="grid min-w-0">
              {item.render ? (
                item.render({ className, children, "aria-current": item.isActive ? "page" : undefined })
              ) : (
                <button
                  type="button"
                  className={className}
                  onClick={item.onClick}
                  aria-current={item.isActive ? "page" : undefined}
                >
                  {children}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
