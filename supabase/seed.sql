-- Dev seed: RBAC catalog (resources/roles/permissions), one org, a rep + manager auth user
-- (password: DevPassword123! — dev-only, never use in prod), a territory, HCO/HCP, a product.

-- ── Resource catalog ─────────────────────────────────────────────────────────
insert into public.resources (key, name, module) values
  ('organizations', 'Organizations', 'admin'),
  ('roles', 'Roles & Permissions', 'admin'),
  ('memberships', 'Staff & Memberships', 'admin'),
  ('territories', 'Territories', 'master_data'),
  ('hcos', 'Healthcare Organizations', 'master_data'),
  ('hcps', 'Healthcare Providers', 'master_data'),
  ('products', 'Products', 'master_data'),
  ('channel_partners', 'Channel Partners (Stockists/Distributors/Pharmacies)', 'master_data'),
  ('visits', 'Visits / Daily Call Reports', 'field_execution'),
  ('tour_plans', 'Tour Plans', 'planning'),
  ('targets', 'Targets', 'planning'),
  ('expense_claims', 'Expense Claims', 'finance'),
  ('sample_inventory', 'Sample Inventory', 'inventory'),
  ('orders', 'Orders', 'inventory'),
  ('reports', 'Reports & Dashboards', 'analytics'),
  ('audit_log', 'Audit Log', 'compliance'),
  ('field_tracking', 'Field Tracking (Live Location & Routes)', 'tracking')
on conflict (key) do nothing;

-- Full action catalog per resource (the "menu" of what's possible; role_permissions decides what's granted).
insert into public.permissions (resource_id, action)
select r.id, a.action
from public.resources r
cross join unnest(enum_range(null::public.permission_action)) as a(action)
on conflict (resource_id, action) do nothing;

-- ── System roles ──────────────────────────────────────────────────────────
insert into public.roles (key, name, description, is_system) values
  ('super_admin', 'Super Admin', 'Full cross-tenant platform access', true),
  ('platform_owner', 'Platform Owner', 'Business owner of the platform, full cross-tenant access', true),
  ('company_admin', 'Company Admin', 'Full access within their organization, can configure roles', true),
  ('national_sales_manager', 'National Sales Manager', 'Org-wide sales oversight and approvals', true),
  ('zonal_manager', 'Zonal Manager', 'Manages a zone (territory subtree)', true),
  ('regional_manager', 'Regional Manager', 'Manages a region (territory subtree)', true),
  ('area_sales_manager', 'Area Sales Manager', 'Manages an area (territory subtree)', true),
  ('territory_manager', 'Territory Manager', 'Manages a single territory', true),
  ('medical_representative', 'Medical Representative', 'Field rep logging visits in their territory', true),
  ('key_account_manager', 'Key Account Manager', 'Owns relationships with named key HCO accounts', true),
  ('product_manager', 'Product Manager', 'Owns product catalog and positioning', true),
  ('marketing_manager', 'Marketing Manager', 'Owns marketing materials and campaigns', true),
  ('hr', 'HR', 'Manages staff and role assignments', true),
  ('finance', 'Finance', 'Approves and audits financial transactions', true),
  ('warehouse_manager', 'Warehouse Manager', 'Manages sample inventory and stock orders', true),
  ('purchasing_officer', 'Purchasing Officer', 'Raises and approves purchase orders', true),
  ('customer_support', 'Customer Support', 'Read-mostly support access to HCPs and visits', true),
  ('auditor', 'Auditor', 'Read + export access everywhere, including the audit log', true),
  ('guest', 'Guest', 'Minimal read-only demo access', true)
on conflict (key) where organization_id is null do nothing;

-- ── Role → permission grants (role_key, resource_key, actions, scope) ──────────────────────
do $$
declare
  grant_row record;
  act text;
  v_role_id uuid;
  v_permission_id uuid;
