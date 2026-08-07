"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard,
  Stethoscope,
  ClipboardList,
  Map,
  Package,
  Receipt,
  Target,
  Handshake,
  ShoppingCart,
  Sparkles,
  Compass,
  ShieldAlert,
  Radar,
  Route,
  CalendarClock,
  UserCheck,
  ClipboardCheck,
  Building2,
  KeyRound,
  Users,
  History,
  MapPinned,
  Settings,
  LogOut,
  LogIn,
  type LucideIcon,
} from "lucide-react"

type NavLink = { href: string; label: string; icon: LucideIcon }

const groups: { label: string; icon: LucideIcon; links: NavLink[] }[] = [
  {
    label: "Field Ops",
    icon: Stethoscope,
    links: [
      { href: "/hcps", label: "HCPs", icon: Stethoscope },
      { href: "/visits", label: "Visits", icon: ClipboardList },
      { href: "/tour-plans", label: "Tour Plans", icon: Map },
      { href: "/sample-inventory", label: "Samples", icon: Package },
    ],
  },
  {
    label: "Commercial",
    icon: Receipt,
    links: [
      { href: "/expense-claims", label: "Expenses", icon: Receipt },
      { href: "/targets", label: "Targets", icon: Target },
      { href: "/channel-partners", label: "Partners", icon: Handshake },
      { href: "/orders", label: "Orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Intelligence",
    icon: Sparkles,
    links: [
      { href: "/next-best-actions", label: "Next Best Actions", icon: Sparkles },
      { href: "/territory-optimization", label: "Territory Optimization", icon: Compass },
      { href: "/anomalies", label: "Anomalies", icon: ShieldAlert },
    ],
  },
  {
    label: "Live Tracking",
    icon: Radar,
    links: [
      { href: "/field-tracking", label: "Live Map", icon: Radar },
      { href: "/field-tracking/replay", label: "Route Replay", icon: Route },
      { href: "/field-tracking/geofences", label: "Geofences", icon: MapPinned },
      { href: "/field-tracking/settings", label: "Tracking Settings", icon: Settings },
    ],
  },
  {
    label: "HR",
    icon: CalendarClock,
    links: [
      { href: "/hr/leave", label: "Leave", icon: CalendarClock },
      { href: "/hr/attendance", label: "Attendance", icon: UserCheck },
      { href: "/hr/performance", label: "Performance", icon: ClipboardCheck },
    ],
  },
  {
    label: "Admin",
    icon: KeyRound,
    links: [
      { href: "/admin/companies", label: "Companies", icon: Building2 },
      { href: "/admin/roles", label: "Roles", icon: KeyRound },
      { href: "/admin/staff", label: "Staff", icon: Users },
      { href: "/admin/audit-log", label: "Audit Log", icon: History },
    ],
  },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isHome = pathname === "/"

  return (
    <header className="border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/zicon-logo.png" alt="Zicon Technology" width={72} height={29} priority />
          <span className="hidden lg:block h-6 w-px bg-divider" aria-hidden />
          <span className="font-semibold tracking-tight text-foreground hidden sm:inline text-[15px]">
            Medical Rep CRM
          </span>
        </Link>
        {!isHome && (
          <Link
            href="/dashboard"
            className={`ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ${
              pathname === "/dashboard"
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                : "text-foreground/70 hover:bg-muted hover:text-foreground"
            }`}
          >
            <LayoutDashboard className="size-4" aria-hidden />
            Dashboard
          </Link>
        )}
        <span className="ml-auto flex items-center gap-2 text-sm">
          {email ? (
            <>
              {isHome && (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors duration-200"
                >
                  <LayoutDashboard className="size-4" aria-hidden />
                  Go to dashboard
                </Link>
              )}
              <span className="hidden md:inline text-muted-foreground text-xs px-2.5 py-1 rounded-full bg-muted">
                {email}
              </span>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <LogOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <LogIn className="size-4" aria-hidden />
              Sign in
            </Link>
          )}
        </span>
      </div>
      {!isHome && (
      <nav aria-label="Primary" className="max-w-6xl mx-auto flex items-stretch gap-6 overflow-x-auto px-4 sm:px-6 pb-3">
        {groups.map((group) => (
          <div key={group.label} className="shrink-0">
            <p className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
              <group.icon className="size-3" aria-hidden />
              {group.label}
            </p>
            <div className="flex items-center gap-1">
              {group.links.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      active
                        ? "bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                        : "text-foreground/75 hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <link.icon className="size-3.5" aria-hidden />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
      )}
    </header>
  )
}
