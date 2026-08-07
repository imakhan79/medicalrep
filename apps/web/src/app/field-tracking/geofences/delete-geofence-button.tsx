"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DeleteGeofenceButton({ geofenceId, name }: { geofenceId: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete geofence "${name}"?`)) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from("geofences").delete().eq("id", geofenceId)
    setBusy(false)
    router.refresh()
  }

  return (
    <Button size="xs" variant="destructive" onClick={handleDelete} disabled={busy}>
      {busy ? "…" : "Delete"}
    </Button>
  )
}
