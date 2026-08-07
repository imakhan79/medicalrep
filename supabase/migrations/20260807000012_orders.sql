-- Orders module: secondary sales orders from channel partners (stockists/distributors/
-- pharmacies — data records, not portal logins, per the earlier RBAC decision).
--
-- Reuses public.approval_status/approval_events a third time (tour_plans, expense_claims,
-- now orders) — same draft->submitted->approved|rejected|escalated graph, same trigger
-- pattern. New here: fulfillment_status is a second, independent state that only moves
-- *after* approval (pending->dispatched->delivered->cancelled), handled by Warehouse
-- Manager — so the content-edit branch of the trigger has to distinguish "editing draft
-- order content" from "advancing fulfillment on an approved order" rather than just
-- blanket-blocking anything once status leaves 'draft'.

create table public.channel_partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null check (type in ('stockist', 'distributor', 'pharmacy')),
  territory_id uuid references public.territories(id),
  contact_phone text,
  contact_email text,
  created_at timestamptz not null default now()
);

alter table public.channel_partners enable row level security;

create policy channel_partner_select on public.channel_partners for select
  using (public.can_access_row(organization_id, 'channel_partners', 'view', territory_id));

create policy channel_partner_write on public.channel_partners for all
  using (public.can_access_row(organization_id, 'channel_partners', 'edit', territory_id))
  with check (public.can_access_row(organization_id, 'channel_partners', 'edit', territory_id));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_partner_id uuid not null references public.channel_partners(id),
  territory_id uuid references public.territories(id),
  placed_by uuid not null references auth.users(id),
  order_date date not null default current_date,
  status public.approval_status not null default 'draft',
  fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'dispatched', 'delivered', 'cancelled')),
  submitted_at timestamptz,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy order_select on public.orders for select
  using (public.can_access_row(organization_id, 'orders', 'view', territory_id, placed_by));

create policy order_insert on public.orders for insert
  with check (
    placed_by = auth.uid()
    and status = 'draft'
    and public.can_access_row(organization_id, 'orders', 'create', territory_id, placed_by)
  );

create policy order_update on public.orders for update
  using (
    public.can_access_row(organization_id, 'orders', 'edit', territory_id, placed_by)
    or public.can_access_row(organization_id, 'orders', 'approve', territory_id)
    or public.can_access_row(organization_id, 'orders', 'reject', territory_id)
  )
  with check (
    public.can_access_row(organization_id, 'orders', 'edit', territory_id, placed_by)
    or public.can_access_row(organization_id, 'orders', 'approve', territory_id)
    or public.can_access_row(organization_id, 'orders', 'reject', territory_id)
  );

create policy order_delete on public.orders for delete
  using (status = 'draft' and public.can_access_row(organization_id, 'orders', 'edit', territory_id, placed_by));

create policy order_item_select on public.order_items for select
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and public.can_access_row(o.organization_id, 'orders', 'view', o.territory_id, o.placed_by)
  ));

create policy order_item_write on public.order_items for all
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and o.status = 'draft'
    and public.can_access_row(o.organization_id, 'orders', 'edit', o.territory_id, o.placed_by)
  ))
  with check (exists (
    select 1 from public.orders o where o.id = order_id
    and o.status = 'draft'
    and public.can_access_row(o.organization_id, 'orders', 'edit', o.territory_id, o.placed_by)
  ));

create or replace function public.fill_order_territory()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.territory_id is null then
    select cp.territory_id into new.territory_id
    from public.channel_partners cp
    where cp.id = new.channel_partner_id;
  end if;
  return new;
end;
$$;

create trigger order_fill_territory
  before insert on public.orders
  for each row execute function public.fill_order_territory();

create or replace function public.enforce_order_transition()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_action text;
begin
  new.updated_at := now();

  if new.status = old.status then
    if new.fulfillment_status <> old.fulfillment_status then
      if old.status <> 'approved' then
        raise exception 'Fulfillment can only be updated on an approved order';
      end if;
      if not public.can_access_row(old.organization_id, 'orders', 'edit', old.territory_id, old.placed_by) then
        raise exception 'Not authorized to update fulfillment for this order';
      end if;
      return new;
    end if;

    if old.status <> 'draft' then
      raise exception 'Order can only be edited while in draft status';
    end if;
    if not public.can_access_row(old.organization_id, 'orders', 'edit', old.territory_id, old.placed_by) then
      raise exception 'Not authorized to edit this order';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if new.placed_by <> auth.uid() or not public.can_access_row(old.organization_id, 'orders', 'edit', old.territory_id, old.placed_by) then
      raise exception 'Only the person who placed this order can submit it';
    end if;
    new.submitted_at := now();
    v_action := 'submit';

  elsif old.status in ('submitted', 'escalated') and new.status = 'approved' then
    if not public.can_access_row(old.organization_id, 'orders', 'approve', old.territory_id) then
      raise exception 'Not authorized to approve this order';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'approve';

  elsif old.status in ('submitted', 'escalated') and new.status = 'rejected' then
    if not public.can_access_row(old.organization_id, 'orders', 'reject', old.territory_id) then
      raise exception 'Not authorized to reject this order';
    end if;
    new.decided_by := auth.uid();
    new.decided_at := now();
    v_action := 'reject';

  elsif old.status = 'submitted' and new.status = 'escalated' then
    if not (
      public.can_access_row(old.organization_id, 'orders', 'approve', old.territory_id)
      or public.can_access_row(old.organization_id, 'orders', 'reject', old.territory_id)
    ) then
      raise exception 'Not authorized to escalate this order';
    end if;
    v_action := 'escalate';

  elsif old.status in ('submitted', 'escalated') and new.status = 'draft' then
    if old.placed_by <> auth.uid() or new.placed_by <> auth.uid() then
      raise exception 'Only the person who placed this order can withdraw it';
    end if;
    new.submitted_at := null;
    v_action := 'withdraw';

  else
    raise exception 'Invalid order status transition: % -> %', old.status, new.status;
  end if;

  insert into public.approval_events (organization_id, entity_type, entity_id, actor_id, action, notes)
  values (old.organization_id, 'order', old.id, auth.uid(), v_action, new.decision_notes);

  return new;
end;
$$;

create trigger order_transition
  before update on public.orders
  for each row execute function public.enforce_order_transition();

create trigger audit_orders
  after insert or update or delete on public.orders
  for each row execute function public.audit_row_change();

create trigger audit_channel_partners
  after insert or update or delete on public.channel_partners
  for each row execute function public.audit_row_change();

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
    or
    (entity_type = 'order' and exists (
      select 1 from public.orders o where o.id = entity_id
      and public.can_access_row(o.organization_id, 'orders', 'view', o.territory_id, o.placed_by)
    ))
  );
