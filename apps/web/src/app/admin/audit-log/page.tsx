import { History } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AuditRow = {
  id: string
  actor_id: string | null
  table_name: string
  row_id: string
  action: string
  changed_data: Record<string, unknown> | null
  created_at: string
}

type Member = { user_id: string; email: string }

const ACTION_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  INSERT: "success",
  UPDATE: "warning",
  DELETE: "destructive",
}

const LIST_LIMIT = 200

function humanizeTable(tableName: string) {
  return tableName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function AuditLogPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const [{ data: canView }, { data: canExport }] = await Promise.all([
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "audit_log", p_action: "view" }),
    supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "audit_log", p_action: "export" }),
  ])

  if (!canView) {
    return (
      <p className="text-muted-foreground text-sm">
        You don&apos;t have permission to view the audit log for this organization.
      </p>
    )
  }

  const [{ data: entries, error }, { data: members }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, actor_id, table_name, row_id, action, changed_data, created_at")
      .order("created_at", { ascending: false })
      .limit(LIST_LIMIT),
    supabase.rpc("list_org_members", { p_org_id: orgId }),
  ])

  const memberList = (members as Member[] | null) ?? []
  const emailFor = (id: string | null) => (id ? memberList.find((m) => m.user_id === id)?.email ?? id : "System")

  const rows = (entries as AuditRow[] | null) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={History}
        title="Audit Log"
        subtitle="Every create, update, and delete across the platform — who did what, and when."
      />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent activity</CardTitle>
          {canExport && (
            <ExportCsvButton
              rows={rows.map((row) => ({
                time: row.created_at,
                actor: emailFor(row.actor_id),
                table: humanizeTable(row.table_name),
                action: row.action,
                row_id: row.row_id,
              }))}
              filename="audit-log.csv"
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Audit log entries">
            {rows.map((row) => (
              <li key={row.id} className="p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={ACTION_VARIANT[row.action] ?? "default"}>{row.action}</Badge>
                    <span className="font-medium">{humanizeTable(row.table_name)}</span>
                    <span className="text-sm text-muted-foreground">by {emailFor(row.actor_id)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
                {row.changed_data && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground w-fit">
                      View details
                    </summary>
                    <pre className="mt-1.5 rounded-md bg-muted p-2.5 text-xs overflow-x-auto">
                      {JSON.stringify(row.changed_data, null, 2)}
                    </pre>
                  </details>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="p-3 text-sm text-muted-foreground">No activity recorded yet.</li>}
          </ul>
          {rows.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
