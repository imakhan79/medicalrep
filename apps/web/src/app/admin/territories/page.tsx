import { Map as MapIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TerritoryForm } from "./territory-form"
import { DeleteTerritoryButton } from "./delete-territory-button"

export default async function TerritoriesPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canEdit }, { data: territories, error }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "territories", p_action: "edit" }),
    supabase
      .from("territories")
      .select("id, name, parent_territory_id")
      .eq("organization_id", orgId)
      .order("name"),
  ])

  const nameById = new Map((territories ?? []).map((t) => [t.id, t.name]))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MapIcon}
        title="Territories"
        subtitle="The zone / region / area / territory hierarchy that scopes visibility across the whole platform."
      />

      {canEdit && <TerritoryForm orgId={orgId} territories={territories ?? []} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All territories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Territories">
            {territories?.map((t) => (
              <li key={t.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  {t.parent_territory_id && (
                    <p className="text-sm text-muted-foreground">
                      Under {nameById.get(t.parent_territory_id) ?? "—"}
                    </p>
                  )}
                </div>
                {canEdit && <DeleteTerritoryButton territoryId={t.id} name={t.name} />}
              </li>
            ))}
            {territories?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No territories yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
