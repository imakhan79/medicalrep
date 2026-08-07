# API Design

## Principle
API-first via Supabase auto-generated PostgREST endpoints for all CRUD, with RLS as the actual authorization layer (not app-code checks) — the same guarantee holds whether the caller is the Next.js app, a future mobile app, or a partner integration.

## REST surface (PostgREST, auto-generated)
- `GET/POST/PATCH/DELETE /rest/v1/hcps`, `/hcos`, `/territories`, `/products`, `/visits`, `/visit_products`, `/memberships` — standard PostgREST filtering/pagination (`?select=`, `?organization_id=eq.<id>`, etc.), all governed by the RLS policies in `02-data-model.md`.
- `/visits` insert uses `client_id` with `Prefer: resolution=merge-duplicates` for idempotent offline sync replay.

## Edge Functions (business logic that doesn't belong in a client-writable table)
- `sync-visits` — batch endpoint the offline queue calls on reconnect; validates a batch of queued visit mutations, applies them transactionally, returns per-item success/conflict status.
- `approval-route` (future) — advances a workflow's approval state machine and notifies the next approver.
- `send-notification` (future) — push/email fan-out for approvals, target alerts.

## Next.js layer
Server Components/Route Handlers act as a thin BFF only where server-side secrets or aggregation are needed (e.g., dashboard roll-up queries); everything else talks to Supabase directly from the client using the anon key + RLS.

## Auth
Supabase Auth (email/password to start); a custom Auth Hook injects `org_id`/`role` as JWT claims at token-issue time so RLS policies avoid a per-request subquery.
