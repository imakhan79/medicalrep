# Permissions & Security

## RBAC + ABAC engine

Permissions are **data, not code** — `roles`, `resources`, `permissions`, and `role_permissions` tables (see `supabase/migrations/20260807000003_rbac_engine.sql`), not a hardcoded enum. A Company Admin can create custom roles and adjust grants at runtime via the `configure` permission on the `roles` resource, without a code change or migration.

Every grant is a `(role, resource, action)` triple plus a **scope** — the ABAC layer:

| Scope | Meaning |
|---|---|
| `platform` | Cross-tenant — every organization (Super Admin, Platform Owner only) |
| `org` | Everything within the caller's organization |
| `hierarchy` | The caller's assigned territory **and all its descendants** (Zonal/Regional/Area managers) |
| `territory` | The caller's assigned territory only (Territory Manager) |
| `own` | Only rows the caller created/owns (a rep's own visits) |

`role_permissions.conditions` (jsonb) is reserved for finer per-grant constraints later — e.g. `{"max_amount": 5000}` capping what a Regional Manager can approve on an expense claim — without needing new scope values.

Territory hierarchy is a self-referencing `territories.parent_territory_id` (Zone → Region → Area → Territory); `public.territory_and_descendants()` walks it for `hierarchy` scope.

## The actual authorization boundary: `public.can_access_row()`

Every RLS policy calls this one `security definer` function (`supabase/migrations/20260807000003_rbac_engine.sql`) instead of embedding scope logic per-table:

```sql
can_access_row(org_id, resource_key, action, territory_id, owner_id) → boolean
```

It resolves the caller's role via `memberships.role_id`, finds the matching grant, and evaluates it against the row's `territory_id`/`owner_id` per the scope rules above. RLS policies (`20260807000004_rls_use_rbac.sql`) are thin wrappers around this — the actual security boundary is centralized in one function, not duplicated across 10+ tables' worth of policies. App-layer UI checks (hide/disable buttons) are UX only and never trusted for security.

## Actions

`view, create, edit, delete, approve, reject, export, import, assign, configure` (`public.permission_action` enum) — the same 10 actions apply to every resource; a role simply may or may not have a grant for a given `(resource, action)` pair.

## Role catalog (19 system roles, seeded in `supabase/seed.sql`)

| Role | Typical scope | Summary |
|---|---|---|
| Super Admin | platform | Full cross-tenant control |
| Platform Owner | platform | Business owner; platform + org config, reporting, audit |
| Company Admin | org | Full control of their organization, can configure custom roles |
| National Sales Manager | org | Org-wide sales oversight, target/tour-plan/expense approvals |
| Zonal / Regional / Area Manager | hierarchy | Same permission shape, differ only by which territory subtree they're assigned to |
| Territory Manager | territory | Manages one territory's HCPs, tour plans, inventory requests |
| Medical Representative | territory (view) / own (write) | Views territory HCPs, creates/edits only their own visits, tour plans, expense claims |
| Key Account Manager | territory (view/edit) / own (write) | Like a rep, but can edit assigned key HCO/HCP accounts directly |
| Product Manager | org | Owns the product catalog |
| Marketing Manager | org | Owns marketing materials, views HCP/HCO data |
| HR | org | Manages staff, memberships, role assignment |
| Finance | org | Approves expense claims and orders, exports financial reports |
| Warehouse Manager | org | Manages sample inventory and stock orders |
| Purchasing Officer | org | Raises and approves purchase orders |
| Customer Support | org | Read-mostly access to HCPs/visits |
| Auditor | org | View + export everywhere, including the audit log; no write access anywhere |
| Guest | org | Minimal read-only (HCOs, products) |

**Doctor, Pharmacy, Hospital, Clinic, Distributor, Stockist are deliberately not login roles** — they remain data entities (`hcps`, `hcos`, and future `partners`/order tables) managed by the internal roles above. Real self-service portals for these parties (a distributor viewing their own orders, a doctor viewing their own visit history) are a distinct future phase — each would need its own auth boundary, not just a role label, since it crosses from "staff acting on data" to "external party acting on their own data."

## Security model
- **RLS everywhere, default-deny**: no table is readable/writable without an explicit policy; `can_access_row` returns `false` when no grant matches.
- **Audit trail**: append-only `audit_log`, populated by a database trigger — not bypassable from the client.
- **PII/HCP data**: B2B rep-to-doctor data, not patient PHI, so HIPAA doesn't directly apply — but HCP personal data still warrants GDPR-style handling for orgs with EU/UK operations: data minimization, consent tracking (`hcps.consent_status`), right-to-erasure support (future).
- **Secrets**: service-role key never shipped to the client; only the anon key + RLS is used client-side.

## WCAG 2.2 AA
Checked during build: color contrast via Tailwind theme tokens, visible focus states on all interactive shadcn/ui components, semantic form labels, full keyboard navigation.
