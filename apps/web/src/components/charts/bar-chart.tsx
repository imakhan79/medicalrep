"use client"

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartTooltip } from "./chart-tooltip"

type Series = { key: string; label: string; color: string }

const axisTick = { fill: "var(--chart-muted)", fontSize: 12 }

/** Single-measure comparison across categories — no legend needed, the card title names the series. */
export function SimpleBarChart({
  data,
  dataKey,
  nameKey = "name",
  color = "var(--chart-1)",
  height = 260,
  layout = "horizontal",
  valueFormatter,
}: {
  data: Record<string, string | number>[]
  dataKey: string
  nameKey?: string
  color?: string
  height?: number
  layout?: "horizontal" | "vertical"
  valueFormatter?: (v: number) => string
}) {
  const vertical = layout === "vertical"
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart
        data={data}
        layout={vertical ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 12, bottom: 0, left: vertical ? 0 : -12 }}
        barCategoryGap="28%"
      >
        <CartesianGrid stroke="var(--chart-grid)" horizontal={!vertical} vertical={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" stroke="var(--chart-axis)" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
            <YAxis
              type="category"
              dataKey={nameKey}
              stroke="var(--chart-axis)"
              tick={axisTick}
              axisLine={false}
              tickLine={false}
              width={110}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={nameKey} stroke="var(--chart-axis)" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis stroke="var(--chart-axis)" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
          </>
        )}
        <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey={dataKey} fill={color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={32} />
      </RBarChart>
    </ResponsiveContainer>
  )
}

/** Multi-measure comparison (e.g. target vs. achieved) — legend + fixed-order categorical colors. */
export function GroupedBarChart({
  data,
  nameKey = "name",
  series,
  height = 260,
  valueFormatter,
}: {
  data: Record<string, string | number>[]
  nameKey?: string
  series: Series[]
  height?: number
  valueFormatter?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: -12 }} barCategoryGap="28%" barGap={4}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey={nameKey} stroke="var(--chart-axis)" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis stroke="var(--chart-axis)" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={valueFormatter} />
        <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)" }} />
        <Legend
          verticalAlign="top"
          align="right"
          height={32}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
        ))}
      </RBarChart>
    </ResponsiveContainer>
  )
}
