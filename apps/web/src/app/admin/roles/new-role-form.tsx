"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function NewRoleForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const key = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    if (!key) {
      setError("Enter a role name.")
      setSubmitting(false)
      return
    }

    const supabase = createClient()
    const { data, error: insertError } = await supabase
      .from("roles")
      .insert({ organization_id: orgId, key, name: name.trim() })
      .select("id")
      .single()

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    router.push(`/admin/roles/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New custom role</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senior Medical Representative"
              required
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create role"}
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
