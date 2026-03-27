# Phase 154: SSH Source Propagation - Research

**Researched:** 2026-03-27
**Domain:** Event pipeline metadata propagation / NDJSON source attribution
**Confidence:** HIGH

## Summary

Phase 154 is a correctness polish phase. The infrastructure for SSH dispatch (Phase 146) and remote relay (Phase 147/152) is fully operational. The gap is a missing source field propagation: SSH-dispatched sessions emit session_start events without a source field, so the ingest route defaults to 'local' instead of 'remote-ssh'.

The fix is a two-point injection: (1) remote-ssh.cjs must set PDE_BACKEND=remote-ssh in the remote env prefix so the executor Claude process inherits it; (2) emit-event.cjs must read process.env.PDE_BACKEND as a fallback when hookData.source is absent, and inject it into the session_start event payload. The ingest route already reads event.source correctly and stores session_source in Redis -- that code path is verified GREEN by tests SS-01 through SS-10 which all pass.

No new libraries are needed. No schema changes are needed. The WireEnvelopeSchema uses .passthrough() so arbitrary additional fields (including source) already flow through validation transparently.

**Primary recommendation:** Set PDE_BACKEND=remote-ssh in remote-ssh.cjs envPrefix, read it in emit-event.cjs as fallback for source on SessionStart events, then write a test verifying the env var is present in the remote command string.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins | v20 | env var propagation, string building | Zero-dep constraint (project rule) |
| zod | ^4.3.6 | WireEnvelope validation (already present) | Already in wire-schema.ts; .passthrough() passes source unchanged |
| vitest | ^4.1.1 | Test framework (root + dashboard) | Already installed; all existing tests use it |

### Supporting

No new dependencies. All changes are in existing CJS modules and TypeScript route handlers.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Env var (PDE_BACKEND) | Synthetic event injected by coordinator before session | Env var approach is consistent with PDE_SESSION_ID, PDE_PHASE, PDE_PLAN pattern already in spawn.cjs and remote-ssh.cjs; synthetic injection would require coordinator to post a fake event |
| Env var in remote envPrefix | Custom field in NDJSON file header | Header approach has no precedent in this codebase; env var is the established pattern |

**Installation:** None -- no new packages required.

## Architecture Patterns

### Current Data Flow (with gap annotated)

```
SSH session dispatch:
  coordinator._runRemoteSession()
    -> remote-ssh.spawnRemoteSession()
        envPrefix = 'CLAUDECODE= PDE_SESSION_ID=... PDE_PHASE=... PDE_PLAN=...'
        <- PDE_BACKEND is ABSENT <- THE GAP
        -> claude --print on remote host
            -> hooks/emit-event.cjs SessionStart fires
                payload.source = hookData.source  <- hookData.source is undefined
                <- source is ABSENT from event payload
            -> event-bus.cjs writes event to pde-session-{UUID}.ndjson
            -> start-relay.cjs spawns relay.cjs on remote
                -> relay.cjs createEnvelope(...pdeEvent)  <- source absent, passes through
                -> POST /api/ingest with batch
                    -> route.ts reads event.source ?? 'local'  <- defaults to 'local' WRONG

Fixed data flow (after this phase):
  remote-ssh.spawnRemoteSession()
    envPrefix = 'CLAUDECODE= PDE_SESSION_ID=... PDE_PHASE=... PDE_PLAN=... PDE_BACKEND=remote-ssh'
                                                                                  ^ NEW
    -> hooks/emit-event.cjs SessionStart fires
        const source = hookData.source || process.env.PDE_BACKEND  <- NEW FALLBACK
        payload.source = 'remote-ssh'
    -> relay wraps event, POST /api/ingest
        -> route.ts reads event.source ?? 'local'  -> 'remote-ssh' CORRECT
        -> Redis stores session_source = 'remote-ssh'
```

### Pattern 1: Env Var Propagation for Session Context

**What:** Metadata about a session's execution context (phase, plan, backend) is injected as env vars before the Claude subprocess starts. The subprocess hooks read these vars to annotate events.

**When to use:** Any time the orchestrator knows something about the session that the executor hooks need to emit correctly.

