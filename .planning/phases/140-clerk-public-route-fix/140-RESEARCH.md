# Phase 140: Clerk Public Route Matcher Fix — Research

**Researched:** 2026-03-25
**Domain:** Clerk Next.js middleware — public route configuration
**Confidence:** HIGH

## Summary

Phase 140 is a surgical one-file fix. `dashboard/proxy.ts` declares only two public routes
(`/sign-in(.*)` and `/api/ingest`). Two additional routes need the same treatment:

1. `/api/approval-response` — the relay daemon calls this with a Bearer token (no Clerk
   session). Clerk middleware runs before the route handler and returns 401, so
   `validateRelayToken` never executes. `getApprovalResponse` in the relay always returns null,
   PDE approval gates block forever. This closes INT-01 (critical) and unblocks APR-04.

2. `/api/cron/gc` — Vercel cron carries `Authorization: Bearer <CRON_SECRET>` but has no
   Clerk session. Handler-level auth is correct; the problem is Clerk intercepts first. This
   closes INT-02 (medium) and hardens HRD-05.

The fix is two strings added to the `createRouteMatcher` array in `proxy.ts`. No other files
change. A new Nyquist test verifies the public-route list so the gap cannot regress.

**Primary recommendation:** Add `'/api/approval-response'` and `'/api/cron/gc'` to the
`createRouteMatcher` array in `dashboard/proxy.ts`. Add a unit test that imports the proxy
module's config and asserts both paths are present.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APR-04 | Approval responses flow back to PDE via relay polling Upstash for pending responses | Fix INT-01: add `/api/approval-response` to public matcher so relay Bearer-token GET reaches the route handler. Route handler `validateRelayToken` already correct; only the middleware gate is missing. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | `latest` (installed) | Auth middleware for Next.js App Router | Project decision from v0.17 init — DSH-05 |
| `next` | `latest` | App Router + middleware pipeline | Project foundation |
| `vitest` | `latest` | Test runner | Established in dashboard (vitest.config.ts, globals:true) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-test-api-route-handler` | `latest` | Route handler integration testing | Already in devDependencies — use for E2E route tests if needed |

**No installation needed.** All packages already present in `dashboard/package.json`.

## Architecture Patterns

### Current proxy.ts Structure

```typescript
// dashboard/proxy.ts — CURRENT (broken)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/ingest',      // relay Bearer token — already public
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Fixed proxy.ts (target state)

