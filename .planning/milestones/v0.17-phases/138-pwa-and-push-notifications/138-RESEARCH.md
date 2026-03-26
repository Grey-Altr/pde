# Phase 138: PWA and Push Notifications - Research

**Researched:** 2026-03-25
**Domain:** Progressive Web App, Web Push API, VAPID, Service Workers, Mobile-First UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PWA-01 | Dashboard is installable as PWA with web manifest, Serwist service worker, and offline shell caching | Serwist @serwist/turbopack 9.5.7 confirmed; Next.js 16 built-in manifest.ts; offline shell via precache + StaleWhileRevalidate |
| PWA-02 | Web Push notifications fire for approval gates and critical errors using VAPID keys | web-push 3.6.7 confirmed; Server Action pattern verified in Next.js official docs; Upstash Redis for subscription storage |
| PWA-03 | Platform capability detection shows "push not available" on unsupported platforms (iOS EU, non-installed PWA) | `'serviceWorker' in navigator && 'PushManager' in window` guard; iOS standalone check via `display-mode: standalone`; EU detection not needed (reversal confirmed) |
| PWA-04 | Mobile-first responsive UI with bottom tab navigation, card-based layout, and Geist typography | Bottom tab with `fixed bottom-0`; safe-area-inset env vars; Tailwind standalone: variant; Geist already in layout |
</phase_requirements>

---

## Summary

This phase adds PWA installability, Web Push notifications, and mobile-first UI to the existing Next.js 16 dashboard. The stack is well-defined by prior project decisions: Serwist for service workers (decided at v0.17 init), web-push + VAPID for push delivery, and Upstash Redis (already in use) for subscription storage.

The critical technical constraint is the Turbopack/Webpack split: Next.js 16 uses Turbopack by default, but Serwist uses `@serwist/turbopack` (esbuild-based) to bridge this. This is a separate package (`@serwist/turbopack`, not `@serwist/next`) and requires a dynamic route handler at `app/serwist/[path]/route.ts`. SERVICE WORKERS ARE DISABLED IN DEV — PWA features only work in production builds or with `next dev --experimental-https --webpack`.

iOS Safari push notifications require home screen installation (iOS 16.4+). The EU PWA removal from iOS 17.4 was subsequently REVERSED per multiple 2024 sources — however, a contradicting 2026 source claims EU restrictions remain active. This must be treated as platform-unavailable for EU users with a clear fallback message (satisfying PWA-03 either way).

**Primary recommendation:** Use `@serwist/turbopack` for Turbopack-compatible service worker; `web-push` + Server Actions for VAPID push delivery; Upstash Redis hash/set for subscription storage; Next.js built-in `app/manifest.ts` for web manifest.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @serwist/turbopack | 9.5.7 | Service worker with Turbopack support | Project decision [v0.17 init]; only Serwist package with Turbopack bridge via esbuild |
| serwist | 9.5.7 | Core service worker runtime | Peer dep of @serwist/turbopack; provides Serwist class, precaching, runtime caching |
| esbuild | latest | Transpiles service worker source for @serwist/turbopack | Required peer dep of @serwist/turbopack |
| web-push | 3.6.7 | Server-side VAPID push delivery | Node.js official lib; used in Next.js official PWA docs |
| @types/web-push | 3.6.4 | TypeScript types for web-push | Matches web-push 3.6.7 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @upstash/redis | already installed (latest) | Push subscription storage | Already in project; store subscriptions as Redis hash keyed by user |
| tailwindcss-safe-area | 4.x | env(safe-area-inset-*) Tailwind utilities | Bottom nav needs padding-bottom: env(safe-area-inset-bottom) for iPhone notch |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @serwist/turbopack | @serwist/next (webpack) | webpack requires `next build --webpack` flag; Turbopack is project standard |
| @serwist/turbopack | next-pwa | next-pwa abandoned/unmaintained; Serwist is the current recommended fork |
| web-push | Firebase FCM | FCM adds 3rd-party dependency and credential management; web-push is self-contained |
| Upstash Redis | In-memory Map | In-memory lost on cold start; Upstash already available and pay-per-request |

