"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Map as LeafletMap, Polyline, CircleMarker } from "leaflet"

type Member = { user_id: string; email: string }
type Point = { id: string; latitude: number; longitude: number; recorded_at: string; is_suspicious: boolean }
type GeofenceEvent = { event_type: string; recorded_at: string; geofences: { name: string } | null }
type Session = { check_in_at: string; check_out_at: string | null }
type HcpVisit = { hcp_id: string; visited_at?: string; planned_date?: string; hcps: { first_name: string; last_name: string } | null }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function ReplayClient({ orgId, members }: { orgId: string; members: Member[] }) {
  const [repId, setRepId] = useState(members[0]?.user_id ?? "")
  const [date, setDate] = useState(todayStr())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [points, setPoints] = useState<Point[]>([])
  const [events, setEvents] = useState<GeofenceEvent[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [planned, setPlanned] = useState<HcpVisit[]>([])
  const [actual, setActual] = useState<HcpVisit[]>([])
  const [playIndex, setPlayIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const polylineRef = useRef<Polyline | null>(null)
  const cursorRef = useRef<CircleMarker | null>(null)

  async function load() {
    if (!repId || !date) return
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const dayStart = `${date}T00:00:00`
    const dayEnd = `${date}T23:59:59.999`

    const [pointsRes, eventsRes, sessionsRes, actualRes, plansRes] = await Promise.all([
      supabase
        .from("location_history")
        .select("id, latitude, longitude, recorded_at, is_suspicious")
        .eq("rep_id", repId)
        .gte("recorded_at", dayStart)
        .lte("recorded_at", dayEnd)
        .order("recorded_at"),
      supabase
        .from("geofence_events")
        .select("event_type, recorded_at, geofences(name)")
        .eq("rep_id", repId)
        .gte("recorded_at", dayStart)
        .lte("recorded_at", dayEnd)
        .order("recorded_at"),
      supabase
        .from("tracking_sessions")
        .select("check_in_at, check_out_at")
        .eq("rep_id", repId)
        .gte("check_in_at", dayStart)
        .lte("check_in_at", dayEnd),
      supabase
        .from("visits")
        .select("hcp_id, visited_at, hcps(first_name, last_name)")
        .eq("rep_id", repId)
        .gte("visited_at", dayStart)
        .lte("visited_at", dayEnd),
      supabase
        .from("tour_plans")
        .select("id")
        .eq("rep_id", repId)
        .lte("period_start", date)
        .gte("period_end", date),
    ])

    if (pointsRes.error) setError(pointsRes.error.message)

    let plannedVisits: HcpVisit[] = []
    const planIds = (plansRes.data ?? []).map((p) => p.id)
    if (planIds.length > 0) {
      const { data } = await supabase
        .from("tour_plan_visits")
        .select("hcp_id, planned_date, hcps(first_name, last_name)")
        .in("tour_plan_id", planIds)
        .eq("planned_date", date)
      plannedVisits = (data as unknown as HcpVisit[]) ?? []
    }

    setPoints((pointsRes.data as Point[]) ?? [])
    setEvents((eventsRes.data as unknown as GeofenceEvent[]) ?? [])
    setSessions((sessionsRes.data as Session[]) ?? [])
    setActual((actualRes.data as unknown as HcpVisit[]) ?? [])
    setPlanned(plannedVisits)
    setPlayIndex(0)
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [repId, date])

  // Init map once
  useEffect(() => {
    let cancelled = false
    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return
      leafletMapRef.current = L.map(mapRef.current).setView([40.75, -73.98], 12)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(leafletMapRef.current)
    })
    return () => {
      cancelled = true
      leafletMapRef.current?.remove()
      leafletMapRef.current = null
    }
  }, [])

  // Redraw route whenever points change
  useEffect(() => {
    import("leaflet").then((L) => {
      const map = leafletMapRef.current
      if (!map) return
      if (polylineRef.current) {
        polylineRef.current.remove()
        polylineRef.current = null
      }
      if (points.length === 0) return
      const latlngs: [number, number][] = points.map((p) => [p.latitude, p.longitude])
      polylineRef.current = L.polyline(latlngs, { color: "#0d9488", weight: 3 }).addTo(map)
      map.fitBounds(polylineRef.current.getBounds(), { padding: [20, 20] })

      points.forEach((p) => {
        if (p.is_suspicious) {
          L.circleMarker([p.latitude, p.longitude], { radius: 6, color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.9 })
            .addTo(map)
            .bindTooltip("Flagged: suspicious point")
        }
      })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points])

  // Move playback cursor
  useEffect(() => {
    import("leaflet").then((L) => {
      const map = leafletMapRef.current
      const p = points[playIndex]
      if (!map || !p) return
      if (!cursorRef.current) {
        cursorRef.current = L.circleMarker([p.latitude, p.longitude], {
          radius: 8,
          color: "#2563eb",
          fillColor: "#2563eb",
          fillOpacity: 1,
        }).addTo(map)
      } else {
        cursorRef.current.setLatLng([p.latitude, p.longitude])
      }
    })
  }, [playIndex, points])

  // Autoplay
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setPlayIndex((i) => {
        if (i >= points.length - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, 400)
    return () => clearInterval(id)
  }, [playing, points.length])

  const totalDistanceKm = useMemo(() => {
    let total = 0
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]
      const b = points[i]
      const R = 6371
      const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
      const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
      total += R * 2 * Math.asin(Math.sqrt(h))
    }
    return total
  }, [points])

  const timeline = useMemo(() => {
    const items: { time: string; label: string }[] = []
    for (const s of sessions) {
      items.push({ time: s.check_in_at, label: "Check-in" })
      if (s.check_out_at) items.push({ time: s.check_out_at, label: "Check-out" })
    }
    for (const e of events) {
      items.push({ time: e.recorded_at, label: `${e.event_type === "arrival" ? "Arrived at" : "Left"} ${e.geofences?.name ?? "geofence"}` })
    }
    for (const v of actual) {
      items.push({ time: v.visited_at!, label: `Visit logged: ${v.hcps?.first_name} ${v.hcps?.last_name}` })
    }
    return items.sort((a, b) => a.time.localeCompare(b.time))
  }, [sessions, events, actual])

  const plannedIds = new Set(planned.map((p) => p.hcp_id))
  const actualIds = new Set(actual.map((v) => v.hcp_id))
  const completed = planned.filter((p) => actualIds.has(p.hcp_id))
  const missed = planned.filter((p) => !actualIds.has(p.hcp_id))
  const unplanned = actual.filter((v) => !plannedIds.has(v.hcp_id))

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="replay-rep">Rep</Label>
              <select
                id="replay-rep"
                value={repId}
                onChange={(e) => setRepId(e.target.value)}
                className="border rounded-md h-9 px-3 text-sm bg-background"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="replay-date">Date</Label>
              <Input id="replay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {loading && <span className="text-sm text-muted-foreground">Loading…</span>}
            {error && <span className="text-destructive text-sm">{error}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Route replay — {points.length} points, {totalDistanceKm.toFixed(1)} km
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div ref={mapRef} className="h-[380px] w-full rounded-md border" />
          {points.length > 0 && (
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={points.length - 1}
                value={playIndex}
                onChange={(e) => setPlayIndex(Number(e.target.value))}
                className="w-full"
                aria-label="Playback position"
              />
              <div className="flex items-center gap-3 text-sm">
                <Button size="sm" variant="outline" onClick={() => setPlaying((p) => !p)}>
                  {playing ? "Pause" : "Play"}
                </Button>
                <span className="text-muted-foreground">
                  {new Date(points[playIndex]?.recorded_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
          {points.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">No tracked points for this rep on this date.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-md border text-sm" aria-label="Timeline">
            {timeline.map((item, i) => (
              <li key={i} className="p-2 flex items-center gap-3">
                <span className="text-muted-foreground w-20 shrink-0">
                  {new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
            {timeline.length === 0 && <li className="p-2 text-muted-foreground">No activity recorded.</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planned vs. actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {completed.length} completed · {missed.length} missed · {unplanned.length} unplanned
          </p>
          {missed.length > 0 && (
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Missed (planned, not visited)</p>
              <ul className="list-disc list-inside">
                {missed.map((m) => (
                  <li key={m.hcp_id}>{m.hcps?.first_name} {m.hcps?.last_name}</li>
                ))}
              </ul>
            </div>
          )}
          {unplanned.length > 0 && (
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Unplanned (visited, not on plan)</p>
              <ul className="list-disc list-inside">
                {unplanned.map((u, i) => (
                  <li key={i}>{u.hcps?.first_name} {u.hcps?.last_name}</li>
                ))}
              </ul>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <p className="font-medium text-teal-700 dark:text-teal-400">Completed as planned</p>
              <ul className="list-disc list-inside">
                {completed.map((c) => (
                  <li key={c.hcp_id}>{c.hcps?.first_name} {c.hcps?.last_name}</li>
                ))}
              </ul>
            </div>
          )}
          {planned.length === 0 && actual.length === 0 && (
            <p className="text-muted-foreground">No plan or visits found for this rep on this date.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
