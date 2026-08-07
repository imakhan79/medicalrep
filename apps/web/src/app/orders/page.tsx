import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { NewOrderForm } from "./new-order-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  approved: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export default async function OrdersPage() {
  const supabase = await createClient()

  const { data: partners } = await supabase.from("channel_partners").select("id, name").order("name")

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, order_date, status, fulfillment_status, channel_partners(name)")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Secondary sales orders from stockists, distributors, and pharmacies.
        </p>
      </div>

      <NewOrderForm partners={partners ?? []} />

      {error && (
        <p role="alert" className="text-destructive text-sm">
          Could not load orders: {error.message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All orders</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  )
}
