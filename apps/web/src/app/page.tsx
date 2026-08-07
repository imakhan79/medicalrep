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
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: Radar,
    title: "Live Field Tracking",
    body: "Real-time GPS, geofenced visit detection, route replay, and statistical anti-spoofing — not a simple map widget.",
  },
  {
    icon: Workflow,
    title: "Built-In Approval Engine",
    body: "Tour plans, expense claims, orders, and leave all route through the same auditable draft → submit → approve workflow.",
  },
  {
    icon: Sparkles,
    title: "Deterministic AI Intelligence",
    body: "Next-best-action visit priority, territory load balancing, and anomaly detection — explainable, not a black box.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise RBAC + ABAC",
    body: "19 configurable roles with platform, org, hierarchy, territory, and own-record scoping enforced at the database layer.",
  },
  {
    icon: Users,
    title: "Every Role, One Platform",
    body: "From Medical Representative to Platform Owner — dedicated permissions, dashboards, and workflows for each.",
  },
  {
    icon: ClipboardCheck,
    title: "HR & Compliance Built In",
    body: "GPS-derived attendance, leave approvals, performance reviews, and an immutable audit log across every module.",
  },
]

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-8">
      <section className="relative overflow-hidden rounded-2xl min-h-[440px] sm:min-h-[520px] flex items-center -mt-2">
        <Image
          src="/images/hero-healthcare.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1152px"
          className="object-cover object-[center_18%]"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, #602020 12%, rgba(61,20,20,0.93) 42%, rgba(53,71,77,0.55) 85%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 size-80 rounded-full opacity-[0.16] blur-[2px]"
          style={{ background: "#f8b028" }}
        />

        <div className="relative w-full px-6 sm:px-12 py-14 flex flex-col items-start gap-6 max-w-3xl">
          <div className="bg-white rounded-lg p-2.5 shadow-[var(--shadow-lg)]">
            <Image src="/zicon-logo.png" alt="Zicon Technology" width={130} height={53} priority />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/85">
            Field Force Intelligence Platform
          </div>
          <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-white leading-[1.05]">
            Medical Rep CRM,
            <br />
            built for the field.
          </h1>
          <p className="text-white/85 text-base sm:text-lg max-w-xl leading-relaxed">
            Territory-aware RBAC, live GPS tracking, deterministic AI intelligence, and a
            single approval engine connecting every workflow — from HCP visits to
            expense claims to secondary sales orders.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
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
            <Card key={f.title}>
              <CardContent className="pt-6">
                <div className="grid place-items-center size-11 rounded-lg bg-primary-soft text-primary mb-4">
                  <f.icon className="size-5" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl">
        <div className="relative min-h-[320px] flex items-center">
          <Image
            src="/images/hero-team.jpg"
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1152px"
            className="object-cover object-[center_30%]"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg, rgba(53,71,77,0.92) 0%, rgba(53,71,77,0.7) 55%, rgba(53,71,77,0.25) 100%)" }}
          />
          <div className="relative px-6 sm:px-12 py-12 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-3">
              Nineteen roles. One connected platform.
            </h2>
            <p className="text-white/85 text-sm sm:text-base leading-relaxed mb-6">
              Super Admin to Medical Representative — every role gets its own permissions,
              territory-scoped visibility, and dashboard, configurable without touching code.
            </p>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg" })}
              style={{ background: "white", color: "#602020" }}
            >
              See it in action <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
