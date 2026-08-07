"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Resource = { id: string; key: string; name: string; module: string }
type Permission = { id: string; resource_id: string; action: string }
type Grant = { permission_id: string; scope: string }

const ACTIONS = [
  "view", "create", "edit", "delete", "approve", "reject", "export", "import", "assign", "configure",
] as const

const SCOPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "org", label: "Org" },
  { value: "hierarchy", label: "Hierarchy" },
  { value: "territory", label: "Territory" },
  { value: "own", label: "Own" },
]

export function PermissionMatrix({
  roleId,
  resources,
  permissions,
  initialGrants,
  editable,
}: {
  roleId: string
  resources: Resource[]
  permissions: Permission[]
  initialGrants: Grant[]
  editable: boolean
}) {
  const [grants, setGrants] = useState<Record<string, string>>(
    Object.fromEntries(initialGrants.map((g) => [g.permission_id, g.scope]))
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const permByResourceAction = new Map(
    permissions.map((p) => [`${p.resource_id}:${p.action}`, p.id])
  )

  const grouped = resources.reduce<Record<string, Resource[]>>((acc, r) => {
    ;(acc[r.module] ??= []).push(r)
    return acc
  }, {})

  async function handleChange(permissionId: string, scope: string) {
    setSaving(permissionId)
    setError(null)
    const supabase = createClient()

    if (scope === "") {
      const { error: delError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)
        .eq("permission_id", permissionId)
      if (delError) {
        setError(delError.message)
        setSaving(null)
        return
      }
      setGrants((prev) => {
        const next = { ...prev }
        delete next[permissionId]
        return next
      })
    } else {
      const { error: upsertError } = await supabase
        .from("role_permissions")
        .upsert(
          { role_id: roleId, permission_id: permissionId, scope },
          { onConflict: "role_id,permission_id" }
        )
      if (upsertError) {
        setError(upsertError.message)
        setSaving(null)
        return
      }
      setGrants((prev) => ({ ...prev, [permissionId]: scope }))
    }
    setSaving(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {Object.entries(grouped).map(([module, moduleResources]) => (
        <div key={module} className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <caption className="text-left font-medium capitalize p-3 bg-muted/50">
              {module.replace("_", " ")}
            </caption>
            <thead>
              <tr className="border-b bg-muted/30">
                <th scope="col" className="text-left p-2 font-medium">
                  Resource
                </th>
                {ACTIONS.map((action) => (
                  <th key={action} scope="col" className="text-left p-2 font-medium capitalize">
                    {action}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moduleResources.map((resource) => (
                <tr key={resource.id} className="border-b last:border-0">
                  <th scope="row" className="text-left p-2 font-normal">
                    {resource.name}
                  </th>
                  {ACTIONS.map((action) => {
                    const permId = permByResourceAction.get(`${resource.id}:${action}`)
                    if (!permId) return <td key={action} className="p-2" />
                    const currentScope = grants[permId] ?? ""
                    return (
                      <td key={action} className="p-2">
                        {editable ? (
                          <label className="sr-only" htmlFor={`perm-${permId}`}>
                            {resource.name} {action} scope
                          </label>
                        ) : null}
                        {editable ? (
                          <select
                            id={`perm-${permId}`}
                            value={currentScope}
                            disabled={saving === permId}
                            onChange={(e) => handleChange(permId, e.target.value)}
                            className="border rounded-md h-7 px-1.5 text-xs bg-background disabled:opacity-50"
                          >
                            {SCOPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : currentScope ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-success-soft text-success">
                            {currentScope}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
