"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
      return
    }

    // The service worker fights Turbopack's dev HMR (it caches chunk responses
    // and falls back to a stale cached "/" on any transient fetch failure,
    // e.g. during a dev-server restart) — never register it in dev, and clean
    // up any already-installed one from before this guard existed.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister())
    })
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
    }
  }, [])
  return null
}
