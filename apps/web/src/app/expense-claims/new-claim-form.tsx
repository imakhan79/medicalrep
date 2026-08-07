"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getCurrentOrgId } from "@/lib/org"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const CATEGORIES = ["travel", "meals", "accommodation", "fuel", "other"] as const

export function NewClaimForm() {
  const router = useRouter()
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("travel")
  const [amount, setAmount] = useState("")
  const [expenseDate, setExpenseDate] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!orgId || !user) {
      setError("Sign in with an organization membership to submit a claim.")
      setSubmitting(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from("expense_claims")
      .insert({
        organization_id: orgId,
        rep_id: user.id,
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        description: description || null,
      })
      .select("id")
      .single()

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    router.push(`/expense-claims/${data.id}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New claim</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-5 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="ec-category">Category</Label>
            <select
              id="ec-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
              className="border rounded-md h-9 px-3 text-sm bg-background capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ec-amount">Amount (USD)</Label>
            <Input
              id="ec-amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ec-date">Expense date</Label>
            <Input id="ec-date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="ec-desc">Description</Label>
            <Input id="ec-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="sm:col-span-5 sm:w-fit">
            {submitting ? "Creating…" : "Create draft"}
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
