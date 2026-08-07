"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/hcps", label: "HCPs" },
  { href: "/visits", label: "Visits" },
  { href: "/admin/roles", label: "Roles & Permissions" },
  { href: "/admin/staff", label: "Staff" },
]

export function NavBar() {
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
    <header className="border-b bg-card">
      <nav
        aria-label="Primary"
        className="max-w-5xl mx-auto flex items-center gap-1 p-3 sm:p-4"
      >
        <span className="font-semibold mr-4 text-teal-700 dark:text-teal-400">
          Medical Rep CRM
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="px-3 py-2 rounded-md text-sm font-medium hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            {link.label}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          {email ? (
            <>
              <span>{email}</span>
              <button
                onClick={handleSignOut}
                className="px-3 py-2 rounded-md font-medium hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="px-3 py-2 rounded-md font-medium hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
            >
              Sign in
            </Link>
          )}
        </span>
      </nav>
    </header>
  )
}
