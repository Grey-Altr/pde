# Phase 190: Infrastructure Foundation - Research

**Researched:** 2026-03-30
**Domain:** TypeScript type system, CJS module extension, Node.js package scaffolding
**Confidence:** HIGH

## Summary

Phase 190 is a pure infrastructure extension phase: it widens five existing files to understand cloud and Docker session sources, and creates one new package stub. No new external dependencies are required. All changes are source-only edits to well-understood, thoroughly tested code.

The work divides into five discrete surgical edits plus one directory creation. Each edit is isolated: the SessionSource enum addition in wire-schema.ts and queries.ts flows independently of the lock.cjs PID guard, which flows independently of the aggregator.cjs routing branch, which flows independently of the config key additions. The packages/cloud-adapter/ scaffold is pure file creation.

The most important design constraint is the `Zero npm deps at plugin root` rule recorded in AGENTS.md. The cloud adapter must live in `packages/cloud-adapter/` with its own `package.json`, but nothing requiring a new `npm install` at the repo root may be introduced in this phase.

**Primary recommendation:** Make all five edits independently, keep each change minimal and additive (no renames, no removals), and verify each one with the corresponding existing test after implementation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — auto-generated infrastructure phase. All implementation at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INF-01 | lock.cjs extended with cloud-aware PID handling (no process.kill for cloud sessions) | lock.cjs line 82 is the exact call site; isCloudSessionId() predicate pattern established by registry.cjs and remote-router.cjs injection patterns |
| INF-02 | aggregator.cjs uses RemoteAggregator for cloud sessions instead of file-based TailCursor | Aggregator constructor already accepts injectable TailCursor class; RemoteAggregator is a new class with same start()/stop() contract, routed by watch() based on sessionId prefix or explicit flag |
| INF-03 | SessionSource registry enum extended for cloud and docker dispatch types | wire-schema.ts has no enum yet; queries.ts has inline union; both need 'remote-cloud' and 'docker' added |
| INF-06 | Dispatch config block extended with cloud and docker settings | VALID_CONFIG_KEYS in bin/lib/config.cjs follows a whitelist additive pattern; config-dispatch.test.cjs uses source inspection so new keys will auto-pass if added correctly |
| CLD-06 | Cloud adapter package lives in isolated packages/cloud-adapter/ respecting zero-npm root constraint | packages/ already contains dispatcher/ and pde-mcp-server/; pattern established — create package.json with name, version, main, dependencies: {} |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:fs | built-in | File I/O for lock and config | Already used throughout |
| node:events | built-in | EventEmitter base for Aggregator | Already used in aggregator.cjs |
| zod | ^4.3.6 (from package.json) | Schema validation for wire-schema.ts | Already used in WireEnvelopeSchema |
| vitest | ^4.1.1 (from package.json) | Test runner | Already used for all dispatcher tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| typescript | dashboard's tsconfig | Types for wire-schema.ts and queries.ts | Always — dashboard files are TypeScript |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Prefix-based cloud session ID detection | Explicit `type` field on session record | Prefix detection (e.g. `sessionId.startsWith('cloud-')`) is invasive and fragile; prefer a session metadata flag in registry.cjs entry or a passed-in `isCloudSession` predicate injected the same way `_TailCursor` is injected into Aggregator |
| Inline union type in queries.ts | Shared type alias | Inline union is the existing pattern — match it to avoid drift |

**Installation:** No new npm packages at repo root. The `packages/cloud-adapter/package.json` will list its own future dependencies but nothing is installed in this phase.

## Architecture Patterns

### Recommended Project Structure

