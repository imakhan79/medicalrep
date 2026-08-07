"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function DeleteAllocationButton({ allocationId }: { allocationId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm("Delete this allocation?")) return
    setBusy(true)
    const supabase = createClient()
    await supabase.from("sample_allocations").delete().eq("id", allocationId)
    setBusy(false)
    router.refresh()
  }

  return (
    <Button size="xs" variant="destructive" onClick={handleDelete} disabled={busy}>
      {busy ? "…" : "Delete"}
    </Button>
  )
}
