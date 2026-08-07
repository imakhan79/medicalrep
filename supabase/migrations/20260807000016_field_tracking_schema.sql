-- Field Force Live Tracking — Phase 1 (see conversation for what's explicitly deferred:
-- traffic-aware AI routing, SMS/push delivery, face-liveness verification, heatmaps,
-- live chat — those need paid APIs/providers this project doesn't have connected).
--
-- Architecture: rep's client inserts into location_history (append-only breadcrumb log);
-- a single trigger (process_location_point) does anti-spoofing checks, geofence arrival/
-- departure detection, alert generation, and upserts the one-row-per-rep live_locations
-- snapshot that Realtime broadcasts to manager dashboards. No polling required.

create table public.tracking_policies (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  tracking_interval_seconds integer not null default 30,
  min_accuracy_meters numeric not null default 100,
  max_plausible_speed_kmh numeric not null default 180,
  stationary_alert_minutes integer not null default 60,
  offline_alert_minutes integer not null default 15,
  location_retention_days integer not null default 180,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.tracking_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  status text not null default 'active' check (status in ('active', 'completed')),
  check_in_at timestamptz not null default now(),
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_at timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  total_distance_km numeric,
  tracking_interval_seconds integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.geofences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('hcp', 'hco', 'office', 'warehouse', 'restricted', 'other')),
  entity_id uuid,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 200 check (radius_meters between 25 and 5000),
  territory_id uuid references public.territories(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.live_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null unique references auth.users(id),
  territory_id uuid references public.territories(id),
  session_id uuid references public.tracking_sessions(id),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters numeric,
  speed_kmh numeric,
  heading numeric,
  battery_pct integer,
  status text not null default 'active'
    check (status in ('active', 'on_visit', 'stationary', 'delayed', 'alert', 'offline')),
  current_geofence_id uuid references public.geofences(id),
  recorded_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table public.location_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  session_id uuid not null references public.tracking_sessions(id),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters numeric,
  speed_kmh numeric,
  heading numeric,
  battery_pct integer,
  is_suspicious boolean not null default false,
  suspicious_reason text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.geofence_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  geofence_id uuid not null references public.geofences(id),
  event_type text not null check (event_type in ('arrival', 'departure')),
  latitude double precision,
  longitude double precision,
  recorded_at timestamptz not null default now()
);

create table public.tracking_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  alert_type text not null check (alert_type in (
    'gps_disabled', 'poor_accuracy', 'spoofing_suspected', 'territory_deviation',
    'excessive_travel', 'late_checkin', 'early_checkout', 'missing_attendance',
    'missed_visit', 'short_visit', 'long_visit', 'sos', 'stationary_long', 'offline'
  )),
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  related_id uuid,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);

create table public.sos_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rep_id uuid not null references auth.users(id),
  territory_id uuid references public.territories(id),
  latitude double precision,
  longitude double precision,
  triggered_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  notes text
);

create index location_history_session_idx on public.location_history (session_id, recorded_at);
create index location_history_rep_recorded_idx on public.location_history (rep_id, recorded_at);
create index tracking_alerts_org_status_idx on public.tracking_alerts (organization_id, status);

alter table public.tracking_policies enable row level security;
alter table public.tracking_sessions enable row level security;
alter table public.geofences enable row level security;
alter table public.live_locations enable row level security;
alter table public.location_history enable row level security;
alter table public.geofence_events enable row level security;
alter table public.tracking_alerts enable row level security;
alter table public.sos_incidents enable row level security;

create policy tracking_policy_select on public.tracking_policies for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view'));
create policy tracking_policy_write on public.tracking_policies for all
  using (public.can_access_row(organization_id, 'field_tracking', 'configure'))
  with check (public.can_access_row(organization_id, 'field_tracking', 'configure'));

create policy tracking_session_select on public.tracking_sessions for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));
create policy tracking_session_write on public.tracking_sessions for all
  using (rep_id = auth.uid() and public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id, rep_id))
  with check (rep_id = auth.uid() and public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id, rep_id));

create policy geofence_select on public.geofences for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id));
create policy geofence_write on public.geofences for all
  using (public.can_access_row(organization_id, 'field_tracking', 'configure', territory_id))
  with check (public.can_access_row(organization_id, 'field_tracking', 'configure', territory_id));

create policy live_location_select on public.live_locations for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));
-- No insert/update policy: live_locations is only ever written by the trigger below
-- (security definer, bypasses RLS as table owner). Direct client writes are refused.

create policy location_history_select on public.location_history for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));
create policy location_history_insert on public.location_history for insert
  with check (rep_id = auth.uid() and public.can_access_row(organization_id, 'field_tracking', 'create', territory_id, rep_id));

create policy geofence_event_select on public.geofence_events for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));

create policy tracking_alert_select on public.tracking_alerts for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));
create policy tracking_alert_update on public.tracking_alerts for update
  using (public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id))
  with check (public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id));

create policy sos_select on public.sos_incidents for select
  using (public.can_access_row(organization_id, 'field_tracking', 'view', territory_id, rep_id));
create policy sos_insert on public.sos_incidents for insert
  with check (rep_id = auth.uid());
create policy sos_update on public.sos_incidents for update
  using (public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id))
  with check (public.can_access_row(organization_id, 'field_tracking', 'edit', territory_id));

-- Territory auto-fill (same pattern as expense_claims/sample_allocations/targets).
create or replace function public.fill_tracking_territory()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.territory_id is null then
    select ta.territory_id into new.territory_id
    from public.territory_assignments ta
    where ta.user_id = new.rep_id and ta.organization_id = new.organization_id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger tracking_session_fill_territory
  before insert on public.tracking_sessions
  for each row execute function public.fill_tracking_territory();

