"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function CloneRoleButton({ roleId, orgId }: { roleId: string; orgId: string }) {
  const router = useRouter()
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClone() {
    setCloning(true)
    setError(null)
    const supabase = createClient()

    const { data: source, error: sourceError } = await supabase
      .from("roles")
      .select("key, name, description")
      .eq("id", roleId)
      .single()

    if (sourceError || !source) {
      setError(sourceError?.message ?? "Could not load role")
      setCloning(false)
      return
    }

    const suffix = crypto.randomUUID().slice(0, 6)
    const { data: newRole, error: insertError } = await supabase
      .from("roles")
      .insert({
        organization_id: orgId,
        key: `${source.key}_custom_${suffix}`,
        name: `${source.name} (Custom)`,
        description: source.description,
      })
      .select("id")
      .single()

    if (insertError || !newRole) {
      setError(insertError?.message ?? "Could not create role")
      setCloning(false)
      return
    }

    // Cross-tenant (platform-scope) grants never carry over into an org-scoped custom role.
    const { data: grants } = await supabase
      .from("role_permissions")
      .select("permission_id, scope, conditions")
      .eq("role_id", roleId)
      .neq("scope", "platform")

    if (grants && grants.length > 0) {
      await supabase.from("role_permissions").insert(
        grants.map((g) => ({
          role_id: newRole.id,
          permission_id: g.permission_id,
          scope: g.scope,
          conditions: g.conditions,
        }))
      )
    }

    setCloning(false)
    router.push(`/admin/roles/${newRole.id}`)
  }

  return (
    <div className="shrink-0 text-right">
      <Button variant="outline" size="sm" onClick={handleClone} disabled={cloning}>
        {cloning ? "Cloning…" : "Clone to customize"}
      </Button>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}
