"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const DEMO_PASSWORD = "DevPassword123!"

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "superadmin@medicalrep.dev" },
  { role: "Platform Owner", email: "platformowner@medicalrep.dev" },
  { role: "Company Admin", email: "admin1@medicalrep.dev" },
  { role: "National Sales Manager", email: "nationalmanager@medicalrep.dev" },
  { role: "Zonal Manager", email: "zonalmanager@medicalrep.dev" },
  { role: "Regional Manager", email: "manager1@medicalrep.dev" },
  { role: "Area Sales Manager", email: "areamanager@medicalrep.dev" },
  { role: "Territory Manager", email: "territorymanager@medicalrep.dev" },
  { role: "Medical Representative", email: "rep1@medicalrep.dev" },
  { role: "Key Account Manager", email: "kam@medicalrep.dev" },
  { role: "Product Manager", email: "productmanager@medicalrep.dev" },
  { role: "Marketing Manager", email: "marketingmanager@medicalrep.dev" },
  { role: "HR", email: "hr@medicalrep.dev" },
  { role: "Finance", email: "finance@medicalrep.dev" },
  { role: "Warehouse Manager", email: "warehouse@medicalrep.dev" },
  { role: "Purchasing Officer", email: "purchasing@medicalrep.dev" },
  { role: "Customer Support", email: "support@medicalrep.dev" },
  { role: "Auditor", email: "auditor@medicalrep.dev" },
  { role: "Guest", email: "guest@medicalrep.dev" },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("rep1@medicalrep.dev")
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [demoLoadingEmail, setDemoLoadingEmail] = useState<string | null>(null)

  async function signIn(signInEmail: string, signInPassword: string) {
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    })
    if (signInError) {
      setError(signInError.message)
      return false
    }
    router.push("/")
    router.refresh()
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    await signIn(email, password)
    setSubmitting(false)
  }

  async function handleDemoLogin(demoEmail: string) {
    setError(null)
    setDemoLoadingEmail(demoEmail)
    await signIn(demoEmail, DEMO_PASSWORD)
    setDemoLoadingEmail(null)
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1.4fr] lg:items-start">
      <div
        className="relative overflow-hidden rounded-xl p-8 text-primary-foreground flex flex-col justify-between min-h-[280px]"
        style={{ background: "linear-gradient(145deg, #602020 0%, #3d1414 55%, #35474d 130%)" }}
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 size-48 rounded-full opacity-20"
          style={{ background: "#f8b028" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="bg-white rounded-md p-1.5 shrink-0">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={80} height={33} className="rounded-sm" />
          </div>
          <span className="font-semibold text-lg">Medical Rep CRM</span>
        </div>
        <div className="relative space-y-2 mt-8">
          <h1 className="text-2xl font-semibold leading-tight">
            Field sales, samples, and compliance — one connected platform.
          </h1>
          <p className="text-sm text-white/80">
            Territory-aware RBAC, live GPS tracking, approvals, and analytics for medical
            representatives, managers, and every role in between.
          </p>
        </div>
        <p className="relative text-xs text-white/60 mt-8">Powered by Zicon Technology</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 max-w-sm">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick demo login</CardTitle>
            <p className="text-sm text-muted-foreground">
              One click per role — dev-only accounts, all password {DEMO_PASSWORD}.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={demoLoadingEmail !== null}
                  onClick={() => handleDemoLogin(account.email)}
                  className="justify-start"
                >
                  {demoLoadingEmail === account.email ? "Signing in…" : account.role}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
