"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentOrgId } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const TYPES = ["stockist", "distributor", "pharmacy"] as const

export function ChannelPartnerForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState<(typeof TYPES)[number]>("distributor")
  const [phone, setPhone] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    if (!orgId) {
      setError("Sign in with an organization membership.")
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from("channel_partners").insert({
      organization_id: orgId,
      name,
      type,
      contact_phone: phone || null,
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    setPhone("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add channel partner</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="cp-name">Name</Label>
            <Input id="cp-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp-type">Type</Label>
            <select
              id="cp-type"
              value={type}
              onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
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
            <Label htmlFor="cp-phone">Phone</Label>
            <Input id="cp-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="sm:col-span-4 sm:w-fit">
            {submitting ? "Saving…" : "Add partner"}
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
