"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Policy = {
  tracking_interval_seconds: number
  min_accuracy_meters: number
  max_plausible_speed_kmh: number
  stationary_alert_minutes: number
  offline_alert_minutes: number
  location_retention_days: number
}

export function TrackingSettingsForm({ orgId, policy }: { orgId: string; policy: Policy }) {
  const router = useRouter()
  const [values, setValues] = useState(policy)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function field(key: keyof Policy) {
    return {
      value: values[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setSaved(false)
        setValues((v) => ({ ...v, [key]: Number(e.target.value) }))
      },
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: upsertError } = await supabase
      .from("tracking_policies")
      .upsert(
        { organization_id: orgId, ...values, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
        { onConflict: "organization_id" }
      )
    setSubmitting(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    setSaved(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3">
      <div className="grid gap-1.5">
        <Label htmlFor="interval">Check-in interval (seconds)</Label>
        <Input id="interval" type="number" min="10" {...field("tracking_interval_seconds")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="accuracy">Min GPS accuracy (meters)</Label>
        <Input id="accuracy" type="number" min="1" {...field("min_accuracy_meters")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="speed">Max plausible speed (km/h)</Label>
        <Input id="speed" type="number" min="1" {...field("max_plausible_speed_kmh")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="stationary">Stationary alert (minutes)</Label>
        <Input id="stationary" type="number" min="1" {...field("stationary_alert_minutes")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="offline">Offline alert (minutes)</Label>
        <Input id="offline" type="number" min="1" {...field("offline_alert_minutes")} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="retention">Location retention (days)</Label>
        <Input id="retention" type="number" min="1" {...field("location_retention_days")} />
      </div>
      <div className="sm:col-span-3 flex items-center gap-3">
        <Button type="submit" disabled={submitting} className="w-fit">
          {submitting ? "Saving…" : "Save settings"}
        </Button>
        {saved && <span className="text-sm text-success">Saved.</span>}
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  )
}
