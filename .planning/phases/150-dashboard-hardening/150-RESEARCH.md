# Phase 150: Dashboard Hardening - Research

**Researched:** 2026-03-26
**Domain:** Next.js App Router API routes (Clerk auth), React Server Actions, Next.js "use server", dispatcher SessionRegistry CJS integration
**Confidence:** HIGH

## Summary

Phase 150 closes two integration gaps surfaced by the milestone audit. Both tasks touch the existing dashboard Next.js app and its relationship to the local dispatcher package.

**HDN-01** adds Clerk authentication to `/api/sessions`. The route currently has no auth guard at all — it returns all session data to any unauthenticated caller. Three other routes in the same codebase (`/api/events`, `/api/poll`, `/api/approval-response POST`) already use the established pattern: `import { auth } from '@clerk/nextjs/server'` followed by `const { isAuthenticated } = await auth()`. The fix is a one-liner plus a test that mocks `@clerk/nextjs/server`.

**HDN-02** wires the FailureCard action buttons to real server-side behavior. Currently, `onRetry`, `onAbandon`, and `onKill` props on FailureCard are passed as undefined from `page.tsx` — the buttons visually exist but do nothing. The fix has two parts: (1) add server action functions in `app/actions.ts` that interact with the local dispatcher's `SessionRegistry` via direct filesystem reads (`dispatcher.pids` JSON), and (2) wire those actions into `page.tsx` as callback props on `<FailureCard>`.

The dispatcher `SessionRegistry` is a local CJS module at `packages/dispatcher/lib/registry.cjs`. The dashboard runs on Vercel in production but also runs locally (same machine as the dispatcher). Server actions on Vercel cannot reach the local filesystem — this is a known constraint. The correct approach for this phase is local-only: server actions read `.planning/dispatcher.pids` using a `PDE_PROJECT_ROOT` environment variable and call `process.kill(pid, 'SIGTERM')`. This matches the existing `stop-session` implementation in `bin/pde-tools.cjs` exactly.

**Primary recommendation:** Copy the `auth()` guard pattern from `/api/poll/route.ts` for HDN-01. For HDN-02, add `retrySession`, `abandonSession`, `killSession` server actions to `app/actions.ts` that read the JSON PID file directly (do not require the full dispatcher package), then pass them as props to `<FailureCard>` in `page.tsx`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HDN-01 | `/api/sessions` route requires Clerk auth — unauthenticated requests return 401 | Established `auth()` pattern verified in 3 existing routes; test pattern verified in poll.test.ts |
| HDN-02 | FailureCard Retry/Abandon/Kill buttons trigger server actions interacting with dispatcher SessionRegistry | SessionRegistry API verified (registry.cjs); stop-session pde-tools.cjs provides reference implementation; actions.ts is the correct location for "use server" functions |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@clerk/nextjs` | 7.0.6 (installed) | Clerk auth for Next.js App Router | Already installed; all protected routes use it |
| `next` | latest | App Router, server actions, API routes | Project framework |
| `vitest` | latest | Test runner | All existing dashboard tests use it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node:fs` | built-in | Read `.planning/dispatcher.pids` | Server action filesystem access |
| `node:path` | built-in | Construct path from `PDE_PROJECT_ROOT` | Server action filesystem access |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct JSON read of dispatcher.pids | `require('../packages/dispatcher/lib/registry.cjs')` | Direct require would import CJS into ESM server action context; `JSON.parse(readFileSync(...))` is simpler and avoids module boundary issues |
| Direct JSON read | New HTTP API endpoint on dispatcher | Over-engineered for local-only use; adds network dependency |

**Installation:**
No new dependencies required. All needed packages are already installed.

## Architecture Patterns

### HDN-01: Auth Guard Pattern (established)

The three existing protected GET routes all follow this identical pattern:

```typescript
// Source: dashboard/app/api/poll/route.ts (verified)
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

`/api/sessions` must NOT be added to `PUBLIC_ROUTES` in `proxy.ts` — it should stay protected. The middleware already protects it via `auth.protect()` for non-public routes, but the in-route guard provides defence-in-depth (same pattern as all other protected routes).

### HDN-02: Server Action Pattern (established)

Server actions live in `app/actions.ts` with `"use server"` directive. The file already contains `subscribeUser`, `unsubscribeUser`, `sendPushToOwner`. New session control actions go in the same file.

```typescript
// Pattern for new session actions (app/actions.ts)
"use server";