Additions only:
```
packages/
├── dispatcher/          # existing
│   └── lib/
│       ├── lock.cjs     # EDIT: add isCloudSessionId guard before process.kill
│       └── aggregator.cjs  # EDIT: add RemoteAggregator class + routing in watch()
└── cloud-adapter/       # NEW: CLD-06
    ├── package.json     # name: @pde/cloud-adapter, version: 0.1.0, main: index.cjs
    └── index.cjs        # placeholder: module.exports = {}; with JSDoc stub

dashboard/lib/
├── wire-schema.ts       # EDIT: add SessionSource enum/union
└── queries.ts           # EDIT: extend source union type + narrowing

bin/lib/
└── config.cjs           # EDIT: add cloud/docker keys to VALID_CONFIG_KEYS

tests/dispatcher/
└── infrastructure-190.test.cjs  # NEW: tests for all INF-01..INF-06 + CLD-06
```

### Pattern 1: Cloud Session ID Detection (INF-01)

**What:** Before calling `process.kill(pid, 0)` in lock.cjs and `_isPidAlive()` in registry.cjs, check if the session ID indicates a cloud session. Cloud sessions have no local PID. The lock entry written for a cloud session should use a sentinel value (`pid: null` or `pid: 0`) that the guard recognises.

**When to use:** Whenever `holder.pid` is read from the lock file.

**Example:**
```javascript
// In lock.cjs — guard before isPidAlive call
function isCloudSessionId(sessionId) {
  // Cloud session IDs will be prefixed by the cloud adapter in Phase 191+
  // For Phase 190, the guard must handle null/zero PID in lock file
  // (cloud sessions write { pid: null, ts: ..., sessionType: 'cloud' })
  return !sessionId; // or check holder.sessionType === 'cloud'
}

function isPidAlive(pid) {
  if (!pid || typeof pid !== 'number') return false; // already handles null/0 correctly
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code !== 'ESRCH';
  }
}
```

**Key insight:** `isPidAlive` in lock.cjs already returns `false` for falsy/non-number PIDs (line 80-81: `if (!pid || typeof pid !== 'number') return false`). The real change needed is to ensure the lock file written for cloud sessions uses `pid: null` (or 0) and that `acquireLock` does NOT treat a null-pid lock as stale. Currently, any lock with a non-alive PID is reclaimed as stale. For cloud sessions, the lock must be reclaimed by the cloud session itself on exit — not by PID liveness.

**Implementation approach for INF-01:** Add a `sessionType` field to the lock file JSON. When `acquireLock` reads an existing lock, if `holder.sessionType === 'cloud'`, skip the `isPidAlive` check and return `{ acquired: false }` — the cloud session owns the lock and will release it normally.

### Pattern 2: RemoteAggregator (INF-02)

**What:** New class in aggregator.cjs with the same `start(ms)` / `stop()` contract as TailCursor, but instead of polling a file it registers an event listener on a shared EventEmitter (the cloud event bus that Phase 191 will populate). The Aggregator.watch() method chooses between TailCursor and RemoteAggregator based on a session metadata flag.

**When to use:** When a session ID belongs to a cloud or docker session.

**Example:**
```javascript
// RemoteAggregator — drop-in replacement for TailCursor for cloud/docker sessions
class RemoteAggregator {
  constructor(filePath, onLine) {
    // filePath is unused for remote sessions — kept for interface parity
    this._onLine = onLine;
    this._handler = null;
    this._bus = RemoteAggregator._sharedBus; // set by cloud adapter in Phase 191
  }
  start(_ms) {
    // No polling — events pushed via _sharedBus.emit('line', sessionId, line)
    // In Phase 190 this is a no-op stub; the bus wiring happens in Phase 191
    this._handler = () => {};
  }
  stop() {
    this._handler = null;
  }
  static _sharedBus = new EventEmitter();
}
```

**Routing in watch():** The cleanest approach is to accept an optional `sessionType` parameter in `watch(sessionId, sessionType)` and select the cursor class based on it. This avoids parsing the session ID string.

### Pattern 3: SessionSource Enum (INF-03)

