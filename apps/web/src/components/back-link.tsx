import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Link>
  )
}
