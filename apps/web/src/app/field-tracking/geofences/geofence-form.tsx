"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Territory = { id: string; name: string }

const ENTITY_TYPES = ["hcp", "hco", "office", "warehouse", "restricted", "other"] as const

export function GeofenceForm({ orgId, territories }: { orgId: string; territories: Territory[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>("office")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [radius, setRadius] = useState("200")
  const [territoryId, setTerritoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error: insertError } = await supabase.from("geofences").insert({
      organization_id: orgId,
      entity_type: entityType,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      radius_meters: Number(radius),
      territory_id: territoryId || null,
      created_by: user?.id ?? null,
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    setLatitude("")
    setLongitude("")
    setRadius("200")
    setTerritoryId("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New geofence</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-name">Name</Label>
            <Input id="geofence-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-type">Type</Label>
            <select
              id="geofence-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as (typeof ENTITY_TYPES)[number])}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-territory">Territory (optional)</Label>
            <select
              id="geofence-territory"
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
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-lat">Latitude</Label>
            <Input id="geofence-lat" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-lng">Longitude</Label>
            <Input id="geofence-lng" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="geofence-radius">Radius (m)</Label>
            <Input
              id="geofence-radius"
              type="number"
              min="25"
              max="5000"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={submitting} className="sm:w-fit">
            {submitting ? "Saving…" : "Add geofence"}
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
