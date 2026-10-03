import { ChartContainer, type ChartConfig } from "@tattvix/ui/components/chart";
import { Cell, Pie, PieChart } from "recharts";

import type { RoomStats } from "../metrics";

const config = {
  occupied: { label: "Occupied", color: "var(--chart-1)" },
  vacant: { label: "Vacant", color: "var(--chart-4)" },
  cleaning: { label: "Cleaning", color: "var(--chart-3)" },
  maintenance: { label: "Maintenance", color: "var(--chart-5)" },
} satisfies ChartConfig;

const keys = ["occupied", "vacant", "cleaning", "maintenance"] as const;

export function RoomStatusChart({ stats }: { stats: RoomStats }) {
  const data = keys.map((key) => ({ key, value: stats[key] }));
  return (
    <div className="@container">
      <div className="grid items-center gap-6 @sm:grid-cols-[160px_1fr]">
      <div className="relative mx-auto size-40">
        <ChartContainer config={config} className="aspect-square size-40">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={52} outerRadius={72} strokeWidth={2} isAnimationActive={false}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={`var(--color-${entry.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-2xl font-semibold tabular-nums">{stats.active}</span>
          <span className="text-xs text-subtle-foreground">active rooms</span>
        </div>
      </div>
      <ul className="grid gap-2.5 text-sm">
        {keys.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: config[key].color }} aria-hidden />
            <span className="flex-1 text-muted-foreground">{config[key].label}</span>
            <span className="font-medium tabular-nums">{stats[key]}</span>
            <span className="w-10 text-right text-xs text-subtle-foreground tabular-nums">
              {stats.active ? Math.round((stats[key] / stats.active) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}
