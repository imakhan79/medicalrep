import { createClient } from "@/lib/supabase/server"
import { HcpCreateForm } from "./hcp-create-form"

export default async function HcpsPage() {
  const supabase = await createClient()
  const { data: hcps, error } = await supabase
    .from("hcps")
    .select("id, first_name, last_name, specialty, tier, consent_status")
    .order("last_name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Healthcare Providers</h1>
        <p className="text-muted-foreground text-sm">
          Doctors and HCPs visible to you, scoped by territory and role.
        </p>
      </div>

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
                  ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
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
    </div>
  )
}