```typescript
// dashboard/proxy.ts — FIXED
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/ingest',               // relay Bearer token (existing)
  '/api/approval-response',    // relay polls with Bearer token — INT-01 fix
  '/api/cron/gc',              // Vercel cron uses CRON_SECRET — INT-02 fix
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Key insight:** `createRouteMatcher` accepts an array of path strings. Paths without `(.*)`
suffix match exact paths only — correct for these two routes (no child routes exist under
them). The `config.matcher` already covers `/(api|trpc)(.*)` so both new paths are already
intercepted by the middleware; the only change is classifying them as public.

### Auth Split Pattern (Do Not Break)

`/api/approval-response` has a dual-auth split:
- `POST` — Clerk auth (dashboard user submits approve/deny) — requires Clerk session
- `GET` — Bearer token auth (relay polls) — requires `PDE_RELAY_TOKEN`

Making the route public in Clerk middleware does NOT remove auth. It only means Clerk stops
short-circuiting the request. The route handler's own auth checks (`auth()` for POST,
`validateRelayToken` for GET) remain fully active. This is the same pattern as `/api/ingest`.

### Anti-Patterns to Avoid

- **Do not use wildcards on approval-response:** `/api/approval-response(.*)` is unnecessary
  and would be overly permissive. The exact path `/api/approval-response` is sufficient.
- **Do not remove handler-level auth:** The GET handler's `validateRelayToken` call and the
  POST handler's `auth()` call must stay. Public in middleware != unauthenticated.
- **Do not add `/api/events` or `/api/poll`:** These serve the dashboard UI and require Clerk
  session. Adding them would be a security regression.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route matching | Custom regex middleware | `createRouteMatcher` from `@clerk/nextjs/server` | Already in use; handles edge cases in path matching |
| Middleware auth bypass | Custom header inspection in middleware | Add to public matcher array | Cleaner, less error-prone, already the project pattern |

## Common Pitfalls

### Pitfall 1: Forgetting trailing-path variants
**What goes wrong:** Adding `/api/approval-response` but relay calls
`/api/approval-response?session_id=...&approval_id=...` — query strings do NOT affect
`createRouteMatcher`, so this is safe. No `(.*)` suffix needed.
**Why it happens:** Confusion between path matching and query string matching.
**How to avoid:** Query strings are stripped before route matching in Next.js middleware.

### Pitfall 2: Clerk 401 vs handler 401 confusion
**What goes wrong:** After the fix, a misconfigured `PDE_RELAY_TOKEN` still returns 401 from
the handler. This can be confused with the Clerk 401 returning before the fix.
**Why it happens:** Both return 401 with `{ error: 'Unauthorized' }`.
**How to avoid:** The Clerk 401 returns HTML (redirect to sign-in) by default, or a JSON
`{ error: 'Unauthorized' }` with `clerkMiddleware`. The handler 401 always returns
`NextResponse.json({ error: 'Unauthorized' })`. If the fix is correct, a relay with a wrong
token gets the handler's 401, not Clerk's. Verify with curl to distinguish.
**Warning signs:** Clerk 401 typically lacks the `{ error: 'Unauthorized' }` body shape the
handler returns; it may redirect or return a Clerk-signed HTML error page.

### Pitfall 3: config.matcher scope gap
**What goes wrong:** Thinking the `config.matcher` needs updating.
**Why it happens:** Confusion between which requests the middleware intercepts vs. which are
public within it.
**How to avoid:** The `config.matcher` already includes `/(api|trpc)(.*)` — both
`/api/approval-response` and `/api/cron/gc` are already intercepted. Only the
`isPublicRoute` list needs updating.

### Pitfall 4: Breaking the POST path for approval-response
**What goes wrong:** If `/api/approval-response` is made public, the POST (dashboard user)
loses Clerk protection.
**Why it happens:** Misunderstanding that "public in middleware" means "unprotected."
**How to avoid:** The route handler runs its own `const { isAuthenticated } = await auth()`
check for POST. This check works even when Clerk middleware does not call `auth.protect()` —
it reads the Clerk session cookie directly. Security is preserved.

## Code Examples

### The minimal diff (verified against current file)

```typescript
// Source: dashboard/proxy.ts — current state read directly
// Change: add two entries to createRouteMatcher array

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/api/ingest',
  '/api/approval-response',  // ADD — relay GET uses Bearer token
  '/api/cron/gc',            // ADD — Vercel cron uses CRON_SECRET
]);
```

### Nyquist test pattern (follows existing hardening.test.ts style)

```typescript
// dashboard/__tests__/proxy-public-routes.test.ts
import { describe, it, expect } from 'vitest';

// Read the raw source to assert the public route list
// This is a static analysis test — no runtime needed
describe('proxy.ts — public route configuration', () => {
  it('Test PR-01: /api/approval-response is in isPublicRoute matcher', async () => {
    const src = await import('fs').then(fs =>
      fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf-8')
    );
    expect(src).toContain("'/api/approval-response'");
  });

  it('Test PR-02: /api/cron/gc is in isPublicRoute matcher', async () => {
    const src = await import('fs').then(fs =>
      fs.readFileSync(new URL('../proxy.ts', import.meta.url), 'utf-8')
    );
    expect(src).toContain("'/api/cron/gc'");
  });
});
```

**Note:** The import/URL approach is slightly brittle. An alternative is to export the route
list from proxy.ts and import it directly. However, exporting from middleware files can
conflict with Next.js edge runtime expectations. The filesystem read approach is safer for
this type of config assertion. The planner should decide which approach to use.

**Better alternative — export the matcher list for testability:**

```typescript
// dashboard/proxy.ts (modified for testability)
export const PUBLIC_ROUTES = [
  '/sign-in(.*)',
  '/api/ingest',
  '/api/approval-response',
  '/api/cron/gc',
] as const;

