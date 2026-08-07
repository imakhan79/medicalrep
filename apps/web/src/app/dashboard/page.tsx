import Image from "next/image"
import { Stethoscope, ClipboardList, CalendarCheck2, TrendingUp, Radio } from "lucide-react"
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
      <div
        className="relative overflow-hidden rounded-2xl min-h-[300px] sm:min-h-[340px] flex flex-col justify-between text-primary-foreground animate-fade-up"
        style={{
          background:
            "radial-gradient(120% 140% at 12% 0%, #7a2b2b 0%, #602020 32%, #3d1515 62%, #26343a 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -right-20 -top-20 size-72 rounded-full opacity-[0.2] blur-[1px] animate-float-slow"
          style={{ background: "radial-gradient(circle, #f8b028 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: "linear-gradient(to top, rgba(23,20,15,0.35), transparent)" }}
        />

        <div className="relative p-8 sm:p-10 pb-4 flex flex-col sm:flex-row sm:items-center gap-6">
          <div className="bg-white rounded-lg p-2.5 shrink-0 w-fit shadow-[var(--shadow-lg)]">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={120} height={48} priority />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-white/85 mb-2">
              <Radio className="size-3 animate-pulse" aria-hidden />
              Live Field Force Intelligence
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-white/80 text-sm sm:text-base mt-2 max-w-xl">
              Your coverage at a glance — territory-scoped in real time to your role.
            </p>
          </div>
        </div>

        <div className="relative px-8 sm:px-10 pb-7 sm:pb-8 flex flex-wrap gap-x-8 gap-y-3">
          {stats.slice(0, 3).map((stat) => (
            <div key={stat.label} className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight">{stat.value}</span>
              <span className="text-xs sm:text-sm text-white/70">{stat.label}</span>
            </div>
          ))}
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