**What:** The dashboard has two locations that encode session source:
1. `dashboard/lib/wire-schema.ts` — currently no enum at all; session source is stored as a raw string in Redis via the ingest route
2. `dashboard/lib/queries.ts` — has a TypeScript union `'local' | 'remote-ssh' | 'remote-managed'` as the `source` field on `SessionListItem`

Both need `'remote-cloud'` and `'docker'` added. The ingest route (`dashboard/app/api/ingest/route.ts`) stores `evPayload.source ?? 'local'` as a raw string — it does not validate against an enum — so the change is purely additive type widening.

**Example:**
```typescript
// dashboard/lib/wire-schema.ts — add SessionSource enum
export const SessionSourceSchema = z.enum([
  'local',
  'remote-ssh',
  'remote-managed',
  'remote-cloud',
  'docker',
]);
export type SessionSource = z.infer<typeof SessionSourceSchema>;
```

```typescript
// dashboard/lib/queries.ts — extend inline union (or import SessionSource)
export interface SessionListItem {
  // ...
  source: 'local' | 'remote-ssh' | 'remote-managed' | 'remote-cloud' | 'docker';
}

// Update narrowing expression in getSessions() and getSessionMeta():
const source = (['local', 'remote-ssh', 'remote-managed', 'remote-cloud', 'docker'] as const)
  .includes(rawSource as SessionSource)
  ? (rawSource as SessionSource)
  : 'local';
```

### Pattern 4: Config Key Extension (INF-06)

**What:** Add cloud and docker dispatch config keys to `VALID_CONFIG_KEYS` in `bin/lib/config.cjs`. The existing `config-dispatch.test.cjs` uses source inspection (`expect(configSource).toContain("'dispatch.cloud.xxx'")`), so new keys will be covered by new test cases using the same pattern.

**New keys to add:**
```
'dispatch.cloud.enabled'       — enable cloud dispatch backend
'dispatch.cloud.provider'      — cloud provider (e.g. 'anthropic')
'dispatch.cloud.idle_timeout'  — idle timeout in seconds before teardown
'dispatch.docker.enabled'      — enable Docker dispatch backend
'dispatch.docker.image'        — Docker image to use for dispatch
'dispatch.docker.idle_timeout' — idle timeout in seconds before teardown
```

These mirror the shape of the existing `dispatch.remote.*` block. The exact names should be determined by what Phase 191 (Docker Dispatch) will actually need — keep them minimal now (enabled + image/provider) and expand in Phase 191.

### Pattern 5: packages/cloud-adapter/ Scaffold (CLD-06)

**What:** Create a minimal package directory. It must pass `node require` with no npm install at repo root.

**Required files:**
```
packages/cloud-adapter/package.json
packages/cloud-adapter/index.cjs
```

**package.json minimum:**
```json
{
  "name": "@pde/cloud-adapter",
  "version": "0.1.0",
  "description": "PDE cloud dispatch adapter (Phase 190 scaffold)",
  "main": "index.cjs",
  "dependencies": {}
}
```

**index.cjs minimum:**
```javascript
'use strict';
/**
 * cloud-adapter/index.cjs — Cloud dispatch adapter stub
 * Phase 190: scaffold only. Populated in Phase 191 (Cloud Event Bus) and Phase 193.
 */
module.exports = {};
```

**Verification:** `node -e "require('./packages/cloud-adapter')"` from project root must exit 0.

### Anti-Patterns to Avoid

