"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { db } from "@/lib/offline/db"
import { flushQueuedVisits, registerSyncListeners } from "@/lib/offline/sync"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Hcp = { id: string; first_name: string; last_name: string }
type Product = { id: string; name: string }

export function VisitCheckinForm({ hcps, products }: { hcps: Hcp[]; products: Product[] }) {
  const router = useRouter()
  const [hcpId, setHcpId] = useState(hcps[0]?.id ?? "")
  const [objective, setObjective] = useState("")
  const [notes, setNotes] = useState("")
  const [productId, setProductId] = useState("")
  const [sampleQty, setSampleQty] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [sampleError, setSampleError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const unregister = registerSyncListeners(() => {
      setStatus("Queued visits synced.")
      router.refresh()
    })
    const on = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      unregister()
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hcpId) return
    setSubmitting(true)
    setStatus(null)
    setSampleError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: membership } = await supabase
      .from("memberships")
      .select("organization_id")
      .limit(1)
      .maybeSingle()

    const clientId = crypto.randomUUID()
    const visit = {
      client_id: clientId,
      hcp_id: hcpId,
      rep_id: user?.id ?? "",
      visited_at: new Date().toISOString(),
      objective: objective || null,
      outcome_notes: notes || null,
      next_visit_date: null,
      latitude: null,
      longitude: null,
      synced: 0 as const,
      created_at: new Date().toISOString(),
    }

    // Always write locally first so offline check-in is instant and never lost.
    await db.visits.add(visit)

    if (navigator.onLine && membership) {
      const { synced, failed } = await flushQueuedVisits()
      setStatus(
        failed > 0
          ? `Saved. ${synced} synced, ${failed} pending retry.`
          : "Visit logged and synced."
      )

      // Samples need a live compliance/cap check, so they're only recorded once the
      // visit itself has actually synced — not attempted from the offline queue.
      if (productId && sampleQty && synced > 0) {
        const { data: savedVisit } = await supabase
          .from("visits")
          .select("id")
          .eq("client_id", clientId)
          .maybeSingle()

        if (savedVisit) {
          const { error: sampleInsertError } = await supabase
            .from("visit_products")
            .insert({ visit_id: savedVisit.id, product_id: productId, sample_qty: Number(sampleQty) })
          if (sampleInsertError) {
            setSampleError(sampleInsertError.message)
          }
        }
      }
    } else {
      setStatus("Offline — visit saved locally, will sync automatically when you reconnect.")
      if (productId) {
        setSampleError("Samples can't be recorded offline — add them from the visit once you're back online.")
      }
    }

    setObjective("")
    setNotes("")
    setProductId("")
    setSampleQty("")
    setSubmitting(false)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Log a visit</CardTitle>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            isOnline
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning"
          }`}
        >
          {isOnline ? "Online" : "Offline — will sync later"}
        </span>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="hcp-select">HCP</Label>
            <select
              id="hcp-select"
              value={hcpId}
              onChange={(e) => setHcpId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
              required
            >
              {hcps.map((hcp) => (
                <option key={hcp.id} value={hcp.id}>
                  {hcp.first_name} {hcp.last_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="objective">Call objective</Label>
            <Input
              id="objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Outcome notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {isOnline && products.length > 0 && (
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sample-product">Sample given (optional)</Label>
                <select
                  id="sample-product"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="border rounded-md h-9 px-3 text-sm bg-background"
                >
                  <option value="">None</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sample-qty">Quantity</Label>
                <Input
                  id="sample-qty"
                  type="number"
                  min="1"
                  value={sampleQty}
                  onChange={(e) => setSampleQty(e.target.value)}
                  disabled={!productId}
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={submitting || !hcpId} className="w-fit">
            {submitting ? "Saving…" : "Check in"}
          </Button>
          {status && (
            <p role="status" className="text-sm text-muted-foreground">
              {status}
            </p>
          )}
          {sampleError && (
            <p role="alert" className="text-destructive text-sm">
              {sampleError}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
