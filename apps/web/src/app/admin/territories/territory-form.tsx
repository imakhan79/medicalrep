"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Territory = { id: string; name: string }

export function TerritoryForm({ orgId, territories }: { orgId: string; territories: Territory[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [parentId, setParentId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase.from("territories").insert({
      organization_id: orgId,
      name,
      parent_territory_id: parentId || null,
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    setParentId("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New territory</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="territory-name">Name</Label>
            <Input id="territory-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="territory-parent">Parent territory (optional)</Label>
            <select
              id="territory-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              <option value="">None (top level)</option>
              {territories.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={submitting} className="sm:w-fit">
            {submitting ? "Saving…" : "Add territory"}
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
