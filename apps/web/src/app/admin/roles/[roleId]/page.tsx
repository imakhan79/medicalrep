import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PermissionMatrix } from "./permission-matrix"

export default async function RoleDetailPage(props: PageProps<"/admin/roles/[roleId]">) {
  const { roleId } = await props.params
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in to view this role.</p>
  }

  const { data: role } = await supabase
    .from("roles")
    .select("id, key, name, description, is_system, organization_id")
    .eq("id", roleId)
    .maybeSingle()

  if (!role) notFound()

  const { data: canConfigure } = await supabase.rpc("can_access_row", {
    p_org_id: orgId,
    p_resource_key: "roles",
    p_action: "configure",
  })

  const editable = Boolean(canConfigure) && !role.is_system && role.organization_id === orgId

  const [{ data: resources }, { data: permissions }, { data: grants }] = await Promise.all([
    supabase.from("resources").select("id, key, name, module").order("module").order("name"),
    supabase.from("permissions").select("id, resource_id, action"),
    supabase.from("role_permissions").select("permission_id, scope").eq("role_id", role.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{role.name}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {role.is_system ? "System role" : "Custom role"}
          </span>
        </div>
        {role.description && <p className="text-muted-foreground text-sm">{role.description}</p>}
        {!editable && (
          <p className="text-sm text-warning mt-1">
            {role.is_system
              ? "System roles are fixed — clone this role from the roles list to create an editable copy."
              : "Read-only — you don't have the 'configure' permission on roles."}
          </p>
        )}
      </div>

      <PermissionMatrix
        roleId={role.id}
        resources={resources ?? []}
        permissions={permissions ?? []}
        initialGrants={grants ?? []}
        editable={editable}
      />
    </div>
  )
}
