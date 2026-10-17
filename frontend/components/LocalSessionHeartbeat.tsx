"use client";

import { useEffect } from "react";

/** Development-only per-tab heartbeat. The Windows launcher stops local services when no tabs remain. */
export default function LocalSessionHeartbeat() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalHost || window.location.port !== "3000") return;

    const sessionId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    let alive = true;
    let closeSent = false;
    let interval: number | null = null;
    const ping = () => {
      if (!alive) return;
      void fetch("/api/local-session/heartbeat", {
        method: "POST", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessionId, action: "heartbeat" }),
      }).catch(() => undefined);
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") ping(); };
    const closeSession = () => {
      if (closeSent) return;
      closeSent = true;
      alive = false;
      if (interval !== null) window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", closeSession);
      window.removeEventListener("beforeunload", closeSession);
      const body = JSON.stringify({ id: sessionId, action: "close" });
      const queued = navigator.sendBeacon(
        "/api/local-session/heartbeat",
        new Blob([body], { type: "application/json" }),
      );
      if (!queued) {
        void fetch("/api/local-session/heartbeat", {
          method: "POST", cache: "no-store", keepalive: true,
          headers: { "Content-Type": "application/json" }, body,
        }).catch(() => undefined);
      }
    };

    ping();
    interval = window.setInterval(ping, 15000);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", closeSession);
    window.addEventListener("beforeunload", closeSession);
    return () => closeSession();
  }, []);

  return null;
}
