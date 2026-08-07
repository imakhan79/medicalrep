import Image from "next/image"
import { Stethoscope, ClipboardList, CalendarCheck2, TrendingUp } from "lucide-react"
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

  const teamRows = (team as TeamRow[] | null) ?? []
  const avgCoverage = teamRows.length
    ? Math.round(teamRows.reduce((sum, r) => sum + r.coverage_pct, 0) / teamRows.length)
    : 0

  const stats = [
    { label: "HCPs in view", value: hcpCount ?? 0, icon: Stethoscope },
    { label: "Total visits logged", value: visitCount ?? 0, icon: ClipboardList },
    { label: "Visits today", value: todayCount ?? 0, icon: CalendarCheck2 },
    { label: "Avg. territory coverage", value: `${avgCoverage}%`, icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-8 sm:p-10 text-primary-foreground min-h-[220px] flex items-center">
        <Image
          src="/images/hero-healthcare.jpg"
          alt=""
          fill
          priority
          className="object-cover object-[center_20%]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(115deg, #602020 15%, rgba(60,20,20,0.94) 45%, rgba(53,71,77,0.55) 100%)" }}
        />
        <div
          aria-hidden
          className="absolute -right-16 -top-16 size-64 rounded-full opacity-[0.15]"
          style={{ background: "#f8b028" }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="bg-white rounded-lg p-2 shrink-0 w-fit shadow-[var(--shadow-lg)]">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={104} height={42} priority />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-1">
              Field Force Intelligence
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-white/75 text-sm mt-1.5 max-w-xl">
              Your coverage at a glance — territory-scoped in real time to your role.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-semibold tracking-tight text-foreground mt-1">{stat.value}</p>
              </div>
              <div className="shrink-0 grid place-items-center size-10 rounded-lg bg-primary-soft text-primary">
                <stat.icon className="size-5" aria-hidden />
              </div>
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
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-divider bg-muted/60">
                    <th scope="col" className="text-left p-3 font-medium text-muted-foreground">Rep</th>
                    <th scope="col" className="text-left p-3 font-medium text-muted-foreground">Visits today</th>
                    <th scope="col" className="text-left p-3 font-medium text-muted-foreground">Visits this month</th>
                    <th scope="col" className="text-left p-3 font-medium text-muted-foreground">HCP coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row) => (
                    <tr key={row.rep_id} className="border-b border-divider last:border-0 hover:bg-muted/40 transition-colors duration-150">
                      <td className="p-3 font-medium">{row.email}</td>
                      <td className="p-3">{row.visits_today}</td>
                      <td className="p-3">{row.visits_this_month}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums">
                            {row.visited_hcps}/{row.total_hcps}
                          </span>
                          <span className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, row.coverage_pct)}%` }}
                            />
                          </span>
                          <span className="text-muted-foreground text-xs">{row.coverage_pct}%</span>
                        </div>
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