- **Renaming existing session source values:** The existing `'remote-ssh'` and `'remote-managed'` strings are stored as literals in Redis and tested in SS-01 through SS-10. Do not rename them.
- **Adding process.kill guard via session ID string parsing:** Session ID format is internal to each phase's spawn code. Prefer a `sessionType` field in the lock file or aggregator `watch()` call.
- **Creating a shared SessionSource import chain from CJS to TypeScript:** The wire-schema.ts and queries.ts live in the Next.js dashboard (TypeScript), completely separate from the CJS dispatcher package. Do not try to import one from the other.
- **Adding npm install at repo root:** Any `dependencies` in `packages/cloud-adapter/package.json` must remain empty until Phase 191. The success criterion explicitly says "no extra npm packages at root".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic lock file | Custom mutex | Existing `acquireLock`/`releaseLock` in lock.cjs | Already handles O_EXCL, stale detection, EEXIST — extend, don't replace |
| Session source validation | Custom string validator | Zod enum (SessionSourceSchema) | Already using Zod in wire-schema.ts; enum gives exhaustive type checking free |
| Test double for RemoteAggregator | vi.mock() module mocking | Constructor injection pattern (same as `_TailCursor` in Aggregator constructor) | CJS module binding with vi.mock() causes import order issues, confirmed by existing aggregator.test.cjs pattern |

## Common Pitfalls

### Pitfall 1: Stale Lock Reclaim Breaks Cloud Sessions
**What goes wrong:** The current `acquireLock` reclaims any lock whose PID fails `isPidAlive`. If a cloud session writes `pid: 0` (or null), it will be immediately reclaimed as stale by any concurrent local dispatch attempt.
**Why it happens:** `isPidAlive(0)` returns false (guard on line 80 of lock.cjs). The reclaim logic treats any dead/zero PID as stale.
**How to avoid:** Write a `sessionType: 'cloud'` field to the lock file for cloud sessions. In `acquireLock`, skip the PID liveness check when `holder.sessionType === 'cloud'` and return `{ acquired: false }` instead.
**Warning signs:** Lock tests that call `acquireLock` twice without an intervening `releaseLock` and expect the second call to return `{ acquired: false }` will fail if the cloud guard is missing.

### Pitfall 2: Ghost TailCursors for Cloud Session IDs
**What goes wrong:** Aggregator.watch() creates a TailCursor that polls `/tmp/pde-session-{sessionId}.ndjson`. For cloud sessions, that file never exists. The cursor polls forever producing 0 results, but the interval keeps running — 500ms overhead per cloud session indefinitely.
**Why it happens:** aggregator.cjs has no routing logic — it creates TailCursor unconditionally.
**How to avoid:** Route to RemoteAggregator in watch() for cloud/docker session IDs. RemoteAggregator.start() is a no-op in Phase 190 (the actual event bus is wired in Phase 191), so no ghost cursor accumulates.
**Warning signs:** After phase completion, `agg._cursors.size` grows without bound as cloud sessions are registered.

### Pitfall 3: queries.ts Narrowing Expression Excludes New Values
**What goes wrong:** The existing narrowing in `getSessions()` and `getSessionMeta()` is:
```typescript
const source = (rawSource === 'remote-ssh' || rawSource === 'remote-managed')
  ? (rawSource as 'remote-ssh' | 'remote-managed')
  : 'local';
```
After adding 'remote-cloud' and 'docker', a session with `session_source: 'remote-cloud'` in Redis will be returned as `'local'` — the narrowing silently drops the new values.
**Why it happens:** The narrowing uses exhaustive equality checks, not an allowlist includes().
**How to avoid:** Replace both narrowing expressions with an allowlist includes() check against the full union.
**Warning signs:** SS-04 style tests pass but cloud sessions always appear as source='local' in the dashboard.

### Pitfall 4: vitest.config.ts include Pattern Excludes New Test File
**What goes wrong:** The root `vitest.config.ts` includes `tests/**/*.{test,spec}.{cjs,mjs,js,ts}`. New test files in `tests/dispatcher/` matching that pattern will be included automatically. However, if a new dashboard test is added, it requires running vitest from the `dashboard/` directory.
**Why it happens:** Two separate vitest configs exist: root config for CJS tests, `dashboard/vitest.config.ts` for Next.js tests.
**How to avoid:** Dispatcher/config tests go in `tests/dispatcher/` and run from root. Dashboard type tests (wire-schema, queries) run from `dashboard/` directory.
**Warning signs:** Tests pass locally but CI reports missing coverage.

