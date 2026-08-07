"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Role = { id: string; key: string; name: string }
type Territory = { id: string; name: string }

function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return "Rx-" + Array.from(bytes, (b) => b.toString(36)).join("").slice(0, 12) + "!1"
}

export function AddStaffForm({
  orgId,
  roles,
  territories,
}: {
  orgId: string
  roles: Role[]
  territories: Territory[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState(generatePassword)
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "")
  const [territoryId, setTerritoryId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setCreated(null)

    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("admin_create_staff_member", {
      p_org_id: orgId,
      p_email: email,
      p_password: password,
      p_role_id: roleId,
      p_territory_id: territoryId || null,
    })

    setSubmitting(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setCreated({ email, password })
    setEmail("")
    setPassword(generatePassword())
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add staff</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5 sm:items-end">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="staff-role">Role</Label>
            <select
              id="staff-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="staff-territory">Territory (optional)</Label>
            <select
              id="staff-territory"
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
          <Button type="submit" disabled={submitting || !roleId}>
            {submitting ? "Adding…" : "Add staff"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-2">
          Temp password: <code>{password}</code> — no email is sent yet, so share this with the new staff
          member yourself; they should change it after first sign-in.
        </p>

        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error}
          </p>
        )}
        {created && (
          <p role="status" className="text-sm text-primary mt-2">
            Created {created.email} — password was <code>{created.password}</code> (shown once, share it now).
          </p>
        )}
      </CardContent>
    </Card>
  )
}
