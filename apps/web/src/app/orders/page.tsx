import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/org"
import { PageHeader } from "@/components/page-header"
import { ExportCsvButton } from "@/components/export-csv-button"
import { NewOrderForm } from "./new-order-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-warning-soft text-warning",
  escalated: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive-soft text-destructive",
}

const LIST_LIMIT = 200

export default async function OrdersPage() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId(supabase)
  const [{ data: canCreate }, { data: canExport }] = orgId
    ? await Promise.all([
        supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "orders", p_action: "create" }),
        supabase.rpc("can_access_row", { p_org_id: orgId, p_resource_key: "orders", p_action: "export" }),
      ])
    : [{ data: false }, { data: false }]

  const { data: partners } = await supabase.from("channel_partners").select("id, name").order("name")

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_date, status, fulfillment_status, channel_partners(name)")
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingCart}
        title="Orders"
        subtitle="Secondary sales orders from stockists, distributors, and pharmacies."
      />

      {canCreate && <NewOrderForm partners={partners ?? []} />}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load orders: {error.message}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">All orders</CardTitle>
          {canExport && (
            <ExportCsvButton
              rows={(orders ?? []).map((o) => ({
                order_date: o.order_date,
                status: o.status,
                fulfillment_status: o.fulfillment_status,
                // @ts-expect-error -- joined relation shape from PostgREST
                partner: o.channel_partners?.name ?? "",
              }))}
              filename="orders.csv"
            />
          )}
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border" aria-label="Orders">
            {orders?.map((order) => (
              <li key={order.id} className="p-3 flex items-center justify-between gap-4">
                <div>
                  <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                    {/* @ts-expect-error -- joined relation shape from PostgREST */}
                    {order.channel_partners?.name ?? "Unknown partner"}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {order.order_date} · fulfillment: {order.fulfillment_status}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full shrink-0 capitalize ${STATUS_STYLES[order.status] ?? ""}`}
                >
                  {order.status}
                </span>
              </li>
            ))}
            {orders?.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">No orders yet.</li>
            )}
          </ul>
          {orders && orders.length === LIST_LIMIT && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing the most recent {LIST_LIMIT}. Search and pagination are coming soon.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
