import { CalendarClock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { NewLeaveForm } from "./new-leave-form"
import { LeaveActions } from "./leave-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  escalated: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
}

const LIST_LIMIT = 200

export default async function LeavePage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: canCreate } = await supabase.rpc("can_access_row", {
    p_org_id: orgId,
    p_resource_key: "leave_requests",
    p_action: "create",
  })

  const { data: requests, error } = await supabase
    .from("leave_requests")
    .select("id, rep_id, territory_id, leave_type, start_date, end_date, reason, status, decision_notes")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  const territoryIds = Array.from(new Set((requests ?? []).map((r) => r.territory_id)))
  const permissionsByTerritory = new Map(
    await Promise.all(
      territoryIds.map(async (territoryId) => {
        const [{ data: canApprove }, { data: canReject }] = await Promise.all([
          supabase.rpc("can_access_row", {
            p_org_id: orgId,
            p_resource_key: "leave_requests",
            p_action: "approve",
            p_territory_id: territoryId,
          }),
          supabase.rpc("can_access_row", {
            p_org_id: orgId,
            p_resource_key: "leave_requests",
            p_action: "reject",
            p_territory_id: territoryId,
          }),
        ])
        return [territoryId, { canApprove: Boolean(canApprove), canReject: Boolean(canReject) }] as const
      })
    )
  )

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Leave Requests"
        subtitle="Request time off and route it for manager approval."
      />

      {canCreate && <NewLeaveForm orgId={orgId} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Leave requests">
            {requests?.map((r) => (
              <li key={r.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium capitalize">{r.leave_type} leave</p>
                    <p className="text-sm text-muted-foreground">
                      {r.start_date} → {r.end_date}
                      {r.reason ? ` · ${r.reason}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${STATUS_STYLES[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </div>
                <LeaveActions
                  leaveId={r.id}
                  status={r.status}
                  isOwner={user?.id === r.rep_id}
                  canApprove={permissionsByTerritory.get(r.territory_id)?.canApprove ?? false}
                  canReject={permissionsByTerritory.get(r.territory_id)?.canReject ?? false}
                />
              </li>
            ))}
            {requests?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No leave requests yet.</li>}
          </ul>
          {requests && requests.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
