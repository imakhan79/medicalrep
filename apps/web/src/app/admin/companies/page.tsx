import { createClient } from "@/lib/supabase/server"
import { NewCompanyForm } from "./new-company-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: orgs, error } = await supabase.from("organizations").select("id, name, created_at").order("created_at")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Companies</h1>
        <p className="text-muted-foreground text-sm">
          Platform-level tenant management. Only visible in full to Platform Owner / Super Admin.
        </p>
      </div>

      <NewCompanyForm />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Companies">
            {orgs?.map((org) => (
              <li key={org.id} className="p-3">
                <p className="font-medium">{org.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(org.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
            {orgs?.length === 0 && <li className="p-3 text-muted-foreground">No companies visible.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
