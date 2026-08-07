import { Route } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ReplayClient } from "./replay-client"

export default async function RouteReplayPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const { data: members } = await supabase.rpc("list_org_members", { p_org_id: orgId })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Route}
        title="Route Replay & Planned vs. Actual"
        subtitle="Pick a rep and a date to replay their tracked movement and compare it against that day's tour plan."
      />
      <ReplayClient orgId={orgId} members={(members as { user_id: string; email: string }[]) ?? []} />
    </div>
  )
}
