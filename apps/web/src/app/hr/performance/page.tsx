import { ClipboardCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { NewReviewForm } from "./new-review-form"
import { AcknowledgeButton } from "./acknowledge-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LIST_LIMIT = 200

export default async function PerformancePage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: members }, { data: reviews, error }, { data: canCreate }, { data: canExport }] = await Promise.all([
    supabase.rpc("list_org_members", { p_org_id: orgId }),
    supabase
      .from("performance_reviews")
      .select("id, rep_id, review_period, rating, strengths, improvements, status")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "performance_reviews", p_action: "create" }),
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "performance_reviews", p_action: "export" }),
  ])

  const memberList = (members as { user_id: string; email: string }[] | null) ?? []
  const emailFor = (id: string) => memberList.find((m) => m.user_id === id)?.email ?? id

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardCheck}
        title="Performance Reviews"
        subtitle="Manager-authored, employee-acknowledged."
      />

      {canCreate && <NewReviewForm orgId={orgId} members={memberList} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All reviews</CardTitle>
          {canExport && (
            <ExportCsvButton
              rows={(reviews ?? []).map((r) => ({
                rep: emailFor(r.rep_id),
                review_period: r.review_period,
                rating: r.rating,
                status: r.status,
              }))}
              filename="performance-reviews.csv"
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Performance reviews">
            {reviews?.map((r) => (
              <li key={r.id} className="p-3 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">
                    {emailFor(r.rep_id)} — {r.review_period} {r.rating ? `· ${r.rating}/5` : ""}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
                    {r.status}
                  </span>
                </div>
                {r.strengths && <p className="text-sm text-muted-foreground">Strengths: {r.strengths}</p>}
                {r.improvements && <p className="text-sm text-muted-foreground">Improvements: {r.improvements}</p>}
                {r.status === "submitted" && user?.id === r.rep_id && <AcknowledgeButton reviewId={r.id} />}
              </li>
            ))}
            {reviews?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No reviews yet.</li>}
          </ul>
          {reviews && reviews.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
