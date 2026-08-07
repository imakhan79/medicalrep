import { Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { AddStaffForm } from "./add-staff-form"
import { StaffTable } from "./staff-table"

export default async function StaffAdminPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return (
      <p className="text-muted-foreground text-sm">
        Sign in with an account that belongs to an organization to manage staff.
      </p>
    )
  }

  const [{ data: canView }, { data: canCreate }, { data: canEdit }, { data: canDelete }] =
    await Promise.all([
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "memberships", p_action: "view" }),
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "memberships", p_action: "create" }),
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "memberships", p_action: "edit" }),
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "memberships", p_action: "delete" }),
    ])

  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        You don&apos;t have permission to view staff for this organization.
      </p>
    )
  }

  const [{ data: members }, { data: roles }, { data: territories }] = await Promise.all([
    supabase.rpc("list_org_members", { p_org_id: orgId }),
    supabase
      .from("roles")
      .select("id, key, name")
      .or(`organization_id.is.null,organization_id.eq.${orgId}`)
      .order("name"),
    supabase.from("territories").select("id, name").eq("organization_id", orgId).order("name"),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Staff & Memberships"
        subtitle="Who has access to this organization, and what role they hold."
      />

      {canCreate && (
        <AddStaffForm orgId={orgId} roles={roles ?? []} territories={territories ?? []} />
      )}

      <StaffTable
        orgId={orgId}
        members={members ?? []}
        roles={roles ?? []}
        territories={territories ?? []}
        canEdit={Boolean(canEdit)}
        canDelete={Boolean(canDelete)}
      />
    </div>
  )
}
