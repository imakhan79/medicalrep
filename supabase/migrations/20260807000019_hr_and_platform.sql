-- HR module (leave requests reusing the approval engine a 5th time, performance
-- reviews, attendance derived from existing tracking_sessions data) + Platform
-- Owner company management (organizations table was select-only until now).

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  leave_type text not null check (leave_type in ('annual', 'sick', 'personal', 'emergency', 'unpaid')),
  start_date date not null,
  end_date date not null,
  reason text,
  status public.approval_status not null default 'draft',
  submitted_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

alter table public.leave_requests enable row level security;

create policy leave_request_select on public.leave_requests for select
  using (public.can_access_row(organization_id, 'leave_requests', 'view', territory_id, rep_id));
create policy leave_request_insert on public.leave_requests for insert
  with check (
    rep_id = auth.uid() and status = 'draft'
    and public.can_access_row(organization_id, 'leave_requests', 'create', territory_id, rep_id)
  );
create policy leave_request_update on public.leave_requests for update
  using (
    public.can_access_row(organization_id, 'leave_requests', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'leave_requests', 'approve', territory_id)
    or public.can_access_row(organization_id, 'leave_requests', 'reject', territory_id)
  )
  with check (
    public.can_access_row(organization_id, 'leave_requests', 'edit', territory_id, rep_id)
    or public.can_access_row(organization_id, 'leave_requests', 'approve', territory_id)
    or public.can_access_row(organization_id, 'leave_requests', 'reject', territory_id)
  );
create policy leave_request_delete on public.leave_requests for delete
  using (status = 'draft' and public.can_access_row(organization_id, 'leave_requests', 'edit', territory_id, rep_id));

create trigger leave_request_fill_territory
  before insert on public.leave_requests
  for each row execute function public.fill_tracking_territory();

create or replace function public.enforce_leave_transition()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
begin
  new.updated_at := now();

  if new.status = old.status then
    if old.status <> 'draft' then
      raise exception 'Leave request can only be edited while in draft status';
    end if;
    if not public.can_access_row(old.organization_id, 'leave_requests', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Not authorized to edit this leave request';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if new.rep_id <> auth.uid() or not public.can_access_row(old.organization_id, 'leave_requests', 'edit', old.territory_id, old.rep_id) then
      raise exception 'Only the requester can submit this leave request';
    end if;
    new.submitted_at := now();
    v_action := 'submit';

  elsif old.status in ('submitted', 'escalated') and new.status = 'approved' then
    if not public.can_access_row(old.organization_id, 'leave_requests', 'approve', old.territory_id) then
      raise exception 'Not authorized to approve this leave request';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'approve';

  elsif old.status in ('submitted', 'escalated') and new.status = 'rejected' then
    if not public.can_access_row(old.organization_id, 'leave_requests', 'reject', old.territory_id) then
      raise exception 'Not authorized to reject this leave request';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'reject';

  elsif old.status = 'submitted' and new.status = 'escalated' then
    if not (
      public.can_access_row(old.organization_id, 'leave_requests', 'approve', old.territory_id)
      or public.can_access_row(old.organization_id, 'leave_requests', 'reject', old.territory_id)
    ) then
      raise exception 'Not authorized to escalate this leave request';
    end if;
    v_action := 'escalate';

  elsif old.status in ('submitted', 'escalated') and new.status = 'draft' then
    if old.rep_id <> auth.uid() or new.rep_id <> auth.uid() then
      raise exception 'Only the requester can withdraw this leave request';
    end if;
    new.submitted_at := null;
    v_action := 'withdraw';

  else
    raise exception 'Invalid leave request status transition: % -> %', old.status, new.status;
  end if;

  insert into public.approval_events (organization_id, entity_type, entity_id, actor_id, action, notes)
  values (old.organization_id, 'leave_request', old.id, auth.uid(), v_action, new.decision_notes);

  return new;
end;
$$;

create trigger leave_request_transition
  before update on public.leave_requests
  for each row execute function public.enforce_leave_transition();

create trigger audit_leave_requests
  after insert or update or delete on public.leave_requests
  for each row execute function public.audit_row_change();

drop policy approval_event_select on public.approval_events;
create policy approval_event_select on public.approval_events for select
  using (
    (entity_type = 'tour_plan' and exists (
      select 1 from public.tour_plans tp where tp.id = entity_id
      and public.can_access_row(tp.organization_id, 'tour_plans', 'view', tp.territory_id, tp.rep_id)
    ))
    or (entity_type = 'expense_claim' and exists (
      select 1 from public.expense_claims ec where ec.id = entity_id
      and public.can_access_row(ec.organization_id, 'expense_claims', 'view', ec.territory_id, ec.rep_id)
    ))
    or (entity_type = 'order' and exists (
      select 1 from public.orders o where o.id = entity_id
      and public.can_access_row(o.organization_id, 'orders', 'view', o.territory_id, o.placed_by)
    ))
    or (entity_type = 'leave_request' and exists (
      select 1 from public.leave_requests lr where lr.id = entity_id
      and public.can_access_row(lr.organization_id, 'leave_requests', 'view', lr.territory_id, lr.rep_id)
    ))
  );

-- Performance reviews: manager-authored, employee-acknowledged. Simpler 3-state flow
-- (draft/submitted/acknowledged) — not the approve/reject engine, since this is an
-- acknowledgment workflow, not an authorization decision.
create table public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  reviewer_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  review_period text not null,
  rating smallint check (rating between 1 and 5),
  strengths text,
  improvements text,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'acknowledged')),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.performance_reviews enable row level security;

