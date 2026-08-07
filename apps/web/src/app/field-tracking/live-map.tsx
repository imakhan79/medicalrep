"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Map as LeafletMap, CircleMarker } from "leaflet"

type LiveLocation = {
  rep_id: string
  latitude: number
  longitude: number
  status: string
  recorded_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: "#0d9488",
  on_visit: "#2563eb",
  stationary: "#eab308",
  delayed: "#f97316",
  alert: "#dc2626",
  offline: "#6b7280",
}

export function LiveMap({
  initialLocations,
  repEmails,
  geofences,
}: {
  initialLocations: LiveLocation[]
  repEmails: Record<string, string>
  geofences: { id: string; name: string; latitude: number; longitude: number; radius_meters: number }[]
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<LeafletMap | null>(null)
  const markersRef = useRef<Record<string, CircleMarker>>({})
  const [locations, setLocations] = useState<Record<string, LiveLocation>>(
    Object.fromEntries(initialLocations.map((l) => [l.rep_id, l]))
  )

  useEffect(() => {
    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return

      const map = L.map(mapRef.current).setView([40.75, -73.98], 12)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map)

      for (const g of geofences) {
        L.circle([g.latitude, g.longitude], { radius: g.radius_meters, color: "#0d9488", weight: 1, fillOpacity: 0.08 })
          .addTo(map)
          .bindTooltip(g.name)
      }

      leafletMapRef.current = map

      for (const loc of Object.values(locations)) {
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 9,
          color: STATUS_COLORS[loc.status] ?? "#0d9488",
          fillColor: STATUS_COLORS[loc.status] ?? "#0d9488",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindTooltip(`${repEmails[loc.rep_id] ?? loc.rep_id} — ${loc.status}`)
        markersRef.current[loc.rep_id] = marker
      }
    })

    return () => {
      cancelled = true
      leafletMapRef.current?.remove()
      leafletMapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("live-locations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_locations" },
        (payload) => {
          const row = payload.new as LiveLocation | undefined
          if (!row) return
          setLocations((prev) => ({ ...prev, [row.rep_id]: row }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    import("leaflet").then((L) => {
      const map = leafletMapRef.current
      if (!map) return
      for (const loc of Object.values(locations)) {
        const color = STATUS_COLORS[loc.status] ?? "#0d9488"
        const existing = markersRef.current[loc.rep_id]
        if (existing) {
          existing.setLatLng([loc.latitude, loc.longitude])
          existing.setStyle({ color, fillColor: color })
          existing.bindTooltip(`${repEmails[loc.rep_id] ?? loc.rep_id} — ${loc.status}`)
        } else {
          const marker = L.circleMarker([loc.latitude, loc.longitude], {
            radius: 9,
            color,
            fillColor: color,
            fillOpacity: 0.9,
          })
            .addTo(map)
            .bindTooltip(`${repEmails[loc.rep_id] ?? loc.rep_id} — ${loc.status}`)
          markersRef.current[loc.rep_id] = marker
        }
      }
    })
  }, [locations, repEmails])

  return (
    <div>
      <div ref={mapRef} className="h-[420px] w-full rounded-md border" />
      <ul className="mt-3 divide-y rounded-md border text-sm" aria-label="Live rep status">
        {Object.values(locations).map((loc) => (
          <li key={loc.rep_id} className="p-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[loc.status] ?? "#0d9488" }}
              />
              {repEmails[loc.rep_id] ?? loc.rep_id}
            </span>
            <span className="text-muted-foreground">
              {loc.status} · {new Date(loc.recorded_at).toLocaleTimeString()}
            </span>
          </li>
        ))}
        {Object.keys(locations).length === 0 && (
          <li className="p-2 text-muted-foreground">No reps currently checked in.</li>
        )}
      </ul>
    </div>
  )
}
