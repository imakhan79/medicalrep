import Link from "next/link"
import { Receipt } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { NewClaimForm } from "./new-claim-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  escalated: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
}

const LIST_LIMIT = 200

export default async function ExpenseClaimsPage() {
  const supabase = await createClient()

  const { data: claims, error } = await supabase
    .from("expense_claims")
    .select("id, category, amount, currency, expense_date, status, description")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Receipt}
        title="Expense Claims"
        subtitle="Submit expenses for approval. Large claims route to a higher approval tier automatically."
      />

      <NewClaimForm />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load expense claims: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All claims</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Expense claims">
            {claims?.map((claim) => (
              <li key={claim.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <Link href={`/expense-claims/${claim.id}`} className="font-medium hover:underline capitalize">
                    {claim.category} — {claim.currency} {Number(claim.amount).toLocaleString()}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {claim.expense_date}
                    {claim.description ? ` · ${claim.description}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${STATUS_STYLES[claim.status] ?? ""}`}
                >
                  {claim.status}
                </span>
              </li>
            ))}
            {claims?.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">No expense claims yet.</li>
            )}
          </ul>
          {claims && claims.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
