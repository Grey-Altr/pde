"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function InstallPrompt() {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-amber-500 text-sm font-semibold">
          Install Required for Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Push notifications require this app to be installed to your Home Screen. Follow these steps in Safari:
        </p>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
          <li>Tap the Share button in Safari</li>
          <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
          <li>Tap &ldquo;Add&rdquo; to confirm</li>
        </ol>
      </CardContent>
    </Card>
  );
}
