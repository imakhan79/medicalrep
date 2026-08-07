# Architecture

## System overview
```
Next.js 15 (App Router, PWA) ──HTTPS/PostgREST──> Supabase (Postgres + Auth + RLS)
        │                                                │
        └── IndexedDB (Dexie) offline mirror + queue ────┘  (background sync on reconnect)
```

## Multi-tenancy
Shared schema, `organization_id` on every table, enforced by RLS (see `04-permissions-security.md`). Chosen over schema-per-tenant: one migration path, no per-tenant provisioning step, scales to thousands of orgs.

## Offline-first design (DCR module)
1. Rep opens the visit form — HCP list is already cached in IndexedDB (synced whenever online).
2. Submitting a visit writes to IndexedDB immediately (instant UI feedback) and enqueues a mutation with a client-generated `client_id`.
3. A service worker + background sync listener flushes the queue to the `sync-visits` Edge Function when connectivity returns.
4. `client_id` uniqueness makes replay idempotent — a retried sync never double-inserts.
5. Conflict policy: last-write-wins by server timestamp; if the same visit was edited both offline and on the server, the offline edit is kept as a separate flagged record for manual review rather than silently overwritten (future refinement — Phase 2 ships last-write-wins only).

## AI modules (designed now, built later)
- **Next-best-action**: suggest which HCPs a rep should prioritize this week from visit-recency + territory coverage gaps.
- **Territory optimization**: rebalance territory assignments from visit-load and HCP-density data.
- **Anomaly detection**: flag outlier expense claims or sample distribution against a rep's historical pattern, for compliance review.
- **Visit summarization**: turn a rep's voice/free-text notes into structured outcome fields.

None of these are in the Phase 2 slice; they need real usage data first.

## Deployment
Next.js app deployable to Vercel; Supabase project (cloud) as the single source of truth, local Supabase (Docker) for development via CLI migrations.