**Example -- existing pattern in spawn.cjs:**
```javascript
// packages/dispatcher/lib/spawn.cjs:43-51
const env = { ...process.env };
delete env.CLAUDECODE;
env.PDE_SESSION_ID = opts.relayId || sessionId;
env.PDE_PHASE = String(phase);
env.PDE_PLAN = String(plan);
env.PDE_SESSION_START = String(Date.now());
```

**Example -- remote-ssh.cjs envPrefix (current, broken):**
```javascript
// packages/dispatcher/lib/remote-ssh.cjs:103-108
const envPrefix =
  'CLAUDECODE= ' +
  'PDE_SESSION_ID=' + opts.sessionId + ' ' +
  'PDE_PHASE=' + opts.phase + ' ' +
  'PDE_PLAN=' + opts.plan +
  (extraEnv ? ' ' + extraEnv : '');
```

**Fix -- add PDE_BACKEND to envPrefix:**
```javascript
const envPrefix =
  'CLAUDECODE= ' +
  'PDE_SESSION_ID=' + opts.sessionId + ' ' +
  'PDE_PHASE=' + opts.phase + ' ' +
  'PDE_PLAN=' + opts.plan + ' ' +
  'PDE_BACKEND=remote-ssh' +
  (extraEnv ? ' ' + extraEnv : '');
```

### Pattern 2: Hook Payload Fallback to Env Var

**What:** emit-event.cjs already reads hookData.source for the source field. Add env var fallback so that even when Claude Code does not set source in the hook payload, the PDE-injected PDE_BACKEND env var is used.

**When to use:** When a hook field may or may not be set by the host application, but the executor has a known value in its environment.

**Example -- current emit-event.cjs (line 95):**
```javascript
// hooks/emit-event.cjs:93-96
if (hookName === 'SessionStart') {
  if (hookData.model)  payload.model  = hookData.model;
  if (hookData.source) payload.source = hookData.source;
}
```

**Fix -- add PDE_BACKEND fallback:**
```javascript
if (hookName === 'SessionStart') {
  if (hookData.model)  payload.model  = hookData.model;
  const source = hookData.source || process.env.PDE_BACKEND;
  if (source) payload.source = source;
}
```

### Pattern 3: Wire Envelope Passthrough (Already Correct)

**What:** WireEnvelopeSchema uses .passthrough() so any field on the PDE event (including source) flows through to the wire envelope and reaches the ingest route unchanged. Verified at relay-protocol.cjs line 70. No change needed.

### Pattern 4: Ingest Route Source Storage (Already Correct)

**What:** /api/ingest/route.ts lines 82-91 scan the batch for event_type === 'session_start' and store event.source ?? 'local' as session_source in Redis. Tests SS-01 through SS-10 all pass GREEN. No change needed.

### Anti-Patterns to Avoid

- **Injecting source in the wire envelope at relay time:** The relay daemon runs on the remote machine and has no guaranteed knowledge of the dispatch backend. The env var is set by the dispatcher and propagated to the remote via the SSH command string.
- **Hardcoding 'remote-ssh' in emit-event.cjs without the env var check:** Breaks local sessions. The `if (source)` guard prevents empty-string assignment, but the logic must branch on the env var, not a hardcoded string.
- **Modifying WireEnvelopeSchema:** The schema uses .passthrough() specifically to avoid needing schema changes for additional fields. Do not add source as a required field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Source validation at ingest | Custom type-guard for 'local' or 'remote-ssh' or 'remote-managed' | Existing queries.ts whitelist pattern (lines 56-58) | Already implemented; unknown values fall through to 'local' default |
| Env var forwarding to remote | Custom SSH channel metadata | Shell-level env var prefix string | Established project pattern; SSH exec command accepts KEY=VALUE cmd prefix |
| Schema changes for source field | Adding source to WireEnvelopeSchema | .passthrough() already handles it | Adding as required would break existing envelopes without the field |

**Key insight:** In a zero-dep NDJSON pipeline, env vars are the correct mechanism for injecting session-origin metadata. The hook reads the env var, the event carries the value, the wire envelope passes it through, and the ingest route stores it. Each layer only needs one small change.

## Common Pitfalls

### Pitfall 1: envPrefix Quoting in SSH Exec Command

**What goes wrong:** The envPrefix string is embedded in a shell command string sent over SSH. If PDE_BACKEND=remote-ssh contains characters interpreted by the remote shell, the command fails.

