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
  ('visits', 'Visits / Daily Call Reports', 'field_execution'),
  ('tour_plans', 'Tour Plans', 'planning'),
  ('targets', 'Targets', 'planning'),
  ('expense_claims', 'Expense Claims', 'finance'),
  ('sample_inventory', 'Sample Inventory', 'inventory'),
  ('orders', 'Orders', 'inventory'),
  ('reports', 'Reports & Dashboards', 'analytics'),
  ('audit_log', 'Audit Log', 'compliance')
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
      ('super_admin', 'visits', array['view','create','edit','delete','export'], 'platform'),
      ('super_admin', 'tour_plans', array['view','create','edit','delete','approve','reject'], 'platform'),
      ('super_admin', 'targets', array['view','create','edit','delete'], 'platform'),
      ('super_admin', 'expense_claims', array['view','create','edit','delete','approve','reject','export'], 'platform'),
      ('super_admin', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'platform'),
      ('super_admin', 'orders', array['view','create','edit','delete','approve','reject','export'], 'platform'),
      ('super_admin', 'reports', array['view','export'], 'platform'),
      ('super_admin', 'audit_log', array['view','export'], 'platform'),

      ('platform_owner', 'organizations', array['view','create','edit','delete','configure'], 'platform'),
      ('platform_owner', 'roles', array['view','create','edit','delete','configure'], 'platform'),
      ('platform_owner', 'memberships', array['view','create','edit','delete','assign'], 'platform'),
      ('platform_owner', 'reports', array['view','export'], 'platform'),
      ('platform_owner', 'audit_log', array['view','export'], 'platform'),

      -- Full control within one org
      ('company_admin', 'organizations', array['view','edit'], 'org'),
      ('company_admin', 'roles', array['view','create','edit','delete','configure'], 'org'),
      ('company_admin', 'memberships', array['view','create','edit','delete','assign'], 'org'),
      ('company_admin', 'territories', array['view','create','edit','delete','assign'], 'org'),
      ('company_admin', 'hcos', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'hcps', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'products', array['view','create','edit','delete','import','export'], 'org'),
      ('company_admin', 'visits', array['view','create','edit','delete','export'], 'org'),
      ('company_admin', 'tour_plans', array['view','create','edit','delete','approve','reject'], 'org'),
      ('company_admin', 'targets', array['view','create','edit','delete'], 'org'),
      ('company_admin', 'expense_claims', array['view','create','edit','delete','approve','reject','export'], 'org'),
      ('company_admin', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'org'),
      ('company_admin', 'orders', array['view','create','edit','delete','approve','reject','export'], 'org'),
      ('company_admin', 'reports', array['view','export'], 'org'),
      ('company_admin', 'audit_log', array['view','export'], 'org'),

      ('national_sales_manager', 'hcos', array['view'], 'org'),
      ('national_sales_manager', 'hcps', array['view','export'], 'org'),
      ('national_sales_manager', 'visits', array['view','export'], 'org'),
      ('national_sales_manager', 'territories', array['view'], 'org'),
      ('national_sales_manager', 'targets', array['view','create','edit','approve'], 'org'),
      ('national_sales_manager', 'tour_plans', array['view','approve','reject'], 'org'),
      ('national_sales_manager', 'expense_claims', array['view','approve','reject','export'], 'org'),
      ('national_sales_manager', 'reports', array['view','export'], 'org'),
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

      ('regional_manager', 'hcos', array['view'], 'hierarchy'),
      ('regional_manager', 'hcps', array['view','edit'], 'hierarchy'),
      ('regional_manager', 'visits', array['view','export'], 'hierarchy'),
      ('regional_manager', 'territories', array['view','assign'], 'hierarchy'),
      ('regional_manager', 'targets', array['view','edit'], 'hierarchy'),
      ('regional_manager', 'tour_plans', array['view','approve','reject'], 'hierarchy'),
      ('regional_manager', 'expense_claims', array['view','approve','reject'], 'hierarchy'),
      ('regional_manager', 'sample_inventory', array['view','assign'], 'hierarchy'),
      ('regional_manager', 'reports', array['view','export'], 'hierarchy'),

      ('area_sales_manager', 'hcos', array['view'], 'hierarchy'),
      ('area_sales_manager', 'hcps', array['view','edit'], 'hierarchy'),
      ('area_sales_manager', 'visits', array['view'], 'hierarchy'),
      ('area_sales_manager', 'tour_plans', array['view','approve'], 'hierarchy'),
      ('area_sales_manager', 'expense_claims', array['view','approve'], 'hierarchy'),
      ('area_sales_manager', 'sample_inventory', array['view','assign'], 'hierarchy'),
      ('area_sales_manager', 'reports', array['view'], 'hierarchy'),

      ('territory_manager', 'hcos', array['view'], 'territory'),
      ('territory_manager', 'hcps', array['view','create','edit'], 'territory'),
      ('territory_manager', 'visits', array['view'], 'territory'),
      ('territory_manager', 'tour_plans', array['view','create','edit'], 'territory'),
      ('territory_manager', 'targets', array['view'], 'territory'),
      ('territory_manager', 'sample_inventory', array['view','assign'], 'territory'),
      ('territory_manager', 'reports', array['view'], 'territory'),

      -- Individual field roles
      ('medical_representative', 'hcos', array['view'], 'territory'),
      ('medical_representative', 'hcps', array['view'], 'territory'),
      ('medical_representative', 'products', array['view'], 'org'),
      ('medical_representative', 'visits', array['view','create','edit'], 'own'),
      ('medical_representative', 'tour_plans', array['view','create','edit'], 'own'),
      ('medical_representative', 'expense_claims', array['view','create'], 'own'),
      ('medical_representative', 'sample_inventory', array['view'], 'own'),

      ('key_account_manager', 'hcos', array['view','edit'], 'territory'),
      ('key_account_manager', 'hcps', array['view','edit'], 'territory'),
      ('key_account_manager', 'products', array['view'], 'org'),
      ('key_account_manager', 'visits', array['view','create','edit'], 'own'),
      ('key_account_manager', 'tour_plans', array['view','create','edit'], 'own'),
      ('key_account_manager', 'expense_claims', array['view','create'], 'own'),
      ('key_account_manager', 'orders', array['view','create'], 'own'),

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
      ('finance', 'orders', array['view','approve','export'], 'org'),
      ('finance', 'reports', array['view','export'], 'org'),
      ('finance', 'targets', array['view'], 'org'),

      ('warehouse_manager', 'sample_inventory', array['view','create','edit','delete','assign','import','export'], 'org'),
      ('warehouse_manager', 'orders', array['view','edit','export'], 'org'),
      ('warehouse_manager', 'products', array['view'], 'org'),

      ('purchasing_officer', 'orders', array['view','create','edit','approve','export'], 'org'),
      ('purchasing_officer', 'sample_inventory', array['view'], 'org'),
      ('purchasing_officer', 'reports', array['view'], 'org'),

      ('customer_support', 'hcps', array['view','edit'], 'org'),
      ('customer_support', 'visits', array['view'], 'org'),
      ('customer_support', 'reports', array['view'], 'org'),

      ('auditor', 'organizations', array['view'], 'org'),
      ('auditor', 'memberships', array['view'], 'org'),
      ('auditor', 'territories', array['view'], 'org'),
      ('auditor', 'hcos', array['view','export'], 'org'),
      ('auditor', 'hcps', array['view','export'], 'org'),
      ('auditor', 'visits', array['view','export'], 'org'),
      ('auditor', 'tour_plans', array['view','export'], 'org'),
      ('auditor', 'expense_claims', array['view','export'], 'org'),
      ('auditor', 'orders', array['view','export'], 'org'),
      ('auditor', 'reports', array['view','export'], 'org'),
      ('auditor', 'audit_log', array['view','export'], 'org'),

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