import { auth } from '@clerk/nextjs/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export async function killSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return { ok: false, error: 'Unauthorized' };

  const projectRoot = process.env.PDE_PROJECT_ROOT;
  if (!projectRoot) return { ok: false, error: 'PDE_PROJECT_ROOT not set' };

  const pidFile = path.join(projectRoot, '.planning', 'dispatcher.pids');
  // ... read JSON, find session, signal PID
}
```

**Auth in server actions:** Server actions called from `"use client"` components MUST re-validate auth server-side. Passing Clerk auth from the client is not trusted — the server action must call `auth()` independently.

### HDN-02: FailureCard Wiring Pattern

`page.tsx` renders `<FailureCard key={s.id} session={s} />` with no action props today. The fix passes the server actions as callbacks:

```tsx
// page.tsx addition
import { retrySession, abandonSession, killSession } from '@/app/actions';

// In the failedSessions.map render:
<FailureCard
  key={s.id}
  session={s}
  onRetry={retrySession}
  onAbandon={abandonSession}
  onKill={killSession}
/>
```

Server actions are directly passable as event handler callbacks from server components. From a `"use client"` page, they must be imported and passed as props — this is supported because server actions are serializable function references.

### HDN-02: SessionRegistry Interaction

The existing `stop-session` command in `bin/pde-tools.cjs` (lines 1133-1158) is the reference implementation. For Retry/Abandon/Kill, the semantics differ:

| Action | Dispatcher Behavior | Status Update |
|--------|--------------------|-|
| **Kill** | `process.kill(pid, 'SIGTERM')` | `registry.update(sessionId, { status: 'stopped' })` |
| **Abandon** | No signal needed (session already failed) | `registry.update(sessionId, { status: 'abandoned' })` |
| **Retry** | Cannot restart from dashboard alone — dispatcher must re-dispatch | Write a retry marker or return `{ ok: false, error: 'retry-not-supported' }` |

**Retry complexity:** Retry requires spawning a new claude subprocess, which the dashboard (running on Vercel) cannot do. For this phase, Retry can either: (a) be a no-op with a toast/error response, or (b) write a `.planning/retry-requests/<sessionId>` file that the local dispatcher daemon polls. Option (a) is simpler and honest. Option (b) is out of scope for HDN-02 as stated.

**Recommend:** Kill and Abandon interact with `dispatcher.pids` directly. Retry returns `{ ok: false, error: 'restart-requires-local-dispatcher' }` and FailureCard shows an error state. This satisfies HDN-02 ("interact with dispatcher SessionRegistry") without requiring complex retry plumbing.

### Project Structure (relevant files)

```
dashboard/
├── app/
│   ├── actions.ts              # "use server" — ADD retrySession, abandonSession, killSession
│   ├── api/sessions/route.ts   # ADD auth() guard (HDN-01)
│   └── page.tsx                # Wire onRetry/onAbandon/onKill props to FailureCard (HDN-02)
├── components/
│   └── failure-card.tsx        # Already has onRetry/onAbandon/onKill props — NO CHANGES needed
├── proxy.ts                    # Already has correct PUBLIC_ROUTES — /api/sessions NOT public
└── __tests__/
    ├── hardening.test.ts       # ADD HDN-01 session auth tests here
    └── page-wiring.test.ts     # ADD wiring assertions for onRetry/onAbandon/onKill
