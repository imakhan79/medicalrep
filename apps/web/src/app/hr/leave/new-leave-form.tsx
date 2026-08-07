"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TYPES = ["annual", "sick", "personal", "emergency", "unpaid"] as const

export function NewLeaveForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [leaveType, setLeaveType] = useState<(typeof TYPES)[number]>("annual")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Sign in to request leave.")
      setSubmitting(false)
      return
    }
    const { error: insertError } = await supabase.from("leave_requests").insert({
      organization_id: orgId,
      rep_id: user.id,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason || null,
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setStartDate("")
    setEndDate("")
    setReason("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request leave</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="leave-type">Type</Label>
            <select
              id="leave-type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as (typeof TYPES)[number])}
              className="border rounded-md h-9 px-3 text-sm bg-background capitalize"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="leave-start">Start date</Label>
            <Input id="leave-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="leave-end">End date</Label>
            <Input id="leave-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Input id="leave-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="sm:col-span-5 sm:w-fit">
            {submitting ? "Creating…" : "Create draft request"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
