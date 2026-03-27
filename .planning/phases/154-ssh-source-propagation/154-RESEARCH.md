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

---

## Verification Deep-Dive

**Verified:** 2026-03-27
**Method:** Line-by-line code reading of every file in the data flow

This section verifies each claim from the prior research by tracing actual code. Several claims are CONFIRMED, one claim has an important PARTIAL CORRECTION, and two previously undocumented issues are newly identified.

---

### Claim 1: remote-ssh.cjs envPrefix lacks PDE_BACKEND

**Verdict: CONFIRMED**

Evidence: `packages/dispatcher/lib/remote-ssh.cjs` lines 103-108:
```javascript
const envPrefix =
  'CLAUDECODE= ' +
  'PDE_SESSION_ID=' + opts.sessionId + ' ' +
  'PDE_PHASE=' + opts.phase + ' ' +
  'PDE_PLAN=' + opts.plan +
  (extraEnv ? ' ' + extraEnv : '');
```

`PDE_BACKEND` is absent. The env prefix only sets CLAUDECODE (empty), PDE_SESSION_ID, PDE_PHASE, PDE_PLAN, and optional user-supplied extraEnv. No source attribution reaches the remote process.

**Also verified:** `extraEnv` comes from `Object.entries(opts.remoteConfig.env || {}).map(([k, v]) => k + '=' + v).join(' ')` (lines 95-97). The `remoteConfig` shape is `{ host, username, identity_file, repo_path, plugin_dir, env }` per the JSDoc. The `env` field is user-configurable extra vars -- no built-in PDE_BACKEND is injected there today.

---

### Claim 2: emit-event.cjs is the correct place to add the fallback

**Verdict: CONFIRMED WITH IMPORTANT NUANCE**

Evidence: `hooks/emit-event.cjs` lines 93-96:
```javascript
if (hookName === 'SessionStart') {
  if (hookData.model)  payload.model  = hookData.model;
  if (hookData.source) payload.source = hookData.source;
}
```

This is where `source` enters the payload. Confirmed correct fix location.

**Critical nuance -- emit-event.cjs does NOT write the event directly.** The actual write path is:

1. `emit-event.cjs` calls `spawnSync(process.execPath, [pdeTools, 'event-emit', eventType, JSON.stringify(payload)])` (line 113)
2. `pde-tools.cjs` `case 'event-emit'` receives the payload as `args[2]`, parses it with `JSON.parse(args[2])` (line 837), then merges it into an envelope (lines 850-856):

```javascript
const envelope = {
  schema_version: '1.0',
  ts: new Date().toISOString(),
  event_type: eventType,
  session_id: sessionId,
  ...payload,       // <-- source field from emit-event.cjs payload arrives here
  extensions: payload.extensions || {},
};
safeAppendEvent(sessionId, envelope);
```

The `source` field survives the JSON serialization round-trip through `spawnSync` args intact, provided `emit-event.cjs` sets it in `payload` before calling `spawnSync`. The research fix is at the right layer.

