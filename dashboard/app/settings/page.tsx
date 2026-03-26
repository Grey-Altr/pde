"use client";

import { usePushCapability } from "@/hooks/use-push-subscription";
import { PushManager } from "@/components/pwa/push-manager";
import { PushStatusBanner } from "@/components/pwa/push-status-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function SettingsPage() {
  const capability = usePushCapability();

  return (
    <main className="px-4 sm:px-8 max-w-screen-sm mx-auto py-12 pb-24 md:pb-12 space-y-4">
      <h1 className="text-xl sm:text-[28px] font-semibold leading-[1.1]">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-base font-medium text-muted-foreground">Notifications</h2>

        {capability === "supported" && <PushManager />}

        {capability === "not-installed" && (
          <>
            <InstallPrompt />
            <PushStatusBanner capability={capability} />
          </>
        )}

        {capability !== "supported" && capability !== "not-installed" && (
          <PushStatusBanner capability={capability} />
        )}
      </section>
    </main>
  );
}
