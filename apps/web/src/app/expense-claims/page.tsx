import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { NewClaimForm } from "./new-claim-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default async function ExpenseClaimsPage() {
  const supabase = await createClient()

  const { data: claims, error } = await supabase
    .from("expense_claims")
    .select("id, category, amount, currency, expense_date, status, description")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Expense Claims</h1>
        <p className="text-muted-foreground text-sm">
          Submit expenses for approval. Large claims route to a higher approval tier automatically.
        </p>
      </div>

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
        </CardContent>
      </Card>
    </div>
  )
}
