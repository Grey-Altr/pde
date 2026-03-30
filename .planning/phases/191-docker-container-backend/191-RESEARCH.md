# Phase 191: Docker Container Backend - Research

**Researched:** 2026-03-30
**Domain:** dockerode v4, Node.js container lifecycle, NDJSON stream relay, dispatcher integration
**Confidence:** HIGH

## Summary

Phase 191 adds a Docker execution backend to the dispatcher. The interface contract is already fully defined by `remote-ssh.cjs`: async IIFE + synchronous kill handle return, NDJSON written to `/tmp/pde-session-{relayId}.ndjson`, `onLine`/`onExit` callbacks matching `spawn.cjs` exactly. The Docker backend (`spawnDockerSession`) lives in `packages/cloud-adapter/index.cjs` and mirrors `spawnRemoteSession` structurally. The coordinator gains a `_runDockerSession()` method that slots into the existing `backend === 'docker'` dispatch branch.

The key technical decision from CONTEXT.md is well-founded: dockerode's `container.logs({ follow: true, stdout: true, stderr: true })` returns a multiplexed stream (when `Tty: false`) that requires `container.modem.demuxStream()` to separate stdout and stderr. For NDJSON line parsing, a `readline` interface on the demuxed stdout PassThrough is the correct pattern. The `container.wait()` promise resolves with `{ StatusCode: N }` when the container exits — this is where `onExit(sessionId, data.StatusCode)` is called, matching the SSH `channel.on('close', code)` pattern.

Docker Desktop is installed at `/Applications/Docker.app` but is not currently running (no socket found). Tests must gate on `DOCKER_AVAILABLE` env var for integration tests. The mocked unit test path (vitest + DI) is the primary CI path.

**Primary recommendation:** Implement `spawnDockerSession` in `packages/cloud-adapter/index.cjs` mirroring `spawnRemoteSession`'s async IIFE + kill handle pattern. Use `container.logs()` + `container.modem.demuxStream()` + `readline` for NDJSON streaming. Use `container.wait()` for exit detection. Use `AutoRemove: true` in `HostConfig` for success cleanup.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Docker interaction:** dockerode npm package added to `dispatcher/package.json` — battle-tested Docker Engine API client, avoids CLI parsing
- **Base image:** Pre-built PDE image with Claude Code CLI + Node.js baked in, referenced by tag `pde-session:latest` — faster startup, reproducible
- **Code mounting:** Bind-mount the worktree directory as read-write at `/workspace` — same pattern as local, no copy overhead
- **Resource limits:** No default limits — user configures via `dispatch.docker.memory` and `dispatch.docker.cpus` config keys (added in Phase 190)
- **Success cleanup:** Auto-remove container (`AutoRemove: true`) — no dangling containers
- **Failure cleanup:** Preserve container for 10min then auto-remove via setTimeout — allows log inspection
- **Idle timeout:** Configurable via `dispatch.docker.idle_timeout`, defaulting to 300s — matches existing function timeout
- **Exit detection:** dockerode `container.wait()` promise + `container.logs()` stream — clean async, matches SSH `channel.on('close')` pattern
- **Test approach:** Both mocked and real — unit tests with mocked dockerode for CI/fast iteration, one integration test with real Docker gated by `DOCKER_AVAILABLE` env
- **Dangling verification:** `docker ps -a --filter label=pde-session` after test — success criteria SC-4
- **Dashboard label:** Extend `session-source.test.ts` with 'docker' value assertions — existing SS-01–SS-10 pattern

### Claude's Discretion

