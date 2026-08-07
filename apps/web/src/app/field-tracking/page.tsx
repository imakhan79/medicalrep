import { Radar, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { TrackingControls } from "./tracking-controls"
import { LiveMap } from "./live-map"
import { AlertActions } from "./alert-actions"
import { SosActions } from "./sos-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function FieldTrackingPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const [{ data: canCreate }, { data: canEdit }, { data: locations }, { data: members }, { data: geofences }, { data: alerts }, { data: sosIncidents }] =
    await Promise.all([
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "field_tracking", p_action: "create" }),
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "field_tracking", p_action: "edit" }),
      supabase.from("live_locations").select("rep_id, latitude, longitude, status, recorded_at"),
      supabase.rpc("list_org_members", { p_org_id: orgId }),
      supabase.from("geofences").select("id, name, latitude, longitude, radius_meters"),
      supabase
        .from("tracking_alerts")
        .select("id, alert_type, severity, message, status, created_at")
        .in("status", ["open", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("sos_incidents")
        .select("id, rep_id, latitude, longitude, triggered_at, status")
        .in("status", ["open", "acknowledged"])
        .order("triggered_at", { ascending: false })
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-4" aria-hidden />
            Emergency SOS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="SOS incidents">
            {sosIncidents?.map((s) => (
              <li key={s.id} className="p-2 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="font-medium">{repEmails[s.rep_id] ?? s.rep_id}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(s.triggered_at).toLocaleString()}
                    {s.latitude != null && s.longitude != null ? ` · ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${
                      s.status === "acknowledged" ? "bg-warning-soft text-warning" : "bg-destructive-soft text-destructive"
                    }`}
                  >
                    {s.status}
                  </span>
                  {canEdit && <SosActions incidentId={s.id} status={s.status} />}
                </div>
              </li>
            ))}
            {sosIncidents?.length === 0 && <li className="p-2 text-muted-foreground">No active SOS incidents.</li>}
          </ul>
        </CardContent>
      </Card>

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
          <CardTitle className="text-base">Active alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Active tracking alerts">
            {alerts?.map((a) => (
              <li key={a.id} className="p-2 flex items-center justify-between gap-4 flex-wrap">
                <span>{a.message}</span>
                <div className="flex items-center gap-2">
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
                  <span className="text-xs px-2 py-1 rounded-full shrink-0 bg-muted text-muted-foreground capitalize">
                    {a.status}
                  </span>
                  {canEdit && <AlertActions alertId={a.id} status={a.status} />}
                </div>
              </li>
            ))}
            {alerts?.length === 0 && <li className="p-2 text-muted-foreground">No active alerts.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
