# Permissions & Security

## Roles
`rep`, `area_manager`, `regional_manager`, `admin`, `compliance_officer` (see `public.user_role` enum).

## Permissions matrix (Phase 2 slice)

| Module        | Rep                          | Area/Regional Manager | Admin | Compliance Officer |
|---------------|-------------------------------|------------------------|-------|---------------------|
| HCPs          | read (own territory), create, update | full read/write org-wide | full | read |
| Visits (DCR)  | create/read/update own         | full read org-wide     | full | read |
| Territories   | read                            | full                    | full | read |
| Audit log     | none                             | read                    | read | read |
| Memberships   | none                             | full                    | full | none |

Enforced twice: **RLS policies** (`supabase/migrations/20260807000002_rls.sql`) are the actual authorization boundary; app-layer UI guards (hide/disable actions) are UX only, never trusted for security.

## Security model
- **RLS everywhere**: no table is readable/writable without an explicit policy; default-deny.
- **`security definer` role-check functions**: centralizes "what can this user do" logic so policies can't drift out of sync with each other.
- **Audit trail**: append-only `audit_log`, populated by database trigger — not bypassable from the client.
- **PII/HCP data**: this is B2B rep-to-doctor data, not patient PHI, so HIPAA doesn't directly apply — but HCP personal data (name, contact info) still warrants GDPR-style handling for orgs with EU/UK operations: data minimization, right-to-erasure support (soft-delete + purge job, future), and consent tracking (`hcps.consent_status`) before certain interactions (e.g., sampling).
- **Secrets**: service-role key never shipped to the client; only the anon key + RLS is used client-side.

## WCAG 2.2 AA
Checked during build, not after: color contrast via the Tailwind theme tokens, visible focus states on all interactive shadcn/ui components, semantic form labels, full keyboard navigation on list/detail/forms.
