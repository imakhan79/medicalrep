import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { NewTargetForm } from "./new-target-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type OrgMember = { user_id: string; email: string }

function currentPeriodMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export default async function TargetsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const periodMonth = currentPeriodMonth()
  const monthStart = periodMonth
  const nextMonth = new Date(periodMonth)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const monthEnd = nextMonth.toISOString().slice(0, 10)

  const [{ data: canCreate }, { data: targets, error }, { data: members }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "targets", p_action: "create" }),
    supabase
      .from("targets")
      .select("id, rep_id, metric_type, target_value, period_month, notes")
      .eq("period_month", periodMonth)
      .order("created_at", { ascending: false }),
    supabase.rpc("list_org_members", { p_org_id: orgId }),
  ])

  const repIds = [...new Set((targets ?? []).map((t) => t.rep_id))]
  const { data: visits } = repIds.length
    ? await supabase
        .from("visits")
        .select("rep_id")
        .in("rep_id", repIds)
        .gte("visited_at", monthStart)
        .lt("visited_at", monthEnd)
    : { data: [] as { rep_id: string }[] }

  const visitCounts = new Map<string, number>()
  for (const v of visits ?? []) {
    visitCounts.set(v.rep_id, (visitCounts.get(v.rep_id) ?? 0) + 1)
  }

  const memberList = (members as OrgMember[] | null) ?? []
  const emailFor = (userId: string) => memberList.find((m) => m.user_id === userId)?.email ?? userId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Targets</h1>
        <p className="text-muted-foreground text-sm">Monthly targets set top-down, with live achievement.</p>
      </div>

      {canCreate && <NewTargetForm orgId={orgId} periodMonth={periodMonth} members={memberList} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load targets: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{periodMonth.slice(0, 7)} targets</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Targets">
            {targets?.map((t) => {
              const achieved = t.metric_type === "visit_count" ? visitCounts.get(t.rep_id) ?? 0 : null
              const pct = achieved !== null ? Math.min(100, Math.round((achieved / Number(t.target_value)) * 100)) : null
              return (
                <li key={t.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span>
                      {emailFor(t.rep_id)} — {t.metric_type === "visit_count" ? "Visits" : "Sales"}: target{" "}
                      {Number(t.target_value).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      {achieved !== null ? `${achieved} achieved (${pct}%)` : "requires Orders module"}
                    </span>
                  </div>
                  {pct !== null && (
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full ${pct >= 100 ? "bg-teal-600" : "bg-amber-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
            {targets?.length === 0 && <li className="p-3 text-muted-foreground">No targets set for this month.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
