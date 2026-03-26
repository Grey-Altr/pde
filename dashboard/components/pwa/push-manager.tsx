"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { subscribeUser, unsubscribeUser } from "@/app/actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushManager() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    }).catch(() => {
      // Service worker not available — silently ignore
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      // CRITICAL: requestPermission MUST be called directly inside click handler for iOS
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      await subscribeUser(JSON.parse(JSON.stringify(sub)));
      setIsSubscribed(true);
    } catch (err) {
      console.error("Failed to subscribe to push notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUnsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      await unsubscribeUser();
      setIsSubscribed(false);
    } catch (err) {
      console.error("Failed to unsubscribe from push notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          {isSubscribed
            ? "You will receive alerts when PDE needs attention."
            : "Subscribe to receive alerts when approvals are required or errors occur."}
        </CardDescription>
        <CardAction>
          {isSubscribed ? (
            <Button
              variant="secondary"
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="min-h-[44px] min-w-[120px]"
            >
              <BellOff />
              Unsubscribe
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={handleSubscribe}
              disabled={isLoading}
              className="min-h-[44px] min-w-[120px]"
            >
              <Bell />
              Subscribe
            </Button>
          )}
        </CardAction>
      </CardHeader>
    </Card>
  );
}
