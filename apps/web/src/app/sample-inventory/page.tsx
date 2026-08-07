import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { NewAllocationForm } from "./new-allocation-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Balance = {
  product_id: string
  product_name: string
  allocated_qty: number
  consumed_qty: number
  remaining_qty: number
}
type OrgMember = { user_id: string; email: string; role_name: string }

function currentPeriodMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
}

export default async function SampleInventoryPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)

  if (!orgId) {
    return <p className="text-muted-foreground text-sm">Sign in with an organization membership.</p>
  }

  const periodMonth = currentPeriodMonth()

  const [{ data: myBalances }, { data: canAssign }, { data: allocations }, { data: members }, { data: products }] =
    await Promise.all([
      supabase.rpc("my_sample_balances", { p_org_id: orgId, p_period_month: periodMonth }),
      supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "sample_inventory", p_action: "assign" }),
      supabase
        .from("sample_allocations")
        .select("id, rep_id, product_id, allocated_qty, period_month, notes, products(name)")
        .eq("period_month", periodMonth)
        .order("created_at", { ascending: false }),
      supabase.rpc("list_org_members", { p_org_id: orgId }),
      supabase.from("products").select("id, name").eq("organization_id", orgId).order("name"),
    ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sample & Inventory</h1>
        <p className="text-muted-foreground text-sm">
          Monthly sample allocations and distribution, capped and consent-checked automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My balance this month</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="My sample balance">
            {(myBalances as Balance[] | null)?.map((b) => (
              <li key={b.product_id} className="p-2 flex items-center justify-between">
                <span>{b.product_name}</span>
                <span className="text-muted-foreground">
                  {b.consumed_qty} used / {b.allocated_qty} allocated —{" "}
                  <span className={b.remaining_qty <= 0 ? "text-destructive font-medium" : ""}>
                    {b.remaining_qty} remaining
                  </span>
                </span>
              </li>
            ))}
            {(!myBalances || myBalances.length === 0) && (
              <li className="p-2 text-muted-foreground">No allocations this month.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {canAssign && (
        <>
          <NewAllocationForm
            orgId={orgId}
            periodMonth={periodMonth}
            members={members ?? []}
            products={products ?? []}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All allocations this month</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border text-sm" aria-label="All allocations">
                {allocations?.map((a) => (
                  <li key={a.id} className="p-2 flex items-center justify-between">
                    <span>
                      {(members as OrgMember[] | null)?.find((m) => m.user_id === a.rep_id)?.email ?? a.rep_id} —{" "}
                      {/* @ts-expect-error -- joined relation shape from PostgREST */}
                      {a.products?.name}
                    </span>
                    <span className="text-muted-foreground">{a.allocated_qty} units</span>
                  </li>
                ))}
                {allocations?.length === 0 && (
                  <li className="p-2 text-muted-foreground">No allocations created yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
