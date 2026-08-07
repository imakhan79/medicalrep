# Roadmap & Dev Setup

## Build sequence after the Phase 2 slice
1. **Tour Plan + Approval Engine** — generic approval state-machine table, reused by every later approval-gated workflow.
2. **Sample/Inventory Distribution** — sample allocation caps, compliance audit tie-in with `hcps.consent_status`.
3. **Expense Claims** — built on the approval engine from step 1.
4. **Targets & Analytics dashboards** — call-frequency/sales targets, coverage reporting.
5. **AI modules** — next-best-action, territory optimization, anomaly detection (see `05-architecture.md`).

Each gets its own detailed plan (data model + UI + RLS) when we get to it — this roadmap is a sequencing guide, not a spec.

## Local dev setup
```
pnpm install
supabase start          # requires Docker Desktop running
# copy the "anon key" from `supabase status` into apps/web/.env.local (see .env.local.example)
pnpm dev                # http://localhost:3000
```

To create dev users: use Supabase Studio (`supabase status` prints its local URL) → Authentication → Add user, then insert a matching row into `public.memberships` with the desired `role` and the seeded `organization_id` (`00000000-0000-0000-0000-000000000001`).
