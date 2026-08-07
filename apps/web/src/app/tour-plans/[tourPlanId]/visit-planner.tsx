"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Hcp = { id: string; first_name: string; last_name: string }
type PlannedVisit = { id: string; hcp_id: string; planned_date: string; notes: string | null }

export function VisitPlanner({
  tourPlanId,
  hcps,
  plannedVisits,
  editable,
}: {
  tourPlanId: string
  hcps: Hcp[]
  plannedVisits: PlannedVisit[]
  editable: boolean
}) {
  const router = useRouter()
  const [hcpId, setHcpId] = useState(hcps[0]?.id ?? "")
  const [date, setDate] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hcpName = (id: string) => {
    const h = hcps.find((h) => h.id === id)
    return h ? `${h.first_name} ${h.last_name}` : "Unknown HCP"
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!hcpId || !date) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from("tour_plan_visits")
      .insert({ tour_plan_id: tourPlanId, hcp_id: hcpId, planned_date: date })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setDate("")
    router.refresh()
  }

  async function handleRemove(id: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("tour_plan_visits").delete().eq("id", id)
    setBusy(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <h2 className="font-medium">Planned visits</h2>
      <ul className="divide-y rounded-md border" aria-label="Planned visits">
        {plannedVisits.map((v) => (
          <li key={v.id} className="p-2 flex items-center justify-between text-sm">
            <span>
              {hcpName(v.hcp_id)} — {v.planned_date}
            </span>
            {editable && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRemove(v.id)}>
                Remove
              </Button>
            )}
          </li>
        ))}
        {plannedVisits.length === 0 && (
          <li className="p-2 text-sm text-muted-foreground">No visits planned yet.</li>
        )}
      </ul>

      {editable && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <select
            aria-label="HCP"
            value={hcpId}
            onChange={(e) => setHcpId(e.target.value)}
            className="border rounded-md h-9 px-3 text-sm bg-background"
          >
            {hcps.map((h) => (
              <option key={h.id} value={h.id}>
                {h.first_name} {h.last_name}
              </option>
            ))}
          </select>
          <Input
            aria-label="Planned date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-auto"
          />
          <Button type="submit" size="sm" disabled={busy || !hcpId}>
            Add visit
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
