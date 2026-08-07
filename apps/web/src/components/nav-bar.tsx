"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const groups = [
  {
    label: "Field Ops",
    links: [
      { href: "/hcps", label: "HCPs" },
      { href: "/visits", label: "Visits" },
      { href: "/tour-plans", label: "Tour Plans" },
      { href: "/sample-inventory", label: "Samples" },
    ],
  },
  {
    label: "Commercial",
    links: [
      { href: "/expense-claims", label: "Expenses" },
      { href: "/targets", label: "Targets" },
      { href: "/channel-partners", label: "Partners" },
      { href: "/orders", label: "Orders" },
    ],
  },
  {
    label: "Intelligence",
    links: [
      { href: "/next-best-actions", label: "Next Best Actions" },
      { href: "/territory-optimization", label: "Territory Optimization" },
      { href: "/anomalies", label: "Anomalies" },
    ],
  },
  {
    label: "Live Tracking",
    links: [
      { href: "/field-tracking", label: "Live Map" },
      { href: "/field-tracking/replay", label: "Route Replay" },
    ],
  },
  {
    label: "HR",
    links: [
      { href: "/hr/leave", label: "Leave" },
      { href: "/hr/attendance", label: "Attendance" },
      { href: "/hr/performance", label: "Performance" },
    ],
  },
  {
    label: "Admin",
    links: [
      { href: "/admin/companies", label: "Companies" },
      { href: "/admin/roles", label: "Roles" },
      { href: "/admin/staff", label: "Staff" },
    ],
  },
]

export function NavBar() {
  const pathname = usePathname()
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
    window.location.href = "/login"
  }

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="max-w-6xl mx-auto flex items-center gap-4 px-3 sm:px-4 py-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/zicon-logo.png" alt="Zicon Technology" width={64} height={26} />
          <span className="font-semibold tracking-tight text-primary hidden sm:inline">Medical Rep CRM</span>
        </Link>
        <Link
          href="/"
          className={`ml-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            pathname === "/" ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
          }`}
        >
          Dashboard
        </Link>
        <span className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          {email ? (
            <>
              <span className="hidden md:inline">{email}</span>
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-full font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-1.5 rounded-full font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign in
            </Link>
          )}
        </span>
      </div>
      <nav aria-label="Primary" className="max-w-6xl mx-auto flex items-stretch gap-5 overflow-x-auto px-3 sm:px-4 pb-3">
        {groups.map((group) => (
          <div key={group.label} className="shrink-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
              {group.label}
            </p>
            <div className="flex items-center gap-1">
              {group.links.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-2.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground/80"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </header>
  )
}
