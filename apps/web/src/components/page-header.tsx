import type { LucideIcon } from "lucide-react"

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 grid place-items-center size-10 rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden />
      </div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
