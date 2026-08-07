import Image from "next/image"
import Link from "next/link"
import {
  Radar,
  ShieldCheck,
  Workflow,
  Sparkles,
  Users,
  ClipboardCheck,
  ArrowRight,
  MapPin,
  TrendingUp,
  FilePlus2,
  Send,
  CheckCheck,
  BarChart3,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Radar,
    title: "Live Field Tracking",
    body: "Real-time GPS, geofenced visit detection, route replay, and statistical anti-spoofing — not a simple map widget.",
    accent: "var(--chart-1)",
  },
  {
    icon: Workflow,
    title: "Built-In Approval Engine",
    body: "Tour plans, expense claims, orders, and leave all route through the same auditable draft → submit → approve workflow.",
    accent: "var(--accent)",
  },
  {
    icon: Sparkles,
    title: "Deterministic AI Intelligence",
    body: "Next-best-action visit priority, territory load balancing, and anomaly detection — explainable, not a black box.",
    accent: "var(--chart-3)",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise RBAC + ABAC",
    body: "19 configurable roles with platform, org, hierarchy, territory, and own-record scoping enforced at the database layer.",
    accent: "var(--primary)",
  },
  {
    icon: Users,
    title: "Every Role, One Platform",
    body: "From Medical Representative to Platform Owner — dedicated permissions, dashboards, and workflows for each.",
    accent: "var(--chart-5)",
  },
  {
    icon: ClipboardCheck,
    title: "HR & Compliance Built In",
    body: "GPS-derived attendance, leave approvals, performance reviews, and an immutable audit log across every module.",
    accent: "var(--chart-4)",
  },
]

const stats = [
  { value: "19", label: "Configurable roles" },
  { value: "6", label: "Connected modules" },
  { value: "100%", label: "Auditable approvals" },
  { value: "Live", label: "GPS field tracking" },
]

const steps = [
  { icon: FilePlus2, title: "Draft", body: "A rep logs a visit, tour plan, expense, or order from the field — online or off." },
  { icon: Send, title: "Submit", body: "One tap routes it into the same permission-aware approval engine, every time." },
  { icon: CheckCheck, title: "Approve", body: "Territory-scoped managers see exactly what they're allowed to — nothing more." },
  { icon: BarChart3, title: "Analyze", body: "Every decision lands in an immutable audit log, feeding dashboards and AI insight." },
]

