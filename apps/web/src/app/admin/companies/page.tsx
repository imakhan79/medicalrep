import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { NewCompanyForm } from "./new-company-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const LIST_LIMIT = 200

export default async function CompaniesPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  const { data: canCreate } = orgId
    ? await supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "organizations", p_action: "create" })
    : { data: false }
  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id, name, created_at")
    .order("created_at")
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Companies"
        subtitle="Platform-level tenant management. Only visible in full to Platform Owner / Super Admin."
      />

      {canCreate && <NewCompanyForm />}

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
          {orgs && orgs.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