create policy performance_review_select on public.performance_reviews for select
  using (public.can_access_row(organization_id, 'performance_reviews', 'view', territory_id, rep_id));
create policy performance_review_write on public.performance_reviews for insert
  with check (
    reviewer_id = auth.uid()
    and public.can_access_row(organization_id, 'performance_reviews', 'create', territory_id)
  );
create policy performance_review_update on public.performance_reviews for update
  using (
    (reviewer_id = auth.uid() and public.can_access_row(organization_id, 'performance_reviews', 'edit', territory_id))
    or (rep_id = auth.uid() and public.can_access_row(organization_id, 'performance_reviews', 'edit', territory_id, rep_id))
  )
  with check (
    (reviewer_id = auth.uid() and public.can_access_row(organization_id, 'performance_reviews', 'edit', territory_id))
    or (rep_id = auth.uid() and public.can_access_row(organization_id, 'performance_reviews', 'edit', territory_id, rep_id))
  );

create trigger performance_review_fill_territory
  before insert on public.performance_reviews
  for each row execute function public.fill_tracking_territory();

create trigger audit_performance_reviews
  after insert or update or delete on public.performance_reviews
  for each row execute function public.audit_row_change();

-- Attendance derived from tracking_sessions (no new table — the check-in/out data
-- already exists; this just presents it, scoped like team_dashboard/reps_in_scope).
create or replace function public.attendance_summary(p_org_id uuid, p_date date)
returns table (rep_id uuid, email text, check_in_at timestamptz, check_out_at timestamptz, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  return query
    select
      u.id,
      u.email::text,
      ts.check_in_at,
      ts.check_out_at,
      case
        when ts.check_in_at is null then 'absent'
        when ts.check_in_at::time > time '09:30:00' then 'late'
        else 'present'
      end
    from auth.users u
    join public.memberships m on m.user_id = u.id and m.organization_id = p_org_id
    left join public.tracking_sessions ts on ts.rep_id = u.id
      and ts.organization_id = p_org_id
      and ts.check_in_at::date = p_date
    where u.id in (select public.reps_in_scope(p_org_id, 'field_tracking', 'view'));
end;
$$;

-- Staff role/territory reassignment (transfers/promotions) already happens via
-- /admin/staff — it just wasn't audit-logged until now.
create trigger audit_memberships
  after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();

-- Platform Owner / Super Admin company management: organizations was select-only.
create policy org_insert on public.organizations for insert
  with check (public.can_access_row(id, 'organizations', 'create'));
create policy org_update on public.organizations for update
  using (public.can_access_row(id, 'organizations', 'edit'))
  with check (public.can_access_row(id, 'organizations', 'edit'));
