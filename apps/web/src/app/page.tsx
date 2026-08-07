import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ count: hcpCount }, { count: visitCount }, { count: todayCount }] =
    await Promise.all([
      supabase.from("hcps").select("*", { count: "exact", head: true }),
      supabase.from("visits").select("*", { count: "exact", head: true }),
      supabase
        .from("visits")
        .select("*", { count: "exact", head: true })
        .gte("visited_at", new Date().toISOString().slice(0, 10)),
    ])

  const stats = [
    { label: "HCPs in view", value: hcpCount ?? 0 },
    { label: "Total visits logged", value: visitCount ?? 0 },
    { label: "Visits today", value: todayCount ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Your coverage at a glance. Scoped to your role and territory.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
