import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ExpenseAnomaly = {
  claim_id: string
  rep_email: string
  category: string
  amount: number
  rep_avg_amount: number
  deviation_ratio: number
  reason: string
}

type SampleAnomaly = {
  rep_email: string
  product_name: string
  rep_avg_qty: number
  org_avg_qty: number
  deviation_ratio: number
  reason: string
}

export default async function AnomaliesPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const [expenseResult, sampleResult] = await Promise.all([
    supabase.rpc("expense_anomalies", { p_org_id: orgId }),
    supabase.rpc("sample_distribution_anomalies", { p_org_id: orgId }),
  ])

  const notAuthorized = expenseResult.error?.message.includes("Not authorized")

  if (notAuthorized) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Anomaly Detection</h1>
        <p className="text-muted-foreground text-sm">
          This compliance view is only available to roles with broader-than-own visibility
          (managers, finance, auditors) — not individual reps looking at their own data.
        </p>
      </div>
    )
  }

  const expenseAnomalies = (expenseResult.data as ExpenseAnomaly[] | null) ?? []
  const sampleAnomalies = (sampleResult.data as SampleAnomaly[] | null) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Anomaly Detection</h1>
        <p className="text-muted-foreground text-sm">
          Statistical outliers for compliance review — not fraud accusations. Deterministic
          thresholds (&gt;2x historical or peer average, minimum sample size 3), not a model.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expense claim outliers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Expense anomalies">
            {expenseAnomalies.map((a) => (
              <li key={a.claim_id} className="p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {a.rep_email} — {a.category}: {a.amount.toLocaleString()}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {a.deviation_ratio}x typical
                  </span>
                </div>
                <p className="text-muted-foreground">{a.reason}</p>
              </li>
            ))}
            {expenseAnomalies.length === 0 && (
              <li className="p-2 text-muted-foreground">No expense outliers detected.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample distribution outliers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Sample anomalies">
            {sampleAnomalies.map((a, i) => (
              <li key={i} className="p-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {a.rep_email} — {a.product_name}
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    {a.deviation_ratio}x peer average
                  </span>
                </div>
                <p className="text-muted-foreground">{a.reason}</p>
              </li>
            ))}
            {sampleAnomalies.length === 0 && (
              <li className="p-2 text-muted-foreground">No sample distribution outliers detected.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
