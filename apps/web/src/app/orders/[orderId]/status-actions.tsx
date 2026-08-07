"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const FULFILLMENT_OPTIONS = ["pending", "dispatched", "delivered", "cancelled"] as const

export function StatusActions({
  orderId,
  status,
  fulfillmentStatus,
  isOwner,
  canApprove,
  canReject,
  canEditFulfillment,
}: {
  orderId: string
  status: string
  fulfillmentStatus: string
  isOwner: boolean
  canApprove: boolean
  canReject: boolean
  canEditFulfillment: boolean
}) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transition(newStatus: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const payload: Record<string, string> = { status: newStatus }
    if (newStatus === "approved" || newStatus === "rejected") {
      payload.decision_notes = notes
    }
    const { error: updateError } = await supabase.from("orders").update(payload).eq("id", orderId)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotes("")
    router.refresh()
  }

  async function updateFulfillment(newFulfillment: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("orders")
      .update({ fulfillment_status: newFulfillment })
      .eq("id", orderId)
    setBusy(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.refresh()
  }

  const canAct =
    (status === "draft" && isOwner) ||
    (["submitted", "escalated"].includes(status) && (isOwner || canApprove || canReject))

  return (
    <div className="space-y-3 border-t pt-4">
      {canAct && (
        <>
          {status === "draft" && isOwner && (
            <Button onClick={() => transition("submitted")} disabled={busy}>
              Submit for approval
            </Button>
          )}

          {["submitted", "escalated"].includes(status) && (
            <>
              {(canApprove || canReject) && (
                <div className="grid gap-1.5 max-w-md">
                  <Label htmlFor="decision-notes">Decision notes</Label>
                  <Input id="decision-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {canApprove && (
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
        </>
      )}

      {status === "approved" && canEditFulfillment && (
        <div className="grid gap-1.5 max-w-xs">
          <Label htmlFor="fulfillment">Fulfillment status</Label>
          <select
            id="fulfillment"
            value={fulfillmentStatus}
            disabled={busy}
            onChange={(e) => updateFulfillment(e.target.value)}
            className="border rounded-md h-9 px-3 text-sm bg-background capitalize disabled:opacity-50"
          >
            {FULFILLMENT_OPTIONS.map((f) => (
              <option key={f} value={f} className="capitalize">
                {f}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
