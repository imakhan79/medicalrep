"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = { user_id: string; email: string }
type Product = { id: string; name: string }
type Allocation = { rep_id: string; product_id: string; allocated_qty: number }

export function NewAllocationForm({
  orgId,
  periodMonth,
  members,
  products,
  existingAllocations,
}: {
  orgId: string
  periodMonth: string
  members: Member[]
  products: Product[]
  existingAllocations: Allocation[]
}) {
  const router = useRouter()
  const [repId, setRepId] = useState(members[0]?.user_id ?? "")
  const [productId, setProductId] = useState(products[0]?.id ?? "")
  const [qty, setQty] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = existingAllocations.find((a) => a.rep_id === repId && a.product_id === productId)

  // Pre-fill the quantity when an allocation for this rep/product already exists this
  // period, so submitting doesn't silently overwrite it without the current value visible.
  function findExisting(rep: string, product: string) {
    return existingAllocations.find((a) => a.rep_id === rep && a.product_id === product)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const { error: upsertError } = await supabase.from("sample_allocations").upsert(
      {
        organization_id: orgId,
        rep_id: repId,
        product_id: productId,
        period_month: periodMonth,
        allocated_qty: Number(qty),
      },
      { onConflict: "organization_id,rep_id,product_id,period_month" }
    )

    setSubmitting(false)
    if (upsertError) {
      setError(upsertError.message)
      return
    }
    setQty("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assign allocation ({periodMonth.slice(0, 7)})</CardTitle>
        {existing && (
          <p className="text-sm text-warning">
            Editing existing allocation of {existing.allocated_qty} — saving will overwrite it.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="alloc-rep">Rep</Label>
            <select
              id="alloc-rep"
              value={repId}
              onChange={(e) => {
                const nextRepId = e.target.value
                setRepId(nextRepId)
                const match = findExisting(nextRepId, productId)
                setQty(match ? String(match.allocated_qty) : "")
              }}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="alloc-product">Product</Label>
            <select
              id="alloc-product"
              value={productId}
              onChange={(e) => {
                const nextProductId = e.target.value
                setProductId(nextProductId)
                const match = findExisting(repId, nextProductId)
                setQty(match ? String(match.allocated_qty) : "")
              }}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="alloc-qty">Quantity</Label>
            <Input id="alloc-qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting || !repId || !productId}>
            {submitting ? "Saving…" : "Assign"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
