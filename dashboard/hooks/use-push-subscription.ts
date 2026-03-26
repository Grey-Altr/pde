"use client";

import { useState, useEffect } from "react";

export type PushCapability =
  | "supported"
  | "not-supported"
  | "not-installed"
  | "permission-denied";

export function usePushCapability(): PushCapability {
  const [capability, setCapability] = useState<PushCapability>("not-supported");

  useEffect(() => {
    const hasServiceWorker = "serviceWorker" in navigator;
    const hasPushManager = "PushManager" in window;

    if (!hasServiceWorker || !hasPushManager) {
      setCapability("not-supported");
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isIOS && !isStandalone) {
      setCapability("not-installed");
      return;
    }

    if (Notification.permission === "denied") {
      setCapability("permission-denied");
      return;
    }

    setCapability("supported");
  }, []);

  return capability;
}
