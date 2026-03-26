"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { type PushCapability } from "@/hooks/use-push-subscription";

interface PushStatusBannerProps {
  capability: PushCapability;
}

const messages: Record<Exclude<PushCapability, "supported">, { title: string; body: string }> = {
  "not-supported": {
    title: "Push Notifications Not Available",
    body: "Your browser does not support push notifications. Try Chrome, Edge, or Safari 16.4+.",
  },
  "not-installed": {
    title: "Install App for Notifications",
    body: "Push notifications require installing this app to your Home Screen.",
  },
  "permission-denied": {
    title: "Notifications Blocked",
    body: "You have blocked notifications for this site. Enable them in your browser settings to receive alerts.",
  },
};

export function PushStatusBanner({ capability }: PushStatusBannerProps) {
  if (capability === "supported") {
    return null;
  }

  const { title, body } = messages[capability];

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-amber-500 text-sm font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}
