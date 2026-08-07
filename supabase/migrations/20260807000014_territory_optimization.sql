-- Territory Optimization: another deterministic AI-doc module, same non-LLM pattern
-- as next_best_actions/team_dashboard. Flags territories whose HCP-per-rep ratio is
-- far from the org's average within the caller's own scope — "far" meaning >30% above
-- or below average, a documented, adjustable threshold rather than a black-box model.

create or replace function public.territories_in_scope(p_org_id uuid, p_resource_key text, p_action public.permission_action)
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
    return query select id from public.territories where organization_id = p_org_id;
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
    return query select id from public.territories where organization_id = p_org_id;
  elsif v_scope in ('hierarchy', 'territory', 'own') then
    select ta.territory_id into v_user_territory
    from public.territory_assignments ta
    where ta.user_id = auth.uid() and ta.organization_id = p_org_id
    limit 1;
    if v_user_territory is null then
      return;
    end if;
    if v_scope = 'hierarchy' then
      return query select td.id from public.territory_and_descendants(v_user_territory) td;
    else
      return query select v_user_territory;
    end if;
  end if;
end;
$$;

create or replace function public.territory_balance(p_org_id uuid)
returns table (
  territory_id uuid,
  territory_name text,
  rep_count integer,
  hcp_count integer,
  hcp_per_rep numeric,
  visits_this_month integer,
  visited_hcps integer,
  coverage_pct numeric,
  balance_flag text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_period date := date_trunc('month', current_date)::date;
  v_avg_hcp_per_rep numeric;
begin
  select coalesce(
    (select count(*) from public.hcps h
      where h.organization_id = p_org_id
        and h.territory_id in (select public.territories_in_scope(p_org_id, 'territories', 'view')))::numeric
    / nullif((select count(*) from public.territory_assignments ta
      where ta.organization_id = p_org_id
        and ta.territory_id in (select public.territories_in_scope(p_org_id, 'territories', 'view'))), 0),
    0
  ) into v_avg_hcp_per_rep;

  return query
    with reps as (
      select ta.territory_id, count(distinct ta.user_id)::int as rep_count
      from public.territory_assignments ta
      where ta.organization_id = p_org_id
      group by ta.territory_id
    ), hcp_counts as (
      select h.territory_id, count(*)::int as hcp_count
      from public.hcps h
      where h.organization_id = p_org_id
      group by h.territory_id
    ), month_visits as (
      select ta.territory_id,
        count(*)::int as visits_this_month,
        count(distinct v.hcp_id)::int as visited_hcps
      from public.visits v
      join public.territory_assignments ta on ta.user_id = v.rep_id and ta.organization_id = v.organization_id
      where v.organization_id = p_org_id and date_trunc('month', v.visited_at)::date = v_period
      group by ta.territory_id
    )
    select
      t.id,
      t.name,
      coalesce(r.rep_count, 0),
      coalesce(hc.hcp_count, 0),
      round(coalesce(hc.hcp_count, 0)::numeric / greatest(coalesce(r.rep_count, 0), 1), 2) as hcp_per_rep,
      coalesce(mv.visits_this_month, 0),
      coalesce(mv.visited_hcps, 0),
      case when coalesce(hc.hcp_count, 0) = 0 then 0
        else round(100.0 * coalesce(mv.visited_hcps, 0) / hc.hcp_count, 1) end,
      case
        when coalesce(r.rep_count, 0) = 0 and coalesce(hc.hcp_count, 0) > 0 then 'unassigned'
        when coalesce(r.rep_count, 0) = 0 then 'no_activity'
        when v_avg_hcp_per_rep > 0 and (coalesce(hc.hcp_count, 0)::numeric / r.rep_count) > v_avg_hcp_per_rep * 1.3 then 'overloaded'
        when v_avg_hcp_per_rep > 0 and (coalesce(hc.hcp_count, 0)::numeric / r.rep_count) < v_avg_hcp_per_rep * 0.7 then 'underutilized'
        else 'balanced'
      end
    from public.territories t
    left join reps r on r.territory_id = t.id
    left join hcp_counts hc on hc.territory_id = t.id
    left join month_visits mv on mv.territory_id = t.id
    where t.organization_id = p_org_id
      and t.id in (select public.territories_in_scope(p_org_id, 'territories', 'view'))
    order by hcp_per_rep desc nulls last;
end;
$$;
