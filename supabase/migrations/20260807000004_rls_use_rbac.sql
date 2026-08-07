-- Rewire existing table RLS to the new RBAC+ABAC engine (public.can_access_row),
-- replacing the old fixed-enum policies from 20260807000002_rls.sql.

drop policy org_select on public.organizations;
create policy org_select on public.organizations for select
  using (public.can_access_row(id, 'organizations', 'view'));

drop policy membership_select on public.memberships;
drop policy membership_write on public.memberships;
create policy membership_select on public.memberships for select
  using (public.can_access_row(organization_id, 'memberships', 'view'));
create policy membership_write on public.memberships for all
  using (public.can_access_row(organization_id, 'memberships', 'edit'))
  with check (public.can_access_row(organization_id, 'memberships', 'edit'));

drop policy territory_select on public.territories;
drop policy territory_write on public.territories;
create policy territory_select on public.territories for select
  using (public.can_access_row(organization_id, 'territories', 'view'));
create policy territory_write on public.territories for all
  using (public.can_access_row(organization_id, 'territories', 'edit'))
  with check (public.can_access_row(organization_id, 'territories', 'edit'));

drop policy territory_assignment_select on public.territory_assignments;
drop policy territory_assignment_write on public.territory_assignments;
create policy territory_assignment_select on public.territory_assignments for select
  using (public.can_access_row(organization_id, 'territories', 'assign'));
create policy territory_assignment_write on public.territory_assignments for all
  using (public.can_access_row(organization_id, 'territories', 'assign'))
  with check (public.can_access_row(organization_id, 'territories', 'assign'));

drop policy hco_select on public.hcos;
drop policy hco_write on public.hcos;
create policy hco_select on public.hcos for select
  using (public.can_access_row(organization_id, 'hcos', 'view', territory_id));
create policy hco_write on public.hcos for all
  using (public.can_access_row(organization_id, 'hcos', 'edit', territory_id))
  with check (public.can_access_row(organization_id, 'hcos', 'edit', territory_id));

drop policy hcp_select on public.hcps;
drop policy hcp_insert on public.hcps;
drop policy hcp_update on public.hcps;
drop policy hcp_delete on public.hcps;
create policy hcp_select on public.hcps for select
  using (public.can_access_row(organization_id, 'hcps', 'view', territory_id));
create policy hcp_insert on public.hcps for insert
  with check (public.can_access_row(organization_id, 'hcps', 'create', territory_id));
create policy hcp_update on public.hcps for update
  using (public.can_access_row(organization_id, 'hcps', 'edit', territory_id))
  with check (public.can_access_row(organization_id, 'hcps', 'edit', territory_id));
create policy hcp_delete on public.hcps for delete
  using (public.can_access_row(organization_id, 'hcps', 'delete', territory_id));

drop policy product_select on public.products;
drop policy product_write on public.products;
create policy product_select on public.products for select
  using (public.can_access_row(organization_id, 'products', 'view'));
create policy product_write on public.products for all
  using (public.can_access_row(organization_id, 'products', 'edit'))
  with check (public.can_access_row(organization_id, 'products', 'edit'));

drop policy visit_select on public.visits;
drop policy visit_insert on public.visits;
drop policy visit_update on public.visits;
drop policy visit_delete on public.visits;
create policy visit_select on public.visits for select
  using (
    public.can_access_row(organization_id, 'visits', 'view', null, rep_id)
    or public.can_access_row(organization_id, 'visits', 'view', (select h.territory_id from public.hcps h where h.id = hcp_id))
  );
create policy visit_insert on public.visits for insert
  with check (rep_id = auth.uid() and public.can_access_row(organization_id, 'visits', 'create', null, rep_id));
create policy visit_update on public.visits for update
  using (
    public.can_access_row(organization_id, 'visits', 'edit', null, rep_id)
    or public.can_access_row(organization_id, 'visits', 'edit', (select h.territory_id from public.hcps h where h.id = hcp_id))
  )
  with check (
    public.can_access_row(organization_id, 'visits', 'edit', null, rep_id)
    or public.can_access_row(organization_id, 'visits', 'edit', (select h.territory_id from public.hcps h where h.id = hcp_id))
  );
create policy visit_delete on public.visits for delete
  using (public.can_access_row(organization_id, 'visits', 'delete', (select h.territory_id from public.hcps h where h.id = hcp_id)));

drop policy visit_product_select on public.visit_products;
drop policy visit_product_write on public.visit_products;
create policy visit_product_select on public.visit_products for select
  using (exists (
    select 1 from public.visits v where v.id = visit_id
    and (
      public.can_access_row(v.organization_id, 'visits', 'view', null, v.rep_id)
      or public.can_access_row(v.organization_id, 'visits', 'view', (select h.territory_id from public.hcps h where h.id = v.hcp_id))
    )
  ));
create policy visit_product_write on public.visit_products for all
  using (exists (
    select 1 from public.visits v where v.id = visit_id
    and (
      public.can_access_row(v.organization_id, 'visits', 'edit', null, v.rep_id)
      or public.can_access_row(v.organization_id, 'visits', 'edit', (select h.territory_id from public.hcps h where h.id = v.hcp_id))
    )
  ))
  with check (exists (
    select 1 from public.visits v where v.id = visit_id
    and (
      public.can_access_row(v.organization_id, 'visits', 'edit', null, v.rep_id)
      or public.can_access_row(v.organization_id, 'visits', 'edit', (select h.territory_id from public.hcps h where h.id = v.hcp_id))
    )
  ));

drop policy audit_select on public.audit_log;
create policy audit_select on public.audit_log for select
  using (public.can_access_row(organization_id, 'audit_log', 'view'));

-- memberships.role_id is now the source of truth; drop the old fixed-role column/type/helpers.
-- (left nullable: seed data backfills it after roles are created; can_access_row default-denies on null)
alter table public.memberships drop column role;
drop function if exists public.current_membership(uuid);
drop function if exists public.is_manager_or_admin(uuid);
drop type public.user_role;
-- public.is_org_member(uuid) is kept: still used for read access to shared catalog tables (roles/resources).
