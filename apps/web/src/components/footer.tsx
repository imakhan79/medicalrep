import Image from "next/image"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 py-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <Image src="/zicon-logo.png" alt="Zicon Technology" width={56} height={23} />
          <span className="hidden sm:inline h-4 w-px bg-divider" aria-hidden />
          <span>© {new Date().getFullYear()} Zicon Technology. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </footer>
  )
}
