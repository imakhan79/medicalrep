import { Radar } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { TrackingControls } from "./tracking-controls"
import { LiveMap } from "./live-map"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function FieldTrackingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const [{ data: canCreate }, { data: locations }, { data: members }, { data: geofences }, { data: alerts }] =
    await Promise.all([
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "field_tracking", p_action: "create" }),
      supabase.from("live_locations").select("rep_id, latitude, longitude, status, recorded_at"),
      supabase.rpc("list_org_members", { p_org_id: orgId }),
      supabase.from("geofences").select("id, name, latitude, longitude, radius_meters"),
      supabase
        .from("tracking_alerts")
        .select("id, alert_type, severity, message, status, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20),
    ])

  const repEmails = Object.fromEntries(
    ((members as { user_id: string; email: string }[] | null) ?? []).map((m) => [m.user_id, m.email])
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Radar}
        title="Field Force Live Tracking"
        subtitle="Real-time GPS, geofenced visit detection, and alerts — scoped to your role and territory."
      />

      {canCreate && <TrackingControls />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live map</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveMap initialLocations={locations ?? []} repEmails={repEmails} geofences={geofences ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Open tracking alerts">
            {alerts?.map((a) => (
              <li key={a.id} className="p-2 flex items-center justify-between gap-4">
                <span>{a.message}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 ${
                    a.severity === "critical"
                      ? "bg-destructive-soft text-destructive"
                      : a.severity === "warning"
                        ? "bg-warning-soft text-warning"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {a.alert_type}
                </span>
              </li>
            ))}
            {alerts?.length === 0 && <li className="p-2 text-muted-foreground">No open alerts.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
