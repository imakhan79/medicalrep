import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TeamRow = {
  rep_id: string
  email: string
  visits_this_month: number
  visits_today: number
  total_hcps: number
  visited_hcps: number
  coverage_pct: number
}

function currentPeriodMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  const [{ count: hcpCount }, { count: visitCount }, { count: todayCount }] =
    await Promise.all([
      supabase.from("hcps").select("*", { count: "exact", head: true }),
      supabase.from("visits").select("*", { count: "exact", head: true }),
      supabase
        .from("visits")
        .select("*", { count: "exact", head: true })
        .gte("visited_at", new Date().toISOString().slice(0, 10)),
    ])

  const { data: team } = orgId
    ? await supabase.rpc("team_dashboard", { p_org_id: orgId, p_period_month: currentPeriodMonth() })
    : { data: null }

  const stats = [
    { label: "HCPs in view", value: hcpCount ?? 0 },
    { label: "Total visits logged", value: visitCount ?? 0 },
    { label: "Visits today", value: todayCount ?? 0 },
  ]

  const teamRows = (team as TeamRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <div
        className="relative overflow-hidden rounded-xl p-6 sm:p-8 text-primary-foreground flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, #5c1d1d 0%, #3d1414 60%, #35474d 140%)" }}
      >
        <div
          aria-hidden
          className="absolute -right-8 -bottom-12 size-40 rounded-full opacity-20"
          style={{ background: "#f2a93b" }}
        />
        <div className="bg-white rounded-md p-1.5 shrink-0 relative">
          <Image src="/zicon-logo.png" alt="Zicon Technology" width={88} height={36} />
        </div>
        <div className="relative">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-white/80 text-sm">
            Your coverage at a glance. Scoped to your role and territory.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-l-4" style={{ borderLeftColor: "#f2a93b" }}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-primary">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {teamRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {teamRows.length === 1 ? "My coverage this month" : "Team coverage this month"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th scope="col" className="text-left p-2 font-medium">Rep</th>
                    <th scope="col" className="text-left p-2 font-medium">Visits today</th>
                    <th scope="col" className="text-left p-2 font-medium">Visits this month</th>
                    <th scope="col" className="text-left p-2 font-medium">HCP coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row) => (
                    <tr key={row.rep_id} className="border-b last:border-0">
                      <td className="p-2">{row.email}</td>
                      <td className="p-2">{row.visits_today}</td>
                      <td className="p-2">{row.visits_this_month}</td>
                      <td className="p-2">
                        {row.visited_hcps}/{row.total_hcps} ({row.coverage_pct}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