None explicitly stated — all major decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Dockerfile/image build automation — Phase 196 (Containerized MCP Servers)
- Multi-container orchestration — out of scope for v0.24
- Docker Compose integration — future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLD-03 | Cloud session emits NDJSON events consumable by existing event bus infrastructure | `container.logs()` stream → readline → write to `/tmp/pde-session-{relayId}.ndjson` → existing TailCursor aggregator picks it up |
| CLD-04 | User can dispatch a plan to a local Docker container via dockerode with NDJSON stdout relay | `spawnDockerSession()` in `cloud-adapter/index.cjs` using dockerode v4 — verified API |
| CLD-05 | Docker container dispatch mirrors spawn.cjs interface (onLine/onExit callbacks, same NDJSON format) | Async IIFE + sync kill handle return matches `remote-ssh.cjs` pattern exactly; same `onLine(sid, parsedEvent)` / `onExit(sid, exitCode)` signatures |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| dockerode | 4.0.10 | Docker Engine Remote API client | Battle-tested, avoids CLI parsing/escaping, locked decision |
| node:readline | built-in | Line-by-line NDJSON parsing from stream | Established pattern in `spawn.cjs` and `remote-ssh.cjs` |
| node:stream (PassThrough) | built-in | Demux target for `container.modem.demuxStream()` | Required for Tty:false stream separation |
| node:fs | built-in | Write NDJSON to `/tmp/pde-session-{relayId}.ndjson` | Matches existing SSH + relay patterns |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto | built-in | UUID generation (already used in coordinator) | If relayId is not passed in |
| vitest | existing | Unit tests with mocked dockerode | All CI tests |
| node:test | N/A | Not used — project uses vitest for .test.cjs files | vitest.config.ts includes `tests/**/*.{test,spec}.{cjs}` |

**Installation:**
```bash
# In packages/dispatcher/
npm install dockerode
```

**Version verification:** dockerode 4.0.10 — verified via `npm view dockerode version` on 2026-03-30.

## Architecture Patterns

### Recommended File Structure

```
packages/
├── cloud-adapter/
│   └── index.cjs              # spawnDockerSession() lives here (Phase 191)
├── dispatcher/
│   ├── lib/
│   │   ├── coordinator.cjs    # Add _runDockerSession(), update dispatch() branch
│   │   ├── remote-router.cjs  # Add 'docker' route (Rule 2.5: before SSH)
│   │   └── tmux-fanout.cjs    # Update sourceLabel() to return 'D' for docker
│   └── package.json           # Add dockerode dependency
tests/
└── dispatcher/
    ├── coordinator-docker.test.cjs   # NEW — coordinator integration (SC-1, SC-2)
    └── remote-docker.test.cjs        # NEW — spawnDockerSession unit tests
dashboard/
└── __tests__/
    └── session-source.test.ts  # Extend with SS-docker-* tests for 'docker' source
```

### Pattern 1: Async IIFE + Synchronous Kill Handle (THE pattern)

**What:** The function returns a `{ kill }` handle synchronously, while all async lifecycle runs in an immediately invoked async arrow. The variable holding the container reference is declared in outer scope so `kill()` can reference it before the async IIFE settles.

**When to use:** Every non-local dispatch backend in this codebase.

```javascript
// Source: packages/dispatcher/lib/remote-ssh.cjs (verified in codebase)
function spawnDockerSession(opts) {
  // Declared in outer scope so kill() can reference before async IIFE settles
  let containerInstance = null;

  (async () => {
    // ... lifecycle: createContainer, start, logs, wait ...
  })().catch((err) => {
    opts.onLine(opts.sessionId, { type: 'system', subtype: 'docker_error', message: err.message });
    opts.onExit(opts.sessionId, 1);
  });

  // Synchronous return — callers can kill() even before container starts
  return {
    kill: () => {
      if (containerInstance) {
        try { containerInstance.kill(); } catch (_) {}
      }
    },
  };
}
```

### Pattern 2: Container Logs Stream + readline (NDJSON extraction)

**What:** `container.logs()` with `Tty: false` returns a multiplexed stream. `container.modem.demuxStream()` separates stdout into a PassThrough. `readline` reads that PassThrough line-by-line for NDJSON parsing.

**When to use:** Any dockerode integration where the container writes NDJSON to stdout.

