import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@tattvix/ui/components/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { DayMovement } from "../metrics";

const config = {
  arrivals: { label: "Arrivals", color: "var(--chart-1)" },
  departures: { label: "Departures", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MovementChart({ data }: { data: DayMovement[] }) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <BarChart data={data} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} width={24} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltipContent />} />
        <Bar dataKey="arrivals" fill="var(--color-arrivals)" radius={3} maxBarSize={18} isAnimationActive={false} />
        <Bar dataKey="departures" fill="var(--color-departures)" radius={3} maxBarSize={18} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
