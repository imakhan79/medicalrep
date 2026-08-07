import { BarChart3, ClipboardList, Receipt, ShoppingCart, Target } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExportCsvButton } from "@/components/export-csv-button"

const EXPORT_LIMIT = 1000

export default async function ReportsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const { data: canView } = await supabase.rpc("can_access_row", {
    p_org_id: orgId,
    p_resource_key: "reports",
    p_action: "view",
  })

  if (!canView) {
    return <p className="text-muted-foreground text-sm">You don&apos;t have permission to view reports for this organization.</p>
  }

  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`

  const [
    { count: visitCount },
    { count: visitsThisMonth },
    { data: claims },
    { data: orders },
    { count: targetCount },
    { data: visitExport },
    { data: claimExport },
  ] = await Promise.all([
    supabase.from("visits").select("*", { count: "exact", head: true }),
    supabase.from("visits").select("*", { count: "exact", head: true }).gte("visited_at", monthStart),
    supabase.from("expense_claims").select("amount, status"),
    supabase.from("orders").select("status"),
    supabase.from("targets").select("*", { count: "exact", head: true }),
    supabase
      .from("visits")
      .select("visited_at, objective, hcps(first_name, last_name)")
      .order("visited_at", { ascending: false })
      .limit(EXPORT_LIMIT),
    supabase
      .from("expense_claims")
      .select("expense_date, category, amount, currency, status")
      .order("expense_date", { ascending: false })
      .limit(EXPORT_LIMIT),
  ])

  const claimRows = claims ?? []
  const totalClaimAmount = claimRows.reduce((sum, c) => sum + Number(c.amount), 0)
  const pendingClaims = claimRows.filter((c) => ["submitted", "escalated"].includes(c.status)).length

  const orderRows = orders ?? []
  const pendingOrders = orderRows.filter((o) => ["submitted", "escalated"].includes(o.status)).length

  const stats = [
    { label: "Total visits", value: visitCount ?? 0, icon: ClipboardList, accent: "var(--chart-1)" },
    { label: "Visits this month", value: visitsThisMonth ?? 0, icon: ClipboardList, accent: "var(--chart-2)" },
    { label: "Expense claims pending", value: pendingClaims, icon: Receipt, accent: "var(--chart-3)" },
    { label: "Orders pending", value: pendingOrders, icon: ShoppingCart, accent: "var(--chart-4)" },
    { label: "Active targets", value: targetCount ?? 0, icon: Target, accent: "var(--chart-5)" },
    { label: "Total claimed", value: totalClaimAmount.toLocaleString(), icon: BarChart3, accent: "var(--primary)" },
  ]

  const visitCsvRows = (visitExport ?? []).map((v) => ({
    date: new Date(v.visited_at).toLocaleDateString(),
    // @ts-expect-error -- joined relation shape from PostgREST
    hcp: `${v.hcps?.first_name ?? ""} ${v.hcps?.last_name ?? ""}`.trim(),
    objective: v.objective ?? "",
  }))

  const claimCsvRows = (claimExport ?? []).map((c) => ({
    date: c.expense_date,
    category: c.category,
    amount: Number(c.amount),
    currency: c.currency,
    status: c.status,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Reports"
        subtitle="Cross-module summary, scoped to what you can see — with CSV export."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="font-display text-3xl font-bold tracking-tight text-foreground tabular-nums mt-1">{stat.value}</p>
              </div>
              <div
                className="shrink-0 grid place-items-center size-10 rounded-lg"
                style={{ background: `color-mix(in oklch, ${stat.accent}, transparent 88%)`, color: stat.accent }}
              >
                <stat.icon className="size-5" aria-hidden />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <ExportCsvButton rows={visitCsvRows} filename="visits.csv" label={`Export visits (${visitCsvRows.length})`} />
          <ExportCsvButton rows={claimCsvRows} filename="expense-claims.csv" label={`Export expense claims (${claimCsvRows.length})`} />
        </CardContent>
      </Card>
    </div>
  )
}
