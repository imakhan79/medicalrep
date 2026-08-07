-- Targets & Analytics Dashboard module.
--
-- Targets are set top-down by managers (not a submit/approve workflow like tour plans
-- or expense claims), so it's a plain can_access_row-gated table — same pattern as
-- every other module, just without a transition trigger.
--
-- The team dashboard is different: it aggregates stats across *all* reps a manager can
-- see, not rows of one existing table, so RLS alone can't express it. reps_in_scope()
-- resolves "which user_ids can I see" the same way can_access_row resolves "can I see
-- this one row" — same grant/scope lookup, just returning a set instead of a boolean.

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  product_id uuid references public.products(id),
  metric_type text not null check (metric_type in ('visit_count', 'sales_amount')),
  period_month date not null check (period_month = date_trunc('month', period_month)::date),
  target_value numeric(12, 2) not null check (target_value > 0),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.targets enable row level security;

create policy target_select on public.targets for select
  using (public.can_access_row(organization_id, 'targets', 'view', territory_id, rep_id));

create policy target_insert on public.targets for insert
  with check (public.can_access_row(organization_id, 'targets', 'create', territory_id, rep_id));

create policy target_update on public.targets for update
  using (public.can_access_row(organization_id, 'targets', 'edit', territory_id, rep_id))
  with check (public.can_access_row(organization_id, 'targets', 'edit', territory_id, rep_id));

create policy target_delete on public.targets for delete
  using (public.can_access_row(organization_id, 'targets', 'delete', territory_id, rep_id));

create or replace function public.fill_target_territory()
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

create trigger target_fill_territory
  before insert on public.targets
  for each row execute function public.fill_target_territory();

create trigger audit_targets
  after insert or update or delete on public.targets
  for each row execute function public.audit_row_change();

-- Which user_ids the caller can see for (resource, action), resolved the same way
-- can_access_row resolves a single row: platform/org see everyone in the org,
-- hierarchy/territory see reps assigned within that territory subtree, own sees just self.
create or replace function public.reps_in_scope(p_org_id uuid, p_resource_key text, p_action public.permission_action)
returns setof uuid
language plpgsql stable security definer set search_path = public as $$
declare
  v_scope public.permission_scope;
  v_user_territory uuid;
begin
  if exists (
    select 1 from public.memberships m
    join public.role_permissions rp on rp.role_id = m.role_id
    join public.permissions p on p.id = rp.permission_id
    join public.resources r on r.id = p.resource_id
    where m.user_id = auth.uid() and r.key = p_resource_key and p.action = p_action and rp.scope = 'platform'
  ) then
    return query select user_id from public.memberships where organization_id = p_org_id;
    return;
  end if;

  select rp.scope into v_scope
  from public.memberships m
  join public.role_permissions rp on rp.role_id = m.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.resources r on r.id = p.resource_id
  where m.user_id = auth.uid() and m.organization_id = p_org_id
    and r.key = p_resource_key and p.action = p_action
  order by case rp.scope when 'org' then 1 when 'hierarchy' then 2 when 'territory' then 3 when 'own' then 4 else 5 end
  limit 1;

  if v_scope is null then
    return;
  elsif v_scope = 'org' then
    return query select user_id from public.memberships where organization_id = p_org_id;
  elsif v_scope in ('hierarchy', 'territory') then
    select ta.territory_id into v_user_territory
    from public.territory_assignments ta
    where ta.user_id = auth.uid() and ta.organization_id = p_org_id
    limit 1;
    if v_user_territory is null then
      return;
    end if;
    if v_scope = 'territory' then
      return query
        select user_id from public.territory_assignments
        where organization_id = p_org_id and territory_id = v_user_territory;
    else
      return query
        select ta.user_id from public.territory_assignments ta
        where ta.organization_id = p_org_id
          and ta.territory_id in (select td.id from public.territory_and_descendants(v_user_territory) td);
    end if;
  else
    return query select auth.uid();
  end if;
end;
$$;

-- Team roll-up: visits today/this month + HCP coverage % for every rep the caller can see.
create or replace function public.team_dashboard(p_org_id uuid, p_period_month date)
returns table (
  rep_id uuid,
  email text,
  visits_this_month integer,
  visits_today integer,
  total_hcps integer,
  visited_hcps integer,
  coverage_pct numeric
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select
      u.id,
      u.email::text,
      (select count(*)::int from public.visits v
        where v.rep_id = u.id and v.organization_id = p_org_id
          and date_trunc('month', v.visited_at)::date = p_period_month),
      (select count(*)::int from public.visits v
        where v.rep_id = u.id and v.organization_id = p_org_id and v.visited_at::date = current_date),
      (select count(*)::int from public.hcps h
        where h.organization_id = p_org_id
          and h.territory_id in (
            select ta.territory_id from public.territory_assignments ta
            where ta.user_id = u.id and ta.organization_id = p_org_id
          )),
      (select count(distinct v.hcp_id)::int from public.visits v
        where v.rep_id = u.id and v.organization_id = p_org_id
          and date_trunc('month', v.visited_at)::date = p_period_month),
      case
        when (select count(*) from public.hcps h
          where h.organization_id = p_org_id
            and h.territory_id in (
              select ta.territory_id from public.territory_assignments ta
              where ta.user_id = u.id and ta.organization_id = p_org_id
            )) = 0
        then 0
        else round(
          100.0 * (select count(distinct v.hcp_id) from public.visits v
            where v.rep_id = u.id and v.organization_id = p_org_id
              and date_trunc('month', v.visited_at)::date = p_period_month)
          / (select count(*) from public.hcps h
            where h.organization_id = p_org_id
              and h.territory_id in (
                select ta.territory_id from public.territory_assignments ta
                where ta.user_id = u.id and ta.organization_id = p_org_id
              )),
          1)
      end
    from auth.users u
    join public.memberships m on m.user_id = u.id and m.organization_id = p_org_id
    where u.id in (select public.reps_in_scope(p_org_id, 'reports', 'view'));
end;
$$;
