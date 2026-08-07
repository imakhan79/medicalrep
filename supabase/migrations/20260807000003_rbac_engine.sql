-- Dynamic RBAC + lightweight ABAC engine.
-- Replaces the fixed user_role enum with configurable roles/resources/permissions,
-- and adds a "scope" (platform/org/hierarchy/territory/own) per role-permission grant
-- so the same permission can mean different visibility depending on the role
-- (e.g. "view hcps" = whole org for a Regional Manager, own territory for a Territory Manager).

create type public.permission_action as enum (
  'view', 'create', 'edit', 'delete', 'approve', 'reject', 'export', 'import', 'assign', 'configure'
);

create type public.permission_scope as enum (
  'platform', 'org', 'hierarchy', 'territory', 'own'
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  module text not null,
  created_at timestamptz not null default now()
);

-- roles: organization_id null = system-defined role available to every org;
-- organization_id set = an org's own custom role (created via the 'configure' permission).
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, key)
);
create unique index roles_system_key_unique on public.roles (key) where organization_id is null;

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  action public.permission_action not null,
  unique (resource_id, action)
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  scope public.permission_scope not null default 'own',
  conditions jsonb not null default '{}'::jsonb, -- extra ABAC constraints, e.g. {"max_amount": 5000}
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

-- Territory hierarchy (Zone > Region > Area > Territory) for 'hierarchy'-scoped roles.
alter table public.territories add column parent_territory_id uuid references public.territories(id);

-- memberships now points at a role row instead of a fixed enum.
alter table public.memberships add column role_id uuid references public.roles(id);

alter table public.resources enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- Resources/permissions are a shared system catalog: any authenticated user can read them
-- (needed to render UI permission checks); only writable via 'configure' on 'roles' (see below).
create policy resources_select on public.resources for select using (auth.role() = 'authenticated');
create policy permissions_select on public.permissions for select using (auth.role() = 'authenticated');

-- roles: system roles + your org's own custom roles are visible to org members.
create policy roles_select on public.roles for select
  using (organization_id is null or public.is_org_member(organization_id));

create policy role_permissions_select on public.role_permissions for select
  using (exists (
    select 1 from public.roles r where r.id = role_id
    and (r.organization_id is null or public.is_org_member(r.organization_id))
  ));

-- Territory-and-descendants closure, used by 'hierarchy' scope.
create or replace function public.territory_and_descendants(p_root uuid)
returns table(id uuid)
language sql stable security definer set search_path = public as $$
  with recursive subtree as (
    select t.id from public.territories t where t.id = p_root
    union all
    select t.id from public.territories t join subtree s on t.parent_territory_id = s.id
  )
  select id from subtree;
$$;

-- Core RBAC+ABAC check used by every RLS policy from here on.
-- p_territory_id / p_owner_id are optional row attributes checked against
-- 'territory'/'hierarchy' and 'own' scoped grants respectively.
create or replace function public.can_access_row(
  p_org_id uuid,
  p_resource_key text,
  p_action public.permission_action,
  p_territory_id uuid default null,
  p_owner_id uuid default null
) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_scope public.permission_scope;
  v_user_territory uuid;
begin
  -- Platform-scope grants (Super Admin / Platform Owner) bypass org matching entirely.
  if exists (
    select 1
    from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    join public.resources r on r.id = p.resource_id
    where m.user_id = auth.uid()
      and r.key = p_resource_key and p.action = p_action
      and rp.scope = 'platform'
  ) then
    return true;
  end if;

  select rp.scope into v_scope
  from public.memberships m
  join public.role_permissions rp on rp.role_id = m.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.resources r on r.id = p.resource_id
  where m.user_id = auth.uid()
    and m.organization_id = p_org_id
    and r.key = p_resource_key and p.action = p_action
  order by case rp.scope
    when 'org' then 1 when 'hierarchy' then 2 when 'territory' then 3 when 'own' then 4 else 5
  end
  limit 1;

  if v_scope is null then
    return false;
  end if;

  if v_scope = 'org' then
    return true;
  end if;

  if v_scope = 'own' then
    return p_owner_id is not null and p_owner_id = auth.uid();
  end if;

  select ta.territory_id into v_user_territory
  from public.territory_assignments ta
  where ta.user_id = auth.uid() and ta.organization_id = p_org_id
  limit 1;

  if p_territory_id is null or v_user_territory is null then
    return false;
  end if;

  if v_scope = 'territory' then
    return p_territory_id = v_user_territory;
  end if;

  if v_scope = 'hierarchy' then
    return p_territory_id in (select td.id from public.territory_and_descendants(v_user_territory) td);
  end if;

  return false;
end;
$$;

-- roles/resources/permissions themselves are only writable by someone with 'configure' on 'roles'.
create policy roles_write on public.roles for all
  using (organization_id is not null and public.can_access_row(organization_id, 'roles', 'configure'))
  with check (organization_id is not null and public.can_access_row(organization_id, 'roles', 'configure'));

create policy role_permissions_write on public.role_permissions for all
  using (exists (
    select 1 from public.roles r where r.id = role_id
    and r.organization_id is not null
    and public.can_access_row(r.organization_id, 'roles', 'configure')
  ))
  with check (exists (
    select 1 from public.roles r where r.id = role_id
    and r.organization_id is not null
    and public.can_access_row(r.organization_id, 'roles', 'configure')
  ));
