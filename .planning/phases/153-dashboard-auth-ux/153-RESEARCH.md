# Phase 153: Dashboard Auth UX - Research

**Researched:** 2026-03-27
**Domain:** Next.js App Router — client-side 401 detection and Clerk auth redirect
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUX-01 | When /api/sessions returns 401, dashboard redirects to sign-in page instead of rendering empty state | useAuth isSignedIn check + useRouter redirect in useAllSessions hook |

</phase_requirements>

---

## Summary

The dashboard's `useAllSessions` hook currently silently swallows all fetch errors via `.catch(() => {})`. When the Clerk middleware returns 401 on `/api/sessions`, the hook does nothing — the `sessions` state stays `[]` — producing an empty dashboard with no feedback. AUX-01 requires the hook to detect 401 and redirect to sign-in instead.

There are two valid approaches for 401 detection in the App Router: (1) check `response.status === 401` inside the fetch then imperatively call `router.push('/sign-in')`, or (2) use `useAuth` from `@clerk/nextjs` which exposes `isSignedIn`/`isLoaded` directly in the client, and redirect before the first fetch fires. The project already has `ClerkProvider` wrapping the entire app in `layout.tsx`, so both approaches are available. The imperative router approach (detect 401 in fetch) is more narrowly scoped — it only triggers on an actual API failure, not on every render.

The proxy middleware (`proxy.ts`) already calls `auth.protect()` on all non-public routes. The `/api/sessions` route performs its own Clerk `auth()` check and returns `{ error: 'Unauthorized', status: 401 }`. The sign-in page lives at `/sign-in` (catch-all `[[...sign-in]]`). A redirect to `/sign-in` from a client component is performed with `useRouter` from `next/navigation` and `router.push('/sign-in')` — NOT `window.location` and NOT `redirect()` from `next/navigation` (that is server-only). **Primary recommendation:** Modify `useAllSessions` to check `response.status === 401` in the fetch tick and call `router.push('/sign-in')`. This is the narrowest, most testable fix with zero changes to page.tsx or other components.

---

## Standard Stack

### Core
| Library | Version (installed) | Purpose | Why Standard |
|---------|-------------------|---------|--------------|
| `@clerk/nextjs` | 7.0.6 | Auth provider + `useAuth` hook + server `auth()` | Already in project; Clerk 7 is current |
| `next` | 16.2.1 | App Router, `useRouter` from `next/navigation` | Already in project |
| `react` | latest | `useState`, `useEffect` | Already in project |
| `vitest` | latest | Test framework (node env) | Already in project |

### No New Dependencies Required
This phase requires zero new npm installs. All needed APIs are already installed.

### Clerk 7 `useAuth` Return Shape (verified from installed types)
```typescript
// From @clerk/shared/dist/types/index.d.ts (lines 9889-9970)
// Three discriminated union states:
{ isLoaded: false; isSignedIn: undefined; userId: undefined; ... }  // initializing
{ isLoaded: true;  isSignedIn: false;     userId: null;      ... }  // signed out
{ isLoaded: true;  isSignedIn: true;      userId: string;    ... }  // signed in
```

---

## Architecture Patterns

### Recommended Project Structure

No new files needed. The change is entirely within:
```
dashboard/
├── hooks/
│   └── use-all-sessions.ts      # MODIFY — add 401 detection + router redirect
└── __tests__/
    └── auth-ux.test.ts          # NEW — AUX-01 test (source-inspection pattern)
```

### Pattern 1: 401 Detection in fetch tick (RECOMMENDED)

**What:** Check `response.ok` / `response.status` before calling `.json()`. On 401, call `router.push('/sign-in')`.

**When to use:** When the redirect should only fire on an actual 401 response from the server — not on every unauthenticated render. This is the minimal, targeted fix.

**Verified sources:** `next/navigation` `useRouter` — App Router client component hook (confirmed in installed Next.js 16.2.1 type definitions at `dashboard/node_modules/next/dist/client/components/navigation.d.ts`).

