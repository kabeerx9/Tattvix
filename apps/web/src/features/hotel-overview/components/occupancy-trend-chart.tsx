import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@tattvix/ui/components/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { OccupancyTrend } from "../metrics";

const config = {
  occupancy: { label: "Occupancy", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function OccupancyTrendChart({ data }: { data: OccupancyTrend[] }) {
  return (
    <ChartContainer config={config} className="h-56 w-full">
      <AreaChart data={data}>
        <CartesianGrid vertical={false} stroke="var(--border-soft)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} width={40} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value}%`} />} />
        <Area name="Occupancy" dataKey="percent" fill="var(--color-occupancy)" fillOpacity={0.12} stroke="var(--color-occupancy)" strokeWidth={2} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
