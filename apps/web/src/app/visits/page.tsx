import { ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { VisitCheckinForm } from "./visit-checkin-form"

const LIST_LIMIT = 50

export default async function VisitsPage() {
  const supabase = await createClient()
  const { data: hcps } = await supabase
    .from("hcps")
    .select("id, first_name, last_name")
    .order("last_name")

  const { data: products } = await supabase.from("products").select("id, name").order("name")

  const { data: visits, error } = await supabase
    .from("visits")
    .select("id, hcp_id, visited_at, objective, outcome_notes, hcps(first_name, last_name)")
    .order("visited_at", { ascending: false })
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ClipboardList}
        title="Daily Call Reports"
        subtitle="Log a visit — works offline and syncs automatically when you're back online."
      />

      <VisitCheckinForm hcps={hcps ?? []} products={products ?? []} />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load visits: {error.message}
        </p>
      )}

      <ul className="divide-y rounded-md border" aria-label="Visit history">
        {visits?.map((visit) => (
          <li key={visit.id} className="p-4">
            <p className="font-medium">
              {/* @ts-expect-error -- joined relation shape from PostgREST */}
              {visit.hcps?.first_name} {visit.hcps?.last_name}
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                {new Date(visit.visited_at).toLocaleString()}
              </span>
            </p>
            {visit.objective && (
              <p className="text-sm text-muted-foreground">{visit.objective}</p>
            )}
          </li>
        ))}
        {visits?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No visits logged yet.</li>
        )}
      </ul>
      {visits && visits.length === LIST_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
        </p>
      )}
    </div>
  )
}