```typescript
// Source: installed @clerk/nextjs 7.0.6 + next/navigation (Next.js 16.2.1)
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionListItem } from '@/lib/queries';

export function useAllSessions(pollIntervalMs = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const tick = async () => {
      const res = await fetch('/api/sessions');
      if (res.status === 401) {
        router.push('/sign-in');
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data);
    };
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, router]);

  return sessions;
}
```

### Pattern 2: useAuth pre-flight check (ALTERNATIVE — not recommended here)

**What:** Call `useAuth()` at hook/component level. When `isLoaded && !isSignedIn`, redirect before fetching.

**Why not recommended for this phase:** This duplicates what the Clerk middleware already does, and is harder to test in the project's node vitest environment (requires mocking `useAuth`). The 401-on-fetch approach is directly testable via source inspection (matching the project's established test pattern) and is more explicit about the trigger condition.

### Test Pattern: Source Inspection (Project Standard)

The project's vitest config uses `environment: 'node'` (no DOM, no React rendering). All tests that verify hooks or components use **source inspection** (`readFileSync`) rather than `@testing-library/react`. This is established in:

- `page-wiring.test.ts` — inspects `app/page.tsx` source
- `failure-card.test.ts` — inspects component source
- `hardening-hdn.test.ts` — uses direct module import for route handler

For `useAllSessions`, the correct test strategy is source inspection:
```typescript
// Source: established project pattern from page-wiring.test.ts
import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(
  path.resolve(import.meta.dirname, '../hooks/use-all-sessions.ts'),
  'utf-8'
);

it('imports useRouter from next/navigation', () => {
  expect(source).toContain("from 'next/navigation'");
  expect(source).toContain('useRouter');
});

it('calls router.push(\'/sign-in\') on 401', () => {
  expect(source).toContain('router.push');
  expect(source).toContain('/sign-in');
});

it('returns early on 401 without calling setSessions', () => {
  expect(source).toContain('res.status === 401');
  expect(source).toContain('return');
});
```

### Anti-Patterns to Avoid

- **`window.location.href = '/sign-in'`:** Full page reload, breaks SSR, harder to test. Use `router.push()`.
- **`redirect()` from `next/navigation`:** This is server-side only. Calling it in a client component throws at runtime.
- **Swallowing the 401 silently:** The current `.catch(() => {})` pattern is the bug. Do not add a generic catch-all after fixing.
- **Triggering redirect on every polling tick:** After `router.push('/sign-in')`, the `setInterval` should be cleared OR the component unmounts (navigation clears it). But the `return` statement prevents repeated `router.push` calls within the same tick — navigation to sign-in will unmount the component before the next tick fires (5s interval). No explicit `clearInterval` before redirect is needed, but it is safe to add one.
- **Checking `res.ok` only:** `res.ok` is `false` for all 4xx/5xx. Check `res.status === 401` specifically to avoid redirecting on transient 5xx errors.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side auth redirect | Custom auth context, session detection logic | `useRouter` from `next/navigation` + `res.status === 401` check | `useRouter.push` is the idiomatic App Router redirect; Clerk middleware already handles the server-side enforcement |
| Auth state detection | Manual cookie reading or JWT decoding | `useAuth()` from `@clerk/nextjs` if needed | Clerk already manages session state; the 401 from the API is a direct signal |

**Key insight:** The API already returns 401 authoritatively (verified in `route.ts`). The client just needs to react to it. No new auth machinery is needed — just a conditional check on the fetch response status before calling `.json()`.

---

## Common Pitfalls

### Pitfall 1: Forgetting to add `router` to the `useEffect` dependency array
**What goes wrong:** ESLint/TypeScript exhaustive-deps rule may warn; stale closure captures wrong router reference.
**Why it happens:** `useRouter()` returns a stable reference in Next.js App Router, but the rule still requires it in deps.
**How to avoid:** Include `router` in `useEffect` deps: `}, [pollIntervalMs, router]);`
**Warning signs:** TypeScript/lint warning about missing dependency.

