"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExportCsvButton({
  rows,
  filename,
  label = "Export CSV",
}: {
  rows: Record<string, string | number | null>[]
  filename: string
  label?: string
}) {
  function handleExport() {
    if (rows.length === 0) return
    const headers = Object.keys(rows[0])
    const escape = (v: string | number | null) => {
      const s = v === null || v === undefined ? "" : String(v)
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={rows.length === 0}>
      <Download className="size-3.5" aria-hidden />
      {label}
    </Button>
  )
}
