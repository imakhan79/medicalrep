import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StatusActions } from "./status-actions"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default async function ExpenseClaimDetailPage(props: PageProps<"/expense-claims/[claimId]">) {
  const { claimId } = await props.params
  const supabase = await createClient()

  const { data: claim } = await supabase
    .from("expense_claims")
    .select("id, organization_id, category, amount, currency, expense_date, description, status, rep_id, territory_id, submitted_at, decided_at, decision_notes")
    .eq("id", claimId)
    .maybeSingle()

  if (!claim) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: events }, { data: canApprove }, { data: canReject }, { data: approvalCondition }] =
    await Promise.all([
      supabase
        .from("approval_events")
        .select("action, actor_id, notes, created_at")
        .eq("entity_type", "expense_claim")
        .eq("entity_id", claim.id)
        .order("created_at"),
      supabase.rpc("can_access_row", {
        p_org_id: claim.organization_id,
        p_resource_key: "expense_claims",
        p_action: "approve",
        p_territory_id: claim.territory_id,
      }),
      supabase.rpc("can_access_row", {
        p_org_id: claim.organization_id,
        p_resource_key: "expense_claims",
        p_action: "reject",
        p_territory_id: claim.territory_id,
      }),
      supabase.rpc("permission_condition", {
        p_org_id: claim.organization_id,
        p_resource_key: "expense_claims",
        p_action: "approve",
      }),
    ])

  const isOwner = user?.id === claim.rep_id
  const approvalLimit =
    approvalCondition && typeof approvalCondition === "object" && "max_amount" in approvalCondition
      ? Number((approvalCondition as { max_amount: number }).max_amount)
      : null

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold capitalize">
            {claim.category} — {claim.currency} {Number(claim.amount).toLocaleString()}
          </h1>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[claim.status] ?? ""}`}>
            {claim.status}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{claim.expense_date}</p>
        {claim.description && <p className="text-sm mt-1">{claim.description}</p>}
        {claim.decision_notes && (
          <p className="text-sm mt-1 italic text-muted-foreground">Decision notes: {claim.decision_notes}</p>
        )}
      </div>

      <StatusActions
        claimId={claim.id}
        status={claim.status}
        isOwner={isOwner}
        canApprove={Boolean(canApprove)}
        canReject={Boolean(canReject)}
        approvalLimit={approvalLimit}
        amount={Number(claim.amount)}
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