const isPublicRoute = createRouteMatcher([...PUBLIC_ROUTES]);
```

```typescript
// dashboard/__tests__/proxy-public-routes.test.ts
import { PUBLIC_ROUTES } from '../proxy';

it('Test PR-01: /api/approval-response is public', () => {
  expect(PUBLIC_ROUTES).toContain('/api/approval-response');
});
it('Test PR-02: /api/cron/gc is public', () => {
  expect(PUBLIC_ROUTES).toContain('/api/cron/gc');
});
```

Risk: Exporting from middleware files. Verify Next.js does not tree-shake or error on named
exports from middleware. The `export default` (the handler) and `export const config` pattern
is standard; adding `export const PUBLIC_ROUTES` is a named export alongside these, which
should be fine — Next.js only uses the default export and `config` from middleware files.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `authMiddleware` | `clerkMiddleware` + `createRouteMatcher` | Clerk v5 (late 2024) | `authMiddleware` deprecated; project already uses new API |

The project's `proxy.ts` already uses the current `clerkMiddleware` + `createRouteMatcher`
pattern. No migration needed — this is purely an additive config change.

## Open Questions

1. **Export PUBLIC_ROUTES vs filesystem read for tests**
   - What we know: Both approaches produce passing tests; named export is cleaner
   - What's unclear: Whether Next.js complains about extra named exports from the middleware
     file in edge runtime (unlikely but unverified)
   - Recommendation: Try named export first; if Next.js build errors, fall back to filesystem
     read in test

2. **Does `clerkMiddleware` in this project run on edge or Node runtime?**
   - What we know: `proxy.ts` has no `export const runtime = 'edge'` — defaults to Node
   - What's unclear: Whether Vercel auto-promotes middleware to edge
   - Recommendation: No impact on the fix itself; both runtimes support `createRouteMatcher`

## Environment Availability

Step 2.6: SKIPPED — this phase is a code-only change. No external tools, services, or CLIs
beyond what is already installed in the dashboard workspace are required.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APR-04 | `/api/approval-response` is in public matcher (relay GET reaches handler) | unit (static config assert) | `cd dashboard && npm test` | Wave 0 |
| HRD-05 (guard) | `/api/cron/gc` is in public matcher (cron reaches handler) | unit (static config assert) | `cd dashboard && npm test` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `dashboard/__tests__/proxy-public-routes.test.ts` — covers APR-04 and HRD-05 guard; test IDs PR-01, PR-02

## Sources

### Primary (HIGH confidence)
- Direct file read: `dashboard/proxy.ts` — current public route list confirmed (lines 3-6)
- Direct file read: `dashboard/app/api/approval-response/route.ts` — confirmed GET uses Bearer token, POST uses Clerk
- Direct file read: `dashboard/app/api/cron/gc/route.ts` — confirmed uses CRON_SECRET not Clerk
- Direct file read: `.planning/v0.17-MILESTONE-AUDIT.md` — INT-01, INT-02 gap descriptions and recommended fix
- WebFetch: `https://clerk.com/docs/references/nextjs/clerk-middleware` — confirmed `createRouteMatcher` array syntax and `auth.protect()` pattern

### Secondary (MEDIUM confidence)
- Project decision log (STATE.md): Clerk for dashboard auth, Bearer token for relay auth — confirms expected auth split

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages already installed, versions confirmed from package.json
- Architecture: HIGH — fix is read directly from audit evidence and current file state
- Pitfalls: HIGH — derived from reading the actual route handler code and middleware

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (Clerk API is stable; `createRouteMatcher` has been the standard since v5)
