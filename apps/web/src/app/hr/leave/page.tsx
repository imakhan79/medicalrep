import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { NewLeaveForm } from "./new-leave-form"
import { LeaveActions } from "./leave-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default async function LeavePage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: requests, error } = await supabase
    .from("leave_requests")
    .select("id, rep_id, territory_id, leave_type, start_date, end_date, reason, status, decision_notes")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Leave Requests</h1>
        <p className="text-muted-foreground text-sm">Request time off and route it for manager approval.</p>
      </div>

      <NewLeaveForm orgId={orgId} />

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
                  organizationId={orgId}
                  territoryId={r.territory_id}
                  status={r.status}
                  isOwner={user?.id === r.rep_id}
                />
              </li>
            ))}
            {requests?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No leave requests yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