## Code Examples

### lock.cjs — Cloud Session Guard

```javascript
// Source: packages/dispatcher/lib/lock.cjs (Phase 190 extension)
function acquireLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.planning', 'dispatcher.lock');
  try {
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
    fs.closeSync(fd);
    return { acquired: true, lockPath };
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;

    let holder;
    try {
      holder = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    } catch (_) {
      try { fs.unlinkSync(lockPath); } catch (_2) {}
      return acquireLock(projectRoot);
    }

    // INF-01: Cloud sessions have no local PID — never reclaim as stale
    if (holder.sessionType === 'cloud' || holder.sessionType === 'docker') {
      return { acquired: false };
    }

    const isAlive = isPidAlive(holder.pid);
    if (isAlive) return { acquired: false };

    try { fs.unlinkSync(lockPath); } catch (_) {}
    return acquireLock(projectRoot);
  }
}
```

### aggregator.cjs — RemoteAggregator Routing

```javascript
// Source: packages/dispatcher/lib/aggregator.cjs (Phase 190 extension)
const { EventEmitter } = require('node:events');

// INF-02: Stub RemoteAggregator — no TailCursor, no ghost file polling
class RemoteAggregator {
  constructor(_filePath, onLine) {
    this._onLine = onLine; // kept for interface parity; wired in Phase 191
  }
  start(_ms) { /* no-op in Phase 190 — bus wired in Phase 191 */ }
  stop() {}
}

class Aggregator extends EventEmitter {
  constructor(TailCursorClass, RemoteAggregatorClass) {
    super();
    this._TailCursor = TailCursorClass || TailCursor;
    this._RemoteAggregator = RemoteAggregatorClass || RemoteAggregator;
    this._cursors = new Map();
  }

  watch(sessionId, sessionType) {
    if (this._cursors.has(sessionId)) return;
    const filePath = path.join(os.tmpdir(), `pde-session-${sessionId}.ndjson`);
    const isRemote = sessionType === 'cloud' || sessionType === 'docker';
    const CursorClass = isRemote ? this._RemoteAggregator : this._TailCursor;
    const cursor = new CursorClass(filePath, (line) => {
      try {
        const parsed = JSON.parse(line);
        this.emit('event', sessionId, parsed);
      } catch (_) {}
    });
    cursor.start(500);
    this._cursors.set(sessionId, cursor);
  }
  // ... rest unchanged
}
```

### wire-schema.ts — SessionSource Schema

```typescript
// Source: dashboard/lib/wire-schema.ts (Phase 190 extension)
import { z } from 'zod';

export const SESSION_SOURCES = [
  'local',
  'remote-ssh',
  'remote-managed',
  'remote-cloud',  // INF-03: cloud VM dispatch
  'docker',        // INF-03: local Docker container dispatch
] as const;

export const SessionSourceSchema = z.enum(SESSION_SOURCES);
export type SessionSource = z.infer<typeof SessionSourceSchema>;

export const WireEnvelopeSchema = z.object({
  // ... existing fields unchanged
}).passthrough();

export type WireEnvelope = z.infer<typeof WireEnvelopeSchema>;
```

### config.cjs — New Config Keys

```javascript
// Source: bin/lib/config.cjs (Phase 190 extension — add to VALID_CONFIG_KEYS Set)
'dispatch.cloud.enabled',        // INF-06: enable cloud dispatch backend
'dispatch.cloud.provider',       // INF-06: cloud provider identifier
'dispatch.cloud.idle_timeout',   // INF-06: idle timeout seconds before container teardown
'dispatch.docker.enabled',       // INF-06: enable Docker dispatch backend
'dispatch.docker.image',         // INF-06: Docker image for dispatch containers
'dispatch.docker.idle_timeout',  // INF-06: idle timeout seconds before container teardown
```

