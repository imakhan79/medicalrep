import Link from "next/link"

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/hcps", label: "HCPs" },
  { href: "/visits", label: "Visits" },
]

export function NavBar() {
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
      </nav>
    </header>
  )
}
