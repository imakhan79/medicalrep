import { MapPinned } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { BackLink } from "@/components/back-link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GeofenceForm } from "./geofence-form"
import { DeleteGeofenceButton } from "./delete-geofence-button"

export default async function GeofencesPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canConfigure }, { data: geofences, error }, { data: territories }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "field_tracking", p_action: "configure" }),
    supabase
      .from("geofences")
      .select("id, name, entity_type, latitude, longitude, radius_meters, territory_id, territories(name)")
      .order("name"),
    supabase.from("territories").select("id, name").eq("organization_id", orgId).order("name"),
  ])

  return (
    <div className="space-y-6">
      <BackLink href="/field-tracking" label="Back to live tracking" />
      <PageHeader
        icon={MapPinned}
        title="Geofences"
        subtitle="Zones used for automatic visit detection and territory-deviation alerts."
      />

      {canConfigure && <GeofenceForm orgId={orgId} territories={territories ?? []} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All geofences</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Geofences">
            {geofences?.map((g) => (
              <li key={g.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {g.name} <span className="text-muted-foreground font-normal capitalize">· {g.entity_type}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {g.latitude.toFixed(4)}, {g.longitude.toFixed(4)} · {g.radius_meters}m radius
                    {/* @ts-expect-error -- joined relation shape from PostgREST */}
                    {g.territories?.name ? ` · ${g.territories.name}` : ""}
                  </p>
                </div>
                {canConfigure && <DeleteGeofenceButton geofenceId={g.id} name={g.name} />}
              </li>
            ))}
            {geofences?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No geofences defined yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