**Why it happens:** remote-ssh.cjs builds a full shell command string (not an array) and sends it via ssh.connection.exec(). The value 'remote-ssh' contains only alphanumeric characters and a hyphen -- safe in shell variable values.

**How to avoid:** 'remote-ssh' is safe. No quoting needed.

**Warning signs:** SSH channel close code non-zero with stderr "command not found" or "unexpected token".

### Pitfall 2: emit-event.cjs Runs in ALL Sessions

**What goes wrong:** If the PDE_BACKEND fallback is added without the `if (source)` guard, local sessions (where PDE_BACKEND is absent) would evaluate `undefined || undefined` which is falsy -- safe. But if written carelessly as `payload.source = hookData.source || process.env.PDE_BACKEND` without the guard, `undefined` would be assigned to payload.source, polluting the payload.

**How to avoid:** Always use the two-step pattern: `const source = hookData.source || process.env.PDE_BACKEND; if (source) payload.source = source;`

**Warning signs:** Local sessions showing source='remote-ssh' in the dashboard -- run SS-01 and SS-03 tests.

### Pitfall 3: Two Separate relay.cjs Instances

**What goes wrong:** Local sessions use a relay.cjs spawned by the coordinator (_spawnRelay). Remote SSH sessions do NOT use the coordinator's relay -- the remote machine runs start-relay.cjs via hooks.json SessionStart hook, which spawns its own relay.cjs. If someone only fixes the local relay path, the remote relay still won't have the source field.

**Why it matters:** The fix to emit-event.cjs on the remote machine is the critical one. The remote-ssh.cjs envPrefix change is what makes PDE_BACKEND available to the remote emit-event.cjs process.

**How to avoid:** Understand the two relay architectures: coordinator relay (local sessions, Phase 152) vs. hooks/start-relay.cjs (SSH sessions). The emit-event.cjs fix covers both because both use the same hook file.

**Warning signs:** SS-02 test passes but no real SSH session ever shows source='remote-ssh'.

### Pitfall 4: extraEnv Override of PDE_BACKEND

**What goes wrong:** remote-ssh.cjs supports opts.remoteConfig.env as user-configurable extra env vars. If PDE_BACKEND is added before extraEnv, a user could override it via config. If added after, it cannot be overridden.

**How to avoid:** Add PDE_BACKEND=remote-ssh before (extraEnv ? ' ' + extraEnv : '') expansion. This allows user override if needed, matching the established pattern where PDE_* vars appear before user env vars.

## Code Examples

### Verified -- ingest route source storage (already correct)
```typescript
// dashboard/app/api/ingest/route.ts:82-91
for (const event of validatedBatch) {
  if (event.event_type === 'session_start') {
    const evPayload = event as Record<string, unknown>;
    const sessionSource = String(evPayload.source ?? 'local');
    p.hset(`pde:default:session:${sessionId}`, {
      session_source: sessionSource,
    });
    break;
  }
}
```

### Verified -- queries.ts source field mapping (already correct)
```typescript
// dashboard/lib/queries.ts:55-58
const rawSource = raw.session_source ?? 'local';
const source = (rawSource === 'remote-ssh' || rawSource === 'remote-managed')
  ? (rawSource as 'remote-ssh' | 'remote-managed')
  : 'local';
```

### Target change 1 -- remote-ssh.cjs envPrefix
```javascript
// packages/dispatcher/lib/remote-ssh.cjs (line ~103)
const envPrefix =
  'CLAUDECODE= ' +
  'PDE_SESSION_ID=' + opts.sessionId + ' ' +
  'PDE_PHASE=' + opts.phase + ' ' +
  'PDE_PLAN=' + opts.plan + ' ' +
  'PDE_BACKEND=remote-ssh' +
  (extraEnv ? ' ' + extraEnv : '');
```

