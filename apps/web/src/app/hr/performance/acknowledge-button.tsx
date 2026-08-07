"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function AcknowledgeButton({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    const supabase = createClient()
    await supabase
      .from("performance_reviews")
      .update({ status: "acknowledged", acknowledged_at: new Date().toISOString() })
      .eq("id", reviewId)
    setBusy(false)
    router.refresh()
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={busy}>
      Acknowledge
    </Button>
  )
}