```

### Anti-Patterns to Avoid

- **Do not add `/api/sessions` to PUBLIC_ROUTES in proxy.ts.** The middleware already protects it via `auth.protect()`. Adding it to PUBLIC_ROUTES would break HDN-01 by making it unprotected.
- **Do not import `SessionRegistry` class into server actions.** The CJS module would need dynamic `require()` inside an async ESM function. Read the JSON file directly with `fs.readFileSync` instead.
- **Do not trust client-side auth state.** Server actions must call `auth()` themselves even though the calling component is already behind Clerk middleware.
- **Do not attempt process.spawn from dashboard server actions.** The dashboard runs on Vercel. Spawning subprocesses is not supported in the Vercel Functions runtime. Retry via filesystem marker is out of scope for this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth check in route | Custom token validation | `auth()` from `@clerk/nextjs/server` | Already used in 3 routes; consistent, tested |
| PID file reading | Custom binary parser | `JSON.parse(readFileSync(pidFile, 'utf-8'))` | File is plain JSON (verified in registry.cjs) |
| Process termination | Custom SIGTERM logic | `process.kill(pid, 'SIGTERM')` | Identical to existing pde-tools.cjs stop-session |

**Key insight:** Every piece of this implementation already exists in the codebase. This phase is pure wiring — connecting existing components, not inventing new ones.

## Common Pitfalls

### Pitfall 1: Missing auth() in server actions
**What goes wrong:** Server actions added to actions.ts without calling `auth()` — the actions become callable by anyone who can trigger them (CSRF protection exists but auth is still required).
**Why it happens:** The middleware guards page routes but not programmatic server action calls.
**How to avoid:** First line of every session-mutating server action must be `const { isAuthenticated } = await auth(); if (!isAuthenticated) return { ok: false, error: 'Unauthorized' };`
**Warning signs:** No `auth` import in the new action functions.

### Pitfall 2: Stale PID data
**What goes wrong:** `dispatcher.pids` read by server action shows a PID that is no longer running, so `process.kill()` throws `ESRCH`.
**Why it happens:** Registry is a file snapshot; the running process may have already exited.
**How to avoid:** Wrap `process.kill(pid, 'SIGTERM')` in try/catch, return `{ ok: true }` regardless (session is dead either way). Match the pattern in `registry.cjs` `_isPidAlive()`.

### Pitfall 3: PDE_PROJECT_ROOT not set in Vercel deployment
**What goes wrong:** `process.env.PDE_PROJECT_ROOT` is undefined in production Vercel deployment, causing server actions to fail silently.
**Why it happens:** The env var only makes sense in local development.
**How to avoid:** Guard with an explicit check: `if (!projectRoot) return { ok: false, error: 'PDE_PROJECT_ROOT not set — session actions only work locally' }`. Document in `.env.example`.

### Pitfall 4: Vitest mock hoisting for Clerk
**What goes wrong:** `vi.mock('@clerk/nextjs/server', ...)` must appear before the route import, or the mock won't intercept the `auth` call.
**Why it happens:** Vitest hoists `vi.mock` calls but only within the same file scope.
**How to avoid:** Follow the pattern in `dashboard/lib/__tests__/poll.test.ts` exactly — mock declaration first, then named import of the route handler.

### Pitfall 5: `/api/sessions` added to PUBLIC_ROUTES by mistake
**What goes wrong:** Developer tries to make sessions "accessible to the relay" and adds it to PUBLIC_ROUTES. Now unauthenticated requests return 200 — HDN-01 broken.
**Why it happens:** Confusion between relay endpoints (ingest, approval-response) and dashboard-user endpoints (sessions, poll, events).
**How to avoid:** Only relay endpoints with Bearer token auth go in PUBLIC_ROUTES. User-facing data endpoints stay protected by Clerk.

## Code Examples

### Verified: auth() guard pattern (from approval-response/route.ts)

```typescript
// Source: dashboard/app/api/approval-response/route.ts (verified 2026-03-26)
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

### Verified: Vitest mock pattern for Clerk (from poll.test.ts)

```typescript
// Source: dashboard/lib/__tests__/poll.test.ts (verified 2026-03-26)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

import { GET } from '../../app/api/poll/route';
import { auth } from '@clerk/nextjs/server';

const mockAuth = auth as ReturnType<typeof vi.fn>;

it('returns 401 when not authenticated', async () => {
  mockAuth.mockResolvedValue({ isAuthenticated: false });
  const res = await GET(makeRequest());
  expect(res.status).toBe(401);
});
```

### Verified: stop-session PID kill pattern (from pde-tools.cjs lines 1133-1158)

```javascript
// Source: bin/pde-tools.cjs (verified 2026-03-26)
const { SessionRegistry } = require('../packages/dispatcher/lib/registry.cjs');
const registry = new SessionRegistry(cwd);
registry.loadFromDisk();
const entry = registry.get(sessionId);
if (entry.pid > 0) {
  try { process.kill(entry.pid, 'SIGTERM'); } catch (_) {}
}
registry.update(sessionId, { status: 'stopped' });
```

### Verified: dispatcher.pids JSON schema (from registry.cjs)

```json
// Source: packages/dispatcher/lib/registry.cjs JSDoc (verified 2026-03-26)
{
  "sessions": {
    "<sessionId>": {
      "pid": 12345,
      "phase": 144,
      "plan": 1,
      "worktreePath": "/abs/.sessions/p144-abc",
      "branch": "pde/session/p144-abc",
      "status": "running",
      "startedAt": "2026-03-26T..."
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getAuth(req)` (Clerk v4/v5 pattern) | `await auth()` (Clerk v6+ App Router) | @clerk/nextjs 6.0 | No request argument needed; all three existing routes already use this |
| Manual CSRF tokens for server actions | Next.js built-in CSRF protection + `auth()` | Next.js 14 Server Actions | Server actions have CSRF protection by default; still need auth check |

