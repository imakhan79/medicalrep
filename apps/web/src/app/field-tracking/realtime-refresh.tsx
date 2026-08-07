"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Both tables are in the supabase_realtime publication specifically so
 * dashboards can subscribe instead of polling (per the schema migration
 * comment) — refreshes the server-rendered alert/SOS lists on any change
 * so a new emergency doesn't require a manual reload to notice.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`field-tracking-alerts-${tables.join("-")}`)
    for (const table of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => router.refresh())
    }
    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tables is a static prop for this page
  }, [])

  return null
}
