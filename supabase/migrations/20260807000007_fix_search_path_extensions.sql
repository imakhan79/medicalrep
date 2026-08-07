-- 20260807000006's admin_create_staff_member (and seed.sql's inline crypt() calls) rely on
-- pgcrypto, which Supabase installs into the `extensions` schema, not `public`. Functions
-- declared with `set search_path = public` can't see it. Widen the search_path on the
-- functions that need crypt()/gen_salt().

create or replace function public.admin_create_staff_member(
  p_org_id uuid,
  p_email text,
  p_password text,
  p_role_id uuid,
  p_territory_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_role_org uuid;
begin
  if not public.can_access_row(p_org_id, 'memberships', 'create') then
    raise exception 'Not authorized to add staff to this organization';
  end if;

  select organization_id into v_role_org from public.roles where id = p_role_id;
  if v_role_org is not null and v_role_org <> p_org_id then
    raise exception 'That role does not belong to this organization';
  end if;

  if length(p_password) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    p_email, crypt(p_password, gen_salt('bf')), now(), now(), now(), '', '', '', '',
    '{"provider":"email","providers":["email"]}', '{}'
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    v_user_id, v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', p_email),
    'email', now(), now(), now()
  );

  insert into public.memberships (organization_id, user_id, role_id)
  values (p_org_id, v_user_id, p_role_id);

  if p_territory_id is not null then
    insert into public.territory_assignments (organization_id, territory_id, user_id)
    values (p_org_id, p_territory_id, v_user_id);
  end if;

  return v_user_id;
end;
$$;
