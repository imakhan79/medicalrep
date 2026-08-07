import Dexie, { type EntityTable } from "dexie"

export interface CachedHcp {
  id: string
  first_name: string
  last_name: string
  specialty: string | null
  tier: string | null
  hco_id: string | null
  territory_id: string | null
  consent_status: "granted" | "pending" | "revoked"
}

export interface QueuedVisit {
  client_id: string
  hcp_id: string
  rep_id: string
  visited_at: string
  objective: string | null
  outcome_notes: string | null
  next_visit_date: string | null
  latitude: number | null
  longitude: number | null
  synced: 0 | 1
  created_at: string
}

const db = new Dexie("medicalrep-offline") as Dexie & {
  hcps: EntityTable<CachedHcp, "id">
  visits: EntityTable<QueuedVisit, "client_id">
}

db.version(1).stores({
  hcps: "id, territory_id",
  visits: "client_id, synced, hcp_id",
})

export { db }