**Additional finding:** `pde-tools.cjs` also sets `session_id` from `config.json` (line 844-847), not from the payload. For SSH sessions this is the PDE_SESSION_ID written by the `session-start` subcommand at line 809: `const newSessionId = process.env.PDE_SESSION_ID || randomUUID();`. Since PDE_SESSION_ID is set in the envPrefix (line 105 of remote-ssh.cjs), the session_id in the NDJSON file will be `opts.sessionId` (the coordinator's session ID string like `p146-1-abc12345`), NOT a UUID.

**WARNING -- Session ID format mismatch (newly identified, see Finding 1).**

---

### Claim 3: Dashboard layer is already complete (ingest + queries)

**Verdict: CONFIRMED**

Evidence:
- `dashboard/app/api/ingest/route.ts` lines 82-91: scans batch for `session_start`, stores `String(evPayload.source ?? 'local')` as `session_source`. Correct.
- `dashboard/lib/queries.ts` lines 55-58: reads `session_source` from Redis hash, whitelists `remote-ssh` and `remote-managed`, defaults to `local`. Correct.
- `dashboard/lib/wire-schema.ts` line 13: `.passthrough()` on `WireEnvelopeSchema`. Confirmed.
- `dashboard/__tests__/session-source.test.ts` SS-01 through SS-10: tests cover all ingest and queries paths. The tests mock Redis correctly and verify the full source storage and retrieval pipeline.

No changes needed in the dashboard layer. Claim is accurate.

---

### Claim 4: WireEnvelopeSchema uses .passthrough() so no schema changes needed

**Verdict: CONFIRMED**

Evidence: `dashboard/lib/wire-schema.ts` line 13: `}).passthrough();`. Also confirmed in `bin/lib/relay-protocol.cjs` line 70: `}).passthrough();`. Both the CJS relay-side schema and the TypeScript dashboard-side schema use passthrough.

`createEnvelope` in `relay-protocol.cjs` lines 93-101 uses `...pdeEvent` spread after the explicit fields, so any `source` field present in the PDE event is preserved in the envelope. The `approval_id` is handled explicitly before the spread (line 99) but `source` is not -- it passes through cleanly.

**One subtle point:** the spread order `{ seq, session_id, machine_id, relay_ts, approval_id, ...pdeEvent }` means if `pdeEvent` contained a `seq`, `session_id`, `machine_id`, or `relay_ts` field, they would be overwritten by the pdeEvent values since the spread comes AFTER. But `source` is not one of those fields, so there is no collision risk. No schema change needed. Claim is accurate.

---

### Claim 5: Both relay architectures run through the same emit-event.cjs

**Verdict: CONFIRMED**

Evidence:
- `hooks/hooks.json` lines 47-71: `SessionStart` hook array includes `emit-event.cjs` (async: false, runs first) and then `start-relay.cjs` (async: true). Both local and SSH sessions run the same hooks file.
- `coordinator.cjs` line 247: `if (backend !== 'ssh') { const relayHandle = this._spawnRelay(relayId); ... }` -- SSH sessions skip the coordinator-side relay. Instead, `start-relay.cjs` on the remote machine spawns `relay.cjs` when `PDE_REMOTE` is set in the remote process environment.
- `hooks/start-relay.cjs` line 31: `if (!process.env.PDE_REMOTE) { process.exit(0); }` -- the remote relay only activates when PDE_REMOTE is present. For SSH sessions, PDE_REMOTE must come from the SSH envPrefix (via `extraEnv` from `remoteConfig.env`) -- see Finding 2.

Both relay paths read the same NDJSON file written by `pde-tools.cjs event-emit`. Claim is correct that `emit-event.cjs` is the correct single fix point.

---

### NEW FINDING 1: Session ID Format Mismatch for SSH Sessions

**Severity: HIGH -- may cause relay to fail silently for SSH sessions**

**Evidence:**

`remote-ssh.cjs` line 105 sets `PDE_SESSION_ID=p146-1-abc12345` (a non-UUID string like `p${phase}-${plan}-${hex8}`).

`pde-tools.cjs` `case 'session-start'` line 809: `const newSessionId = process.env.PDE_SESSION_ID || randomUUID();`

So the session ID written to `config.json` for SSH sessions is a short non-UUID string (e.g. `p146-1-abc12345`), NOT a UUID.

`bin/lib/relay-protocol.cjs` line 62: `session_id: z.string().uuid()` -- the WireEnvelopeSchema (relay-side CJS) requires a valid UUID v4 for `session_id`.

`dashboard/lib/wire-schema.ts` line 5: `session_id: z.string().uuid()` -- the dashboard-side schema also requires UUID.

**The consequence:** If the session_id in the NDJSON event is `p146-1-abc12345`, then `WireEnvelopeSchema.safeParse(envelope)` at `relay.cjs` line 471 will FAIL, and the event will be silently dropped: `if (!result.success) return;`. The relay will drop ALL events for SSH sessions with non-UUID session IDs.

**However -- there is a mitigating mechanism:** The remote `start-relay.cjs` uses the session ID from `config.json` (lines 43-45) for naming the NDJSON file path and for `relay.cjs argv[2]`. But `createEnvelope(sessionId, pdeEvent)` in relay.cjs uses the sessionId from `argv[2]`, which is the value from `config.json`. If that is `p146-1-abc12345`, then `session_id` in the envelope will be a non-UUID, and schema validation will fail.

**Comparison with local sessions:** `coordinator.cjs` line 220 generates `const relayId = crypto.randomUUID()` and passes it as `opts.relayId` to `spawnSession()`. `spawn.cjs` line 47: `env.PDE_SESSION_ID = opts.relayId || sessionId`. So LOCAL sessions have `PDE_SESSION_ID` set to a proper UUID (the `relayId`), and the relay works correctly.

**For SSH sessions:** `remote-ssh.cjs` line 105 sets `PDE_SESSION_ID=opts.sessionId` which is `p146-1-abc12345`. There is no relay UUID pre-assigned for SSH sessions. There is no `relayId` concept in `_runRemoteSession`.

**This is likely why the prior research says SSH session relay is "operational" but source never shows up: the relay may be dropping all events due to UUID validation failure.**

**Resolution required in Phase 154:** `_runRemoteSession` must generate a `relayId = crypto.randomUUID()` and pass it as `PDE_SESSION_ID` in the remote envPrefix (just as `_runSession` does for local sessions via `spawn.cjs`). The coordinator must also call `this._aggregator.watch(relayId)` for SSH sessions (currently it only does this for non-SSH sessions implicitly through the relay spawn path). Check coordinator.cjs line 243: `this._aggregator.watch(relayId)` is called BEFORE the backend check -- but `relayId` for SSH sessions is the local `relayId` generated at line 220. The remote machine does not know this UUID. The remote `start-relay.cjs` spawns relay.cjs with the session_id from `config.json` (which will be whatever PDE_SESSION_ID is set to in the SSH command).

**Revised fix for remote-ssh.cjs:** The caller (`_runRemoteSession`) must pass a UUID as `opts.relayId`, and `remote-ssh.cjs` must use `opts.relayId || opts.sessionId` for the `PDE_SESSION_ID` env var -- matching the spawn.cjs pattern exactly.

**Alternatively:** Check whether the coordinator already passes a relayId to `_runRemoteSession` -- it currently does NOT (lines 353-371 show `_runRemoteSession` called with `sessionId, phase, plan, worktreePath, branch` -- no relayId). This must be added.

---

### NEW FINDING 2: PDE_REMOTE Is Not Set in the SSH Remote Environment

**Severity: HIGH -- start-relay.cjs silently exits without spawning relay for SSH sessions**

**Evidence:**

`hooks/start-relay.cjs` line 31: `if (!process.env.PDE_REMOTE) { process.exit(0); }` -- the relay only starts if `PDE_REMOTE` is set.

`remote-ssh.cjs` envPrefix (lines 103-108): `CLAUDECODE= PDE_SESSION_ID=... PDE_PHASE=... PDE_PLAN= [extraEnv]` -- `PDE_REMOTE` is NOT in the envPrefix.

`PDE_REMOTE` can only reach the remote process via `opts.remoteConfig.env` (user-configured extra env vars from `dispatch.remote.env` in config.json). There is no built-in injection of `PDE_REMOTE` into the SSH command.

**The consequence:** Unless the user manually adds `PDE_REMOTE=https://dashboard.example.com/api/ingest` to their `dispatch.remote.env` config block, `start-relay.cjs` will silently exit without spawning a relay on the remote machine. No events from SSH sessions will reach the dashboard at all.

**This finding is independent of the source attribution bug.** Even after fixing `PDE_BACKEND` and `source`, SSH sessions will produce no relay traffic unless `PDE_REMOTE` is in the environment.

**Whether this is a pre-existing bug or Phase 154's scope:** Looking at the phase description -- "SSH-dispatched sessions display correct `source='remote-ssh'` in dashboard" -- the bug description implies events ARE reaching the dashboard but with wrong source. If `PDE_REMOTE` is absent, no events reach the dashboard at all. Either: (a) users are expected to set `PDE_REMOTE` in `remoteConfig.env` manually (documented elsewhere), or (b) this is a second bug that prevents relay from ever running.

**Required investigation:** Check whether Phase 146 (Remote Dispatch) included documentation or configuration requirements for `PDE_REMOTE` in `remoteConfig.env`. If it did, the relay can work for properly-configured users. If it did not, Phase 154 may need to also inject `PDE_REMOTE` (and `PDE_RELAY_TOKEN`) into the SSH envPrefix.

**The fix if needed:** Add to remote-ssh.cjs envPrefix (reading from `opts.remoteConfig` or a new `opts.ingestUrl` / `opts.relayToken` field):
```javascript
const ingestUrl = opts.remoteConfig.ingest_url || process.env.PDE_REMOTE || '';
const relayToken = opts.remoteConfig.relay_token || process.env.PDE_RELAY_TOKEN || '';
// Add to envPrefix:
(ingestUrl ? ' PDE_REMOTE=' + ingestUrl : '') +
(relayToken ? ' PDE_RELAY_TOKEN=' + relayToken : '') +
```

---

### Claim Verification Summary

| Claim | Verdict | Evidence Location |
|-------|---------|-------------------|
| remote-ssh.cjs lacks PDE_BACKEND in envPrefix | CONFIRMED | remote-ssh.cjs:103-108 |
| emit-event.cjs is the correct fix location for source | CONFIRMED (with nuance: calls pde-tools.cjs via spawnSync) | emit-event.cjs:113, pde-tools.cjs:850-856 |
| Dashboard layer complete (ingest + queries) | CONFIRMED | route.ts:82-91, queries.ts:55-58, SS-01..SS-10 |
| WireEnvelopeSchema .passthrough() handles source | CONFIRMED | wire-schema.ts:13, relay-protocol.cjs:70 |
| Both relay architectures share emit-event.cjs | CONFIRMED | hooks.json:47-71, coordinator.cjs:247 |
| Two-file fix is sufficient (remote-ssh.cjs + emit-event.cjs) | PARTIALLY WRONG | See Findings 1 and 2 |

---

### Revised Implementation Plan

The prior research identified two changes. The verification reveals two additional changes are needed:

**Change 1 (confirmed from prior research):** `hooks/emit-event.cjs` -- add PDE_BACKEND fallback for source on SessionStart. Lines 93-96. Small, safe, additive.

**Change 2 (confirmed from prior research):** `packages/dispatcher/lib/remote-ssh.cjs` -- add `PDE_BACKEND=remote-ssh` to envPrefix. Lines 103-108. Small, safe.

**Change 3 (NEW -- Finding 1):** `packages/dispatcher/lib/coordinator.cjs` `_runRemoteSession` -- generate and pass a `relayId` UUID to `_spawnRemoteSession`, then use it for `this._aggregator.watch(relayId)` and `this._relayIds.set(sessionId, relayId)`. Also update `remote-ssh.cjs` to accept `opts.relayId` and use `opts.relayId || opts.sessionId` for `PDE_SESSION_ID` in the envPrefix -- matching the spawn.cjs pattern (spawn.cjs line 47: `env.PDE_SESSION_ID = opts.relayId || sessionId`).

**Change 4 (NEW -- Finding 2, conditional):** `packages/dispatcher/lib/remote-ssh.cjs` -- inject `PDE_REMOTE` and `PDE_RELAY_TOKEN` into the SSH envPrefix if the remoteConfig includes `ingest_url` / `relay_token` fields, OR if the coordinator's process.env has PDE_REMOTE set. Without this, `start-relay.cjs` on the remote machine silently exits without creating a relay. **This change is CONDITIONAL on confirming that Phase 146 did not already document a manual `remoteConfig.env` solution for users.** Before implementing, verify by checking Phase 146 plan/docs for `PDE_REMOTE` injection guidance.

**Files that need changes (revised):**

| File | Change | Confirmed Needed |
|------|--------|-----------------|
| `hooks/emit-event.cjs` | Add PDE_BACKEND fallback for source | YES |
| `packages/dispatcher/lib/remote-ssh.cjs` | Add PDE_BACKEND to envPrefix; add relayId support; conditionally inject PDE_REMOTE/PDE_RELAY_TOKEN | YES |
| `packages/dispatcher/lib/coordinator.cjs` | Generate relayId in _runRemoteSession, pass to spawnRemoteSession | YES (if Finding 1 is confirmed as a bug) |

---

### Files Verified in This Deep-Dive

| File | Key Finding |
|------|-------------|
| `packages/dispatcher/lib/remote-ssh.cjs` | envPrefix confirmed missing PDE_BACKEND; also missing PDE_REMOTE; PDE_SESSION_ID uses non-UUID sessionId |
| `hooks/emit-event.cjs` | source handling confirmed at lines 93-96; fix location is correct |
| `bin/pde-tools.cjs` | event-emit case (lines 824-863) is the actual NDJSON writer; receives payload from emit-event.cjs via spawnSync args; source survives round-trip |
| `bin/lib/event-bus.cjs` | safeAppendEvent writes to /tmp/pde-session-{id}.ndjson; sessionId comes from payload or module-level _sessionId |
| `bin/lib/relay-protocol.cjs` | createEnvelope (lines 93-101) spreads pdeEvent after explicit fields; source passes through; .passthrough() on schema (line 70) |
| `bin/lib/relay.cjs` | startRelay daemon mode (lines 527-539): reads sessionId from argv[2], which is what start-relay.cjs passes from config.json |
| `hooks/start-relay.cjs` | PDE_REMOTE gate at line 31; sessionId from config.json (lines 43-45); spawns relay.cjs with sessionId, ingestUrl, bearerToken |
| `hooks/hooks.json` | SessionStart runs emit-event.cjs (async:false) then start-relay.cjs (async:true); order confirmed |
| `packages/dispatcher/lib/coordinator.cjs` | SSH path skips local relay spawn (line 247); relayId generated at line 220 but NOT passed to _runRemoteSession; aggregator.watch(relayId) called for all sessions at line 243 |
| `packages/dispatcher/lib/spawn.cjs` | env.PDE_SESSION_ID = opts.relayId || sessionId (line 47); UUID pattern for local sessions |
| `dashboard/app/api/ingest/route.ts` | source storage confirmed at lines 82-91 |
| `dashboard/lib/queries.ts` | source field mapping confirmed at lines 55-58 |
| `dashboard/lib/wire-schema.ts` | .passthrough() confirmed at line 13; UUID required for session_id at line 5 |
| `dashboard/__tests__/session-source.test.ts` | SS-01..SS-10 tests confirmed; cover ingest and queries layers only |
