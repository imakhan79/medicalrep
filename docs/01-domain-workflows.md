# Domain Workflow Catalog

## Master Data
- **HCPs (doctors)**: specialty, tier/segment, HCO affiliation, territory, consent status. Source of truth for all field activity.
- **HCOs** (hospitals/clinics/pharmacies): affiliation parent for HCPs.
- **Chemists/Stockists**: secondary-sales channel partners (future module).
- **Products**: brand catalog, sample-eligibility flag.
- **Territories & org hierarchy**: Rep → Area Manager → Regional Manager → Admin; territory assignment drives RLS visibility.

## Planning
- **Tour/beat plan**: rep's monthly/weekly planned HCP visits, submitted for manager approval before the period starts.
- **Target setting**: call-frequency and sales targets per rep/territory/product, set top-down by managers.

## Field Execution (Phase 2 build)
- **Daily Call Report (DCR) / Visit Check-in**: rep logs a visit against an HCP — geolocation check-in, objective, products discussed, samples given, outcome notes, next visit date. Must work offline and sync later.
- **Sampling/detailing**: product samples handed to an HCP during a visit, tracked against a monthly allocation cap (compliance-controlled).
- **CME/RCPA events**: continuing medical education sponsorship and retail chemist prescription audits (future module).

## Orders & Inventory (future)
- Secondary sales orders from stockists, sample inventory allocation to reps, stock reconciliation.

## Expense Claims (future)
- Rep submits travel/entertainment expenses tied to visits; multi-level approval by amount threshold (Area Manager → Regional Manager → Finance above a cap).

## Approval Chains (future, general engine)
- Generic state machine: `draft → submitted → approved | rejected → (optionally) escalated`, configurable per workflow (tour plan, expense claim, sample request), routed by org hierarchy.

## Reporting & Dashboards
- Rep: visits today, coverage % of assigned HCPs, frequency vs. plan.
- Manager: team roll-up of the same, territory heatmaps (future, AI-assisted).

## Compliance
- Full audit trail (`audit_log` table) on every mutation to HCP and visit data.
- HCP consent status gates certain interactions (e.g., no sample drop without `granted` consent) — enforced at the application layer on top of RLS.

## Admin
- Tenant (organization) management, user/role/membership management, territory and master-data management — all scoped by `organization_id` + RBAC.
