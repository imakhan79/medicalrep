-- Anomaly Detection: the third and last "AI module" from the architecture doc, same
-- deterministic, explainable approach. Two checks:
--   expense_anomalies: a claim > 2x the *same rep's own* historical average for that
--     category (excluding the claim itself), with a minimum history of 3 prior claims
--     so a rep's very first claim in a category is never flagged.
--   sample_distribution_anomalies: a rep whose average sample quantity per visit for a
--     product is > 2x the *org-wide peer* average for that product — peer comparison
--     rather than self-history, since hard caps (sample_allocations) already constrain
--     totals; this catches unusual per-visit patterns within those caps.
-- Both are gated to callers whose grant scope is broader than 'own' — an individual
-- rep can't pull org-wide anomaly data about other reps just because they can view
-- their own expense claims.

create or replace function public.expense_anomalies(p_org_id uuid)
returns table (
  claim_id uuid,
  rep_id uuid,
  rep_email text,
  category text,
  amount numeric,
  rep_avg_amount numeric,
  deviation_ratio numeric,
  reason text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_scope public.permission_scope;
begin
  select rp.scope into v_scope
  from public.memberships m
  join public.role_permissions rp on rp.role_id = m.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.resources r on r.id = p.resource_id
  where m.user_id = auth.uid() and m.organization_id = p_org_id
    and r.key = 'expense_claims' and p.action = 'view'
  order by case rp.scope
    when 'platform' then 0 when 'org' then 1 when 'hierarchy' then 2 when 'territory' then 3 when 'own' then 4 else 5
  end
  limit 1;

  if v_scope is null or v_scope = 'own' then
    raise exception 'Not authorized to view expense anomaly reports';
  end if;

  return query
    select
      ec.id,
      ec.rep_id,
      u.email::text,
      ec.category,
      ec.amount,
      round(oth.avg_amount, 2),
      round(ec.amount / nullif(oth.avg_amount, 0), 2) as deviation_ratio,
      'Amount is ' || round(ec.amount / nullif(oth.avg_amount, 0), 1)
        || 'x this rep''s typical ' || ec.category || ' claim'
    from public.expense_claims ec
    join auth.users u on u.id = ec.rep_id
    cross join lateral (
      select avg(ec2.amount) as avg_amount, count(*) as n
      from public.expense_claims ec2
      where ec2.rep_id = ec.rep_id and ec2.category = ec.category and ec2.id <> ec.id
        and ec2.organization_id = p_org_id and ec2.status in ('submitted', 'escalated', 'approved')
    ) oth
    where ec.organization_id = p_org_id
      and ec.status in ('submitted', 'escalated', 'approved')
      and oth.n >= 3
      and ec.amount > oth.avg_amount * 2
    order by deviation_ratio desc;
end;
$$;

create or replace function public.sample_distribution_anomalies(p_org_id uuid)
returns table (
  rep_id uuid,
  rep_email text,
  product_id uuid,
  product_name text,
  rep_avg_qty numeric,
  org_avg_qty numeric,
  deviation_ratio numeric,
  reason text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_scope public.permission_scope;
begin
  select rp.scope into v_scope
  from public.memberships m
  join public.role_permissions rp on rp.role_id = m.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.resources r on r.id = p.resource_id
  where m.user_id = auth.uid() and m.organization_id = p_org_id
    and r.key = 'sample_inventory' and p.action = 'view'
  order by case rp.scope
    when 'platform' then 0 when 'org' then 1 when 'hierarchy' then 2 when 'territory' then 3 when 'own' then 4 else 5
  end
  limit 1;

  if v_scope is null or v_scope = 'own' then
    raise exception 'Not authorized to view sample distribution anomaly reports';
  end if;

  return query
    with rep_product_avg as (
      select v.rep_id, vp.product_id, avg(vp.sample_qty) as avg_qty, count(*) as n
      from public.visit_products vp
      join public.visits v on v.id = vp.visit_id
      where v.organization_id = p_org_id and vp.sample_qty > 0
      group by v.rep_id, vp.product_id
    ), org_product_avg as (
      select vp.product_id, avg(vp.sample_qty) as avg_qty
      from public.visit_products vp
      join public.visits v on v.id = vp.visit_id
      where v.organization_id = p_org_id and vp.sample_qty > 0
      group by vp.product_id
    )
    select
      rpa.rep_id,
      u.email::text,
      rpa.product_id,
      pr.name,
      round(rpa.avg_qty, 2),
      round(opa.avg_qty, 2),
      round(rpa.avg_qty / nullif(opa.avg_qty, 0), 2) as deviation_ratio,
      'Gives ' || round(rpa.avg_qty / nullif(opa.avg_qty, 0), 1)
        || 'x the org average sample quantity per visit for ' || pr.name
    from rep_product_avg rpa
    join org_product_avg opa on opa.product_id = rpa.product_id
    join auth.users u on u.id = rpa.rep_id
    join public.products pr on pr.id = rpa.product_id
    where rpa.n >= 3
      and rpa.avg_qty > opa.avg_qty * 2
    order by deviation_ratio desc;
end;
$$;