```javascript
// Source: dockerode official README + verified against dockerode 4.0.10 API
const { PassThrough } = require('node:stream');
const readline = require('node:readline');

container.logs(
  { follow: true, stdout: true, stderr: true, timestamps: false },
  (err, logStream) => {
    if (err) { /* handle */ return; }

    // Demux: Tty:false produces multiplexed stream — modem separates it
    const stdoutPass = new PassThrough();
    const stderrPass = new PassThrough();
    container.modem.demuxStream(logStream, stdoutPass, stderrPass);

    const rl = readline.createInterface({ input: stdoutPass, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      ndjsonStream.write(line + '\n');
      try {
        const event = JSON.parse(line);
        opts.onLine(opts.sessionId, event);
      } catch (_) {}
    });

    stderrPass.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) opts.onLine(opts.sessionId, { type: 'system', subtype: 'stderr', message: msg });
    });

    // CRITICAL: logStream 'end' fires when container exits (follow:true)
    logStream.on('end', () => {
      rl.close();
      ndjsonStream.end();
    });
  }
);
```

### Pattern 3: container.wait() for Exit Code

**What:** `container.wait()` returns a promise that resolves with `{ StatusCode: N }` when the container process exits. This is the canonical exit code source.

**When to use:** Always run concurrently with `container.logs()` — logs stream handles NDJSON relay, wait handles exit code.

```javascript
// Source: dockerode README (verified API shape)
const waitResult = await container.wait();
// waitResult.StatusCode is the process exit code (0 = success)
opts.onExit(opts.sessionId, waitResult.StatusCode ?? 1);
```

### Pattern 4: createContainer Config for PDE

```javascript
// Source: dockerode README + CONTEXT.md locked decisions
const dockerConfig = opts.dockerConfig || {};
const container = await docker.createContainer({
  Image: dockerConfig.image || 'pde-session:latest',
  WorkingDir: '/workspace',
  Env: [
    'CLAUDECODE=',                              // CRITICAL: prevents nested session error
    `PDE_SESSION_ID=${effectiveSessionId}`,     // relayId (UUID)
    `PDE_PHASE=${opts.phase}`,
    `PDE_PLAN=${opts.plan}`,
    'PDE_BACKEND=docker',
    `PDE_SESSION_START=${new Date().toISOString()}`,
    ...(ingestUrl ? [`PDE_REMOTE=${ingestUrl}`] : []),
    ...(relayToken ? [`PDE_RELAY_TOKEN=${relayToken}`] : []),
  ],
  OpenStdin: false,  // CRITICAL: prevents hang (equiv to stdio:['ignore'])
  Tty: false,        // CRITICAL: prevents NDJSON corruption from escape sequences
  Labels: { 'pde-session': opts.sessionId },    // enables docker ps --filter label=pde-session
  HostConfig: {
    Binds: [`${opts.worktreePath}:/workspace`], // bind-mount worktree as read-write
    AutoRemove: true,                            // success: auto-cleanup
    ...(dockerConfig.memory ? { Memory: parseMemory(dockerConfig.memory) } : {}),
    ...(dockerConfig.cpus ? { NanoCpus: Math.floor(dockerConfig.cpus * 1e9) } : {}),
  },
  Cmd: [
    'claude', '--print', '--bare',
    '--output-format', 'stream-json', '--verbose',
    '--dangerously-skip-permissions',
    '--plugin-dir', opts.pluginDir || '/root/.claude/pde',
    '--append-system-prompt',
    'You are a PDE executor agent running in a worktree. Operate in autonomous mode. Auto-approve all checkpoints. Do not ask questions.',
    `Execute phase ${opts.phase}, plan ${opts.plan}. Run /gsd:execute-plan ${opts.phase} ${opts.plan}.`,
  ],
});
```

### Pattern 5: Failure Cleanup — setTimeout AutoRemove

**What:** On non-zero exit, preserve container for 10 minutes (inspection window), then kill it. `AutoRemove: true` on the container means once stopped/killed it removes itself. Because the container may still be running (idle timeout scenario), a `container.stop()` or `container.kill()` call triggers the auto-remove.

```javascript
// Source: CONTEXT.md locked decision
if (exitCode !== 0) {
  const CLEANUP_MS = (opts.dockerConfig && opts.dockerConfig.failure_cleanup_ms) || 600_000;
  setTimeout(() => {
    try { containerInstance.kill(); } catch (_) {}
  }, CLEANUP_MS).unref();  // unref: don't keep process alive for cleanup timer
}
```

