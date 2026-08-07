"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Radar,
  Workflow,
  ShieldCheck,
  ShieldAlert,
  Building2,
  Briefcase,
  TrendingUp,
  Map,
  Compass,
  Target,
  MapPin,
  Stethoscope,
  Handshake,
  Package,
  Megaphone,
  Users,
  Receipt,
  Boxes,
  ShoppingCart,
  LifeBuoy,
  ClipboardCheck,
  User,
  Loader2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"

const DEMO_PASSWORD = "DevPassword123!"

const DEMO_GROUPS: { label: string; accent: string; accounts: { role: string; email: string; icon: LucideIcon }[] }[] = [
  {
    label: "Leadership",
    accent: "var(--primary)",
    accounts: [
      { role: "Super Admin", email: "superadmin@medicalrep.dev", icon: ShieldAlert },
      { role: "Platform Owner", email: "platformowner@medicalrep.dev", icon: Building2 },
      { role: "Company Admin", email: "admin1@medicalrep.dev", icon: Briefcase },
      { role: "National Sales Manager", email: "nationalmanager@medicalrep.dev", icon: TrendingUp },
      { role: "Zonal Manager", email: "zonalmanager@medicalrep.dev", icon: Map },
      { role: "Regional Manager", email: "manager1@medicalrep.dev", icon: Compass },
      { role: "Area Sales Manager", email: "areamanager@medicalrep.dev", icon: Target },
      { role: "Territory Manager", email: "territorymanager@medicalrep.dev", icon: MapPin },
    ],
  },
  {
    label: "Sales & Marketing",
    accent: "var(--accent)",
    accounts: [
      { role: "Medical Representative", email: "rep1@medicalrep.dev", icon: Stethoscope },
      { role: "Key Account Manager", email: "kam@medicalrep.dev", icon: Handshake },
      { role: "Product Manager", email: "productmanager@medicalrep.dev", icon: Package },
      { role: "Marketing Manager", email: "marketingmanager@medicalrep.dev", icon: Megaphone },
    ],
  },
  {
    label: "Operations & Support",
    accent: "var(--chart-3)",
    accounts: [
      { role: "HR", email: "hr@medicalrep.dev", icon: Users },
      { role: "Finance", email: "finance@medicalrep.dev", icon: Receipt },
      { role: "Warehouse Manager", email: "warehouse@medicalrep.dev", icon: Boxes },
      { role: "Purchasing Officer", email: "purchasing@medicalrep.dev", icon: ShoppingCart },
      { role: "Customer Support", email: "support@medicalrep.dev", icon: LifeBuoy },
      { role: "Auditor", email: "auditor@medicalrep.dev", icon: ClipboardCheck },
      { role: "Guest", email: "guest@medicalrep.dev", icon: User },
    ],
  },
]

const highlights = [
  { icon: Radar, text: "Live GPS field tracking, territory-aware" },
  { icon: Workflow, text: "One approval engine across every module" },
  { icon: ShieldCheck, text: "19 roles, database-enforced RBAC + ABAC" },
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
    router.push("/dashboard")
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
        className="relative overflow-hidden rounded-xl p-8 text-primary-foreground flex flex-col justify-between min-h-[420px] animate-fade-up"
        style={{
          background:
            "radial-gradient(130% 150% at 15% 0%, #7a2b2b 0%, #602020 35%, #3d1515 65%, #26343a 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -right-16 -top-16 size-64 rounded-full opacity-[0.2] blur-[2px] animate-float-slow"
          style={{ background: "radial-gradient(circle, #f8b028 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="bg-white rounded-md p-1.5 shrink-0">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={80} height={33} className="rounded-sm" />
          </div>
          <span className="font-semibold text-lg">Medical Rep CRM</span>
        </div>

        <div className="relative space-y-4 mt-8">
          <h1 className="text-2xl font-semibold leading-tight">
            Field sales, samples, and compliance — one connected platform.
          </h1>
          <p className="text-sm text-white/80 leading-relaxed">
            Territory-aware RBAC, live GPS tracking, approvals, and analytics for medical
            representatives, managers, and every role in between.
          </p>
          <ul className="space-y-2 pt-2">
            {highlights.map((h) => (
              <li key={h.text} className="flex items-center gap-2.5 text-sm text-white/85">
                <span className="grid place-items-center size-7 rounded-md bg-white/10 ring-1 ring-white/15 shrink-0">
                  <h.icon className="size-3.5" aria-hidden />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60 mt-8">Powered by Zicon Technology</p>
      </div>

      <div className="space-y-6">
        <Card className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
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

        <Card className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="text-base">Quick demo login</CardTitle>
            <p className="text-sm text-muted-foreground">
              One tap per role — dev-only accounts, all password {DEMO_PASSWORD}.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {DEMO_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="size-1.5 rounded-full" style={{ background: group.accent }} aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.accounts.map((account) => {
                    const isLoading = demoLoadingEmail === account.email
                    return (
                      <button
                        key={account.email}
                        type="button"
                        disabled={demoLoadingEmail !== null}
                        onClick={() => handleDemoLogin(account.email)}
                        className="group flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-transparent hover:bg-[color-mix(in_oklch,var(--tile-accent),transparent_92%)] hover:shadow-[var(--shadow-sm)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        style={{ "--tile-accent": group.accent } as React.CSSProperties}
                      >
                        <span
                          className="grid place-items-center size-8 rounded-md shrink-0"
                          style={{ background: `color-mix(in oklch, ${group.accent}, transparent 85%)`, color: group.accent }}
                        >
                          <account.icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">
                          {account.role}
                        </span>
                        {isLoading ? (
                          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                        ) : (
                          <ChevronRight
                            className="size-3.5 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0"
                            aria-hidden
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
