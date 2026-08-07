-- Staff/membership administration functions.
--
-- There is no service_role key on the client, so we can't call the Auth Admin API
-- from the browser to create new staff accounts. Instead, these are `security definer`
-- functions (owned by the migration role, which has direct access to `auth`) that
-- perform their own permission check via can_access_row() before touching anything —
-- the same authorization boundary RLS uses everywhere else, just exposed as an RPC
-- for the one case (creating an auth user) that RLS can't reach.

create or replace function public.list_org_members(p_org_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  role_id uuid,
  role_name text,
  role_key text,
  role_is_system boolean,
  territory_names text,
  created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.can_access_row(p_org_id, 'memberships', 'view') then
    raise exception 'Not authorized to view members of this organization';
  end if;

  return query
    select
      m.id,
      m.user_id,
      u.email::text,
      m.role_id,
      r.name,
      r.key,
      r.is_system,
      (select string_agg(t.name, ', ') from public.territory_assignments ta
        join public.territories t on t.id = ta.territory_id
        where ta.user_id = m.user_id and ta.organization_id = p_org_id),
      m.created_at
    from public.memberships m
    join auth.users u on u.id = m.user_id
    join public.roles r on r.id = m.role_id
    where m.organization_id = p_org_id
    order by u.email;
end;
$$;

create or replace function public.admin_create_staff_member(
  p_org_id uuid,
  p_email text,
  p_password text,
  p_role_id uuid,
  p_territory_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
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

create or replace function public.admin_remove_staff_member(p_org_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.can_access_row(p_org_id, 'memberships', 'delete') then
    raise exception 'Not authorized to remove staff from this organization';
  end if;

  delete from public.territory_assignments where organization_id = p_org_id and user_id = p_user_id;
  delete from public.memberships where organization_id = p_org_id and user_id = p_user_id;
end;
$$;
