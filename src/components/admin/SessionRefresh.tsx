"use client";

import { useEffect } from "react";

/* Pings /admin/auth/refresh so the operator's Supabase session survives a
   long publishing session. Supabase access tokens expire after an hour; with
   no proxy, only a route handler can persist a rotated token, so the shell
   asks for one on mount, every 30 minutes, and whenever the tab is brought
   back to the foreground (covers a closed laptop lid).

   Purely a convenience: authorization is still requireAdmin() on every admin
   layout, page, and route handler. If this never fires, the worst outcome is
   an earlier bounce to the magic-link screen — never wider access. */
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export function SessionRefresh() {
  useEffect(() => {
    const refresh = () => {
      void fetch("/admin/auth/refresh", {
        method: "POST",
        cache: "no-store",
      }).catch(() => {
        /* Offline or mid-deploy: the next tick tries again. */
      });
    };

    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