### Installation

```bash
# From dashboard/ directory
npm install web-push @types/web-push
npm install -D @serwist/turbopack esbuild serwist
```

**Version verification (confirmed 2026-03-25):**
- `@serwist/turbopack`: 9.5.7
- `serwist`: 9.5.7
- `web-push`: 3.6.7
- `@types/web-push`: 3.6.4

---

## Architecture Patterns

### Recommended Project Structure

```
dashboard/
├── app/
│   ├── manifest.ts              # Next.js built-in PWA manifest (auto-served at /manifest.webmanifest)
│   ├── sw.ts                    # Service worker source (compiled by @serwist/turbopack)
│   ├── serwist/
│   │   └── [path]/
│   │       └── route.ts         # createSerwistRoute handler (Turbopack arch)
│   ├── actions.ts               # Server Actions: subscribeUser, unsubscribeUser, sendPushNotification
│   ├── layout.tsx               # Add SerwistProvider + PWA metadata + viewport
│   └── (existing routes...)
├── components/
│   ├── pwa/
│   │   ├── push-manager.tsx     # Client component: subscribe/unsubscribe UI
│   │   ├── install-prompt.tsx   # iOS install instructions
│   │   └── push-status-banner.tsx  # "Push not available" fallback UI
│   └── layout/
│       └── bottom-nav.tsx       # Mobile bottom tab navigation
├── hooks/
│   └── use-push-subscription.ts # Client hook: subscription state, capability detection
├── lib/
│   └── push.ts                  # Server-side push helpers (web-push config, sendApprovalNotification)
└── public/
    ├── icon-192x192.png
    ├── icon-512x512.png
    ├── icon-maskable-512x512.png
    └── sw.js                    # Generated by @serwist/turbopack (gitignored)
```

### Pattern 1: Turbopack Service Worker via @serwist/turbopack

**What:** @serwist/turbopack uses an esbuild-based compilation approach with a dynamic route handler instead of a webpack plugin.
**When to use:** Always — this project uses Turbopack for `next dev` and `next build`.

```typescript
// next.config.ts — Source: https://serwist.pages.dev/docs/next/turbo
import { withSerwist } from "@serwist/turbopack";
import path from "path";

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname), // preserve existing config
  },
};

export default withSerwist(nextConfig);
```

```typescript
// app/serwist/[path]/route.ts — Source: https://serwist.pages.dev/docs/next/turbo
import { createSerwistRoute } from "@serwist/turbopack";

export const { GET } = createSerwistRoute({
  swSrc: "app/sw.ts",
  additionalPrecacheEntries: [
    { url: "/", revision: null },
    { url: "/sign-in", revision: null },
  ],
});
```

```typescript
// app/sw.ts — Service worker source
import { Serwist } from "serwist";
import { defaultCache } from "@serwist/next/worker";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url ?? "/" },
      tag: data.tag ?? "pde-notification",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      const url = event.notification.data?.url ?? "/";
      const existing = clientList.find((c) => c.url === url && "focus" in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
```

### Pattern 2: Web App Manifest via Next.js Built-In

**What:** Next.js 16 natively supports `app/manifest.ts` — no plugin needed.
**When to use:** Always for PWA installability.

```typescript
// app/manifest.ts — Source: https://nextjs.org/docs/app/guides/progressive-web-apps
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PDE Dashboard",
    short_name: "PDE",
    description: "Remote monitoring for Platform Development Engine",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

```typescript
// app/layout.tsx — add PWA metadata and viewport exports
import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#09090b",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",   // CRITICAL: enables safe-area-inset on iOS
};

