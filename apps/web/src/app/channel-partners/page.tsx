import { Handshake } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { ChannelPartnerForm } from "./channel-partner-form"

const LIST_LIMIT = 200

export default async function ChannelPartnersPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  const [{ data: canCreate }, { data: canExport }] = orgId
    ? await Promise.all([
        supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "channel_partners", p_action: "create" }),
        supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "channel_partners", p_action: "export" }),
      ])
    : [{ data: false }, { data: false }]
  const { data: partners, error } = await supabase
    .from("channel_partners")
    .select("id, name, type, contact_phone, contact_email")
    .order("name")
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Handshake}
        title="Channel Partners"
        subtitle="Stockists, distributors, and pharmacies that place secondary sales orders."
      />

      {canCreate && <ChannelPartnerForm />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load channel partners: {error.message}
        </p>
      )}

      {canExport && (
        <div className="flex justify-end">
          <ExportCsvButton
            rows={(partners ?? []).map((p) => ({
              name: p.name,
              type: p.type,
              contact_phone: p.contact_phone,
              contact_email: p.contact_email,
            }))}
            filename="channel-partners.csv"
          />
        </div>
      )}

      <ul className="divide-y rounded-md border" aria-label="Channel partners">
        {partners?.map((p) => (
          <li key={p.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.contact_phone ?? p.contact_email ?? "No contact on file"}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
              {p.type}
            </span>
          </li>
        ))}
        {partners?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No channel partners yet.</li>
        )}
      </ul>
      {partners && partners.length === LIST_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
        </p>
      )}
    </div>
  )
}
