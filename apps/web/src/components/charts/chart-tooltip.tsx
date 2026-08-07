"use client"

import type { TooltipContentProps } from "recharts"
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent"

export function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-[var(--shadow-md)] text-xs">
      {label !== undefined && <p className="font-medium text-foreground mb-1">{label}</p>}
      <div className="grid gap-1">
        {payload.map((entry) => (
          <div key={entry.dataKey as string} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 rounded-full shrink-0"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium tabular-nums text-foreground">
              {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
