-- 20260807000016/17's `if v_prev is not null` never actually ran the spoofing/geofence
-- logic: for a composite/record value, SQL's IS NOT NULL is only true when *every*
-- field is non-null. location_history rows commonly have null heading/speed_kmh/
-- battery_pct, so the found row still failed "IS NOT NULL" — the classic row-type
-- NULL-semantics trap. Check v_prev.id instead, which is always populated when a row
-- was actually found.

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

  if v_prev.id is not null then
    v_seconds := extract(epoch from (new.recorded_at - v_prev.recorded_at));
    v_distance_from_prev := public.haversine_meters(v_prev.latitude, v_prev.longitude, new.latitude, new.longitude);

    if v_seconds > 0 then
      v_implied_speed := (v_distance_from_prev / 1000.0) / (v_seconds / 3600.0);
    end if;

    if v_seconds > 0 and v_implied_speed > coalesce(v_max_speed, 180) then
      new.is_suspicious := true;
      new.suspicious_reason := 'Implied speed ' || round(v_implied_speed) || ' km/h exceeds plausible maximum';
      insert into public.tracking_alerts (organization_id, rep_id, territory_id, alert_type, severity, message)
      values (new.organization_id, new.rep_id, new.territory_id, 'spoofing_suspected', 'critical',
        'Implied speed of ' || round(v_implied_speed) || ' km/h between consecutive points for this rep — possible GPS spoofing or teleportation. Flagged for manager review, not auto-penalized.');
    elsif v_seconds <= 0 and v_distance_from_prev > 50 then
      new.is_suspicious := true;
      new.suspicious_reason := 'Moved ' || round(v_distance_from_prev) || 'm with a zero/negative time delta';
      insert into public.tracking_alerts (organization_id, rep_id, territory_id, alert_type, severity, message)
      values (new.organization_id, new.rep_id, new.territory_id, 'spoofing_suspected', 'critical',
        'Location jumped ' || round(v_distance_from_prev) || 'm with no elapsed time — possible GPS spoofing, clock manipulation, or duplicate/out-of-order events. Flagged for manager review, not auto-penalized.');
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