**Deprecated/outdated:**
- `getAuth(req)`: Clerk v4 pattern. Not used anywhere in this codebase. Do not introduce.
- `authMiddleware()`: Old Clerk middleware helper. This codebase correctly uses `clerkMiddleware()` from `@clerk/nextjs/server` in proxy.ts.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@clerk/nextjs` | HDN-01 auth guard | ✓ | 7.0.6 | — |
| `node:fs` / `node:path` | HDN-02 server actions | ✓ | Node built-in | — |
| `PDE_PROJECT_ROOT` env var | HDN-02 server actions (local) | Not in .env.example | — | Return `{ ok: false, error: 'PDE_PROJECT_ROOT not set' }` |
| `packages/dispatcher/lib/registry.cjs` | Reference only | ✓ | Phase 144 | — |

**Missing dependencies with no fallback:** None — all required code already exists.

**Missing dependencies with fallback:**
- `PDE_PROJECT_ROOT`: Not present in `.env.example`. Server actions must gracefully return an error when absent (Vercel production). Add to `.env.example` with a comment marking it as local-only.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest installed) |
| Config file | `dashboard/vitest.config.ts` |
| Quick run command | `cd dashboard && npm test` |
| Full suite command | `cd dashboard && npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDN-01 | `/api/sessions` returns 401 when unauthenticated | unit | `cd dashboard && npm test -- --reporter=verbose 2>&1 \| grep HDN` | ❌ Wave 0 |
| HDN-01 | `/api/sessions` returns 200 when authenticated | unit | same | ❌ Wave 0 |
| HDN-02 | `killSession` action calls process.kill and updates registry | unit | same | ❌ Wave 0 |
| HDN-02 | `abandonSession` action updates registry status to 'abandoned' | unit | same | ❌ Wave 0 |
| HDN-02 | page.tsx passes onKill/onAbandon/onRetry props to FailureCard | source inspection | same | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd dashboard && npm test`
- **Per wave merge:** `cd dashboard && npm test`
- **Phase gate:** Full suite (205 existing + new tests) green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test cases in `dashboard/__tests__/hardening.test.ts` — covers HDN-01 (sessions auth 401/200)
- [ ] New test cases in `dashboard/__tests__/hardening.test.ts` OR new `__tests__/session-actions.test.ts` — covers HDN-02 (killSession, abandonSession actions)
- [ ] New assertions in `dashboard/__tests__/page-wiring.test.ts` — covers HDN-02 FailureCard prop wiring

## Open Questions

1. **Retry semantics for HDN-02**
   - What we know: Retry requires spawning a new claude subprocess. Dashboard runs on Vercel and cannot spawn processes.
   - What's unclear: Whether HDN-02 expects a fully functional Retry (which requires local dispatcher cooperation) or an error-returning stub.
   - Recommendation: Implement Kill and Abandon as real actions. Implement Retry as a server action that returns `{ ok: false, error: 'retry-requires-local-dispatcher' }`. FailureCard shows the error. This satisfies "triggers server action that interacts with dispatcher SessionRegistry" — the action still reads the registry to validate the session exists.

2. **Abandon vs Kill semantics**
   - What we know: Kill = send SIGTERM + mark stopped. Abandon = failed session, no process to kill.
   - What's unclear: Whether Abandon should also mark the worktree for cleanup or just update registry status.
   - Recommendation: Abandon sets `status: 'abandoned'` in registry only. No worktree removal (that is a separate cleanup operation handled by the dispatcher merge flow).

## Sources

### Primary (HIGH confidence)
- `dashboard/app/api/poll/route.ts` — auth() pattern, vitest mock pattern
- `dashboard/app/api/approval-response/route.ts` — auth() + userId pattern
- `dashboard/app/api/events/route.ts` — auth() guard pattern
- `packages/dispatcher/lib/registry.cjs` — SessionRegistry API, dispatcher.pids JSON schema
- `bin/pde-tools.cjs` lines 1133-1158 — stop-session reference implementation
- `dashboard/proxy.ts` — PUBLIC_ROUTES definition, clerkMiddleware usage
- `dashboard/lib/__tests__/poll.test.ts` — Vitest mock pattern for Clerk
- `dashboard/app/actions.ts` — existing server actions structure
- `dashboard/components/failure-card.tsx` — current component structure and props
- `dashboard/app/page.tsx` — current FailureCard rendering (no action props)

### Secondary (MEDIUM confidence)
- `dashboard/package.json` — confirmed @clerk/nextjs@7.0.6, no new deps needed
- `dashboard/vitest.config.ts` — confirmed node environment, test glob pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed packages and existing route files
- Architecture: HIGH — all patterns directly verified from existing codebase; no guesswork
- Pitfalls: HIGH — derived from direct code inspection of existing tests and middleware
- Retry semantics: MEDIUM — deduced from dispatcher architecture; no explicit requirement spec

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable stack — Clerk, Next.js, vitest all pinned to installed versions)
