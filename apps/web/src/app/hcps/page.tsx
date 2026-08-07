import { Stethoscope } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { HcpCreateForm } from "./hcp-create-form"

const LIST_LIMIT = 200

export default async function HcpsPage() {
  const supabase = await createClient()
  const { data: hcps, error } = await supabase
    .from("hcps")
    .select("id, first_name, last_name, specialty, tier, consent_status")
    .order("last_name")
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Stethoscope}
        title="Healthcare Providers"
        subtitle="Doctors and HCPs visible to you, scoped by territory and role."
      />

      <HcpCreateForm />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load HCPs: {error.message}
        </p>
      )}

      <ul className="divide-y rounded-md border" aria-label="HCP list">
        {hcps?.map((hcp) => (
          <li key={hcp.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">
                {hcp.first_name} {hcp.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {hcp.specialty ?? "General"} · Tier {hcp.tier ?? "—"}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                hcp.consent_status === "granted"
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning"
              }`}
            >
              {hcp.consent_status}
            </span>
          </li>
        ))}
        {hcps?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No HCPs yet.</li>
        )}
      </ul>
      {hcps && hcps.length === LIST_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
        </p>
      )}
    </div>
  )
}
