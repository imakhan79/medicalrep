export default function Loading() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl border border-border bg-card p-4">
            <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
            <div className="mt-3 h-8 w-1/3 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-xl border border-border bg-card animate-pulse" />
    </div>
  )
}
