"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DeleteTerritoryButton({ territoryId, name }: { territoryId: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`Delete territory "${name}"? This can't be undone.`)) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("territories").delete().eq("id", territoryId)
    setBusy(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="xs" variant="destructive" onClick={handleDelete} disabled={busy}>
        {busy ? "…" : "Delete"}
      </Button>
      {error && <span className="text-destructive text-xs">{error}</span>}
    </div>
  )
}