export const metadata: Metadata = {
  // existing...
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PDE Dashboard",
  },
};
```

### Pattern 3: VAPID Push via Server Actions

**What:** web-push runs in Node.js runtime Server Actions. Subscriptions stored in Upstash Redis.
**When to use:** For sending approval gate and critical error notifications.

```typescript
// lib/push.ts — server-side push configuration
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:pde@example.com",  // replace with actual contact
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export { webpush };
```

```typescript
// app/actions.ts — Server Actions
"use server";
import { webpush } from "@/lib/push";
import { redis } from "@/lib/redis";  // existing Upstash client

// Key pattern: push:sub:{userId}
export async function subscribeUser(sub: PushSubscriptionJSON) {
  await redis.set(`push:sub:${process.env.PDE_USER_ID ?? "owner"}`, JSON.stringify(sub));
  return { success: true };
}

export async function unsubscribeUser() {
  await redis.del(`push:sub:${process.env.PDE_USER_ID ?? "owner"}`);
  return { success: true };
}

export async function sendApprovalNotification(approvalId: string, context: string) {
  const raw = await redis.get(`push:sub:${process.env.PDE_USER_ID ?? "owner"}`);
  if (!raw) return { success: false, reason: "no-subscription" };
  const sub = JSON.parse(raw as string);
  await webpush.sendNotification(sub, JSON.stringify({
    title: "Approval Required",
    body: context,
    tag: `approval-${approvalId}`,
    url: `/sessions`,
  }));
  return { success: true };
}
```

### Pattern 4: Platform Capability Detection

**What:** Client component detects push support and iOS install state before showing UI.
**When to use:** For PWA-03 — show "push not available" on unsupported platforms.

```typescript
// hooks/use-push-subscription.ts
"use client";
import { useState, useEffect } from "react";

export type PushCapability =
  | "supported"
  | "not-supported"          // browser lacks Push API or serviceWorker
  | "not-installed"          // iOS + not standalone — must install first
  | "permission-denied";     // user explicitly denied

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
```

### Pattern 5: Bottom Tab Navigation with Safe Area

**What:** Fixed bottom nav bar with `env(safe-area-inset-bottom)` for iOS home indicator clearance.
**When to use:** Mobile breakpoints (below md:).

```typescript
// components/layout/bottom-nav.tsx
export function BottomNav() {
  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        bg-background/95 backdrop-blur
        border-t border-border
        flex items-center justify-around
        md:hidden
        z-50
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* Tab items — min touch target 44px */}
    </nav>
  );
}

