import { Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { BackLink } from "@/components/back-link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrackingSettingsForm } from "./tracking-settings-form"

const DEFAULT_POLICY = {
  tracking_interval_seconds: 30,
  min_accuracy_meters: 100,
  max_plausible_speed_kmh: 180,
  stationary_alert_minutes: 60,
  offline_alert_minutes: 15,
  location_retention_days: 180,
}

export default async function TrackingSettingsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canConfigure }, { data: policy }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "field_tracking", p_action: "configure" }),
    supabase
      .from("tracking_policies")
      .select("tracking_interval_seconds, min_accuracy_meters, max_plausible_speed_kmh, stationary_alert_minutes, offline_alert_minutes, location_retention_days")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <BackLink href="/field-tracking" label="Back to live tracking" />
      <PageHeader
        icon={Settings}
        title="Tracking Settings"
        subtitle="Org-wide GPS check-in interval, accuracy, alert thresholds, and data retention."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policy</CardTitle>
        </CardHeader>
        <CardContent>
          {canConfigure ? (
            <TrackingSettingsForm orgId={orgId} policy={policy ?? DEFAULT_POLICY} />
          ) : (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have permission to configure tracking settings for this organization.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
