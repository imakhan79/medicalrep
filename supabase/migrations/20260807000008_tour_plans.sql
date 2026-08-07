-- Tour Plan module + generic approval engine.
--
-- Design: approval eligibility is NOT a separately-assigned "approver" — it's just
-- can_access_row(org, 'tour_plans', 'approve'/'reject', territory_id), the same
-- RBAC+ABAC grants used everywhere else. A Regional Manager can approve any tour
-- plan whose territory falls in their hierarchy because that's exactly what their
-- 'hierarchy'-scoped 'approve' grant already means — no extra routing table needed.
--
-- approval_events is a generic, append-only audit log keyed by (entity_type, entity_id)
-- so later approval-gated modules (expense_claims, orders) can reuse it instead of each
-- growing their own history table.

create type public.approval_status as enum ('draft', 'submitted', 'approved', 'rejected', 'escalated');

create table public.tour_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  title text not null,
  period_start date not null,
  period_end date not null,
  notes text,
  status public.approval_status not null default 'draft',
  submitted_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table public.tour_plan_visits (
  id uuid primary key default gen_random_uuid(),
  tour_plan_id uuid not null references public.tour_plans(id) on delete cascade,
  hcp_id uuid not null references public.hcps(id),
  planned_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  actor_id uuid references auth.users(id),
  action text not null check (action in ('submit', 'approve', 'reject', 'escalate', 'withdraw')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tour_plans enable row level security;
alter table public.tour_plan_visits enable row level security;
alter table public.approval_events enable row level security;

create policy tour_plan_select on public.tour_plans for select
  using (public.can_access_row(organization_id, 'tour_plans', 'view', territory_id, rep_id));

create policy tour_plan_insert on public.tour_plans for insert
  with check (
    rep_id = auth.uid()
    and status = 'draft'
    and public.can_access_row(organization_id, 'tour_plans', 'create', territory_id, rep_id)
  );

-- Broad baseline gate; the exact legal transitions (who can move draft -> submitted,
-- submitted -> approved, etc.) are enforced by the trigger below, not here.
create policy tour_plan_update on public.tour_plans for update
  using (
    public.can_access_row(organization_id, 'tour_plans', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'tour_plans', 'approve', territory_id)
    or public.can_access_row(organization_id, 'tour_plans', 'reject', territory_id)
  )
  with check (
    public.can_access_row(organization_id, 'tour_plans', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'tour_plans', 'approve', territory_id)
    or public.can_access_row(organization_id, 'tour_plans', 'reject', territory_id)
  );

create policy tour_plan_delete on public.tour_plans for delete
  using (status = 'draft' and public.can_access_row(organization_id, 'tour_plans', 'edit', territory_id, rep_id));

create policy tour_plan_visit_select on public.tour_plan_visits for select
  using (exists (
    select 1 from public.tour_plans tp where tp.id = tour_plan_id
    and public.can_access_row(tp.organization_id, 'tour_plans', 'view', tp.territory_id, tp.rep_id)
  ));

create policy tour_plan_visit_write on public.tour_plan_visits for all
  using (exists (
    select 1 from public.tour_plans tp where tp.id = tour_plan_id
    and tp.status = 'draft'
    and public.can_access_row(tp.organization_id, 'tour_plans', 'edit', tp.territory_id, tp.rep_id)
  ))
  with check (exists (
    select 1 from public.tour_plans tp where tp.id = tour_plan_id
    and tp.status = 'draft'
    and public.can_access_row(tp.organization_id, 'tour_plans', 'edit', tp.territory_id, tp.rep_id)
  ));

-- approval_events is written only by the transition trigger below (security definer,
-- bypasses RLS as table owner) — no insert/update/delete policy is granted here.
create policy approval_event_select on public.approval_events for select
  using (exists (
    select 1 from public.tour_plans tp where tp.id = entity_id and entity_type = 'tour_plan'
    and public.can_access_row(tp.organization_id, 'tour_plans', 'view', tp.territory_id, tp.rep_id)
  ));

create or replace function public.enforce_tour_plan_transition()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
begin
  new.updated_at := now();

  if new.status = old.status then
    if old.status <> 'draft' then
      raise exception 'Tour plan can only be edited while in draft status';
    end if;
    if not public.can_access_row(old.organization_id, 'tour_plans', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Not authorized to edit this tour plan';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if new.rep_id <> auth.uid() or not public.can_access_row(old.organization_id, 'tour_plans', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Only the owner can submit this tour plan';
    end if;
    new.submitted_at := now();
    v_action := 'submit';

  elsif old.status in ('submitted', 'escalated') and new.status = 'approved' then
    if not public.can_access_row(old.organization_id, 'tour_plans', 'approve', old.territory_id) then
      raise exception 'Not authorized to approve this tour plan';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'approve';

  elsif old.status in ('submitted', 'escalated') and new.status = 'rejected' then
    if not public.can_access_row(old.organization_id, 'tour_plans', 'reject', old.territory_id) then
      raise exception 'Not authorized to reject this tour plan';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'reject';

  elsif old.status = 'submitted' and new.status = 'escalated' then
    if not (
      public.can_access_row(old.organization_id, 'tour_plans', 'approve', old.territory_id)
      or public.can_access_row(old.organization_id, 'tour_plans', 'reject', old.territory_id)
    ) then
      raise exception 'Not authorized to escalate this tour plan';
    end if;
    v_action := 'escalate';

  elsif old.status in ('submitted', 'escalated') and new.status = 'draft' then
    if old.rep_id <> auth.uid() or new.rep_id <> auth.uid() then
      raise exception 'Only the owner can withdraw this tour plan';
    end if;
    new.submitted_at := null;
    v_action := 'withdraw';

  else
    raise exception 'Invalid tour plan status transition: % -> %', old.status, new.status;
  end if;

  insert into public.approval_events (organization_id, entity_type, entity_id, actor_id, action, notes)
  values (old.organization_id, 'tour_plan', old.id, auth.uid(), v_action, new.decision_notes);

  return new;
end;
$$;

create trigger tour_plan_transition
  before update on public.tour_plans
  for each row execute function public.enforce_tour_plan_transition();

create trigger audit_tour_plans
  after insert or update or delete on public.tour_plans
  for each row execute function public.audit_row_change();
