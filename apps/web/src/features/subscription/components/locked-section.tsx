import type { LucideIcon } from "lucide-react";

import { Panel, PanelHeader } from "@/components/design-system";

/**
 * Stands in for a report the server refused with 402. The API never fakes
 * numbers; the blurred bars here are decoration, so nothing can be misread as
 * a real zero.
 */
export function LockedSection({
  title,
  icon,
  tiles = 3,
}: {
  title: string;
  icon?: LucideIcon;
  tiles?: number;
}) {
  return (
    <Panel>
      <PanelHeader title={title} icon={icon} />
      <div className="relative">
        <div
          aria-hidden
          className="grid grid-cols-3 gap-3 p-5 blur-sm select-none sm:p-6"
          style={{ gridTemplateColumns: `repeat(${tiles}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: tiles }, (_, index) => (
            <div key={index} className="grid gap-2">
              <div className="h-7 w-16 rounded bg-muted" />
              <div className="h-3 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
        <p className="absolute inset-0 grid place-items-center px-5 text-center text-sm text-muted-foreground">
          Reports resume once the subscription is active.
        </p>
      </div>
    </Panel>
  );
}
