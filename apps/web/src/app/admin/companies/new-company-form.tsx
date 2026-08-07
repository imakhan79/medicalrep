"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function NewCompanyForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: insertError } = await supabase.from("organizations").insert({ name })
    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }
    setName("")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New company</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="grid gap-1.5 flex-1">
            <Label htmlFor="company-name">Company name</Label>
            <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create company"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-destructive text-sm mt-2">
            {error} — only Platform Owner / Super Admin can create companies.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