// Corresponding page layout — add bottom padding so content isn't hidden
// pb-[calc(64px+env(safe-area-inset-bottom,0px))]
```

### Anti-Patterns to Avoid

- **Do not import `@serwist/next`** in the Turbopack path — the Turbopack package is `@serwist/turbopack`. They are different packages.
- **Do not place service worker code in `public/sw.js` manually** — with Turbopack arch, it is compiled from `app/sw.ts` via the route handler. Manually writing `public/sw.js` conflicts.
- **Do not call Notification.requestPermission() on page load** — iOS silently ignores it; it MUST be inside a user gesture (click/tap handler).
- **Do not use the Edge runtime for the push send route/action** — `web-push` requires full Node.js crypto. Server Actions default to Node.js runtime on Vercel; do not add `export const runtime = 'edge'` near push code.
- **Do not use in-memory state for subscription storage** — Vercel serverless = cold starts; subscription is lost. Always use Upstash Redis.
- **Do not register the service worker with `navigator.serviceWorker.register('/sw.js')`** — with Serwist Turbopack, the SW is served from `/serwist/sw.js` (the dynamic route handler). Register at that URL.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| VAPID key generation + push payload encryption | Custom crypto | `web-push` | VAPID involves EC key pairs + JWT signing + AES-GCM encryption of payload — extremely easy to get wrong |
| Service worker lifecycle (skipWaiting, clientsClaim, precache versioning) | Custom SW logic | `serwist` | Serwist handles cache busting via revision hashes, race conditions on SW update |
| Push subscription management with expiry | Custom KV schema | Upstash Redis `set` with TTL | Subscription endpoints expire; error 410 = remove from storage |
| iOS install detection | UA string parsing | `window.matchMedia('(display-mode: standalone)')` | UA sniffing is unreliable; display-mode is the canonical API |
| Offline fallback page routing | Custom fetch intercept | Serwist `PrecacheFallbackPlugin` + `additionalPrecacheEntries` | Race conditions in offline SW routing are non-trivial |

**Key insight:** Web Push encryption (VAPID) involves ECDH key exchange + AES-GCM + JWT — never implement manually.

---

## Runtime State Inventory

> SKIPPED — this is a greenfield addition phase, not a rename/refactor phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | web-push crypto | ✓ | v20.20.0 | — |
| Next.js | App framework | ✓ | 16.2.1 | — |
| npm | Package install | ✓ | (system) | — |
| Upstash Redis | Subscription storage | ✓ (existing) | latest | — |
| HTTPS (dev) | SW registration | ✗ (localhost) | — | `next dev --experimental-https` for PWA testing |
| Public/icon images | PWA manifest | ✗ | — | Must be created (Wave 0 gap) |

**Missing dependencies with no fallback:**
- PWA icons (192x192, 512x512, maskable 512x512) must be created in `public/` — required for installability. Use `realfavicongenerator.net` or generate programmatically.

**Missing dependencies with fallback:**
- HTTPS for local PWA testing: use `next dev --experimental-https --webpack` (note: `--webpack` needed for Serwist to activate in dev)

---

## Common Pitfalls

### Pitfall 1: @serwist/turbopack vs @serwist/next Confusion

**What goes wrong:** Installing `@serwist/next` (the webpack package) and trying to use it with Turbopack — the withSerwist wrapper silently does nothing or throws at build time.
**Why it happens:** The two packages have the same conceptual purpose but completely different internals. `@serwist/next` uses a webpack plugin. `@serwist/turbopack` uses esbuild + a route handler.
**How to avoid:** Only install `@serwist/turbopack`. The route handler at `app/serwist/[path]/route.ts` IS the integration point.
**Warning signs:** Service worker never appears in DevTools > Application; no `sw.js` file generated after build.

### Pitfall 2: Service Worker URL Mismatch

**What goes wrong:** Registering SW at `/sw.js` but Turbopack serves it from `/serwist/sw.js` (the route handler path).
**Why it happens:** Legacy tutorials use `public/sw.js`. Turbopack uses dynamic route.
**How to avoid:** In the layout, register at `/serwist/sw.js` matching the route path.
**Warning signs:** SW registration fails with "no service worker" or 404 on `/sw.js`.

### Pitfall 3: iOS Push Without Home Screen Install

**What goes wrong:** Push subscription succeeds in browser, but notifications never arrive on iOS.
**Why it happens:** iOS only delivers Web Push to installed PWAs (standalone mode). Browser-tab subscriptions are silently dropped.
**How to avoid:** Gate the Subscribe button behind `isStandalone` check + show install instructions when not standalone on iOS.
**Warning signs:** `Notification.permission === 'granted'` but user never receives notifications on iPhone.

### Pitfall 4: iOS EU Push Unavailability (Ambiguous)

**What goes wrong:** EU users cannot receive push notifications — PWAs in EU on iOS open as Safari tabs, not standalone.
**Why it happens:** Apple's DMA compliance changes in iOS 17.4 removed standalone PWA mode in EU. The reversal (March 2024 news) may have been partial or re-applied — multiple 2026 sources indicate EU restrictions remain.
**How to avoid:** Treat EU iOS as "push not available". The capability detection pattern (Pattern 4) handles this correctly — if not installed as standalone, show fallback message. This satisfies PWA-03 regardless.
**Warning signs:** Only manifests in EU with iOS — difficult to test. The `display-mode: standalone` check is the safe guard.

### Pitfall 5: web-push on Edge Runtime

**What goes wrong:** `web-push` calls fail silently or throw crypto errors on Vercel edge runtime.
**Why it happens:** Edge runtime lacks Node.js crypto APIs that web-push requires.
**How to avoid:** Server Actions run on Node.js runtime by default on Vercel. Never add `export const runtime = 'edge'` to files containing web-push calls.
**Warning signs:** `ReferenceError: crypto is not defined` or `Cannot read properties of undefined` in production Vercel logs.

### Pitfall 6: Stale Push Subscriptions

**What goes wrong:** Push endpoint returns 410 Gone (subscription expired), but the error is ignored and the stale subscription stays in Redis.
**Why it happens:** Push subscriptions expire when the user clears browser data or reinstalls the PWA.
**How to avoid:** Handle `webpush.sendNotification` error: if error status is 410 or 404, delete the subscription from Redis.
**Warning signs:** Push sends return errors but notifications stop arriving; Redis has stale entries.

### Pitfall 7: Notification.requestPermission() Not in User Gesture

**What goes wrong:** On iOS, calling `Notification.requestPermission()` outside a click handler is silently ignored (no prompt shown, no error).
**Why it happens:** iOS enforces user gesture requirement for permission prompts more strictly than Chrome.
**How to avoid:** The Subscribe button `onClick` handler must directly call `requestPermission()`. No `setTimeout`, no `useEffect`, no auto-call.
**Warning signs:** Chrome DevTools shows permission prompt; iOS never shows it.

### Pitfall 8: Missing `viewport-fit=cover` for Safe Area

**What goes wrong:** Bottom navigation is partially hidden by iPhone home indicator bar on notched devices.
**Why it happens:** Without `viewport-fit=cover`, the browser clips the viewport above the home indicator. `env(safe-area-inset-bottom)` returns `0` without this meta.
**How to avoid:** Set `viewportFit: "cover"` in Next.js `Viewport` export. Add `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` to the bottom nav container.
**Warning signs:** Bottom nav icons are partially obscured on iPhone 12+.

---

## Code Examples

### VAPID Key Generation (one-time setup)

```bash
# Source: https://nextjs.org/docs/app/guides/progressive-web-apps
npx web-push generate-vapid-keys
# Output:
# Public Key: BExxxxxxx...
# Private Key: xxxxxxxxx...
# Add to .env:
# NEXT_PUBLIC_VAPID_PUBLIC_KEY=BExxxxxxx...
# VAPID_PRIVATE_KEY=xxxxxxxxx...
```

### Subscribe to Push (client-side)

```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
    ),
  });
  await subscribeUser(JSON.parse(JSON.stringify(sub)));
}
```

### Send Push from Server Action with Error Handling

```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps (adapted)
"use server";
import webpush from "web-push";
import { redis } from "@/lib/redis";