const roles = [
  "Super Admin", "Platform Owner", "Company Admin", "National Sales Manager",
  "Zonal Manager", "Regional Manager", "Area Sales Manager", "Territory Manager",
  "Medical Representative", "Key Account Manager", "Product Manager", "Marketing Manager",
  "HR", "Finance", "Warehouse Manager", "Purchasing Officer",
  "Customer Support", "Auditor", "Guest",
]

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-8">
      <section
        className="relative overflow-hidden rounded-2xl min-h-[540px] sm:min-h-[620px] flex items-center -mt-2"
        style={{
          background:
            "radial-gradient(120% 140% at 12% 0%, #7a2b2b 0%, #602020 32%, #3d1515 62%, #26343a 100%)",
        }}
      >
        {/* Brand glow accents */}
        <div
          aria-hidden
          className="absolute -right-32 -top-32 size-[28rem] rounded-full opacity-[0.22] blur-[2px] animate-float-slow"
          style={{ background: "radial-gradient(circle, #f8b028 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="absolute -left-20 bottom-0 size-72 rounded-full opacity-[0.14] blur-[2px] animate-float-slow"
          style={{ background: "radial-gradient(circle, #a4b4b6 0%, transparent 70%)", animationDelay: "-4s" }}
        />
        {/* Subtle dot-grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.25) 100%)" }}
        />

        <div className="relative w-full px-6 sm:px-12 py-14 flex flex-col items-start gap-7 max-w-3xl">
          <div className="bg-white rounded-xl p-3 shadow-[var(--shadow-lg)] animate-fade-up">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={140} height={57} priority />
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8b028] ring-1 ring-white/15 animate-fade-up"
            style={{ animationDelay: "0.05s" }}
          >
            <Sparkles className="size-3" aria-hidden />
            Field Force Intelligence Platform
          </div>
          <h1
            className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.05] animate-fade-up"
            style={{ animationDelay: "0.1s" }}
          >
            Medical Rep CRM,
            <br />
            built for the field.
          </h1>
          <p
            className="text-white/85 text-base sm:text-lg max-w-xl leading-relaxed animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            Territory-aware RBAC, live GPS tracking, deterministic AI intelligence, and a
            single approval engine connecting every workflow — from HCP visits to
            expense claims to secondary sales orders.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1 animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              Sign in <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
              style={{ background: "rgba(255,255,255,0.06)", color: "white", borderColor: "rgba(255,255,255,0.3)" }}
            >
              Explore the demo
            </Link>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 pt-8 w-full border-t border-white/15 mt-2 animate-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{s.value}</p>
                <p className="text-xs sm:text-sm text-white/60 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-2xl mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Platform</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            One system for field ops, compliance, and intelligence.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="group">
              <CardContent className="pt-6">
                <div
                  className="grid place-items-center size-11 rounded-lg mb-4 transition-transform duration-200 group-hover:scale-105"
                  style={{ background: `color-mix(in oklch, ${f.accent}, transparent 88%)`, color: f.accent }}
                >
                  <f.icon className="size-5" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-2">Workflow</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            One approval engine, every workflow.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
          <div
            aria-hidden
            className="hidden lg:block absolute top-6 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border to-transparent"
          />
          {steps.map((s, i) => (
            <div key={s.title} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative z-10 grid place-items-center size-12 rounded-full bg-primary text-primary-foreground font-semibold shadow-[var(--shadow-md)]">
                  {i + 1}
                </div>
                <s.icon className="size-5 text-muted-foreground" aria-hidden />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(115deg, #35474d 0%, #26343a 55%, #1c2529 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute -right-16 -bottom-24 size-96 rounded-full opacity-[0.12]"
          style={{ background: "radial-gradient(circle, #f8b028 0%, transparent 70%)" }}
        />
        <div className="relative grid lg:grid-cols-[1.1fr_1fr] items-center gap-8 px-6 sm:px-12 py-12">
          <div className="max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
              Nineteen roles. One connected platform.
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6">
              Super Admin to Medical Representative — every role gets its own permissions,
              territory-scoped visibility, and dashboard, configurable without touching code.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-7">
              {roles.map((r) => (
                <span
                  key={r}
                  className="text-xs px-2.5 py-1 rounded-full bg-white/8 text-white/70 ring-1 ring-white/10"
                >
                  {r}
                </span>
              ))}
            </div>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg" })}
              style={{ background: "white", color: "#602020" }}
            >
              See it in action <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Product preview mockup — real UI language, no stock photography */}
          <div className="hidden lg:block rounded-xl bg-[#211c17]/80 ring-1 ring-white/10 shadow-[var(--shadow-lg)] p-4 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-2.5 rounded-full bg-[#f87171]/70" />
              <span className="size-2.5 rounded-full bg-[#fbbf5c]/70" />
              <span className="size-2.5 rounded-full bg-[#4ade80]/70" />
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-white/50">
                <MapPin className="size-3" aria-hidden /> Live Map
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "On duty", value: "12", color: "#4ade80" },
                { label: "Visits today", value: "38", color: "#f8b028" },
                { label: "Alerts", value: "2", color: "#f87171" },
              ].map((k) => (
                <div key={k.label} className="rounded-lg bg-white/5 p-2.5">
                  <p className="text-lg font-semibold text-white">{k.value}</p>
                  <p className="text-[10px] text-white/50">{k.label}</p>
                  <span className="block h-1 w-full rounded-full mt-1.5" style={{ background: k.color, opacity: 0.7 }} />
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-white/5 p-3 flex items-center gap-2">
              <TrendingUp className="size-3.5 text-[#f8b028]" aria-hidden />
              <div className="flex-1 flex items-end gap-1 h-10">
                {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${h}%`, background: i === 5 ? "#f8b028" : "rgba(255,255,255,0.25)" }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden rounded-2xl text-center px-6 sm:px-12 py-14"
        style={{ background: "linear-gradient(135deg, #602020 0%, #4c1a1a 100%)" }}
      >
        <div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -top-16 size-72 rounded-full opacity-[0.18]"
          style={{ background: "radial-gradient(circle, #f8b028 0%, transparent 70%)" }}
        />
        <div className="relative max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
            Ready to see your field force in real time?
          </h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-7">
            Sign in with any of the 19 demo roles and explore the full platform — no setup required.
          </p>
          <Link href="/login" className={buttonVariants({ size: "lg" })}>
            Sign in <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </section>
    </div>
  )
}
