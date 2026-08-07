import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ItemEditor } from "./item-editor"
import { StatusActions } from "./status-actions"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default async function OrderDetailPage(props: PageProps<"/orders/[orderId]">) {
  const { orderId } = await props.params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("id, organization_id, order_date, status, fulfillment_status, placed_by, territory_id, decision_notes, channel_partners(name)")
    .eq("id", orderId)
    .maybeSingle()

  if (!order) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: products }, { data: items }, { data: events }, { data: canApprove }, { data: canReject }, { data: canEdit }] =
    await Promise.all([
      supabase.from("products").select("id, name").order("name"),
      supabase.from("order_items").select("id, product_id, quantity, unit_price").eq("order_id", order.id),
      supabase
        .from("approval_events")
        .select("action, notes, created_at")
        .eq("entity_type", "order")
        .eq("entity_id", order.id)
        .order("created_at"),
      supabase.rpc("can_access_row", {
        p_org_id: order.organization_id,
        p_resource_key: "orders",
        p_action: "approve",
        p_territory_id: order.territory_id,
      }),
      supabase.rpc("can_access_row", {
        p_org_id: order.organization_id,
        p_resource_key: "orders",
        p_action: "reject",
        p_territory_id: order.territory_id,
      }),
      supabase.rpc("can_access_row", {
        p_org_id: order.organization_id,
        p_resource_key: "orders",
        p_action: "edit",
        p_territory_id: order.territory_id,
        p_owner_id: order.placed_by,
      }),
    ])

  const isOwner = user?.id === order.placed_by
  const itemsEditable = order.status === "draft" && Boolean(canEdit)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {/* @ts-expect-error -- joined relation shape from PostgREST */}
            {order.channel_partners?.name ?? "Order"}
          </h1>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_STYLES[order.status] ?? ""}`}>
            {order.status}
          </span>
          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground capitalize">
            {order.fulfillment_status}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">{order.order_date}</p>
        {order.decision_notes && (
          <p className="text-sm mt-1 italic text-muted-foreground">Decision notes: {order.decision_notes}</p>
        )}
      </div>

      <ItemEditor orderId={order.id} products={products ?? []} items={items ?? []} editable={itemsEditable} />

      <StatusActions
        orderId={order.id}
        status={order.status}
        fulfillmentStatus={order.fulfillment_status}
        isOwner={isOwner}
        canApprove={Boolean(canApprove)}
        canReject={Boolean(canReject)}
        canEditFulfillment={Boolean(canEdit)}
      />

      <div>
        <h2 className="font-medium mb-2">History</h2>
        <ul className="divide-y rounded-md border text-sm" aria-label="Approval history">
          {events?.map((e, i) => (
            <li key={i} className="p-2 flex items-center justify-between">
              <span className="capitalize">{e.action}</span>
              <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
            </li>
          ))}
          {events?.length === 0 && <li className="p-2 text-muted-foreground">No activity yet.</li>}
        </ul>
      </div>
    </div>
  )
}
