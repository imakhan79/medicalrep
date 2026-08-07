import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VisitPlanner } from "./visit-planner"
import { StatusActions } from "./status-actions"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  escalated: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
}

export default async function TourPlanDetailPage(props: PageProps<"/tour-plans/[tourPlanId]">) {
  const { tourPlanId } = await props.params
  const supabase = await createClient()

  const { data: plan } = await supabase
    .from("tour_plans")
    .select("id, organization_id, title, period_start, period_end, notes, status, rep_id, territory_id, submitted_at, decided_at, decision_notes")
    .eq("id", tourPlanId)
    .maybeSingle()

  if (!plan) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: hcps }, { data: plannedVisits }, { data: events }, { data: canApprove }, { data: canReject }] =
    await Promise.all([
      supabase.from("hcps").select("id, first_name, last_name").order("last_name"),
      supabase.from("tour_plan_visits").select("id, hcp_id, planned_date, notes").eq("tour_plan_id", plan.id).order("planned_date"),
      supabase
        .from("approval_events")
        .select("action, actor_id, notes, created_at")
        .eq("entity_type", "tour_plan")
        .eq("entity_id", plan.id)
        .order("created_at"),
      supabase.rpc("can_access_row", {
        p_org_id: plan.organization_id,
        p_resource_key: "tour_plans",
        p_action: "approve",
        p_territory_id: plan.territory_id,
      }),
      supabase.rpc("can_access_row", {
        p_org_id: plan.organization_id,
        p_resource_key: "tour_plans",
        p_action: "reject",
        p_territory_id: plan.territory_id,
      }),
    ])

  const isOwner = user?.id === plan.rep_id
  const editable = plan.status === "draft" && isOwner

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{plan.title}</h1>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[plan.status] ?? ""}`}>
            {plan.status}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {plan.period_start} → {plan.period_end}
        </p>
        {plan.notes && <p className="text-sm mt-1">{plan.notes}</p>}
        {plan.decision_notes && (
          <p className="text-sm mt-1 italic text-muted-foreground">Decision notes: {plan.decision_notes}</p>
        )}
      </div>

      <VisitPlanner
        tourPlanId={plan.id}
        hcps={hcps ?? []}
        plannedVisits={plannedVisits ?? []}
        editable={editable}
      />

      <StatusActions
        tourPlanId={plan.id}
        status={plan.status}
        isOwner={isOwner}
        canApprove={Boolean(canApprove)}
        canReject={Boolean(canReject)}
      />

      <div>
        <h2 className="font-medium mb-2">History</h2>
        <ul className="divide-y rounded-md border text-sm" aria-label="Approval history">
          {events?.map((e, i) => (
            <li key={i} className="p-2 flex items-center justify-between">
              <span className="capitalize">{e.action}</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
          {events?.length === 0 && <li className="p-2 text-muted-foreground">No activity yet.</li>}
        </ul>
      </div>
    </div>
  )
}
