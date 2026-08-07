"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = { user_id: string; email: string }

export function NewTargetForm({
  orgId,
  periodMonth,
  members,
}: {
  orgId: string
  periodMonth: string
  members: Member[]
}) {
  const router = useRouter()
  const [repId, setRepId] = useState(members[0]?.user_id ?? "")
  const [metricType, setMetricType] = useState<"visit_count" | "sales_amount">("visit_count")
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from("targets").insert({
      organization_id: orgId,
      rep_id: repId,
      metric_type: metricType,
      period_month: periodMonth,
      target_value: Number(value),
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setValue("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Set target ({periodMonth.slice(0, 7)})</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="target-rep">Rep</Label>
            <select
              id="target-rep"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="target-metric">Metric</Label>
            <select
              id="target-metric"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as "visit_count" | "sales_amount")}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              <option value="visit_count">Visit count</option>
              <option value="sales_amount">Sales amount</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="target-value">Target value</Label>
            <Input id="target-value" type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting || !repId}>
            {submitting ? "Saving…" : "Set target"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