### Target change 2 -- emit-event.cjs source fallback
```javascript
// hooks/emit-event.cjs (lines 93-96)
if (hookName === 'SessionStart') {
  if (hookData.model)  payload.model  = hookData.model;
  const source = hookData.source || process.env.PDE_BACKEND;
  if (source) payload.source = source;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| source always 'local' (pre-Phase 146) | source read from event payload with 'local' fallback | Phase 147 added session_source storage | Route code correct; emission code incomplete |
| No relay for local sessions | relay.cjs spawned per-session via coordinator (RLY-01) | Phase 152 | Local sessions relay correctly; SSH sessions use remote relay |

**Deprecated/outdated:** None. This is purely additive.

## Open Questions

1. **Does Claude Code's SessionStart hook payload include a source field natively?**
   - What we know: emit-event.cjs reads hookData.source if truthy. Claude Code documentation does not indicate source is set in the SessionStart payload automatically.
   - What's unclear: Whether future Claude Code versions might set source automatically for remote invocations.
   - Recommendation: The PDE_BACKEND env var fallback is additive and safe regardless. If Claude Code eventually sets hookData.source, it takes priority via `hookData.source || process.env.PDE_BACKEND`.

2. **Should spawn.cjs also set PDE_BACKEND=local for local sessions?**
   - What we know: Local sessions default to 'local' in the ingest route (source ?? 'local'), so no env var is needed.
   - Recommendation: Do NOT add PDE_BACKEND=local to spawn.cjs in this phase -- the default covers it. Defer to a future phase if remote-managed support is added.

## Environment Availability

Step 2.6: SKIPPED -- Phase 154 is purely code changes to existing CJS and TypeScript files. No external tools, databases, or services beyond the already-deployed Redis and Next.js dashboard are required.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest v4.1.1 |
| Config file (root) | vitest.config.ts (includes tests/**/*.{test,spec}.{cjs,mjs,js,ts}) |
| Config file (dashboard) | dashboard/vitest.config.ts |
| Quick run (root) | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs` |
| Quick run (dashboard) | `cd dashboard && npx vitest run __tests__/session-source.test.ts` |
| Full suite | `npx vitest run && cd dashboard && npx vitest run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SSH-01 | SSH sessions show source='remote-ssh' in dashboard | integration | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02, SS-05, SS-07 pass) |
| SSH-02 | Ingest route stores remote-ssh source from relay event | unit | `cd dashboard && npx vitest run __tests__/session-source.test.ts` | YES (SS-02 passes) |
| SSH-03 | remote-ssh.cjs sets PDE_BACKEND=remote-ssh in envPrefix | unit | `npx vitest run tests/dispatcher/coordinator-remote.test.cjs` | NO -- Wave 0 gap |
| SSH-04 | emit-event.cjs reads PDE_BACKEND as source fallback | unit | New test file needed | NO -- Wave 0 gap |

### Sampling Rate

- **Per task commit:** `cd dashboard && npx vitest run __tests__/session-source.test.ts`
- **Per wave merge:** `npx vitest run tests/dispatcher/ && cd dashboard && npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] New test in `tests/dispatcher/coordinator-remote.test.cjs` verifying PDE_BACKEND=remote-ssh appears in opts captured by spawnRemoteSession stub -- covers SSH-03
- [ ] New test verifying emit-event.cjs reads PDE_BACKEND as source fallback when hookData.source is absent -- covers SSH-04

Note: The dashboard tests (SS-01 through SS-10) already cover the ingest and queries layers completely. Only the emission layer (remote-ssh.cjs + emit-event.cjs) needs new tests.

## Sources

### Primary (HIGH confidence)

- Direct code reading of packages/dispatcher/lib/remote-ssh.cjs -- envPrefix construction confirmed, PDE_BACKEND absent confirmed
- Direct code reading of hooks/emit-event.cjs -- source field handling confirmed (line 95)
- Direct code reading of dashboard/app/api/ingest/route.ts -- source storage logic confirmed (lines 82-91)
- Direct code reading of dashboard/lib/queries.ts -- source field mapping confirmed (lines 55-58)
- Direct code reading of dashboard/lib/wire-schema.ts -- .passthrough() confirmed
- Test run: `cd dashboard && npx vitest run __tests__/session-source.test.ts` -- 10/10 tests PASS
- Test run: `npx vitest run tests/dispatcher/` -- 229/229 tests PASS

### Secondary (MEDIUM confidence)

- Web search: NDJSON event pipeline metadata propagation patterns -- confirms env var injection is the standard approach for origin metadata in distributed event pipelines

### Tertiary (LOW confidence)

- None -- all critical claims verified by direct code reading.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies; existing infrastructure verified
- Architecture: HIGH -- gap identified by direct code tracing; fix pattern verified against existing project conventions
- Pitfalls: HIGH -- all pitfalls derived from direct code reading, not speculation

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase; no fast-moving external dependencies)
