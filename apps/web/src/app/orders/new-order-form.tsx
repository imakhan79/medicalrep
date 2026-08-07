"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentOrgId } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Partner = { id: string; name: string }

export function NewOrderForm({ partners }: { partners: Partner[] }) {
  const router = useRouter()
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!partnerId) return
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!orgId || !user) {
      setError("Sign in with an organization membership to place an order.")
      setSubmitting(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from("orders")
      .insert({ organization_id: orgId, channel_partner_id: partnerId, placed_by: user.id })
      .select("id")
      .single()

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.push(`/orders/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="order-partner">Channel partner</Label>
            <select
              id="order-partner"
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={submitting || !partnerId}>
            {submitting ? "Creating…" : "Create draft"}
          </Button>
        </form>
        {partners.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            No channel partners yet — add one on the Channel Partners page first.
          </p>
        )}
        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
