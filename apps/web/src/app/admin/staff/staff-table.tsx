"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = {
  membership_id: string
  user_id: string
  email: string
  role_id: string
  role_name: string
  role_key: string
  role_is_system: boolean
  territory_names: string | null
  created_at: string
}
type Role = { id: string; key: string; name: string }
type Territory = { id: string; name: string }

export function StaffTable({
  orgId,
  members,
  roles,
  territories,
  canEdit,
  canDelete,
}: {
  orgId: string
  members: Member[]
  roles: Role[]
  territories: Territory[]
  canEdit: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleChange(userId: string, roleId: string) {
    setBusyId(userId)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("memberships")
      .update({ role_id: roleId })
      .eq("organization_id", orgId)
      .eq("user_id", userId)
    setBusyId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }
    router.refresh()
  }

  async function handleTerritoryChange(userId: string, territoryId: string) {
    setBusyId(userId)
    setError(null)
    const supabase = createClient()

    const { error: deleteError } = await supabase
      .from("territory_assignments")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", userId)
    if (deleteError) {
      setBusyId(null)
      setError(deleteError.message)
      return
    }

    if (territoryId) {
      const { error: insertError } = await supabase
        .from("territory_assignments")
        .insert({ organization_id: orgId, user_id: userId, territory_id: territoryId })
      if (insertError) {
        setBusyId(null)
        setError(insertError.message)
        return
      }
    }

    setBusyId(null)
    router.refresh()
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Remove ${email} from this organization?`)) return
    setBusyId(userId)
    setError(null)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("admin_remove_staff_member", {
      p_org_id: orgId,
      p_user_id: userId,
    })
    setBusyId(null)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Members</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <p role="alert" className="text-destructive text-sm mb-2">
            {error}
          </p>
        )}
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th scope="col" className="text-left p-2 font-medium">Email</th>
                <th scope="col" className="text-left p-2 font-medium">Role</th>
                <th scope="col" className="text-left p-2 font-medium">Territory</th>
                <th scope="col" className="text-left p-2 font-medium">Joined</th>
                {canDelete && <th scope="col" className="p-2" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.membership_id} className="border-b last:border-0">
                  <td className="p-2">{m.email}</td>
                  <td className="p-2">
                    {canEdit ? (
                      <select
                        aria-label={`Role for ${m.email}`}
                        value={m.role_id}
                        disabled={busyId === m.user_id}
                        onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                        className="border rounded-md h-8 px-2 text-sm bg-background disabled:opacity-50"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      m.role_name
                    )}
                  </td>
                  <td className="p-2">
                    {canEdit ? (
                      <select
                        aria-label={`Territory for ${m.email}`}
                        defaultValue=""
                        disabled={busyId === m.user_id}
                        onChange={(e) => handleTerritoryChange(m.user_id, e.target.value)}
                        className="border rounded-md h-8 px-2 text-sm bg-background disabled:opacity-50"
                      >
                        <option value="" disabled hidden>
                          {m.territory_names ?? "None"}
                        </option>
                        <option value="">None</option>
                        {territories.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      m.territory_names ?? "—"
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  {canDelete && (
                    <td className="p-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyId === m.user_id}
                        onClick={() => handleRemove(m.user_id, m.email)}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-sm text-muted-foreground">
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