### Pitfall 2: Using `response.json()` before checking status
**What goes wrong:** `response.json()` on a 401 response that returns `{ error: 'Unauthorized' }` would call `setSessions({ error: 'Unauthorized' })` — type error and UI breakage.
**Why it happens:** The original code chains `.then(r => r.json()).then(setSessions)` blindly.
**How to avoid:** Check `res.status === 401` (or `!res.ok`) BEFORE calling `res.json()`.
**Warning signs:** Sessions state contains `{ error: string }` instead of array.

### Pitfall 3: Redirect loop if sign-in page is accidentally protected
**What goes wrong:** If `/sign-in` were not in `PUBLIC_ROUTES`, Clerk middleware would redirect unauthenticated users from `/sign-in` to `/sign-in` infinitely.
**Why it happens:** Route protection misconfiguration.
**How to avoid:** Already handled — `proxy.ts` has `'/sign-in(.*)'` in `PUBLIC_ROUTES`. Do not change this file.
**Warning signs:** 308/307 redirect loop in browser network tab.

### Pitfall 4: `router.push` called after component unmount
**What goes wrong:** React "Can't perform a state update on an unmounted component" (or similar) warning if `setSessions` is called after navigation starts.
**Why it happens:** The `return` statement prevents calling `setSessions` after a 401, so this is not a problem in the recommended pattern. Only an issue if the code calls both.
**How to avoid:** Ensure the `return` statement after `router.push('/sign-in')` prevents any further state updates in the same tick.

### Pitfall 5: Test mocking `useRouter` in node vitest environment
**What goes wrong:** `useRouter` from `next/navigation` throws or returns undefined in a pure node test environment.
**Why it happens:** `useRouter` is a React hook; it requires a React rendering context.
**How to avoid:** Use source inspection for the test (see Architecture Patterns section). Do NOT attempt to render the hook with `renderHook` — the project has no `@testing-library/react` installed and uses `environment: 'node'`.

---

## Code Examples

### Final hook implementation
```typescript
// dashboard/hooks/use-all-sessions.ts
// Source: verified against @clerk/nextjs 7.0.6, Next.js 16.2.1, project test pattern
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SessionListItem } from '@/lib/queries';

export function useAllSessions(pollIntervalMs = 5000): SessionListItem[] {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const tick = async () => {
      const res = await fetch('/api/sessions');
      if (res.status === 401) {
        router.push('/sign-in');
        return;
      }
      if (!res.ok) return;
      const data: SessionListItem[] = await res.json();
      setSessions(data);
    };
    tick();
    const id = setInterval(tick, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, router]);

  return sessions;
}
```

