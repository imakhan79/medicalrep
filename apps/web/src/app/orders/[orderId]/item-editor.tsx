"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Product = { id: string; name: string }
type OrderItem = { id: string; product_id: string; quantity: number; unit_price: number }

export function ItemEditor({
  orderId,
  products,
  items,
  editable,
}: {
  orderId: string
  products: Product[]
  items: OrderItem[]
  editable: boolean
}) {
  const router = useRouter()
  const [productId, setProductId] = useState(products[0]?.id ?? "")
  const [qty, setQty] = useState("")
  const [price, setPrice] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "Unknown product"
  const total = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!productId || !qty || !price) return
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase
      .from("order_items")
      .insert({ order_id: orderId, product_id: productId, quantity: Number(qty), unit_price: Number(price) })
    setBusy(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setQty("")
    setPrice("")
    router.refresh()
  }

  async function handleRemove(id: string) {
    setBusy(true)
    setError(null)
    const supabase = createClient()
    const { error: deleteError } = await supabase.from("order_items").delete().eq("id", id)
    setBusy(false)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <h2 className="font-medium">Line items</h2>
      <ul className="divide-y rounded-md border" aria-label="Order items">
        {items.map((item) => (
          <li key={item.id} className="p-2 flex items-center justify-between text-sm">
            <span>
              {productName(item.product_id)} — {item.quantity} × {Number(item.unit_price).toFixed(2)} ={" "}
              {(item.quantity * Number(item.unit_price)).toFixed(2)}
            </span>
            {editable && (
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => handleRemove(item.id)}>
                Remove
              </Button>
            )}
          </li>
        ))}
        {items.length === 0 && <li className="p-2 text-sm text-muted-foreground">No items yet.</li>}
        {items.length > 0 && (
          <li className="p-2 text-sm font-medium flex justify-end">Total: {total.toFixed(2)}</li>
        )}
      </ul>

      {editable && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <select
            aria-label="Product"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="border rounded-md h-9 px-3 text-sm bg-background"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Input
            aria-label="Quantity"
            type="number"
            min="1"
            placeholder="Qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
            className="w-24"
          />
          <Input
            aria-label="Unit price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-32"
          />
          <Button type="submit" size="sm" disabled={busy || !productId}>
            Add item
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
