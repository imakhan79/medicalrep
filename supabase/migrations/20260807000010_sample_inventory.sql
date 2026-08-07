-- Sample/Inventory Distribution module.
--
-- No new "distribution log" table is needed: public.visit_products already IS the
-- distribution record (product + qty handed out during a specific visit). What's new:
-- (1) sample_allocations — the monthly per-rep-per-product cap a manager assigns,
-- (2) sample_balance() — allocated vs. consumed (from visit_products) vs. remaining,
-- (3) a trigger on visit_products enforcing two compliance rules the roadmap called for:
--     no sample without a 'granted' HCP consent, and never exceed the remaining balance.

create table public.sample_allocations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  product_id uuid not null references public.products(id),
  period_month date not null check (period_month = date_trunc('month', period_month)::date),
  allocated_qty integer not null check (allocated_qty > 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, rep_id, product_id, period_month)
);

alter table public.sample_allocations enable row level security;

create policy sample_allocation_select on public.sample_allocations for select
  using (public.can_access_row(organization_id, 'sample_inventory', 'view', territory_id, rep_id));

create policy sample_allocation_write on public.sample_allocations for all
  using (public.can_access_row(organization_id, 'sample_inventory', 'assign', territory_id))
  with check (public.can_access_row(organization_id, 'sample_inventory', 'assign', territory_id));

create or replace function public.fill_sample_allocation_territory()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.territory_id is null then
    select ta.territory_id into new.territory_id
    from public.territory_assignments ta
    where ta.user_id = new.rep_id and ta.organization_id = new.organization_id
    limit 1;
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

create trigger sample_allocation_fill_territory
  before insert on public.sample_allocations
  for each row execute function public.fill_sample_allocation_territory();

create trigger audit_sample_allocations
  after insert or update or delete on public.sample_allocations
  for each row execute function public.audit_row_change();

-- allocated / consumed / remaining for one rep+product+month.
create or replace function public.sample_balance(
  p_org_id uuid,
  p_rep_id uuid,
  p_product_id uuid,
  p_period_month date
) returns table (allocated_qty integer, consumed_qty integer, remaining_qty integer)
language sql stable security definer set search_path = public as $$
  with alloc as (
    select coalesce(sum(sa.allocated_qty), 0)::int as qty
    from public.sample_allocations sa
    where sa.organization_id = p_org_id and sa.rep_id = p_rep_id and sa.product_id = p_product_id
      and sa.period_month = p_period_month
  ), consumed as (
    select coalesce(sum(vp.sample_qty), 0)::int as qty
    from public.visit_products vp
    join public.visits v on v.id = vp.visit_id
    where v.organization_id = p_org_id and v.rep_id = p_rep_id and vp.product_id = p_product_id
      and date_trunc('month', v.visited_at)::date = p_period_month
  )
  select alloc.qty, consumed.qty, alloc.qty - consumed.qty from alloc, consumed;
$$;

-- Balance for every product a rep has an allocation or consumption for, current month —
-- powers the "My Sample Balance" screen without the client assembling per-product calls.
create or replace function public.my_sample_balances(p_org_id uuid, p_period_month date)
returns table (product_id uuid, product_name text, allocated_qty integer, consumed_qty integer, remaining_qty integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_access_row(p_org_id, 'sample_inventory', 'view', null, auth.uid()) then
    raise exception 'Not authorized to view sample balances for this organization';
  end if;

  return query
    select p.id, p.name, b.allocated_qty, b.consumed_qty, b.remaining_qty
    from public.products p
    cross join lateral public.sample_balance(p_org_id, auth.uid(), p.id, p_period_month) b
    where p.organization_id = p_org_id
      and (b.allocated_qty > 0 or b.consumed_qty > 0);
end;
$$;

-- Compliance + cap enforcement. Checked on INSERT only: editing a past distribution's
-- quantity is rare enough, and safely re-validating it mid-edit against a balance that
-- already includes the row's own prior value is more complexity than it's worth here.
create or replace function public.enforce_sample_distribution()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_consent public.consent_status;
  v_rep_id uuid;
  v_org_id uuid;
  v_period date;
  v_remaining integer;
begin
  if new.sample_qty is null or new.sample_qty <= 0 then
    return new;
  end if;

  select h.consent_status, v.rep_id, v.organization_id, date_trunc('month', v.visited_at)::date
  into v_consent, v_rep_id, v_org_id, v_period
  from public.visits v join public.hcps h on h.id = v.hcp_id
  where v.id = new.visit_id;

  if v_consent is distinct from 'granted' then
    raise exception 'Cannot distribute samples: this HCP''s consent status is not granted';
  end if;

  select remaining_qty into v_remaining
  from public.sample_balance(v_org_id, v_rep_id, new.product_id, v_period);

  if new.sample_qty > coalesce(v_remaining, 0) then
    raise exception 'Sample quantity (%) exceeds your remaining allocation (%) for this product this month',
      new.sample_qty, coalesce(v_remaining, 0);
  end if;

  return new;
end;
$$;

create trigger visit_product_sample_check
  before insert on public.visit_products
  for each row execute function public.enforce_sample_distribution();