### Test file (source inspection pattern)
```typescript
// dashboard/__tests__/auth-ux.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(
  path.resolve(import.meta.dirname, '../hooks/use-all-sessions.ts'),
  'utf-8'
);

describe('useAllSessions — AUX-01 auth redirect', () => {
  it('imports useRouter from next/navigation', () => {
    expect(source).toContain("from 'next/navigation'");
    expect(source).toContain('useRouter');
  });

  it('calls router.push with /sign-in on 401', () => {
    expect(source).toContain("router.push('/sign-in')");
  });

  it('checks res.status === 401 before redirecting', () => {
    expect(source).toContain('res.status === 401');
  });

  it('returns early after redirect (does not call setSessions on 401)', () => {
    // The return statement must appear before any setSessions call
    const redirectIdx = source.indexOf("router.push('/sign-in')");
    const returnIdx = source.indexOf('return', redirectIdx);
    const setSessionsIdx = source.indexOf('setSessions', redirectIdx);
    // return must come before any setSessions after the push
    expect(returnIdx).toBeLessThan(setSessionsIdx === -1 ? Infinity : setSessionsIdx);
  });

  it('still polls on non-401 non-ok responses without redirecting', () => {
    expect(source).toContain('if (!res.ok) return');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Clerk `clerkMiddleware` with `afterAuth` callback | `clerkMiddleware` + `auth.protect()` (simpler) | Clerk v5+ | `auth.protect()` replaces verbose `afterAuth` pattern |
| `useRouter` from `next/router` (Pages Router) | `useRouter` from `next/navigation` (App Router) | Next.js 13+ | App Router only; Pages Router hook does not exist in `next/navigation` |
| `redirect()` for client redirects | `router.push()` for client redirects | Next.js 13+ | `redirect()` is server-side only; client components must use `useRouter` |

---

## Open Questions

1. **Should the interval be cleared before calling `router.push`?**
   - What we know: Navigation will unmount the component, triggering the cleanup `() => clearInterval(id)`. The next tick (5s away) will not fire.
   - What's unclear: In edge cases (very fast navigation), could a tick fire between the `router.push` call and component unmount?
   - Recommendation: Defensively clear the interval before `router.push` for belt-and-suspenders safety. This is cheap and harmless.

2. **Should `redirectUrl` be appended (e.g., `router.push('/sign-in?redirect_url=/')`)?**
   - What we know: The Clerk `<SignIn>` component at `app/sign-in/[[...sign-in]]/page.tsx` uses default Clerk behavior. Clerk handles `redirect_url` automatically via middleware in most cases.
   - What's unclear: Whether the catch-all `[[...sign-in]]` page reads `redirect_url` query param for post-sign-in redirect.
   - Recommendation: Redirect to `/sign-in` without query params. The middleware's `auth.protect()` handles post-sign-in redirect for protected routes. Keep the fix minimal.

---

## Environment Availability

Step 2.6: SKIPPED — no external tool dependencies. This phase is a pure TypeScript/React code edit within the existing Next.js dashboard project. All runtime dependencies (Clerk, Next.js) are already installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm test` |

Current baseline: **28 test files, 212 tests, all passing** (verified 2026-03-27).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUX-01 | useAllSessions redirects to /sign-in on 401 | source-inspection | `cd dashboard && npm test -- auth-ux` | ❌ Wave 0 — create `__tests__/auth-ux.test.ts` |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite 212+ tests green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/__tests__/auth-ux.test.ts` — covers AUX-01 (source inspection of `hooks/use-all-sessions.ts`)

*(All other test infrastructure already in place — 28 existing test files, node environment, vitest config configured)*

---

## Sources

### Primary (HIGH confidence)
- Installed `@clerk/nextjs` 7.0.6 — `useAuth` return type, `UseAuthReturn` union type, `RedirectToSignIn` component API
- Installed `@clerk/shared/dist/types/index.d.ts` — `UseAuthReturn` discriminated union (`isLoaded`, `isSignedIn` fields)
- Installed `@clerk/react/dist/useAuth-DcwU7ADV.d.ts` — `useAuth` function signature
- Installed `next` 16.2.1 `dist/client/components/navigation.d.ts` — `useRouter` App Router hook
- Project source: `dashboard/hooks/use-all-sessions.ts` — current buggy implementation
- Project source: `dashboard/app/api/sessions/route.ts` — confirmed 401 response shape
- Project source: `dashboard/proxy.ts` — confirmed `/sign-in(.*)` in PUBLIC_ROUTES
- Project source: `dashboard/vitest.config.ts` — confirmed node environment, no jsdom
- Project source: `dashboard/__tests__/page-wiring.test.ts` — confirmed source-inspection test pattern

### Secondary (MEDIUM confidence)
- N/A — all critical claims verified against installed library source

### Tertiary (LOW confidence)
- N/A

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed package.json and node_modules type definitions
- Architecture: HIGH — implementation pattern derived from reading installed Clerk/Next.js types and existing codebase patterns directly
- Pitfalls: HIGH — derived from actual code analysis (current bug is `.catch(() => {})`, sign-in route already in PUBLIC_ROUTES)
- Test strategy: HIGH — verified project uses node vitest environment + source inspection pattern (multiple existing examples)

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (stable libraries — Clerk 7, Next.js 16 both stable)
