import { db } from "./db"
import { createClient } from "@/lib/supabase/client"

export async function flushQueuedVisits() {
  const pending = await db.visits.where("synced").equals(0).toArray()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  const supabase = createClient()
  let synced = 0
  let failed = 0

  for (const visit of pending) {
    const { client_id, ...rest } = visit
    const { error } = await supabase
      .from("visits")
      .upsert({ client_id, ...rest }, { onConflict: "client_id" })

    if (error) {
      failed++
      continue
    }
    await db.visits.update(client_id, { synced: 1 })
    synced++
  }

  return { synced, failed }
}

export function registerSyncListeners(onSync: () => void) {
  const handler = async () => {
    if (navigator.onLine) {
      await flushQueuedVisits()
      onSync()
    }
  }
  window.addEventListener("online", handler)
  return () => window.removeEventListener("online", handler)
}
