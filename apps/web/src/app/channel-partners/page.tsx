import { createClient } from "@/lib/supabase/server"
import { ChannelPartnerForm } from "./channel-partner-form"

export default async function ChannelPartnersPage() {
  const supabase = await createClient()
  const { data: partners, error } = await supabase
    .from("channel_partners")
    .select("id, name, type, contact_phone, contact_email")
    .order("name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Channel Partners</h1>
        <p className="text-muted-foreground text-sm">
          Stockists, distributors, and pharmacies that place secondary sales orders.
        </p>
      </div>

      <ChannelPartnerForm />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load channel partners: {error.message}
        </p>
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
    </div>
  )
}
