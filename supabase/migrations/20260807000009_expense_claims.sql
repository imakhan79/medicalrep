-- Expense Claims module, built on the same generic approval engine as tour_plans
-- (reuses public.approval_status and public.approval_events — no new plumbing).
--
-- New here: role_permissions.conditions (the ABAC hook stubbed in the RBAC migration
-- but unused until now) enforces per-role approval limits — an Area Sales Manager
-- with conditions {"max_amount": 5000} can't approve a bigger claim; it must be
-- escalated to a Regional/Zonal Manager with a higher (or no) limit.

create table public.expense_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  tour_plan_id uuid references public.tour_plans(id),
  category text not null check (category in ('travel', 'meals', 'accommodation', 'fuel', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD',
  expense_date date not null,
  description text,
  status public.approval_status not null default 'draft',
  submitted_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.expense_claims enable row level security;

create policy expense_claim_select on public.expense_claims for select
  using (public.can_access_row(organization_id, 'expense_claims', 'view', territory_id, rep_id));

create policy expense_claim_insert on public.expense_claims for insert
  with check (
    rep_id = auth.uid()
    and status = 'draft'
    and public.can_access_row(organization_id, 'expense_claims', 'create', territory_id, rep_id)
  );

create policy expense_claim_update on public.expense_claims for update
  using (
    public.can_access_row(organization_id, 'expense_claims', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'expense_claims', 'approve', territory_id)
    or public.can_access_row(organization_id, 'expense_claims', 'reject', territory_id)
  )
  with check (
    public.can_access_row(organization_id, 'expense_claims', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'expense_claims', 'approve', territory_id)
    or public.can_access_row(organization_id, 'expense_claims', 'reject', territory_id)
  );

create policy expense_claim_delete on public.expense_claims for delete
  using (status = 'draft' and public.can_access_row(organization_id, 'expense_claims', 'edit', territory_id, rep_id));

-- Auto-fill territory_id from the claimant's assignment so hierarchy-scoped
-- managers (Zonal/Regional/Area) can see and approve their team's claims
-- without the client needing to know or send territory data.
create or replace function public.set_expense_claim_territory()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.territory_id is null then
    select ta.territory_id into new.territory_id
    from public.territory_assignments ta
    where ta.user_id = new.rep_id and ta.organization_id = new.organization_id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger expense_claim_set_territory
  before insert on public.expense_claims
  for each row execute function public.set_expense_claim_territory();

-- Returns the `conditions` jsonb attached to the highest-priority matching grant,
-- same resolution order as can_access_row. Used for the max_amount approval-limit check.
create or replace function public.permission_condition(
  p_org_id uuid,
  p_resource_key text,
  p_action public.permission_action
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_conditions jsonb;
begin
  select rp.conditions into v_conditions
  from public.memberships m
  join public.role_permissions rp on rp.role_id = m.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.resources r on r.id = p.resource_id
  where m.user_id = auth.uid()
    and r.key = p_resource_key and p.action = p_action
    and rp.scope = 'platform'
  limit 1;
  if found then
    return v_conditions;
  end if;

  select rp.conditions into v_conditions
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

  return v_conditions;
end;
$$;

create or replace function public.enforce_expense_claim_transition()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_conditions jsonb;
  v_max_amount numeric;
begin
  new.updated_at := now();

  if new.status = old.status then
    if old.status <> 'draft' then
      raise exception 'Expense claim can only be edited while in draft status';
    end if;
    if not public.can_access_row(old.organization_id, 'expense_claims', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Not authorized to edit this expense claim';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if new.rep_id <> auth.uid() or not public.can_access_row(old.organization_id, 'expense_claims', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Only the owner can submit this expense claim';
    end if;
    new.submitted_at := now();
    v_action := 'submit';

  elsif old.status in ('submitted', 'escalated') and new.status = 'approved' then
    if not public.can_access_row(old.organization_id, 'expense_claims', 'approve', old.territory_id) then
      raise exception 'Not authorized to approve this expense claim';
    end if;

    v_conditions := public.permission_condition(old.organization_id, 'expense_claims', 'approve');
    if v_conditions ? 'max_amount' then
      v_max_amount := (v_conditions ->> 'max_amount')::numeric;
      if old.amount > v_max_amount then
        raise exception 'Claim amount % exceeds your approval limit of % — escalate it instead', old.amount, v_max_amount;
      end if;
    end if;

    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'approve';

  elsif old.status in ('submitted', 'escalated') and new.status = 'rejected' then
    if not public.can_access_row(old.organization_id, 'expense_claims', 'reject', old.territory_id) then
      raise exception 'Not authorized to reject this expense claim';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'reject';

  elsif old.status = 'submitted' and new.status = 'escalated' then
    if not (
      public.can_access_row(old.organization_id, 'expense_claims', 'approve', old.territory_id)
      or public.can_access_row(old.organization_id, 'expense_claims', 'reject', old.territory_id)
    ) then
      raise exception 'Not authorized to escalate this expense claim';
    end if;
    v_action := 'escalate';

  elsif old.status in ('submitted', 'escalated') and new.status = 'draft' then
    if old.rep_id <> auth.uid() or new.rep_id <> auth.uid() then
      raise exception 'Only the owner can withdraw this expense claim';
    end if;
    new.submitted_at := null;
    v_action := 'withdraw';

  else
    raise exception 'Invalid expense claim status transition: % -> %', old.status, new.status;
  end if;

  insert into public.approval_events (organization_id, entity_type, entity_id, actor_id, action, notes)
  values (old.organization_id, 'expense_claim', old.id, auth.uid(), v_action, new.decision_notes);

  return new;
end;
$$;

create trigger expense_claim_transition
  before update on public.expense_claims
  for each row execute function public.enforce_expense_claim_transition();

create trigger audit_expense_claims
  after insert or update or delete on public.expense_claims
  for each row execute function public.audit_row_change();

-- Extend the generic approval_events read policy to cover expense claims too.
drop policy approval_event_select on public.approval_events;
create policy approval_event_select on public.approval_events for select
  using (
    (entity_type = 'tour_plan' and exists (
      select 1 from public.tour_plans tp where tp.id = entity_id
      and public.can_access_row(tp.organization_id, 'tour_plans', 'view', tp.territory_id, tp.rep_id)
    ))
    or
    (entity_type = 'expense_claim' and exists (
      select 1 from public.expense_claims ec where ec.id = entity_id
      and public.can_access_row(ec.organization_id, 'expense_claims', 'view', ec.territory_id, ec.rep_id)
    ))
  );
