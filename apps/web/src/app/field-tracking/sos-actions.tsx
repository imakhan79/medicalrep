"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function SosActions({ incidentId, status }: { incidentId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"acknowledge" | "resolve" | null>(null)

  async function acknowledge() {
    setBusy("acknowledge")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase
      .from("sos_incidents")
      .update({ status: "acknowledged", acknowledged_by: user?.id ?? null, acknowledged_at: new Date().toISOString() })
      .eq("id", incidentId)
    setBusy(null)
    router.refresh()
  }

  async function resolve() {
    const notes = window.prompt("Resolution notes (optional):")
    setBusy("resolve")
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase
      .from("sos_incidents")
      .update({
        status: "resolved",
        resolved_by: user?.id ?? null,
        resolved_at: new Date().toISOString(),
        resolution_notes: notes || null,
      })
      .eq("id", incidentId)
    setBusy(null)
    router.refresh()
  }

  if (status === "resolved") return null

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {status === "open" && (
        <Button size="xs" variant="outline" onClick={acknowledge} disabled={busy !== null}>
          {busy === "acknowledge" ? "…" : "Acknowledge"}
        </Button>
      )}
      <Button size="xs" variant="destructive" onClick={resolve} disabled={busy !== null}>
        {busy === "resolve" ? "…" : "Resolve"}
      </Button>
    </div>
  )
}
