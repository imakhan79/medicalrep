import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HcoForm } from "./hco-form"

const LIST_LIMIT = 200

export default async function HcosPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canEdit }, { data: canExport }, { data: hcos, error }, { data: territories }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "hcos", p_action: "edit" }),
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "hcos", p_action: "export" }),
    supabase
      .from("hcos")
      .select("id, name, type, address, territory_id, territories(name)")
      .order("name")
      .limit(LIST_LIMIT),
    supabase.from("territories").select("id, name").eq("organization_id", orgId).order("name"),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title="Healthcare Organizations"
        subtitle="Hospitals, clinics, and pharmacies that HCPs belong to."
      />

      {canEdit && <HcoForm orgId={orgId} territories={territories ?? []} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All HCOs</CardTitle>
          {canExport && (
            <ExportCsvButton
              rows={(hcos ?? []).map((h) => ({
                name: h.name,
                type: h.type,
                address: h.address,
                // @ts-expect-error -- joined relation shape from PostgREST
                territory: h.territories?.name ?? "",
              }))}
              filename="hcos.csv"
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Healthcare organizations">
            {hcos?.map((hco) => (
              <li key={hco.id} className="p-3">
                <p className="font-medium">
                  {hco.name}
                  {hco.type && <span className="text-muted-foreground font-normal"> · {hco.type}</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hco.address ?? "No address on file"}
                  {/* @ts-expect-error -- joined relation shape from PostgREST */}
                  {hco.territories?.name ? ` · ${hco.territories.name}` : ""}
                </p>
              </li>
            ))}
            {hcos?.length === 0 && <li className="p-3 text-sm text-muted-foreground">No HCOs yet.</li>}
          </ul>
          {hcos && hcos.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
