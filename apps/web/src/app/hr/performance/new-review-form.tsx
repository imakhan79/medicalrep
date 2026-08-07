"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Member = { user_id: string; email: string }

export function NewReviewForm({ orgId, members }: { orgId: string; members: Member[] }) {
  const router = useRouter()
  const [repId, setRepId] = useState(members[0]?.user_id ?? "")
  const [period, setPeriod] = useState("")
  const [rating, setRating] = useState("3")
  const [strengths, setStrengths] = useState("")
  const [improvements, setImprovements] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Sign in to create a review.")
      setSubmitting(false)
      return
    }
    const { error: insertError } = await supabase.from("performance_reviews").insert({
      organization_id: orgId,
      rep_id: repId,
      reviewer_id: user.id,
      review_period: period,
      rating: Number(rating),
      strengths: strengths || null,
      improvements: improvements || null,
      status: "submitted",
    })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setPeriod("")
    setStrengths("")
    setImprovements("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-4 sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="review-rep">Employee</Label>
            <select
              id="review-rep"
              value={repId}
              onChange={(e) => setRepId(e.target.value)}
              className="border rounded-md h-9 px-3 text-sm bg-background"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.email}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-period">Period</Label>
            <Input id="review-period" placeholder="2026-Q3" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="review-rating">Rating (1-5)</Label>
            <Input id="review-rating" type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-4">
            <Label htmlFor="review-strengths">Strengths</Label>
            <Input id="review-strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} />
          </div>
          <div className="grid gap-1.5 sm:col-span-4">
            <Label htmlFor="review-improvements">Areas to improve</Label>
            <Input id="review-improvements" value={improvements} onChange={(e) => setImprovements(e.target.value)} />
          </div>
          <Button type="submit" disabled={submitting} className="sm:w-fit">
            {submitting ? "Saving…" : "Submit review"}
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
