-- Dev seed: one org, a rep + manager auth user (password: DevPassword123! — dev-only, never use in prod),
-- a territory, a couple of HCOs/HCPs, and a product.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated',
   'rep1@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated',
   'manager1@medicalrep.dev', crypt('DevPassword123!', gen_salt('bf')), now(), now(), now(), '', '', '', '',
   '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1',
   '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"rep1@medicalrep.dev"}', 'email', now(), now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2',
   '{"sub":"00000000-0000-0000-0000-0000000000a2","email":"manager1@medicalrep.dev"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

insert into public.organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Acme Pharma Demo')
on conflict do nothing;

insert into public.territories (id, organization_id, name) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'North Zone')
on conflict do nothing;

insert into public.hcos (id, organization_id, name, type, territory_id) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'City General Hospital', 'hospital', '00000000-0000-0000-0000-000000000010')
on conflict do nothing;

insert into public.hcps (id, organization_id, first_name, last_name, specialty, tier, hco_id, territory_id, consent_status) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', 'Ayesha', 'Khan', 'Cardiology', 'A', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'granted')
on conflict do nothing;

insert into public.products (id, organization_id, name, sku) values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', 'CardioMax 10mg', 'CM-010')
on conflict do nothing;

insert into public.memberships (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'rep'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2', 'area_manager')
on conflict (user_id, organization_id) do nothing;

insert into public.territory_assignments (organization_id, territory_id, user_id) values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000a1')
on conflict (territory_id, user_id) do nothing;
