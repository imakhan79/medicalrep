"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TargetActions({
  targetId,
  targetValue,
  canEdit,
  canDelete,
}: {
  targetId: string
  targetValue: number
  canEdit: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(targetValue))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("targets")
      .update({ target_value: Number(value), updated_at: new Date().toISOString() })
      .eq("id", targetId)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm("Delete this target?")) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from("targets").delete().eq("id", targetId)
    setBusy(false)
    router.refresh()
  }

  if (!canEdit && !canDelete) return null

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <Input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 w-28 text-xs"
        />
        <Button size="xs" onClick={handleSave} disabled={busy}>
          {busy ? "…" : "Save"}
        </Button>
        <Button size="xs" variant="outline" onClick={() => setEditing(false)} disabled={busy}>
          Cancel
        </Button>
        {error && <span className="text-destructive text-xs">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      {canEdit && (
        <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
          Edit
        </Button>
      )}
      {canDelete && (
        <Button size="xs" variant="destructive" onClick={handleDelete} disabled={busy}>
          {busy ? "…" : "Delete"}
        </Button>
      )}
    </div>
  )
}
