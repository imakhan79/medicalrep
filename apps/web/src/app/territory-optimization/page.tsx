import { Compass } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TerritoryRow = {
  territory_id: string
  territory_name: string
  rep_count: number
  hcp_count: number
  hcp_per_rep: number
  visits_this_month: number
  visited_hcps: number
  coverage_pct: number
  balance_flag: string
}

const FLAG_STYLES: Record<string, string> = {
  overloaded: "bg-destructive-soft text-destructive",
  underutilized: "bg-warning-soft text-warning",
  unassigned: "bg-destructive-soft text-destructive",
  no_activity: "bg-muted text-muted-foreground",
  balanced: "bg-success-soft text-success",
}

const FLAG_LABELS: Record<string, string> = {
  overloaded: "Overloaded — consider adding a rep",
  underutilized: "Underutilized — spare capacity",
  unassigned: "Unassigned — no rep covering this territory",
  no_activity: "No rep assigned",
  balanced: "Balanced",
}

export default async function TerritoryOptimizationPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const { data, error } = await supabase.rpc("territory_balance", { p_org_id: orgId })
  const rows = (data as TerritoryRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Compass}
        title="Territory Optimization"
        subtitle="HCP-per-rep load compared against the average across territories you can see — not a machine-learning model, a documented ratio (>30% above/below average)."
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Territory balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th scope="col" className="text-left p-2 font-medium">Territory</th>
                  <th scope="col" className="text-left p-2 font-medium">Reps</th>
                  <th scope="col" className="text-left p-2 font-medium">HCPs</th>
                  <th scope="col" className="text-left p-2 font-medium">HCPs/rep</th>
                  <th scope="col" className="text-left p-2 font-medium">Coverage this month</th>
                  <th scope="col" className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.territory_id} className="border-b last:border-0">
                    <td className="p-2 font-medium">{row.territory_name}</td>
                    <td className="p-2">{row.rep_count}</td>
                    <td className="p-2">{row.hcp_count}</td>
                    <td className="p-2">{row.hcp_per_rep}</td>
                    <td className="p-2">
                      {row.visited_hcps}/{row.hcp_count} ({row.coverage_pct}%)
                    </td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${FLAG_STYLES[row.balance_flag] ?? ""}`}>
                        {FLAG_LABELS[row.balance_flag] ?? row.balance_flag}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-3 text-muted-foreground">
                      No territories in view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
