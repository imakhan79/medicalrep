"use client"

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { ChartTooltip } from "./chart-tooltip"

type Slice = { key: string; label: string; value: number; color: string }

/** Status breakdown (fixed status colors, never categorical hues) with a hero total in the center. */
export function StatusDonutChart({ data, height = 220 }: { data: Slice[]; height?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
          >
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={ChartTooltip} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 top-[38%] -translate-y-1/2 text-center pointer-events-none">
        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{total}</p>
        <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Total</p>
      </div>
    </div>
  )
}