begin
  for grant_row in
    select * from (values
      -- Full cross-tenant control
      ('super_admin', 'organizations', array['view','create','edit','delete','configure'], 'platform'),
      ('super_admin', 'roles', array['view','create','edit','delete','configure'], 'platform'),
      ('super_admin', 'memberships', array['view','create','edit','delete','assign'], 'platform'),
      ('super_admin', 'territories', array['view','create','edit','delete','assign'], 'platform'),
      ('super_admin', 'hcos', array['view','create','edit','delete','import','export'], 'platform'),
      ('super_admin', 'hcps', array['view','create','edit','delete','import','export'], 'platform'),
      ('super_admin', 'products', array['view','create','edit','delete','import','export'], 'platform'),
      ('super_admin', 'channel_partners', array['view','create','edit','delete','import','export'], 'platform'),
      ('super_admin', 'visits', array['view','create','edit','delete','export'], 'platform'),
      ('super_admin', 'tour_plans', array['view','create','edit','delete','approve','reject'], 'platform'),
      ('super_admin', 'targets', array['view','create','edit','delete'], 'platform'),
      ('super_admin', 'expense_claims', array['view','create','edit','delete','approve','reject','export'], 'platform'),
      ('super_admin', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'platform'),
      ('super_admin', 'orders', array['view','create','edit','delete','approve','reject','export'], 'platform'),
      ('super_admin', 'reports', array['view','export'], 'platform'),
      ('super_admin', 'audit_log', array['view','export'], 'platform'),
      ('super_admin', 'field_tracking', array['view','edit','export','configure'], 'platform'),

      ('platform_owner', 'organizations', array['view','create','edit','delete','configure'], 'platform'),
      ('platform_owner', 'roles', array['view','create','edit','delete','configure'], 'platform'),
      ('platform_owner', 'memberships', array['view','create','edit','delete','assign'], 'platform'),
      ('platform_owner', 'reports', array['view','export'], 'platform'),
      ('platform_owner', 'audit_log', array['view','export'], 'platform'),
      ('platform_owner', 'field_tracking', array['view','edit','export','configure'], 'platform'),

      -- Full control within one org
      ('company_admin', 'organizations', array['view','edit'], 'org'),
      ('company_admin', 'roles', array['view','create','edit','delete','configure'], 'org'),
      ('company_admin', 'memberships', array['view','create','edit','delete','assign'], 'org'),
      ('company_admin', 'territories', array['view','create','edit','delete','assign'], 'org'),
      ('company_admin', 'hcos', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'hcps', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'products', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'channel_partners', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'visits', array['view','create','edit','delete','export'], 'org'),
      ('company_admin', 'tour_plans', array['view','create','edit','delete','approve','reject'], 'org'),
      ('company_admin', 'targets', array['view','create','edit','delete'], 'org'),
      ('company_admin', 'expense_claims', array['view','create','edit','delete','approve','reject','export'], 'org'),
      ('company_admin', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'org'),
      ('company_admin', 'orders', array['view','create','edit','delete','approve','reject','export'], 'org'),
      ('company_admin', 'reports', array['view','export'], 'org'),
      ('company_admin', 'audit_log', array['view','export'], 'org'),
      ('company_admin', 'field_tracking', array['view','edit','export','configure'], 'org'),

      ('national_sales_manager', 'hcos', array['view'], 'org'),
      ('national_sales_manager', 'hcps', array['view','export'], 'org'),
      ('national_sales_manager', 'visits', array['view','export'], 'org'),
      ('national_sales_manager', 'territories', array['view'], 'org'),
      ('national_sales_manager', 'targets', array['view','create','edit','approve'], 'org'),
      ('national_sales_manager', 'tour_plans', array['view','approve','reject'], 'org'),
      ('national_sales_manager', 'expense_claims', array['view','approve','reject','export'], 'org'),
      ('national_sales_manager', 'reports', array['view','export'], 'org'),
      ('national_sales_manager', 'field_tracking', array['view','edit','export'], 'org'),
      ('national_sales_manager', 'products', array['view'], 'org'),
      ('national_sales_manager', 'memberships', array['view'], 'org'),

      -- Territory-hierarchy management tiers (zonal/regional/area share the same shape;
      -- only which territory subtree they're assigned to differs)
      ('zonal_manager', 'hcos', array['view'], 'hierarchy'),
      ('zonal_manager', 'hcps', array['view','edit'], 'hierarchy'),
      ('zonal_manager', 'visits', array['view','export'], 'hierarchy'),
      ('zonal_manager', 'territories', array['view','assign'], 'hierarchy'),
      ('zonal_manager', 'targets', array['view','edit'], 'hierarchy'),
      ('zonal_manager', 'tour_plans', array['view','approve','reject'], 'hierarchy'),
      ('zonal_manager', 'expense_claims', array['view','approve','reject'], 'hierarchy'),
      ('zonal_manager', 'sample_inventory', array['view','assign'], 'hierarchy'),
      ('zonal_manager', 'reports', array['view','export'], 'hierarchy'),
      ('zonal_manager', 'field_tracking', array['view','edit','export'], 'hierarchy'),

      ('regional_manager', 'hcos', array['view'], 'hierarchy'),
      ('regional_manager', 'hcps', array['view','edit'], 'hierarchy'),
      ('regional_manager', 'visits', array['view','export'], 'hierarchy'),
      ('regional_manager', 'territories', array['view','assign'], 'hierarchy'),
      ('regional_manager', 'targets', array['view','edit'], 'hierarchy'),
      ('regional_manager', 'tour_plans', array['view','approve','reject'], 'hierarchy'),
      ('regional_manager', 'expense_claims', array['view','approve','reject'], 'hierarchy'),
      ('regional_manager', 'sample_inventory', array['view','assign'], 'hierarchy'),
      ('regional_manager', 'reports', array['view','export'], 'hierarchy'),
      ('regional_manager', 'field_tracking', array['view','edit','export'], 'hierarchy'),

      ('area_sales_manager', 'hcos', array['view'], 'hierarchy'),
      ('area_sales_manager', 'hcps', array['view','edit'], 'hierarchy'),
      ('area_sales_manager', 'visits', array['view'], 'hierarchy'),
      ('area_sales_manager', 'tour_plans', array['view','approve'], 'hierarchy'),
      ('area_sales_manager', 'expense_claims', array['view','approve'], 'hierarchy'),
      ('area_sales_manager', 'sample_inventory', array['view','assign'], 'hierarchy'),
      ('area_sales_manager', 'reports', array['view'], 'hierarchy'),
      ('area_sales_manager', 'targets', array['view','edit'], 'hierarchy'),
      ('area_sales_manager', 'field_tracking', array['view','edit'], 'hierarchy'),

      ('territory_manager', 'hcos', array['view'], 'territory'),
      ('territory_manager', 'channel_partners', array['view'], 'territory'),
      ('territory_manager', 'hcps', array['view','create','edit'], 'territory'),
      ('territory_manager', 'visits', array['view'], 'territory'),
      ('territory_manager', 'tour_plans', array['view','create','edit'], 'territory'),
      ('territory_manager', 'targets', array['view'], 'territory'),
      ('territory_manager', 'sample_inventory', array['view','assign'], 'territory'),
      ('territory_manager', 'reports', array['view'], 'territory'),
      ('territory_manager', 'field_tracking', array['view','edit'], 'territory'),

      -- Individual field roles
      ('medical_representative', 'hcos', array['view'], 'territory'),
      ('medical_representative', 'hcps', array['view'], 'territory'),
      ('medical_representative', 'products', array['view'], 'org'),
      ('medical_representative', 'channel_partners', array['view'], 'territory'),
      ('medical_representative', 'visits', array['view','create','edit'], 'own'),
      ('medical_representative', 'tour_plans', array['view','create','edit'], 'own'),
      ('medical_representative', 'expense_claims', array['view','create','edit'], 'own'),
      ('medical_representative', 'sample_inventory', array['view'], 'own'),
      ('medical_representative', 'targets', array['view'], 'own'),
      ('medical_representative', 'reports', array['view'], 'own'),
      ('medical_representative', 'field_tracking', array['view','create','edit'], 'own'),

      ('key_account_manager', 'hcos', array['view','edit'], 'territory'),
      ('key_account_manager', 'hcps', array['view','edit'], 'territory'),
      ('key_account_manager', 'products', array['view'], 'org'),
      ('key_account_manager', 'visits', array['view','create','edit'], 'own'),
      ('key_account_manager', 'tour_plans', array['view','create','edit'], 'own'),
      ('key_account_manager', 'expense_claims', array['view','create','edit'], 'own'),
      ('key_account_manager', 'orders', array['view','create','edit'], 'own'),
      ('key_account_manager', 'channel_partners', array['view','edit'], 'territory'),
      ('key_account_manager', 'targets', array['view'], 'own'),
      ('key_account_manager', 'reports', array['view'], 'own'),
      ('key_account_manager', 'field_tracking', array['view','create','edit'], 'own'),

      -- Functional / back-office roles
      ('product_manager', 'products', array['view','create','edit','delete','configure'], 'org'),
      ('product_manager', 'reports', array['view','export'], 'org'),
      ('product_manager', 'targets', array['view'], 'org'),

      ('marketing_manager', 'products', array['view','edit'], 'org'),
      ('marketing_manager', 'reports', array['view','export'], 'org'),
      ('marketing_manager', 'tour_plans', array['view'], 'org'),
      ('marketing_manager', 'hcos', array['view'], 'org'),
      ('marketing_manager', 'hcps', array['view'], 'org'),

      ('hr', 'memberships', array['view','create','edit','delete','assign'], 'org'),
      ('hr', 'roles', array['view'], 'org'),
      ('hr', 'reports', array['view','export'], 'org'),

      ('finance', 'expense_claims', array['view','approve','reject','export'], 'org'),
      ('finance', 'orders', array['view','approve','reject','export'], 'org'),
      ('finance', 'reports', array['view','export'], 'org'),
      ('finance', 'targets', array['view'], 'org'),

      ('warehouse_manager', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'org'),
      ('warehouse_manager', 'orders', array['view','edit','export'], 'org'),
      ('warehouse_manager', 'products', array['view'], 'org'),
      ('warehouse_manager', 'channel_partners', array['view'], 'org'),

      ('purchasing_officer', 'orders', array['view','create','edit','approve','reject','export'], 'org'),
      ('purchasing_officer', 'channel_partners', array['view','create','edit'], 'org'),
      ('purchasing_officer', 'sample_inventory', array['view'], 'org'),
      ('purchasing_officer', 'reports', array['view'], 'org'),

      ('customer_support', 'hcps', array['view','edit'], 'org'),
      ('customer_support', 'visits', array['view'], 'org'),
      ('customer_support', 'reports', array['view'], 'org'),

      ('auditor', 'organizations', array['view'], 'org'),
      ('auditor', 'memberships', array['view'], 'org'),
      ('auditor', 'territories', array['view'], 'org'),
      ('auditor', 'hcos', array['view','export'], 'org'),
      ('auditor', 'channel_partners', array['view','export'], 'org'),
      ('auditor', 'hcps', array['view','export'], 'org'),
      ('auditor', 'visits', array['view','export'], 'org'),
      ('auditor', 'tour_plans', array['view','export'], 'org'),
      ('auditor', 'expense_claims', array['view','export'], 'org'),
      ('auditor', 'orders', array['view','export'], 'org'),
      ('auditor', 'reports', array['view','export'], 'org'),
      ('auditor', 'audit_log', array['view','export'], 'org'),
      ('auditor', 'field_tracking', array['view','export'], 'org'),

      ('guest', 'hcos', array['view'], 'org'),
      ('guest', 'products', array['view'], 'org')
    ) as g(role_key, resource_key, actions, scope)
  loop
    select id into v_role_id from public.roles where key = grant_row.role_key and organization_id is null;
    if v_role_id is null then
      raise exception 'Unknown role key: %', grant_row.role_key;
    end if;

    foreach act in array grant_row.actions loop
      select p.id into v_permission_id
      from public.permissions p
      join public.resources r on r.id = p.resource_id
      where r.key = grant_row.resource_key and p.action = act::public.permission_action;

      if v_permission_id is null then
        raise exception 'Unknown permission: % / %', grant_row.resource_key, act;
      end if;

      insert into public.role_permissions (role_id, permission_id, scope)
      values (v_role_id, v_permission_id, grant_row.scope::public.permission_scope)
      on conflict (role_id, permission_id) do update set scope = excluded.scope;
    end loop;
  end loop;
end $$;

-- ── Expense claim approval limits (ABAC via role_permissions.conditions) ───────
-- Area Sales Manager can approve up to 5,000; must escalate above that.
-- Zonal/Regional Manager have a higher cap; National/Company Admin/Finance are uncapped.
update public.role_permissions rp
set conditions = '{"max_amount": 5000}'::jsonb
where rp.role_id = (select id from public.roles where key = 'area_sales_manager' and organization_id is null)
  and rp.permission_id = (
    select p.id from public.permissions p join public.resources r on r.id = p.resource_id
    where r.key = 'expense_claims' and p.action = 'approve'
  );

update public.role_permissions rp
set conditions = '{"max_amount": 20000}'::jsonb
where rp.role_id in (
    select id from public.roles where key in ('zonal_manager', 'regional_manager') and organization_id is null
  )
  and rp.permission_id = (
    select p.id from public.permissions p join public.resources r on r.id = p.resource_id
    where r.key = 'expense_claims' and p.action = 'approve'
  );

-- ── Dev auth users (password: DevPassword123! — dev-only) ──────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
   'rep1@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated',
   'manager1@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a3', 'authenticated', 'authenticated',
   'admin1@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
   '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"rep1@medicalrep.dev"}', 'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2',
   '{"sub":"00000000-0000-0000-0000-0000000000a2","email":"manager1@medicalrep.dev"}', 'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a3',
   '{"sub":"00000000-0000-0000-0000-0000000000a3","email":"admin1@medicalrep.dev"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Acme Pharma Demo')
