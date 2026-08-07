-- Row Level Security: every table scoped to organization membership.
-- Reps: read/write their own visits + read HCPs in their assigned territory.
-- Managers/Admin/Compliance: full read/write across their org.

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.territories enable row level security;
alter table public.territory_assignments enable row level security;
alter table public.hcos enable row level security;
alter table public.hcps enable row level security;
alter table public.products enable row level security;
alter table public.visits enable row level security;
alter table public.visit_products enable row level security;
alter table public.audit_log enable row level security;

-- organizations: visible to members
create policy org_select on public.organizations for select
  using (public.is_org_member(id));

-- memberships: visible to members of the same org; only managers/admin can write
create policy membership_select on public.memberships for select
  using (public.is_org_member(organization_id));
create policy membership_write on public.memberships for all
  using (public.is_manager_or_admin(organization_id))
  with check (public.is_manager_or_admin(organization_id));

-- territories: org members read; managers/admin write
create policy territory_select on public.territories for select
  using (public.is_org_member(organization_id));
create policy territory_write on public.territories for all
  using (public.is_manager_or_admin(organization_id))
  with check (public.is_manager_or_admin(organization_id));

create policy territory_assignment_select on public.territory_assignments for select
  using (public.is_org_member(organization_id));
create policy territory_assignment_write on public.territory_assignments for all
  using (public.is_manager_or_admin(organization_id))
  with check (public.is_manager_or_admin(organization_id));

-- hcos: org members read; managers/admin write
create policy hco_select on public.hcos for select
  using (public.is_org_member(organization_id));
create policy hco_write on public.hcos for all
  using (public.is_manager_or_admin(organization_id))
  with check (public.is_manager_or_admin(organization_id));

-- hcps: reps see HCPs in their assigned territory (or unassigned), managers/admin see all in org
create policy hcp_select on public.hcps for select
  using (
    public.is_manager_or_admin(organization_id)
    or (
      public.is_org_member(organization_id)
      and (
        territory_id is null
        or territory_id in (
          select territory_id from public.territory_assignments
          where user_id = auth.uid()
        )
      )
    )
  );
create policy hcp_insert on public.hcps for insert
  with check (public.is_org_member(organization_id));
create policy hcp_update on public.hcps for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));
create policy hcp_delete on public.hcps for delete
  using (public.is_manager_or_admin(organization_id));

-- products: org members read; managers/admin write
create policy product_select on public.products for select
  using (public.is_org_member(organization_id));
create policy product_write on public.products for all
  using (public.is_manager_or_admin(organization_id))
  with check (public.is_manager_or_admin(organization_id));

-- visits: reps see/create their own; managers/admin see all in org
create policy visit_select on public.visits for select
  using (
    public.is_manager_or_admin(organization_id)
    or (public.is_org_member(organization_id) and rep_id = auth.uid())
  );
create policy visit_insert on public.visits for insert
  with check (public.is_org_member(organization_id) and rep_id = auth.uid());
create policy visit_update on public.visits for update
  using (
    public.is_manager_or_admin(organization_id)
    or (public.is_org_member(organization_id) and rep_id = auth.uid())
  )
  with check (
    public.is_manager_or_admin(organization_id)
    or (public.is_org_member(organization_id) and rep_id = auth.uid())
  );
create policy visit_delete on public.visits for delete
  using (public.is_manager_or_admin(organization_id));

-- visit_products: follows parent visit's visibility
create policy visit_product_select on public.visit_products for select
  using (exists (
    select 1 from public.visits v where v.id = visit_id
    and (public.is_manager_or_admin(v.organization_id) or v.rep_id = auth.uid())
  ));
create policy visit_product_write on public.visit_products for all
  using (exists (
    select 1 from public.visits v where v.id = visit_id
    and (public.is_manager_or_admin(v.organization_id) or v.rep_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.visits v where v.id = visit_id
    and (public.is_manager_or_admin(v.organization_id) or v.rep_id = auth.uid())
  ));

-- audit_log: managers/admin/compliance read only; writes happen via security-definer triggers only
create policy audit_select on public.audit_log for select
  using (public.is_manager_or_admin(organization_id));

-- Generic audit trigger
create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  org_id uuid;
begin
  org_id := coalesce(new.organization_id, old.organization_id);
  insert into public.audit_log (organization_id, actor_id, table_name, row_id, action, changed_data)
  values (
    org_id,
    auth.uid(),
    tg_table_name,
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_hcps after insert or update or delete on public.hcps
  for each row execute function public.audit_row_change();
create trigger audit_visits after insert or update or delete on public.visits
  for each row execute function public.audit_row_change();
