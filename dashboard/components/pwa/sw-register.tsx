"use client";

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/serwist/sw.js").catch((err) => {
        console.error("[pwa] SW registration failed:", err);
      });
    }
  }, []);
  return null;
}