on conflict do nothing;

insert into public.territories (id, organization_id, name) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'North Zone')
on conflict do nothing;

insert into public.hcos (id, organization_id, name, type, territory_id) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'City General Hospital', 'hospital', '00000000-0000-0000-0000-000000000010')
on conflict do nothing;

insert into public.hcps (id, organization_id, first_name, last_name, specialty, tier, hco_id, territory_id, consent_status) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Ayesha', 'Khan', 'Cardiology', 'A', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'granted')
on conflict do nothing;

insert into public.products (id, organization_id, name, sku) values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'CardioMax 10mg', 'CM-010')
on conflict do nothing;

insert into public.memberships (organization_id, user_id, role_id)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', id
from public.roles where key = 'medical_representative' and organization_id is null
on conflict (user_id, organization_id) do update set role_id = excluded.role_id;

insert into public.memberships (organization_id, user_id, role_id)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', id
from public.roles where key = 'regional_manager' and organization_id is null
on conflict (user_id, organization_id) do update set role_id = excluded.role_id;

insert into public.memberships (organization_id, user_id, role_id)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a3', id
from public.roles where key = 'company_admin' and organization_id is null
on conflict (user_id, organization_id) do update set role_id = excluded.role_id;

insert into public.territory_assignments (organization_id, territory_id, user_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a2')
on conflict (territory_id, user_id) do nothing;

insert into public.tour_plans (id, organization_id, rep_id, territory_id, title, period_start, period_end, notes, status) values
  ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-000000000010', 'North Zone — Week 32', '2026-08-10', '2026-08-14', 'Focus on cardiology accounts', 'draft')
on conflict (id) do nothing;

insert into public.tour_plan_visits (id, tour_plan_id, hcp_id, planned_date, notes) values
  ('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000030', '2026-08-11', 'Discuss CardioMax 10mg')
on conflict (id) do nothing;

insert into public.sample_allocations (id, organization_id, rep_id, product_id, period_month, allocated_qty, notes) values
  ('00000000-0000-0000-0000-000000000060', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-000000000040', date_trunc('month', current_date)::date, 20, 'Monthly allocation')
on conflict (id) do nothing;

insert into public.targets (id, organization_id, rep_id, metric_type, period_month, target_value, notes) values
  ('00000000-0000-0000-0000-000000000070', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1',
   'visit_count', date_trunc('month', current_date)::date, 15, 'Monthly visit frequency target')
on conflict (id) do nothing;

insert into public.channel_partners (id, organization_id, name, type, territory_id, contact_phone) values
  ('00000000-0000-0000-0000-000000000080', '00000000-0000-0000-0000-000000000001', 'North Zone Pharma Distributors', 'distributor', '00000000-0000-0000-0000-000000000010', '+1-555-0100')
on conflict (id) do nothing;

insert into public.orders (id, organization_id, channel_partner_id, placed_by, status) values
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000080', '00000000-0000-0000-0000-0000000000a3', 'draft')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit_price) values
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000040', 100, 12.50)
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════════════
-- Fuller demo dataset: a 2nd territory + 2 more reps, more master data, and a
-- realistic spread of activity so every module (and the analytics/AI RPCs)
-- has something real to show, including deliberate outliers for the anomaly
-- detector to actually flag.
-- ══════════════════════════════════════════════════════════════════════════

insert into public.territories (id, organization_id, name) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'South Zone')
on conflict (id) do nothing;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a4', 'authenticated', 'authenticated',
   'rep2@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a5', 'authenticated', 'authenticated',
   'rep3@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a4',
   '{"sub":"00000000-0000-0000-0000-0000000000a4","email":"rep2@medicalrep.dev"}', 'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a5',
   '{"sub":"00000000-0000-0000-0000-0000000000a5","email":"rep3@medicalrep.dev"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.memberships (organization_id, user_id, role_id)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', id
from public.roles where key = 'medical_representative' and organization_id is null
on conflict (user_id, organization_id) do update set role_id = excluded.role_id;

insert into public.memberships (organization_id, user_id, role_id)
select '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', id
from public.roles where key = 'medical_representative' and organization_id is null
on conflict (user_id, organization_id) do update set role_id = excluded.role_id;

insert into public.territory_assignments (organization_id, territory_id, user_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a4'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a5')
on conflict (territory_id, user_id) do nothing;

insert into public.hcos (id, organization_id, name, type, territory_id) values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001', 'Riverside Clinic', 'clinic', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000001', 'Southside Medical Center', 'hospital', '00000000-0000-0000-0000-000000000011')
on conflict (id) do nothing;