### Pattern 6: router.cjs Docker Rule (between Rule 2 and Rule 3)

**What:** Docker is preferred over SSH when `preferred_backend === 'docker'` or `dispatch.docker` is configured.

```javascript
// New Rule 2.5 in remote-router.cjs (after "no remote config" check)
if (remoteConfig && remoteConfig.preferred_backend === 'docker') {
  return 'docker';
}
if (dockerConfig && dockerConfig.enabled) {
  return 'docker';
}
```

### Pattern 7: coordinator.cjs Docker Dispatch Branch

**What:** After `backend === 'ssh'` check in `dispatch()`, add `backend === 'docker'` branch. No relay spawn for docker (same as SSH: `if (backend !== 'ssh')` currently spawns relay — docker should also skip relay spawn by adding `backend !== 'docker'` to that condition or treating docker like SSH for relay purposes).

Note on relay: looking at coordinator.cjs line 247: `if (backend !== 'ssh')` — relay is spawned for local but not SSH. Docker should behave like SSH for relay (RelayId is used, aggregator.watch(relayId, 'docker') routes to RemoteAggregator from Phase 190). The `if (backend !== 'ssh')` condition should become `if (backend !== 'ssh' && backend !== 'docker')`.

### Anti-Patterns to Avoid

- **`Tty: true` with NDJSON:** Terminal escape sequences corrupt JSON parsing. `Tty: false` is mandatory.
- **`OpenStdin: true`:** The container will hang waiting for stdin EOF. Must use `OpenStdin: false`.
- **`CLAUDECODE=1` in container env:** Inheriting it causes "cannot be launched inside another session" error. Must explicitly set `CLAUDECODE=` (empty string).
- **Using `docker.run()` shorthand:** It wraps create+start+wait but makes the stream interface opaque — hard to inject kill handle and test. Use `createContainer` + `start` + `logs` + `wait` directly.
- **Reading `logStream` directly without demux:** When `Tty: false`, the stream is multiplexed (Docker's 8-byte frame header). Reading it raw produces garbage. Always demux.
- **`container.wait()` alone for exit code without logs stream:** `container.wait()` does not fire `logStream 'end'` — these are separate. Run both concurrently.
- **Not calling `.unref()` on setTimeout:** The 10min failure-cleanup timer will keep the Node process alive. Always `.unref()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docker Engine API calls | Raw HTTP to `/var/run/docker.sock` | dockerode | Docker API has multiplexed streams, attach/exec differences, auth complexity |
| Multiplexed stream parsing | Manual 8-byte header parser | `container.modem.demuxStream()` | Docker's multiplex protocol has stdout/stderr framing — already in dockerode |
| Container lifecycle | Shell-spawned `docker run` + output parsing | dockerode createContainer/start/logs/wait | No shell escaping risks; testable via DI; structured error handling |
| Image availability check | `docker images grep pde-session` | `docker.getImage('pde-session:latest').inspect()` | Structured response, proper error codes |

**Key insight:** dockerode is a thin wrapper over the Docker Engine HTTP API — it provides correct stream demultiplexing that is non-trivial to replicate.

## Runtime State Inventory

> This phase creates new containers at runtime. No rename/refactor operations.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — Phase 191 creates new Docker containers, writes NDJSON to /tmp | None |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | None new — ANTHROPIC_API_KEY inherited from parent process env | None |
| Build artifacts | `pde-session:latest` Docker image — must exist on host before integration test runs | Manual: `docker build` before running `DOCKER_AVAILABLE=1` tests; documented in test |

## Common Pitfalls

### Pitfall 1: logStream never emits 'end' with follow:true

**What goes wrong:** With `container.logs({ follow: true })`, the stream stays open even after the container exits in some Docker/dockerode version combinations. `rl.close()` and `ndjsonStream.end()` are never called; `onExit` is never fired.

**Why it happens:** Known dockerode issue (#531, #456). The `follow:true` stream may not self-terminate depending on Docker Engine version.

**How to avoid:** Run `container.wait()` concurrently as the authoritative exit signal. In `wait()`.then, call `logStream.destroy()` explicitly to force the readline 'close' event and NDJSON stream end. Pattern: `Promise.race` or sequential: start wait(), in wait().then → destroy stream → fire onExit.

**Warning signs:** Unit tests complete but `onExit` is never called in mock scenarios.

### Pitfall 2: Container not removed on failure (dangling containers)

**What goes wrong:** When `AutoRemove: true` is set, the container auto-removes after it stops naturally. But if a kill signal is needed (idle timeout, user kill), the container must be explicitly stopped/killed first — `AutoRemove` only triggers on natural exit.

**Why it happens:** `AutoRemove` is a Docker `--rm` equivalent; it triggers when the container's entrypoint exits, not when dockerode loses track of the container.

**How to avoid:** The `kill()` handle must call `containerInstance.kill()` (or `.stop()`) — this triggers the stop → AutoRemove chain. The failure-cleanup `setTimeout` also calls `.kill()`.

**Warning signs:** `docker ps -a --filter label=pde-session` shows dangling containers after test run.

### Pitfall 3: `DOCKER_AVAILABLE` integration test leaves dangling containers on failure

**What goes wrong:** If the integration test fails mid-lifecycle (e.g., container started but test assertion throws), the container may not be cleaned up, polluting the host.

**Why it happens:** Test cleanup requires explicit `afterEach` or `after` hooks that call `containerInstance.kill()`.

**How to avoid:** Wrap integration test cleanup in `try/finally`. Track container ID at test scope; kill in `after` hook regardless of test outcome.

**Warning signs:** After running `DOCKER_AVAILABLE=1 npx vitest`, `docker ps -a` shows `pde-session:latest` containers in `Exited` state with no auto-remove.

### Pitfall 4: Relay spawn for Docker sessions

**What goes wrong:** `coordinator.cjs` currently spawns a relay for `backend !== 'ssh'` (i.e., local gets relay, SSH does not). Docker should also skip relay spawn (Docker uses RemoteAggregator from Phase 190, not TailCursor + relay).

**Why it happens:** The condition `if (backend !== 'ssh')` was written before docker existed as a backend.

**How to avoid:** Change to `if (backend !== 'ssh' && backend !== 'docker')` before spawning relay. Aggregator already handles `watch(relayId, 'docker')` via RemoteAggregator stub.

**Warning signs:** Relay process spawned but NDJSON path not written (RemoteAggregator is a no-op stub), causing relay to exit immediately with no events.

### Pitfall 5: tmux-fanout sourceLabel returns 'R' for docker

**What goes wrong:** `sourceLabel()` returns 'R' for any non-local backend. Docker sessions would show as 'R' (SSH label) in tmux output.

**Why it happens:** `sourceLabel` was written before docker backend existed.

**How to avoid:** Update `sourceLabel()`:

```javascript
function sourceLabel(backend) {
  if (backend === undefined || backend === null) return 'L';
  if (backend === 'local') return 'L';
  if (backend === 'docker') return 'D';
  return 'R';
}
```

Dashboard `session-health-matrix.tsx` already shows 'Docker' text for `source === 'docker'` (Phase 190 gap fix). The `[D]` tmux label comes from this function change.

### Pitfall 6: AutoRemove: true conflicts with failure container inspection

**What goes wrong:** `AutoRemove: true` removes the container immediately on exit, even on failure. This prevents log inspection during the 10min window.

**Why it happens:** `AutoRemove` fires on any container exit regardless of exit code.

**How to avoid:** Two options (CONTEXT.md chose option A):

- **Option A (chosen):** Always set `AutoRemove: true`. On failure, logs were already streamed to NDJSON file at `/tmp/pde-session-{relayId}.ndjson`. The 10-min preservation applies to the NDJSON file, not the container. The container is gone but the events are preserved.
- **Option B:** Set `AutoRemove: false`, manually call `container.remove()` after 10 minutes on failure.

Since CONTEXT.md locks `AutoRemove: true`, the 10-min setTimeout still makes sense as a guard for the kill handle (prevents dangling kill calls), but the container will already be removed by Docker.

## Code Examples

### Complete spawnDockerSession skeleton

```javascript
// Source: CONTEXT.md decisions + remote-ssh.cjs pattern (packages/dispatcher/lib/remote-ssh.cjs)
'use strict';

const Dockerode = require('dockerode');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { PassThrough } = require('node:stream');

function spawnDockerSession(opts) {
  // opts shape mirrors spawnRemoteSession:
  //   sessionId, relayId, phase, plan, worktreePath, dockerConfig,
  //   pluginDir, onLine(sessionId, parsedEvent), onExit(sessionId, exitCode)
  //   _deps: { Dockerode } for DI

  const DockerodeClass = (opts._deps && opts._deps.Dockerode) || Dockerode;
  let containerInstance = null;

  const effectiveSessionId = opts.relayId || opts.sessionId;
  const ndjsonPath = path.join(os.tmpdir(), `pde-session-${effectiveSessionId}.ndjson`);

  (async () => {
    const docker = new DockerodeClass();
    const dockerConfig = opts.dockerConfig || {};

    const container = await docker.createContainer({
      Image: dockerConfig.image || 'pde-session:latest',
      WorkingDir: '/workspace',
      Env: [ /* ... PDE env vars ... */ ],
      OpenStdin: false,
      Tty: false,
      Labels: { 'pde-session': opts.sessionId },
      HostConfig: {
        Binds: [`${opts.worktreePath}:/workspace`],
        AutoRemove: true,
      },
      Cmd: [ 'claude', '--print', /* ... args ... */ ],
    });

    containerInstance = container;
    await container.start();

    const ndjsonStream = fs.createWriteStream(ndjsonPath, { flags: 'a' });

    // Run logs stream and wait() concurrently
    const waitResult = await new Promise((resolve, reject) => {
      container.logs({ follow: true, stdout: true, stderr: true }, (err, logStream) => {
        if (err) { reject(err); return; }

        const stdoutPass = new PassThrough();
        const stderrPass = new PassThrough();
        container.modem.demuxStream(logStream, stdoutPass, stderrPass);

        const rl = readline.createInterface({ input: stdoutPass, crlfDelay: Infinity });
        rl.on('line', (line) => {
          if (!line.trim()) return;
          ndjsonStream.write(line + '\n');
          try { opts.onLine(opts.sessionId, JSON.parse(line)); } catch (_) {}
        });

        stderrPass.on('data', (data) => {
          const msg = data.toString().trim();
          if (msg) opts.onLine(opts.sessionId, { type: 'system', subtype: 'stderr', message: msg });
        });

        // container.wait() is the authoritative exit signal
        container.wait().then((data) => {
          logStream.destroy(); // force logs stream close
          rl.close();
          ndjsonStream.end();
          resolve(data);
        }).catch(reject);
      });
    });

    const exitCode = (waitResult && waitResult.StatusCode != null) ? waitResult.StatusCode : 1;

    if (exitCode !== 0) {
      // Failure: container already auto-removed (AutoRemove:true), but guard cleanup timer
      const cleanupMs = (opts.dockerConfig && opts.dockerConfig.failure_cleanup_ms) || 600_000;
      setTimeout(() => {
        try { containerInstance && containerInstance.kill(); } catch (_) {}
      }, cleanupMs).unref();
    }

    opts.onExit(opts.sessionId, exitCode);
  })().catch((err) => {
    opts.onLine(opts.sessionId, { type: 'system', subtype: 'docker_error', message: err.message });
    opts.onExit(opts.sessionId, 1);
  });

  return {
    kill: () => {
      if (containerInstance) {
        try { containerInstance.kill(); } catch (_) {}
      }
    },
  };
}

module.exports = { spawnDockerSession };
```

### Aggregator watch call (coordinator.cjs)

```javascript
// Source: aggregator.cjs watch(sessionId, sessionType) — Phase 190 confirmed
this._aggregator.watch(relayId, 'docker'); // routes to RemoteAggregator
```

### session-source.test.ts docker extension

```typescript
// Source: dashboard/__tests__/session-source.test.ts (SS-01 pattern)
it('Test SS-docker-01: stores session_source=docker on session_start when source=docker', async () => {
  const sessionId = '550e8400-e29b-41d4-a716-446655440001';
  const req = makeIngestRequest([makeValidEnvelope({ session_id: sessionId, event_type: 'session_start', source: 'docker' })]);
  await POST(req);
  const hsetCalls = mockHset.mock.calls;
  const sourceCall = hsetCalls.find(
    (c) => c[0] === `pde:default:session:${sessionId}` && c[1]?.session_source !== undefined
  );
  expect(sourceCall).toBeDefined();
  expect(sourceCall![1].session_source).toBe('docker');
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `docker.run()` one-shot | `createContainer + start + logs + wait` | Always available | Explicit lifecycle control, testable via DI |
| `Tty: true` stream | `Tty: false + modem.demuxStream()` | Docker Remote API v1.6 | Clean NDJSON, no escape sequences |

**Deprecated/outdated:**
- `container.attach()` for log streaming: README now recommends `container.logs()` with `follow: true` for following output from a started container.

## Open Questions

1. **RemoteAggregator bus wiring**
   - What we know: Phase 190 stubbed `RemoteAggregator.start()` as no-op with comment "bus wired in Phase 191"
   - What's unclear: The NDJSON file IS written by `spawnDockerSession` to `/tmp/pde-session-{relayId}.ndjson`. `RemoteAggregator` currently does nothing — it doesn't tail the file. The existing `TailCursor` tails the file.
   - Recommendation: For Docker sessions where the NDJSON file IS written locally (unlike cloud which would push over network), `RemoteAggregator` may not be needed — the existing `TailCursor` path would work. However, Phase 190 explicitly routes `'docker'` sessions to `RemoteAggregator`. The planner should decide: either make `RemoteAggregator` a `TailCursor` wrapper for local Docker, or route Docker through `TailCursor` directly. Verify aggregator.watch() logic before planning.

2. **`AutoRemove: true` + failure inspection window conflict**
   - What we know: CONTEXT.md locks `AutoRemove: true` AND "preserve container for 10min" — these are in tension.
   - What's unclear: With `AutoRemove: true`, the container is removed by Docker upon exit. The 10-min setTimeout serves no container-preservation purpose.
   - Recommendation: The setTimeout is still useful as a `kill()` guard (prevents the kill handle from calling `.kill()` on a long-gone container). The "preservation" for failure inspection is via the NDJSON file, not the container. Plan should document this explicitly.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Desktop / Docker Engine | Integration tests, runtime container dispatch | Installed but NOT running | Docker Desktop at `/Applications/Docker.app` — no socket found | Gate integration tests on `DOCKER_AVAILABLE=1` env var |
| dockerode npm package | `spawnDockerSession()` | Not yet installed | 4.0.10 (npm registry verified) | None — must install |
| `pde-session:latest` image | Container spawn | Unknown (Docker not running to verify) | N/A | Phase 196 deferred; image must be pre-built manually |
| Node.js | All runtime code | ✓ | v20.20.0 | — |
| vitest | Unit tests (mocked dockerode) | ✓ | existing in project | — |

**Missing dependencies with no fallback:**
- `dockerode` not in `packages/dispatcher/package.json` yet — planner must add install step
- `pde-session:latest` image must exist for integration test (`DOCKER_AVAILABLE=1`) — planner must document prerequisite or skip image check in unit tests

**Missing dependencies with fallback:**
- Docker Engine not running — fallback is mocked unit tests (primary CI path per locked decision)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest (globals: true) |
| Config file | `vitest.config.ts` at project root |
| Quick run command | `npx vitest run tests/dispatcher/coordinator-docker.test.cjs tests/dispatcher/remote-docker.test.cjs` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLD-04 | spawnDockerSession creates container with dockerode, streams NDJSON | unit (mocked dockerode) | `npx vitest run tests/dispatcher/remote-docker.test.cjs` | ❌ Wave 0 |
| CLD-05 | onLine/onExit callbacks fire with correct signatures | unit (mocked dockerode) | `npx vitest run tests/dispatcher/remote-docker.test.cjs` | ❌ Wave 0 |
| CLD-03 | NDJSON events consumable by event bus (coordinator integration) | unit (mocked) | `npx vitest run tests/dispatcher/coordinator-docker.test.cjs` | ❌ Wave 0 |
| SC-1 | `--dispatch=docker` spawns container, streams NDJSON to event bus | integration (DOCKER_AVAILABLE) | `DOCKER_AVAILABLE=1 npx vitest run tests/dispatcher/coordinator-docker.test.cjs` | ❌ Wave 0 |
| SC-2 | Same onLine/onExit interface as spawn.cjs | unit | `npx vitest run tests/dispatcher/remote-docker.test.cjs` | ❌ Wave 0 |
| SC-3 | Dashboard shows [D] source label for docker sessions | unit (session-source) | `npx vitest run dashboard/__tests__/session-source.test.ts` | ✅ (needs SS-docker tests) |
| SC-4 | No dangling containers after test run | integration (DOCKER_AVAILABLE) | `docker ps -a --filter label=pde-session` after test | manual |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/remote-docker.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/remote-docker.test.cjs` — covers CLD-04, CLD-05, SC-2 (unit, mocked dockerode via DI)
- [ ] `tests/dispatcher/coordinator-docker.test.cjs` — covers CLD-03, SC-1, SC-4 (integration gated on DOCKER_AVAILABLE)

*(No new fixtures needed — existing `vitest.config.ts` include pattern covers `tests/dispatcher/*.test.cjs`)*

## Sources

### Primary (HIGH confidence)

- Codebase: `packages/dispatcher/lib/remote-ssh.cjs` — THE pattern Docker mirrors (async IIFE, kill handle, readline, NDJSON write)
- Codebase: `packages/dispatcher/lib/spawn.cjs` — onLine/onExit contract definition
- Codebase: `packages/dispatcher/lib/coordinator.cjs` — dispatch orchestration site (lines 191-265, 386-454)
- Codebase: `packages/dispatcher/lib/aggregator.cjs` — RemoteAggregator stub + watch(id, 'docker') routing
- Codebase: `packages/dispatcher/lib/remote-router.cjs` — routing decision tree to extend
- Codebase: `packages/dispatcher/lib/tmux-fanout.cjs` — sourceLabel() needs 'D' for docker
- Codebase: `dashboard/__tests__/session-source.test.ts` — SS-01–SS-10 pattern to extend
- Codebase: `dashboard/lib/queries.ts` — 'docker' already in SessionListItem.source union (Phase 190)
- Codebase: `dashboard/components/session-health-matrix.tsx` — 'docker': 'Docker' already in sourceLabels (Phase 190)
- `npm view dockerode version` — 4.0.10 verified 2026-03-30

### Secondary (MEDIUM confidence)

- dockerode README (github.com/apocas/dockerode) — createContainer options shape, container.logs(), container.modem.demuxStream(), container.wait() return shape `{ StatusCode: N }`
- dockerode examples/logs.js — demuxStream + PassThrough pattern for Tty:false containers

### Tertiary (LOW confidence)

- WebSearch: dockerode issue #531 (log stream never ends) — known issue with `follow:true`, mitigation via `container.wait()` + `logStream.destroy()` is the recommended workaround based on community patterns
- WebSearch: dockerode issue #456 (logs sometimes returns string not stream) — affects older Docker Engine versions; using callback form of `container.logs()` is safer than promise form for compatibility

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — dockerode 4.0.10 verified from npm registry; all other deps are built-ins
- Architecture: HIGH — directly modeled from existing `remote-ssh.cjs` pattern in codebase
- Pitfalls: MEDIUM — stream termination behavior (Pitfall 1) is LOW (known issue without definitive fix; mitigation via `container.wait()` + `destroy()` is community-confirmed but not officially documented)
- Integration with aggregator: MEDIUM — Open Question 1 about RemoteAggregator vs TailCursor for local Docker needs planner decision

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (dockerode API is stable; Docker Engine API changes are versioned)
