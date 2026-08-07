"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getCurrentOrgId } from "@/lib/org"
import { Button } from "@/components/ui/button"

export function TrackingControls({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastSentRef = useRef(0)

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  async function handleCheckIn() {
    setError(null)
    if (!("geolocation" in navigator)) {
      setError("Geolocation isn't supported on this device/browser.")
      return
    }
    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!orgId || !user) {
      setError("Sign in with an organization membership.")
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data, error: insertError } = await supabase
          .from("tracking_sessions")
          .insert({
            organization_id: orgId,
            rep_id: user.id,
            check_in_lat: pos.coords.latitude,
            check_in_lng: pos.coords.longitude,
            tracking_interval_seconds: intervalSeconds,
          })
          .select("id")
          .single()

        if (insertError || !data) {
          setError(insertError?.message ?? "Could not start tracking session")
          return
        }
        setSessionId(data.id)
        setStatus("On duty — tracking active")
        startWatch(data.id, orgId, user.id)
      },
      (err) => setError(`Location permission error: ${err.message}`),
      { enableHighAccuracy: true }
    )
  }

  function startWatch(sid: string, orgId: string, repId: string) {
    const supabase = createClient()
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now()
        if (now - lastSentRef.current < intervalSeconds * 1000) return
        lastSentRef.current = now

        let batteryPct: number | null = null
        try {
          // @ts-expect-error -- getBattery isn't in the standard lib.dom types
          const battery = await navigator.getBattery?.()
          if (battery) batteryPct = Math.round(battery.level * 100)
        } catch {
          // Battery Status API unavailable on this browser — fine, it's optional.
        }

        const { error: insertError } = await supabase.from("location_history").insert({
          organization_id: orgId,
          rep_id: repId,
          session_id: sid,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_meters: pos.coords.accuracy,
          speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : null,
          heading: pos.coords.heading,
          battery_pct: batteryPct,
          recorded_at: new Date().toISOString(),
        })
        if (insertError) setError(insertError.message)
      },
      (err) => setError(`Location error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }

  async function handleCheckOut() {
    if (!sessionId) return
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from("tracking_sessions")
      .update({ status: "completed", check_out_at: new Date().toISOString() })
      .eq("id", sessionId)
    if (updateError) setError(updateError.message)
    setSessionId(null)
    setStatus("Off duty")
  }

  async function handleSOS() {
    if (!confirm("Trigger an emergency SOS alert? This notifies your managers immediately.")) return
    const supabase = createClient()
    const orgId = await getCurrentOrgId(supabase)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!orgId || !user) return

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error: sosError } = await supabase.from("sos_incidents").insert({
        organization_id: orgId,
        rep_id: user.id,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      })
      setStatus(sosError ? null : "SOS sent — help is on the way")
      if (sosError) setError(sosError.message)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      {!sessionId ? (
        <Button onClick={handleCheckIn}>Go On Duty (Check In)</Button>
      ) : (
        <Button variant="outline" onClick={handleCheckOut}>
          Check Out
        </Button>
      )}
      <Button variant="destructive" onClick={handleSOS}>
        SOS
      </Button>
      {status && <span className="text-sm text-primary">{status}</span>}
      {error && (
        <span role="alert" className="text-destructive text-sm">
          {error}
        </span>
      )}
      <p className="text-xs text-muted-foreground w-full">
        Tracking runs only while this tab is open and you&apos;re checked in — an explicit,
        visible session, not silent background surveillance.
      </p>
    </div>
  )
}
