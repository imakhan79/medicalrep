import Link from "next/link"
import { Map } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { NewTourPlanForm } from "./new-tour-plan-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  escalated: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
}

const LIST_LIMIT = 200

export default async function TourPlansPage() {
  const supabase = await createClient()

  const { data: territories } = await supabase.from("territories").select("id, name").order("name")

  const { data: plans, error } = await supabase
    .from("tour_plans")
    .select("id, title, period_start, period_end, status, rep_id, territory_id")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Map}
        title="Tour Plans"
        subtitle="Plan visits ahead of time and route them for manager approval."
      />

      <NewTourPlanForm territories={territories ?? []} />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load tour plans: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All tour plans</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Tour plans">
            {plans?.map((plan) => (
              <li key={plan.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <Link href={`/tour-plans/${plan.id}`} className="font-medium hover:underline">
                    {plan.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {plan.period_start} → {plan.period_end}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${STATUS_STYLES[plan.status] ?? ""}`}
                >
                  {plan.status}
                </span>
              </li>
            ))}
            {plans?.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">No tour plans yet.</li>
            )}
          </ul>
          {plans && plans.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
