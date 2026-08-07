-- Privilege-escalation guard: an org-scoped custom role (organization_id not null)
-- must never be granted 'platform' scope, even by someone with 'configure' on 'roles'.
-- Only the pre-seeded system roles (Super Admin, Platform Owner) may hold platform scope.

create or replace function public.prevent_org_role_platform_scope()
returns trigger
language plpgsql as $$
begin
  if new.scope = 'platform' and exists (
    select 1 from public.roles r where r.id = new.role_id and r.organization_id is not null
  ) then
    raise exception 'Org-scoped custom roles cannot be granted platform scope';
  end if;
  return new;
end;
$$;

create trigger role_permissions_no_org_platform
before insert or update on public.role_permissions
for each row execute function public.prevent_org_role_platform_scope();