## Runtime State Inventory

> No rename/refactor involved in this phase. New values are additive. No existing stored data uses 'remote-cloud' or 'docker' as session source strings in production Redis — they have never been emitted.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Redis `session_source` field uses 'local', 'remote-ssh', 'remote-managed' string values | None — adding new values is additive; existing records unaffected |
| Live service config | n8n: none. Vercel dashboard deployment: no config change | None |
| OS-registered state | None | None |
| Secrets/env vars | None | None |
| Build artifacts | None — CJS, no compiled output | None |

## Environment Availability

> This phase is purely source/file edits. No external services or CLI tools required beyond what is already running.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | lock.cjs, aggregator.cjs edits | Yes | built-in | — |
| vitest | test execution | Yes | ^4.1.1 | — |
| TypeScript | dashboard type check | Yes (via Next.js dashboard) | dashboard tsconfig | — |

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (root) / dashboard/vitest.config.ts (dashboard tests) |
| Quick run command | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INF-01 | lock.cjs: cloud session lock (sessionType='cloud') not reclaimed as stale | unit | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-01 | lock.cjs: existing local PID stale reclaim still works | unit | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-02 | aggregator.cjs: watch(sid, 'cloud') creates RemoteAggregator not TailCursor | unit | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-02 | aggregator.cjs: watch(sid) (no type) still creates TailCursor (backward compat) | unit | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-03 | wire-schema.ts: SessionSourceSchema accepts 'remote-cloud' and 'docker' | source inspection | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-03 | queries.ts: SessionListItem.source union includes 'remote-cloud' and 'docker' | source inspection | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-06 | config.cjs: VALID_CONFIG_KEYS contains dispatch.cloud.enabled | source inspection | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| INF-06 | config.cjs: VALID_CONFIG_KEYS contains dispatch.docker.enabled | source inspection | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| CLD-06 | packages/cloud-adapter/ exists with package.json | filesystem check | `npx vitest run tests/dispatcher/infrastructure-190.test.cjs` | No — Wave 0 |
| CLD-06 | packages/cloud-adapter/ require() succeeds (no extra npm at root) | node require | `node -e "require('./packages/cloud-adapter')"` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dispatcher/infrastructure-190.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dispatcher/infrastructure-190.test.cjs` — covers INF-01, INF-02, INF-03, INF-06, CLD-06 using source inspection + behavioral patterns established in existing tests

## Sources

### Primary (HIGH confidence)
- Direct source read: `packages/dispatcher/lib/lock.cjs` — exact isPidAlive call site at line 80-88
- Direct source read: `packages/dispatcher/lib/aggregator.cjs` — constructor injection pattern lines 36-38
- Direct source read: `dashboard/lib/wire-schema.ts` — no SessionSource enum exists, confirmed
- Direct source read: `dashboard/lib/queries.ts` — inline union `'local' | 'remote-ssh' | 'remote-managed'` at lines 15 and 56
- Direct source read: `bin/lib/config.cjs` — VALID_CONFIG_KEYS set at lines 14-43; pattern for source inspection tests confirmed
- Direct source read: `tests/dispatcher/aggregator.test.cjs` — constructor injection test pattern
- Direct source read: `tests/dispatcher/config-dispatch.test.cjs` — source inspection test pattern

### Secondary (MEDIUM confidence)
- Direct source read: `packages/dispatcher/lib/registry.cjs` — `_isPidAlive` duplicate at lines 177-185 (same guard needed there for consistency, though not a Phase 190 success criterion)
- Direct source read: `dashboard/app/api/ingest/route.ts` — stores `evPayload.source ?? 'local'` as raw string; no enum validation, so new source values pass through without schema change to ingest

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in use with known versions
- Architecture: HIGH — all patterns derived from reading actual source files
- Pitfalls: HIGH — identified by direct reading of the exact code paths being modified

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable internal codebase; no external dependency changes)
