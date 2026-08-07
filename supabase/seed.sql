-- Dev seed: one org, one territory, a manager + rep membership (users created via Auth separately),
-- a couple of HCOs/HCPs, and a product. Run after auth users exist (see docs/06-roadmap.md dev setup notes).

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
