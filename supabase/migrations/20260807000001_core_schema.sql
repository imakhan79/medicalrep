-- Core multi-tenant schema: organizations, membership/RBAC, HCP master data, visits (DCR)

create type public.user_role as enum ('rep', 'area_manager', 'regional_manager', 'admin', 'compliance_officer');
create type public.consent_status as enum ('granted', 'pending', 'revoked');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role public.user_role not null default 'rep',
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);

create table public.territories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.territory_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  territory_id uuid not null references public.territories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (territory_id, user_id)
);

create table public.hcos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text,
  address text,
  territory_id uuid references public.territories(id),
  created_at timestamptz not null default now()
);

create table public.hcps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  specialty text,
  tier text,
  hco_id uuid references public.hcos(id),
  territory_id uuid references public.territories(id),
  phone text,
  email text,
  consent_status public.consent_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  created_at timestamptz not null default now()
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  hcp_id uuid not null references public.hcps(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  visited_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  objective text,
  outcome_notes text,
  next_visit_date date,
  client_id text unique,
  created_at timestamptz not null default now()
);

create table public.visit_products (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  product_id uuid not null references public.products(id),
  sample_qty integer default 0
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  table_name text not null,
  row_id uuid not null,
  action text not null,
  changed_data jsonb,
  created_at timestamptz not null default now()
);

-- Helper: current user's role/org lookup used by RLS policies
create or replace function public.current_membership(org_id uuid)
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.memberships
  where user_id = auth.uid() and organization_id = org_id
  limit 1;
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.memberships
    where user_id = auth.uid() and organization_id = org_id
  );
$$;

create or replace function public.is_manager_or_admin(org_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.current_membership(org_id) in ('area_manager', 'regional_manager', 'admin', 'compliance_officer');
$$;
