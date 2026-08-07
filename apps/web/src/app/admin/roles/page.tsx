import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import Link from "next/link"
import { NewRoleForm } from "./new-role-form"
import { CloneRoleButton } from "./clone-role-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function RolesAdminPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return (
      <p className="text-muted-foreground text-sm">
        Sign in with an account that belongs to an organization to manage roles.
      </p>
    )
  }

  const { data: canConfigure } = await supabase.rpc("can_access_row", {
    p_org_id: orgId,
    p_resource_key: "roles",
    p_action: "configure",
  })

  const { data: roles } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system, organization_id")
    .or(`organization_id.is.null,organization_id.eq.${orgId}`)
    .order("is_system", { ascending: false })
    .order("name")

  const systemRoles = roles?.filter((r) => r.is_system) ?? []
  const customRoles = roles?.filter((r) => !r.is_system) ?? []

  if (!canConfigure) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-muted-foreground text-sm">Read-only — you don&apos;t have the &apos;configure&apos; permission on roles.</p>
        </div>
        <RoleList title="System Roles" roles={systemRoles} />
        {customRoles.length > 0 && <RoleList title="Custom Roles" roles={customRoles} />}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
        <p className="text-muted-foreground text-sm">
          System roles are fixed defaults — clone one to create a customizable copy for your organization.
        </p>
      </div>

      <NewRoleForm orgId={orgId} />

      <RoleList title="System Roles" roles={systemRoles} cloneable orgId={orgId} />
      <RoleList title={`Custom Roles`} roles={customRoles} editable />
    </div>
  )
}

function RoleList({
  title,
  roles,
  editable,
  cloneable,
  orgId,
}: {
  title: string
  roles: { id: string; key: string; name: string; description: string | null }[]
  editable?: boolean
  cloneable?: boolean
  orgId?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border" aria-label={title}>
          {roles.map((role) => (
            <li key={role.id} className="p-3 flex items-center justify-between gap-4">
              <div>
                <Link href={`/admin/roles/${role.id}`} className="font-medium hover:underline">
                  {role.name}
                </Link>
                {role.description && (
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                )}
              </div>
              {editable && (
                <Link
                  href={`/admin/roles/${role.id}`}
                  className="text-sm text-teal-700 dark:text-teal-400 hover:underline shrink-0"
                >
                  Edit permissions
                </Link>
              )}
              {cloneable && orgId && <CloneRoleButton roleId={role.id} orgId={orgId} />}
            </li>
          ))}
          {roles.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">None yet.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