insert into public.hcps (id, organization_id, first_name, last_name, specialty, tier, hco_id, territory_id, consent_status) values
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000001', 'Bilal', 'Ahmed', 'Neurology', 'B', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'granted'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Sara', 'Malik', 'Pediatrics', 'C', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'pending'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000001', 'Omar', 'Farooq', 'Cardiology', 'A', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'granted'),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000001', 'Nadia', 'Sheikh', 'Dermatology', 'B', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'granted')
on conflict (id) do nothing;

insert into public.products (id, organization_id, name, sku) values
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000001', 'NeuroCalm 20mg', 'NC-020'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', 'PediaVite Syrup', 'PV-100')
on conflict (id) do nothing;

-- Visits: a realistic recency spread (today down to 45 days ago) across 3 reps,
-- so next_best_actions has real gaps to surface (Sara Malik: overdue + pending consent).
insert into public.visits (id, organization_id, hcp_id, rep_id, visited_at, objective) values
  ('00000000-0000-0000-0000-000000000090', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-0000000000a1', now() - interval '3 days', 'Detailing NeuroCalm'),
  ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-0000000000a1', now() - interval '45 days', 'Routine call'),
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-0000000000a5', now() - interval '10 days', 'Follow-up'),
  ('00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-0000000000a5', now() - interval '2 days', 'Sample drop'),
  ('00000000-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000a4', now() - interval '1 days', 'Intro call'),
  ('00000000-0000-0000-0000-000000000095', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-0000000000a4', now() - interval '20 days', 'Dermatology detailing'),
  ('00000000-0000-0000-0000-000000000096', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000a4', now(), 'Follow-up'),
  ('00000000-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-0000000000a1', now() - interval '6 days', 'Sample drop'),
  ('00000000-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-0000000000a1', now() - interval '3 days', 'Sample drop'),
  ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-0000000000a5', now() - interval '4 days', 'Sample drop'),
  ('00000000-0000-0000-0000-00000000009a', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-0000000000a5', now() - interval '5 days', 'Sample drop'),
  ('00000000-0000-0000-0000-00000000009b', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-0000000000a5', now() - interval '1 days', 'Sample drop'),
  ('00000000-0000-0000-0000-00000000009c', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000a4', now() - interval '2 days', 'Sample drop'),
  ('00000000-0000-0000-0000-00000000009d', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-0000000000a4', now() - interval '6 days', 'Sample drop'),
  ('00000000-0000-0000-0000-00000000009e', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-0000000000a4', now() - interval '4 days', 'Sample drop')
on conflict (id) do nothing;

-- Sample allocations: enough headroom for the distributions below.
insert into public.sample_allocations (id, organization_id, rep_id, product_id, period_month, allocated_qty, notes) values
  ('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000040', date_trunc('month', current_date)::date, 20, 'Monthly allocation'),
  ('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000040', date_trunc('month', current_date)::date, 100, 'Monthly allocation')
on conflict (id) do nothing;

-- Distributions calibrated so sample_distribution_anomalies actually fires: rep1 and
-- rep3 give CardioMax conservatively (avg ~2-3/visit), rep2 gives it far more heavily
-- (avg ~21/visit) — well over 2x the resulting org-wide average.
insert into public.visit_products (id, visit_id, product_id, sample_qty) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000097', '00000000-0000-0000-0000-000000000040', 2),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000098', '00000000-0000-0000-0000-000000000040', 2),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000040', 2),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-00000000009a', '00000000-0000-0000-0000-000000000040', 3),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-00000000009b', '00000000-0000-0000-0000-000000000040', 2),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-00000000009c', '00000000-0000-0000-0000-000000000040', 20),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-00000000009d', '00000000-0000-0000-0000-000000000040', 22),
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-00000000009e', '00000000-0000-0000-0000-000000000040', 21)
on conflict (id) do nothing;

-- Targets for the new reps.
insert into public.targets (id, organization_id, rep_id, metric_type, period_month, target_value, notes) values
  ('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'visit_count', date_trunc('month', current_date)::date, 12, 'Monthly visit frequency target'),
  ('00000000-0000-0000-0000-000000000072', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'visit_count', date_trunc('month', current_date)::date, 18, 'Monthly visit frequency target')
on conflict (id) do nothing;

-- Tour plans: one more draft, one more submitted, for pipeline variety.
insert into public.tour_plans (id, organization_id, rep_id, territory_id, title, period_start, period_end, notes, status) values
  ('00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000011', 'South Zone — Week 33', current_date, current_date + 4, 'Cover Southside accounts', 'draft'),
  ('00000000-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000010', 'North Zone — Week 33', current_date, current_date + 4, 'Cover Riverside + City General', 'submitted')
on conflict (id) do nothing;

insert into public.tour_plan_visits (id, tour_plan_id, hcp_id, planned_date, notes) values
  ('00000000-0000-0000-0000-000000000056', '00000000-0000-0000-0000-000000000054', '00000000-0000-0000-0000-000000000033', current_date + 1, 'Intro visit'),
  ('00000000-0000-0000-0000-000000000057', '00000000-0000-0000-0000-000000000055', '00000000-0000-0000-0000-000000000031', current_date + 2, 'Follow-up')
on conflict (id) do nothing;

-- Expense claims: real history per rep/category, plus two deliberate outliers so
-- expense_anomalies has something genuine to flag (each >2x that rep's own average
-- for the same category, excluding itself, with 4 prior claims backing the average).
insert into public.expense_claims (id, organization_id, rep_id, category, amount, expense_date, description, status) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'travel', 60, current_date - 20, 'Client visit mileage', 'approved'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'travel', 55, current_date - 15, 'Client visit mileage', 'approved'),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'travel', 65, current_date - 10, 'Client visit mileage', 'approved'),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'travel', 58, current_date - 5, 'Client visit mileage', 'submitted'),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'travel', 280, current_date - 1, 'Regional conference travel', 'submitted'),
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'meals', 25, current_date - 14, 'Client lunch', 'approved'),
  ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'meals', 30, current_date - 7, 'Client lunch', 'approved'),
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'travel', 40, current_date - 12, 'Territory travel', 'approved'),
  ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'travel', 45, current_date - 6, 'Territory travel', 'approved'),
  ('00000000-0000-0000-0000-0000000000ca', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a4', 'travel', 42, current_date - 2, 'Territory travel', 'submitted'),
  ('00000000-0000-0000-0000-0000000000cb', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'accommodation', 100, current_date - 25, 'Overnight territory trip', 'approved'),
  ('00000000-0000-0000-0000-0000000000cc', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'accommodation', 110, current_date - 18, 'Overnight territory trip', 'approved'),
  ('00000000-0000-0000-0000-0000000000cd', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'accommodation', 95, current_date - 9, 'Overnight territory trip', 'approved'),
  ('00000000-0000-0000-0000-0000000000ce', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'accommodation', 105, current_date - 4, 'Overnight territory trip', 'submitted'),
  ('00000000-0000-0000-0000-0000000000cf', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a5', 'accommodation', 500, current_date - 1, 'Extended stay, regional summit', 'submitted')
on conflict (id) do nothing;

-- Channel partners + orders: full lifecycle variety.
insert into public.channel_partners (id, organization_id, name, type, territory_id, contact_phone) values
  ('00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-000000000001', 'City Central Stockist', 'stockist', '00000000-0000-0000-0000-000000000010', '+1-555-0101'),
  ('00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-000000000001', 'Southside Pharmacy Group', 'pharmacy', '00000000-0000-0000-0000-000000000011', '+1-555-0102')
on conflict (id) do nothing;

insert into public.orders (id, organization_id, channel_partner_id, placed_by, status, fulfillment_status) values
  ('00000000-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000083', '00000000-0000-0000-0000-0000000000a3', 'submitted', 'pending'),
  ('00000000-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000084', '00000000-0000-0000-0000-0000000000a3', 'approved', 'delivered')
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, quantity, unit_price) values
  ('00000000-0000-0000-0000-000000000087', '00000000-0000-0000-0000-000000000085', '00000000-0000-0000-0000-000000000041', 50, 18.00),
  ('00000000-0000-0000-0000-000000000088', '00000000-0000-0000-0000-000000000086', '00000000-0000-0000-0000-000000000042', 200, 6.25)
on conflict (id) do nothing;

-- Field tracking: policy defaults + demo geofences around the seeded HCOs.
insert into public.tracking_policies (organization_id, tracking_interval_seconds, min_accuracy_meters, max_plausible_speed_kmh, stationary_alert_minutes, offline_alert_minutes, location_retention_days) values
  ('00000000-0000-0000-0000-000000000001', 30, 100, 180, 60, 15, 180)
on conflict (organization_id) do nothing;

insert into public.geofences (id, organization_id, entity_type, entity_id, name, latitude, longitude, radius_meters, territory_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000001', 'hco', '00000000-0000-0000-0000-000000000020', 'City General Hospital', 40.7580, -73.9855, 200, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000001', 'hco', '00000000-0000-0000-0000-000000000021', 'Riverside Clinic', 40.7489, -73.9680, 150, '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000001', 'hco', '00000000-0000-0000-0000-000000000022', 'Southside Medical Center', 40.6892, -74.0445, 250, '00000000-0000-0000-0000-000000000011')
on conflict (id) do nothing;
