"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AlertActions({ alertId, status }: { alertId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState<"acknowledge" | "resolve" | null>(null)

  async function transition(newStatus: "acknowledged" | "resolved") {
    setBusy(newStatus === "acknowledged" ? "acknowledge" : "resolve")
    const supabase = createClient()
    const patch: Record<string, unknown> = { status: newStatus }
    if (newStatus === "resolved") {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      patch.resolved_by = user?.id ?? null
      patch.resolved_at = new Date().toISOString()
    }
    await supabase.from("tracking_alerts").update(patch).eq("id", alertId)
    setBusy(null)
    router.refresh()
  }

  if (status === "resolved") return null

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {status === "open" && (
        <Button size="xs" variant="outline" onClick={() => transition("acknowledged")} disabled={busy !== null}>
          {busy === "acknowledge" ? "…" : "Acknowledge"}
        </Button>
      )}
      <Button size="xs" variant="outline" onClick={() => transition("resolved")} disabled={busy !== null}>
        {busy === "resolve" ? "…" : "Resolve"}
      </Button>
    </div>
  )
}