export async function sendPushToOwner(payload: { title: string; body: string; url: string; tag: string }) {
  const raw = await redis.get("push:sub:owner");
  if (!raw) return { success: false, reason: "no-subscription" };

  const sub = JSON.parse(raw as string);
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload));
    return { success: true };
  } catch (err: any) {
    // 410 = subscription expired; 404 = endpoint gone
    if (err.statusCode === 410 || err.statusCode === 404) {
      await redis.del("push:sub:owner");
    }
    return { success: false, reason: err.message };
  }
}
```

### Runtime Caching Strategy for App Shell

```typescript
// app/sw.ts — Source: https://sukechris.medium.com/building-offline-apps-with-next-js-and-serwist-a395ed4ae6ba
import { Serwist, StaleWhileRevalidate, CacheFirst, NetworkOnly } from "serwist";
import { defaultCache } from "@serwist/next/worker";
import { ExpirationPlugin } from "serwist";

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // RSC navigation — stale-while-revalidate for speed
    {
      matcher: ({ request }) =>
        request.headers.get("RSC") === "1" &&
        request.headers.get("Next-Router-Prefetch") !== "1",
      handler: new StaleWhileRevalidate({ cacheName: "rsc-pages" }),
    },
    // Static assets — cache-first
    {
      matcher: ({ request }) =>
        ["image", "font"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // API routes — network-only (never serve stale data)
    {
      matcher: ({ url }) => url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
```

### Tailwind Standalone Variant (v4 CSS)

```css
/* globals.css — for Tailwind v4 */
@custom-variant standalone {
  @media (display-mode: standalone) {
    @slot;
  }
}
/* Usage: standalone:pb-4 to add extra padding only when running as installed PWA */
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-pwa | @serwist/turbopack (Serwist) | 2023-2024 | next-pwa unmaintained; Serwist is active fork with Turbopack support |
| @serwist/next (webpack) | @serwist/turbopack (esbuild) | Dec 2025 (backport to v9.5.7) | Turbopack-native; no webpack flag needed for production |
| FCM for web push | VAPID (web-push library) | 2017 onward | VAPID is browser-native standard; FCM is Google-specific |
| iOS push via APNs token | iOS 16.4+ Web Push via VAPID | iOS 16.4 (2023) | Same VAPID/web-push flow now works on iOS when installed as PWA |
| Lighthouse PWA category | Chrome Installability Criteria | 2024 | Lighthouse PWA audit deprecated; service worker no longer required for installability |

**Deprecated/outdated:**
- `next-pwa`: abandoned, do not use
- `@serwist/next` (webpack-only): superseded by `@serwist/turbopack` for this project
- GCM API keys: replaced by VAPID (still works but deprecated upstream)

---

## Open Questions

1. **iOS EU Push Notifications: Restriction Confirmed or Reversed?**
   - What we know: Apple removed standalone PWA in EU with iOS 17.4 (March 2024). Apple then reversed this in same month. However, a 2026 source (magicbell.com) claims EU restrictions remain.
   - What's unclear: Whether the reversal was complete or Apple re-applied restrictions in a later iOS version.
   - Recommendation: Treat EU iOS as unsupported for push (the capability detection handles this safely regardless). PWA-03 requires showing "push not available" — the `display-mode: standalone` check satisfies this for any scenario.

2. **SerwistProvider in Root Layout**
   - What we know: The Turbopack guide mentions wrapping layout with `SerwistProvider` and pointing to `/serwist/sw.js`.
   - What's unclear: Whether SerwistProvider is a named export from `@serwist/turbopack` or a separate client component to write.
   - Recommendation: Check `@serwist/turbopack` exports at install time; fallback is to manually call `navigator.serviceWorker.register('/serwist/sw.js')` in a client component.

3. **Push Notification Triggering from Ingest Endpoint**
   - What we know: PWA-02 says "Web Push notifications fire for approval gates and critical errors". The ingest endpoint receives events; approval gates are already handled in Phase 137.
   - What's unclear: Whether push should be sent (a) from the existing ingest Route Handler when an approval event arrives, or (b) from a new Server Action triggered by SSE event on the client.
   - Recommendation: Send from the ingest Route Handler (server-side, immediate) — lower latency, no client dependency. The ingest handler already processes event types; add a push send call when `type === 'approval_gate'` or `type === 'error'`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `npm test --prefix dashboard` |
| Full suite command | `npm test --prefix dashboard` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PWA-01 | manifest.ts returns valid manifest shape | unit | `npm test --prefix dashboard -- --reporter=verbose` | ❌ Wave 0 |
| PWA-01 | sw.ts exports Serwist instance with precacheEntries | unit (smoke) | same | ❌ Wave 0 |
| PWA-02 | subscribeUser stores sub in Redis | unit (mocked Redis) | same | ❌ Wave 0 |
| PWA-02 | sendPushToOwner calls webpush.sendNotification with correct payload | unit (mocked webpush) | same | ❌ Wave 0 |
| PWA-02 | sendPushToOwner removes stale subscription on 410 | unit | same | ❌ Wave 0 |
| PWA-03 | usePushCapability returns 'not-installed' on iOS non-standalone | unit (jsdom, mocked navigator) | same | ❌ Wave 0 |
| PWA-03 | usePushCapability returns 'not-supported' when no PushManager | unit | same | ❌ Wave 0 |
| PWA-04 | BottomNav renders with correct accessible structure | unit (RTL) | same | ❌ Wave 0 |

**Note:** Service worker runtime behavior (push events, notification click) cannot be meaningfully unit-tested with jsdom. These are manual-only + Lighthouse audit. The unit tests cover the composable logic (capability detection, Server Actions, manifest shape).

### Sampling Rate

- **Per task commit:** `npm test --prefix dashboard`
- **Per wave merge:** `npm test --prefix dashboard`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `dashboard/__tests__/pwa/manifest.test.ts` — covers PWA-01 manifest shape
- [ ] `dashboard/__tests__/pwa/actions.test.ts` — covers PWA-02 subscribe/send/stale-cleanup
- [ ] `dashboard/__tests__/pwa/use-push-capability.test.ts` — covers PWA-03 capability states
- [ ] `dashboard/__tests__/pwa/bottom-nav.test.ts` — covers PWA-04 nav accessibility

---

## Sources

### Primary (HIGH confidence)

- [Next.js Official PWA Guide (v16.2.1, updated 2026-03-20)](https://nextjs.org/docs/app/guides/progressive-web-apps) — manifest.ts pattern, Server Actions, VAPID key generation, service worker template, iOS InstallPrompt pattern
- [Serwist Turbopack Getting Started](https://serwist.pages.dev/docs/next/turbo) — createSerwistRoute, withSerwist Turbopack, app/sw.ts template
- [Serwist GitHub Issue #54](https://github.com/serwist/serwist/issues/54) — Turbopack support confirmed, @serwist/turbopack 9.5.7 release

### Secondary (MEDIUM confidence)

- [Aurora Scharff — Next.js 16 Serwist Setup](https://aurorascharff.no/posts/dynamically-generating-pwa-app-icons-nextjs-16-serwist/) — Webpack dev flag workaround, suppress Turbopack warning
- [LogRocket — Next.js 16 PWA with offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — runtimeCaching strategies, NetworkOnly for API routes
- [sukechris.medium.com — Offline Apps with Serwist](https://sukechris.medium.com/building-offline-apps-with-next-js-and-serwist-a395ed4ae6ba) — ExpirationPlugin, CacheFirst for static, StaleWhileRevalidate for RSC
- [MagicBell — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — EU DMA PWA restrictions, storage caps, background sync unavailable

### Tertiary (LOW confidence — needs validation)

- [Various web push UX guides 2025] — permission prompt best practices (soft prompt before hard prompt); timing: never on page load
- iOS EU DMA reversal status — conflicting sources; treat EU iOS push as unavailable for safety

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — packages confirmed against npm registry (2026-03-25); official Next.js docs cite web-push explicitly; @serwist/turbopack 9.5.7 confirmed in npm
- Architecture: HIGH — patterns from official Next.js docs + Serwist Turbopack official docs
- iOS push status: MEDIUM — multiple sources confirm iOS 16.4+ works when installed; EU status ambiguous (conflicting sources); capability detection pattern handles all cases safely
- Pitfalls: HIGH — most pitfalls confirmed by official docs, npm package constraints (edge runtime), or Apple platform behavior
- Caching strategies: MEDIUM — from community guides verified against Serwist docs

**Research date:** 2026-03-25
**Valid until:** 2026-06-25 (90 days — PWA/SW APIs are stable; iOS version changes most likely to shift)
