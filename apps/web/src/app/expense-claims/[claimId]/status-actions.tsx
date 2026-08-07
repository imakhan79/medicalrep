"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function StatusActions({
  claimId,
  status,
  isOwner,
  canApprove,
  canReject,
  approvalLimit,
  amount,
}: {
  claimId: string
  status: string
  isOwner: boolean
  canApprove: boolean
  canReject: boolean
  approvalLimit: number | null
  amount: number
}) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const overLimit = approvalLimit !== null && amount > approvalLimit

  async function transition(newStatus: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const payload: Record<string, string> = { status: newStatus }
    if (newStatus === "approved" || newStatus === "rejected") {
      payload.decision_notes = notes
    }
    const { error: updateError } = await supabase.from("expense_claims").update(payload).eq("id", claimId)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotes("")
    router.refresh()
  }

  const canAct =
    (status === "draft" && isOwner) ||
    (["submitted", "escalated"].includes(status) && (isOwner || canApprove || canReject))

  if (!canAct) return null

  return (
    <div className="space-y-3 border-t pt-4">
      {status === "draft" && isOwner && (
        <Button onClick={() => transition("submitted")} disabled={busy}>
          Submit for approval
        </Button>
      )}

      {["submitted", "escalated"].includes(status) && (
        <>
          {canApprove && overLimit && (
            <p className="text-sm text-warning">
              This claim exceeds your {approvalLimit?.toLocaleString()} approval limit — escalate it to a
              higher tier instead of approving.
            </p>
          )}
          {(canApprove || canReject) && (
            <div className="grid gap-1.5 max-w-md">
              <Label htmlFor="decision-notes">Decision notes</Label>
              <Input id="decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {canApprove && !overLimit && (
              <Button onClick={() => transition("approved")} disabled={busy}>
                Approve
              </Button>
            )}
            {canReject && (
              <Button variant="destructive" onClick={() => transition("rejected")} disabled={busy}>
                Reject
              </Button>
            )}
            {status === "submitted" && (canApprove || canReject) && (
              <Button variant="outline" onClick={() => transition("escalated")} disabled={busy}>
                Escalate
              </Button>
            )}
            {isOwner && (
              <Button variant="ghost" onClick={() => transition("draft")} disabled={busy}>
                Withdraw
              </Button>
            )}
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
