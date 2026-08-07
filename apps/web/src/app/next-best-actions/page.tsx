import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

type Recommendation = {
  hcp_id: string
  hcp_name: string
  tier: string | null
  consent_status: string
  days_since_last_visit: number | null
  priority_score: number
  reasons: string[]
}

export default async function NextBestActionsPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const { data, error } = await supabase.rpc("next_best_actions", { p_org_id: orgId, p_limit: 15 })
  const recommendations = (data as Recommendation[] | null) ?? []
  const maxScore = Math.max(1, ...recommendations.map((r) => r.priority_score))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Next Best Actions</h1>
        <p className="text-muted-foreground text-sm">
          HCPs ranked by visit recency and account tier — a deterministic priority score,
          not a machine-learning prediction.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load recommendations: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended visits</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Recommended visits">
            {recommendations.map((r) => (
              <li key={r.hcp_id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {r.hcp_name}
                      {r.tier && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Tier {r.tier}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.days_since_last_visit === null
                        ? "Never visited"
                        : `Last visited ${r.days_since_last_visit} day${r.days_since_last_visit === 1 ? "" : "s"} ago`}
                    </p>
                  </div>
                  <Link href="/visits" className={buttonVariants({ size: "sm" })}>
                    Log visit
                  </Link>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-teal-600"
                    style={{ width: `${Math.round((r.priority_score / maxScore) * 100)}%` }}
                  />
                </div>
                {r.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.reasons.map((reason) => (
                      <span
                        key={reason}
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          reason.includes("Consent")
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {recommendations.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">
                No HCPs in view yet — add some on the HCPs page.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
