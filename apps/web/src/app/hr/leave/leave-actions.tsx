"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LeaveActions({
  leaveId,
  status,
  isOwner,
  canApprove,
  canReject,
}: {
  leaveId: string
  status: string
  isOwner: boolean
  canApprove: boolean
  canReject: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transition(newStatus: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.from("leave_requests").update({ status: newStatus }).eq("id", leaveId)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.refresh()
  }

  const showRow =
    (status === "draft" && isOwner) || (["submitted", "escalated"].includes(status) && (isOwner || canApprove || canReject))

  if (!showRow) return null

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" && isOwner && (
        <Button size="sm" onClick={() => transition("submitted")} disabled={busy}>
          Submit
        </Button>
      )}
      {["submitted", "escalated"].includes(status) && (
        <>
          {canApprove && (
            <Button size="sm" onClick={() => transition("approved")} disabled={busy}>
              Approve
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="destructive" onClick={() => transition("rejected")} disabled={busy}>
              Reject
            </Button>
          )}
          {isOwner && (
            <Button size="sm" variant="ghost" onClick={() => transition("draft")} disabled={busy}>
              Withdraw
            </Button>
          )}
        </>
      )}
      {error && (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      )}
    </div>
  )
}
