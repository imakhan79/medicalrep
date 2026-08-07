-- Next-Best-Action: deterministic HCP prioritization, not an LLM call.
--
-- Heuristic (documented here since it's the only place the formula lives):
--   priority_score = days_since_last_visit (capped at 999, "never visited" = 999)
--                     x tier_weight (A=3, B=2, C=1, other=1)
-- i.e. a high-tier account that's gone a long time without a visit ranks highest.
-- `reasons` explains the score in plain language for the UI, and flags consent status
-- so a rep is never nudged toward sampling at an HCP who hasn't granted consent.
--
-- Uses the same public.can_access_row() scoping as everywhere else, so a rep only
-- ever sees recommendations for HCPs their role/territory already lets them view.

create or replace function public.next_best_actions(p_org_id uuid, p_limit integer default 10)
returns table (
  hcp_id uuid,
  hcp_name text,
  tier text,
  consent_status public.consent_status,
  days_since_last_visit integer,
  priority_score numeric,
  reasons text[]
)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    with visited as (
      select v.hcp_id, max(v.visited_at) as last_visited_at
      from public.visits v
      where v.organization_id = p_org_id
      group by v.hcp_id
    ), scored as (
      select
        h.id as hcp_id,
        h.first_name || ' ' || h.last_name as hcp_name,
        h.tier,
        h.consent_status,
        case when vi.last_visited_at is null then null
             else date_part('day', now() - vi.last_visited_at)::int end as days_since_last_visit,
        (least(coalesce(date_part('day', now() - vi.last_visited_at)::int, 999), 999)
          * case h.tier when 'A' then 3 when 'B' then 2 when 'C' then 1 else 1 end)::numeric as priority_score,
        array_remove(array[
          case when vi.last_visited_at is null then 'Never visited' end,
          case when vi.last_visited_at is not null and now() - vi.last_visited_at > interval '30 days'
               then 'Not visited in ' || date_part('day', now() - vi.last_visited_at)::int || ' days' end,
          case when h.tier = 'A' then 'Tier A account' end,
          case when h.consent_status <> 'granted' then 'Consent not granted — confirm before sampling' end
        ], null) as reasons
      from public.hcps h
      left join visited vi on vi.hcp_id = h.id
      where h.organization_id = p_org_id
        and public.can_access_row(p_org_id, 'hcps', 'view', h.territory_id)
    )
    select * from scored
    order by priority_score desc nulls first
    limit p_limit;
end;
$$;
