"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentOrgId } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Territory = { id: string; name: string }

export function NewTourPlanForm({ territories }: { territories: Territory[] }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [territoryId, setTerritoryId] = useState(territories[0]?.id ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!orgId || !user) {
      setError("Sign in with an organization membership to create a tour plan.")
      setSubmitting(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from("tour_plans")
      .insert({
        organization_id: orgId,
        rep_id: user.id,
        territory_id: territoryId || null,
        title,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .select("id")
      .single()

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.push(`/tour-plans/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New tour plan</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5 sm:items-end">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="tp-title">Title</Label>
            <Input id="tp-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tp-start">Period start</Label>
            <Input id="tp-start" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tp-end">Period end</Label>
            <Input id="tp-end" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tp-territory">Territory</Label>
            <select
              id="tp-territory"
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              <option value="">None</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create draft"}
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
