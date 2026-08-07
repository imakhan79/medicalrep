"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DeleteRoleButton({ roleId, name }: { roleId: string; name: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm(`Delete the "${name}" role? This can't be undone.`)) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("roles").delete().eq("id", roleId)
    setBusy(false)
    if (deleteError) {
      setError(
        deleteError.message.includes("foreign key")
          ? "Can't delete — staff members are still assigned this role."
          : deleteError.message
      )
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <Button size="xs" variant="destructive" onClick={handleDelete} disabled={busy}>
        {busy ? "…" : "Delete"}
      </Button>
      {error && <span className="text-destructive text-xs max-w-48 text-right">{error}</span>}
    </div>
  )
}
