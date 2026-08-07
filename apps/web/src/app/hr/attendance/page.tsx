import { UserCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  present: "bg-success-soft text-success",
  late: "bg-warning-soft text-warning",
  absent: "bg-muted text-muted-foreground",
}

export default async function AttendancePage(props: PageProps<"/hr/attendance">) {
  const searchParams = await props.searchParams
  const date = typeof searchParams.date === "string" ? searchParams.date : new Date().toISOString().slice(0, 10)

  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  if (!orgId) return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>

  const { data: rows, error } = await supabase.rpc("attendance_summary", { p_org_id: orgId, p_date: date })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCheck}
        title="Attendance"
        subtitle="Derived from GPS check-in/out — present if checked in, late after 9:30am, absent otherwise."
      />

      <form className="flex items-end gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="date" className="text-sm font-medium">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="border rounded-md h-9 px-3 text-sm bg-background"
          />
        </div>
        <button type="submit" className="h-9 px-3 rounded-md border text-sm hover:bg-accent">
          View
        </button>
      </form>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{date}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Attendance">
            {rows?.map((r: { rep_id: string; email: string; check_in_at: string | null; check_out_at: string | null; status: string }) => (
              <li key={r.rep_id} className="p-2 flex items-center justify-between">
                <span>{r.email}</span>
                <span className="flex items-center gap-2">
                  {r.check_in_at && (
                    <span className="text-muted-foreground">{new Date(r.check_in_at).toLocaleTimeString()}</span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </span>
              </li>
            ))}
            {rows?.length === 0 && <li className="p-2 text-muted-foreground">No staff in view.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
