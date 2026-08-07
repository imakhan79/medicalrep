"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Territory = { id: string; name: string }

export function HcoForm({ orgId, territories }: { orgId: string; territories: Territory[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [address, setAddress] = useState("")
  const [territoryId, setTerritoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase.from("hcos").insert({
      organization_id: orgId,
      name,
      type: type || null,
      address: address || null,
      territory_id: territoryId || null,
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    setType("")
    setAddress("")
    setTerritoryId("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New healthcare organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="hco-name">Name</Label>
            <Input id="hco-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hco-type">Type</Label>
            <Input id="hco-type" placeholder="Hospital, Clinic…" value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hco-territory">Territory</Label>
            <select
              id="hco-territory"
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              <option value="">None</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 lg:col-span-1">
            <Label htmlFor="hco-address">Address</Label>
            <Input id="hco-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="sm:w-fit">
            {submitting ? "Saving…" : "Add HCO"}
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