create trigger sos_fill_territory
  before insert on public.sos_incidents
  for each row execute function public.fill_tracking_territory();

create or replace function public.haversine_meters(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lon2 - lon1) / 2) ^ 2
  ));
$$;

-- The core real-time pipeline: every inserted breadcrumb runs anti-spoofing + geofence
-- detection + alerting, then upserts the live snapshot Realtime broadcasts.
create or replace function public.process_location_point()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_min_accuracy numeric := 100;
  v_max_speed numeric := 180;
  v_prev record;
  v_seconds numeric;
  v_implied_speed numeric;
  v_distance_from_prev numeric;
  v_now_inside uuid;
  v_was_inside uuid;
  v_status text := 'active';
begin
  if new.territory_id is null then
    select territory_id into new.territory_id from public.tracking_sessions where id = new.session_id;
  end if;

  select tp.min_accuracy_meters, tp.max_plausible_speed_kmh
    into v_min_accuracy, v_max_speed
  from public.tracking_policies tp where tp.organization_id = new.organization_id;

  select * into v_prev from public.location_history
  where session_id = new.session_id
  order by recorded_at desc
  limit 1;

  if v_prev is not null then
    v_seconds := extract(epoch from (new.recorded_at - v_prev.recorded_at));
    v_distance_from_prev := public.haversine_meters(v_prev.latitude, v_prev.longitude, new.latitude, new.longitude);
    if v_seconds > 0 then
      v_implied_speed := (v_distance_from_prev / 1000.0) / (v_seconds / 3600.0);
      if v_implied_speed > coalesce(v_max_speed, 180) then
        new.is_suspicious := true;
        new.suspicious_reason := 'Implied speed ' || round(v_implied_speed) || ' km/h exceeds plausible maximum';
        insert into public.tracking_alerts (organization_id, rep_id, territory_id, alert_type, severity, message)
        values (new.organization_id, new.rep_id, new.territory_id, 'spoofing_suspected', 'critical',
          'Implied speed of ' || round(v_implied_speed) || ' km/h between consecutive points for this rep — possible GPS spoofing or teleportation. Flagged for manager review, not auto-penalized.');
      end if;
    end if;
  end if;

  if new.accuracy_meters is not null and new.accuracy_meters > coalesce(v_min_accuracy, 100) then
    insert into public.tracking_alerts (organization_id, rep_id, territory_id, alert_type, severity, message)
    values (new.organization_id, new.rep_id, new.territory_id, 'poor_accuracy', 'info',
      'GPS accuracy ' || round(new.accuracy_meters) || 'm exceeds the ' || coalesce(v_min_accuracy, 100) || 'm threshold');
  end if;

  select g.id into v_now_inside
  from public.geofences g
  where g.organization_id = new.organization_id
    and public.haversine_meters(g.latitude, g.longitude, new.latitude, new.longitude) <= g.radius_meters
  order by public.haversine_meters(g.latitude, g.longitude, new.latitude, new.longitude)
  limit 1;

  select current_geofence_id into v_was_inside from public.live_locations where rep_id = new.rep_id;

  if v_now_inside is distinct from v_was_inside then
    if v_was_inside is not null then
      insert into public.geofence_events (organization_id, rep_id, territory_id, geofence_id, event_type, latitude, longitude)
      values (new.organization_id, new.rep_id, new.territory_id, v_was_inside, 'departure', new.latitude, new.longitude);
    end if;
    if v_now_inside is not null then
      insert into public.geofence_events (organization_id, rep_id, territory_id, geofence_id, event_type, latitude, longitude)
      values (new.organization_id, new.rep_id, new.territory_id, v_now_inside, 'arrival', new.latitude, new.longitude);
    end if;
  end if;

  v_status := case
    when new.is_suspicious then 'alert'
    when v_now_inside is not null then 'on_visit'
    when v_distance_from_prev is not null and v_distance_from_prev < 20 then 'stationary'
    else 'active'
  end;

  insert into public.live_locations (
    organization_id, rep_id, territory_id, session_id, latitude, longitude,
    accuracy_meters, speed_kmh, heading, battery_pct, status, current_geofence_id, recorded_at, updated_at
  ) values (
    new.organization_id, new.rep_id, new.territory_id, new.session_id, new.latitude, new.longitude,
    new.accuracy_meters, new.speed_kmh, new.heading, new.battery_pct, v_status, v_now_inside, new.recorded_at, now()
  )
  on conflict (rep_id) do update set
    organization_id = excluded.organization_id,
    territory_id = excluded.territory_id,
    session_id = excluded.session_id,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    accuracy_meters = excluded.accuracy_meters,
    speed_kmh = excluded.speed_kmh,
    heading = excluded.heading,
    battery_pct = excluded.battery_pct,
    status = excluded.status,
    current_geofence_id = excluded.current_geofence_id,
    recorded_at = excluded.recorded_at,
    updated_at = now();

  return new;
end;
$$;

create trigger location_history_process
  before insert on public.location_history
  for each row execute function public.process_location_point();

create or replace function public.notify_sos()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.tracking_alerts (organization_id, rep_id, territory_id, alert_type, severity, message, related_id)
  values (new.organization_id, new.rep_id, new.territory_id, 'sos', 'critical',
    coalesce(new.notes, 'Emergency SOS triggered'), new.id);
  return new;
end;
$$;

create trigger sos_notify
  after insert on public.sos_incidents
  for each row execute function public.notify_sos();

-- Realtime: manager dashboards subscribe to these instead of polling.
alter publication supabase_realtime add table public.live_locations;
alter publication supabase_realtime add table public.tracking_alerts;
alter publication supabase_realtime add table public.sos_incidents;
