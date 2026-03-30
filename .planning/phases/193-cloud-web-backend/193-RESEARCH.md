# Phase 193: Cloud Web Backend - Research

**Researched:** 2026-03-30
**Domain:** Claude CLI cloud dispatch, CloudPoller polling, RemoteAggregator wiring, routing fallback chain
**Confidence:** HIGH

## Summary

Phase 193 implements the cloud dispatch backend by populating two stubs (`remote-managed.cjs` and `aggregator.cjs`), creating a new `remote-cloud.cjs` module, extending the router with cloud routing rules, wiring `_runCloudSession()` into the coordinator, and updating the tmux `sourceLabel` for the cloud backend. All integration points are already scaffolded from prior phases — this phase is purely additive populate-the-stub work.

The most important environment finding is that `claude auth status` does **not** include a `github_connected` field. The actual JSON schema (v2.1.87) has `authMethod`, `loggedIn`, `subscriptionType`, `apiProvider`, `email`, `orgId`, `orgName`. The CONTEXT.md decision to "parse for github_connected" must be adapted: the real availability probe should check `authMethod === 'claude.ai'` and `loggedIn === true` as the availability signal. Separately, `claude task start --remote` does not appear in the installed CLI (v2.1.87) as a structured subcommand. The plan must use CLI stub injection (`_deps.execCommand`) for all CLI calls so tests never touch real cloud APIs.

The `coordinator-docker.test.cjs` file is the exact structural template to mirror for `coordinator-cloud.test.cjs`. The test harness uses vitest v4.1.1 with CJS globals, full `_deps` injection, and `await new Promise(r => setImmediate(r))` for microtask flushing.

**Primary recommendation:** Mirror `remote-ssh.cjs` and `coordinator-docker.test.cjs` exactly. Adapt `detectManagedBackend()` to check `authMethod === 'claude.ai'` (not `github_connected`). All cloud CLI calls go through injectable `_deps.execCommand`. The CloudPoller + RemoteAggregator design from CONTEXT.md is sound and fully compatible with the existing aggregator architecture.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Cloud dispatch module:** New `packages/dispatcher/lib/remote-cloud.cjs` -- parallel to remote-ssh.cjs, contains spawnCloudSession() + CloudPoller
- **Session spawn:** Shell out to `claude task start --remote "<prompt>"` via child_process -- captures task ID from stdout, all auth handled by CLI
- **Status polling:** CloudPoller class polling `claude task status <id> --json` every 5 seconds -- emits synthetic NDJSON events (cloud_heartbeat, session_end, cloud_error) to aggregator's onLine callback
- **RemoteAggregator:** Wire CloudPoller INTO RemoteAggregator -- RemoteAggregator.start() creates a CloudPoller that calls the onLine callback with synthetic events; RemoteAggregator.stop() clears the polling interval
- **Cloud availability detection:** `claude auth status --output-format json` -- parse for github_connected field; if command fails or no GitHub auth, return unavailable
- **Fallback chain:** cloud to SSH to local -- if cloud probe returns unavailable, try SSH if configured, else fall to local; emit `routing_fallback` system event at each fallback step
- **Testing strategy:** CLI stub injection via `_deps.execCommand` on all functions -- never call real `claude` CLI in tests; fixture JSON responses for auth/task commands

### Claude's Discretion

None stated explicitly.

### Deferred Ideas (OUT OF SCOPE)

- Real NDJSON streaming from cloud (requires Anthropic API changes) -- future
- Multi-region cloud dispatch -- out of scope for v0.24
- Cloud session cost tracking/billing integration -- future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLD-01 | User can dispatch an autonomous phase to an ephemeral cloud container via Agent SDK | spawnCloudSession() in remote-cloud.cjs shells out to `claude task start --remote`; coordinator._runCloudSession() queues it |
| CLD-02 | Cloud container is automatically torn down on task completion with configurable idle timeout | CloudPoller detects non-running status and calls stop(); idle_timeout config key in dispatch.cloud block; coordinator._handleExit tears down on session_end |
| CLD-07 | Graceful fallback chain: cloud to SSH to local with same degradation UX as v0.18 SSH fallback | remote-router.cjs extended with cloud probe rule; routing_fallback system event emitted at each fallback step |
| CLD-08 | Cloud session auth uses claude.ai OAuth (not ANTHROPIC_API_KEY), with probe before dispatch | detectManagedBackend() in remote-managed.cjs probes `claude auth status --json`; checks authMethod field |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:child_process | built-in | Shell out to `claude` CLI for task start/status/stop | Established pattern throughout dispatcher package |
| node:events | built-in | EventEmitter base for CloudPoller event forwarding | Already used throughout aggregator and coordinator |
| node:path / node:os | built-in | NDJSON path construction (`/tmp/pde-session-{id}.ndjson`) | Established pattern from TailCursor and RemoteAggregator |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.1 | Test runner with CJS globals (`vi.fn`, `describe`, `it`, `expect`) | All test files -- confirmed working on this machine |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setInterval polling | EventEmitter push | Polling is correct because cloud CLI has no streaming push interface; push would require HTTP server |
| child_process.exec (async) | execFileSync (sync) | Use async execFile for cloud CLI to avoid blocking the Node event loop during poll cycles |

**Installation:** No new npm packages required. All required modules are built-in or already in `packages/dispatcher/package.json`.

## Architecture Patterns

### File Layout

```
packages/dispatcher/lib/
  remote-cloud.cjs      -- NEW: spawnCloudSession() + CloudPoller class
  remote-managed.cjs    -- MODIFY: populate detectManagedBackend() with real probe
  remote-router.cjs     -- MODIFY: add cloud routing rule + fallback chain
  aggregator.cjs        -- MODIFY: populate RemoteAggregator with CloudPoller wiring
  coordinator.cjs       -- MODIFY: add _runCloudSession(), import spawnCloudSession
  tmux-fanout.cjs       -- MODIFY: sourceLabel('cloud') returns 'C'

tests/dispatcher/
  coordinator-cloud.test.cjs  -- NEW: mirrors coordinator-docker.test.cjs exactly
```

### Pattern 1: CloudPoller Class (remote-cloud.cjs)

**What:** Timer-based poller that shells out to `claude task status <id> --json` every N ms and forwards synthetic NDJSON events to the aggregator's `onLine` callback.

**When to use:** Whenever a cloud session is active and status must be relayed as synthetic events.

**Design from CONTEXT.md -- verified compatible with aggregator:**

```javascript
// Source: CONTEXT.md specifics + child_process.execFile safety pattern
const { execFile } = require('node:child_process');

function defaultExecCommand(cmd) {
  // Split cmd string into args array for execFile (no shell injection)
  const parts = cmd.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);
  return new Promise((resolve, reject) => {
    execFile(bin, args, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout.trim());
    });
  });
}

class CloudPoller {
  constructor(taskId, onLine, opts) {
    this._taskId = taskId;
    this._onLine = onLine;
    this._interval = (opts && opts.pollInterval) || 5000;
    this._execCommand = (opts && opts._execCommand) || defaultExecCommand;
    this._timer = null;
  }

  start() {
    this._timer = setInterval(() => this._poll(), this._interval);
  }

  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  async _poll() {
    try {
      const raw = await this._execCommand(
        'claude task status ' + this._taskId + ' --json'
      );
      const parsed = JSON.parse(raw);
      this._onLine({
        event_type: parsed.status === 'running' ? 'cloud_heartbeat' : 'session_end',
        session_id: this._taskId,
        ts: new Date().toISOString(),
        cloud_status: parsed.status,
      });
      if (parsed.status !== 'running') this.stop();
    } catch (err) {
      this._onLine({
        event_type: 'cloud_error',
        session_id: this._taskId,
        ts: new Date().toISOString(),
        error: err.message,
      });
      this.stop();
    }
  }
}
```

**Key detail:** `_poll()` must be async and wrapped in try/catch. If `claude task status` fails, emit `cloud_error` and stop polling to avoid an infinite error loop.

### Pattern 2: RemoteAggregator Population (aggregator.cjs)

**What:** `RemoteAggregator.start()` creates a CloudPoller with the taskId extracted from the filePath convention, wires the onLine callback, and calls `poller.start()`. `stop()` calls `poller.stop()`.

**Key constraint from STATE.md:** "RemoteAggregator never creates TailCursor for cloud session IDs." This is already enforced by `aggregator.watch()` selecting `RemoteAggregator` when `sessionType === 'cloud'`.

```javascript
// Source: CONTEXT.md specifics section
class RemoteAggregator {
  constructor(filePath, onLine) {
    this._filePath = filePath;
    this._onLine = onLine;
    this._poller = null;
  }

  start(pollInterval, opts) {
    // Extract taskId from filePath: /tmp/pde-session-{taskId}.ndjson
    const taskId = path.basename(this._filePath, '.ndjson').replace('pde-session-', '');
    this._poller = new CloudPoller(taskId, (event) => {
      this._onLine(JSON.stringify(event));
    }, { pollInterval: pollInterval, ...(opts || {}) });
    this._poller.start();
  }

  stop() {
    if (this._poller) this._poller.stop();
  }
}
```

**Critical:** `onLine` in aggregator.watch() receives raw strings (TailCursor calls `onLine(line)` with a string). `RemoteAggregator.start()` must call `this._onLine(JSON.stringify(event))` not `this._onLine(event)`.

### Pattern 3: Auth Probe (remote-managed.cjs)

**CRITICAL FINDING:** `claude auth status --output-format json` does NOT exist as a flag. The correct flag is `claude auth status --json` (confirmed on v2.1.87). The schema returned:

```json
{
  "loggedIn": true,
  "authMethod": "claude.ai",
  "apiProvider": "firstParty",
  "email": "...",
  "orgId": "...",
  "orgName": "...",
  "subscriptionType": "max"
}
```

There is NO `github_connected` field. The CONTEXT.md probe decision must be adapted. Use `authMethod === 'claude.ai'` as the availability signal:

```javascript
// Source: live probe of claude auth status --json on v2.1.87
async function detectManagedBackend(_deps) {
  const execCommand = (_deps && _deps.execCommand) || defaultExecCommand;
  try {
    const raw = await execCommand('claude auth status --json');
    const parsed = JSON.parse(raw);
    if (parsed.loggedIn === true && parsed.authMethod === 'claude.ai') {
      return { available: true };
    }
    return { available: false, reason: 'Not logged in with claude.ai OAuth' };
  } catch (err) {
    return { available: false, reason: 'claude auth status failed: ' + err.message };
  }
}
```

### Pattern 4: Router Extension (remote-router.cjs)

**What:** Add a 'cloud' rule before the SSH rule. If `preferred_backend === 'cloud'` or `cloudConfig.enabled`, probe the managed backend. If available, return `'cloud'`. If not, fall through to SSH.

The router returns the final target; the coordinator detects a different backend from what was requested and emits the `routing_fallback` event. This keeps the router pure (no EventEmitter dependency).

**routing_fallback event shape** (from CONTEXT.md and coordinator event patterns):
```
{ type: 'system', subtype: 'routing_fallback', from: 'cloud', to: 'ssh' }
{ type: 'system', subtype: 'routing_fallback', from: 'cloud', to: 'local' }
```

Extended router signature must accept `cloudConfig` and `_detectCloud` deps alongside the existing params.

### Pattern 5: Coordinator Extension (coordinator.cjs)

**What:** Import `spawnCloudSession` from `remote-cloud.cjs`, add `_runCloudSession()` method mirroring `_runDockerSession()`, add cloud routing in `dispatch()`, and wire cloud sessions to skip relay spawn.

**dispatch() guard change:** Extend relay spawn guard from `backend !== 'ssh' && backend !== 'docker'` to also exclude `'cloud'`.

**aggregator.watch call:** Cloud sessions use `this._aggregator.watch(relayId, 'cloud')` so RemoteAggregator is selected (vs TailCursor for docker).

**_handleExit:** Cloud sessions have `entry.backend === 'cloud'` which is not `'local'`, so the existing Phase 192 cloud sync block already runs. No changes needed in `_handleExit`.

**routing_fallback emission:** Compare the originally-requested backend (`dispatch.cloud.enabled` or `preferred_backend === 'cloud'`) with the returned route result. If different, emit:
```javascript
this._aggregator.emit('event', 'system', {
  type: 'system', subtype: 'routing_fallback', from: 'cloud', to: actualBackend
});
```

### Pattern 6: tmux sourceLabel Extension (tmux-fanout.cjs)

Current `sourceLabel` function returns `'R'` as the default catch-all. Add `if (backend === 'cloud') return 'C';` before the `return 'R'` line. This satisfies DSH-01 (`[C]` label for cloud sessions).

### Pattern 7: Test Structure (coordinator-cloud.test.cjs)

Mirror `coordinator-docker.test.cjs` exactly. Test IDs use `CC-NN` prefix. Required test coverage per phase success criteria:

1. `CC-01`: dispatch() with backend=cloud queues _runCloudSession (not _runSession or _runRemoteSession or _runDockerSession)
2. `CC-02`: dispatch() with backend=cloud skips relay spawn
3. `CC-03`: _runCloudSession passes correct opts to spawnCloudSession
4. `CC-04`: _runCloudSession onLine forwards events to aggregator
5. `CC-05`: _runCloudSession onExit calls _handleExit
6. `CC-06`: detectManagedBackend returns available:false when authMethod !== 'claude.ai'
7. `CC-07`: detectManagedBackend returns available:true when authMethod === 'claude.ai' and loggedIn === true
8. `CC-08`: CloudPoller emits cloud_heartbeat when status=running, stops on completed
9. `CC-09`: Fallback chain: cloud probe unavailable falls to ssh (routing_fallback emitted)
10. `CC-10`: sourceLabel('cloud') returns 'C'
11. `CC-11`: aggregator.watch(id, 'cloud') uses RemoteAggregator (verifies aggregator unchanged)

**Test fixture pattern for CLI stubs:**
```javascript
// Auth fixture
const authAvailable = JSON.stringify({
  loggedIn: true, authMethod: 'claude.ai', apiProvider: 'firstParty',
  email: 'test@example.com',
});
const authUnavailable = JSON.stringify({
  loggedIn: false, authMethod: 'none',
});

// Task status fixtures
const runningStatus = JSON.stringify({ status: 'running' });
const completedStatus = JSON.stringify({ status: 'completed' });

// Stub execCommand for detectManagedBackend
const mockExec = vi.fn().mockResolvedValue(authAvailable);
```

### Anti-Patterns to Avoid

- **Calling real `claude` CLI in tests:** All `execCommand` calls must go through `_deps.execCommand`. Tests stub this. The CJS DI pattern is `opts._deps && opts._deps.execCommand || defaultExecCommand`.
- **Relay spawned for cloud sessions:** Cloud sessions must NOT spawn a relay process. Extend the existing guard to exclude `'cloud'`.
- **onLine receiving objects instead of strings:** `RemoteAggregator.start()` must call `this._onLine(JSON.stringify(event))` -- the aggregator callback parses strings with `JSON.parse()`.
- **CloudPoller keeps polling after session_end:** The `catch` block in `_poll()` MUST call `this.stop()` after emitting `cloud_error`. Not calling stop() causes infinite error loops.
- **Parsing `github_connected`:** That field does not exist. Checking it always results in `undefined` which is falsy -- cloud is always "unavailable". Use `authMethod === 'claude.ai'`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cloud status polling interval management | Custom timer abstraction | Native `setInterval`/`clearInterval` | CloudPoller already encapsulates this cleanly |
| CLI invocation abstraction | Wrapper library | `child_process.execFile` with `_deps` injection | Established pattern throughout dispatcher package |
| JSON parsing of CLI output | Schema validation library | Direct `JSON.parse()` with try/catch | Output is controlled -- validation overhead not warranted |
| Event routing state machine | FSM library | Simple if/else in router | Router has 5 rules maximum |

**Key insight:** This phase adds approximately 150 lines of new code across 5 existing files plus one new 200-line module. The complexity is in the integration contract, not the algorithms. Don't over-engineer it.

## Common Pitfalls

### Pitfall 1: Auth Probe Field Mismatch

**What goes wrong:** Code checks for `github_connected` field that does not exist in `claude auth status --json` output. Probe always returns unavailable. Cloud dispatch never activates.

**Why it happens:** CONTEXT.md decisions were written before verifying the actual CLI schema. The CLI (v2.1.87) does not output `github_connected`.

**How to avoid:** Use `authMethod === 'claude.ai'` as the availability signal. Document the schema divergence in a comment in `remote-managed.cjs`.

**Warning signs:** Test stub for auth returns `{ github_connected: true }` but a real machine with claude.ai auth always reports unavailable.

### Pitfall 2: `claude task` Subcommand Does Not Exist

**What goes wrong:** `claude task start --remote "..."` fails because `task` is not a registered subcommand in v2.1.87. The CLI interprets the text as a prompt instead.

**Why it happens:** The `claude task` API has not shipped yet in the installed CLI version.

**How to avoid:** Because all cloud CLI calls go through `_deps.execCommand`, this is only a problem in production (not tests). `spawnCloudSession()` must catch the exec error and call `onExit(sessionId, 1)` gracefully -- same pattern as `remote-ssh.cjs` handles SSH connection failures in the async IIFE catch block.

**Warning signs:** Integration test passes with stubs but manual cloud dispatch always fails immediately with exit code 1.

### Pitfall 3: RemoteAggregator.start() Receives Wrong onLine Type

**What goes wrong:** `RemoteAggregator.start()` calls `this._onLine(event)` with a parsed object, but the aggregator callback expects a string. The `JSON.parse(line)` in `aggregator.watch()` throws on the object, event is silently dropped.

**Why it happens:** The CloudPoller `_onLine` callback in remote-cloud.cjs passes a parsed object, but TailCursor passes raw string lines.

**How to avoid:** In `RemoteAggregator.start()`, always wrap with `this._onLine(JSON.stringify(event))`.

**Warning signs:** Events dispatched in CloudPoller tests but aggregator.emit('event', ...) never fires in integration test.

### Pitfall 4: Cloud Session Spawns Relay Process

**What goes wrong:** Cloud sessions spawn a relay.cjs child process. Relay tries to tail a file that never gets written to (cloud uses RemoteAggregator/CloudPoller, not file writes). Relay loops or errors.

**Why it happens:** The relay spawn guard in `dispatch()` only excludes `'ssh'` and `'docker'`. Cloud is not excluded.

**How to avoid:** Change `if (backend !== 'ssh' && backend !== 'docker')` to `if (backend !== 'ssh' && backend !== 'docker' && backend !== 'cloud')`.

**Warning signs:** Test CC-02 (skip relay for cloud) fails.

### Pitfall 5: CloudPoller Keeps Polling After Error

**What goes wrong:** CloudPoller polls indefinitely because the error catch block does not call `stop()`. The cloud task is done but polling continues.

**Why it happens:** Missing `this.stop()` call in `_poll()` catch block.

**How to avoid:** Always call `this.stop()` in both the non-running branch AND the catch branch of `_poll()`.

**Warning signs:** Test shows `cloud_error` event emitted but the timer mock continues advancing without stopping.

## Code Examples

### spawnCloudSession skeleton (remote-cloud.cjs)

```javascript
// Source: mirrors remote-ssh.cjs async IIFE + synchronous kill handle pattern
function spawnCloudSession(opts) {
  const execCommand = (opts._deps && opts._deps.execCommand) || defaultExecCommand;
  let poller = null;

  (async () => {
    try {
      const prompt =
        'Execute phase ' + opts.phase + ', plan ' + opts.plan +
        '. Run /gsd:execute-plan ' + opts.phase + ' ' + opts.plan + '.';
      const taskId = await execCommand('claude task start --remote "' + prompt + '"');

      const pollInterval =
        (opts.cloudConfig && opts.cloudConfig.poll_interval) || 5000;

      poller = new CloudPoller(taskId, (event) => {
        opts.onLine(opts.sessionId, event);
        if (event.event_type === 'session_end') {
          opts.onExit(opts.sessionId, 0);
        } else if (event.event_type === 'cloud_error') {
          opts.onExit(opts.sessionId, 1);
        }
      }, { pollInterval: pollInterval, _execCommand: execCommand });
      poller.start();
    } catch (err) {
      opts.onLine(opts.sessionId, {
        type: 'system', subtype: 'cloud_error', message: err.message,
      });
      opts.onExit(opts.sessionId, 1);
    }
  })().catch((err) => {
    opts.onLine(opts.sessionId, {
      type: 'system', subtype: 'cloud_error', message: err.message,
    });
    opts.onExit(opts.sessionId, 1);
  });

  return {
    kill: () => { if (poller) poller.stop(); },
  };
}
```

### Test DI Factory Pattern (coordinator-cloud.test.cjs)

```javascript
// Source: mirrors createDockerTestCoordinator from coordinator-docker.test.cjs
function createCloudTestCoordinator(overrides) {
  const over = overrides || {};
  const tmpRoot = makeTempRoot();
  const { depOverrides = {}, configOverride, ...rest } = over;

  const mockSpawnCloudSession = vi.fn(() => ({ kill: vi.fn() }));

  const defaults = {
    spawnSession: vi.fn(() => ({ pid: 1234, kill: vi.fn() })),
    spawnRemoteSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnDockerSession: vi.fn(() => ({ kill: vi.fn() })),
    spawnCloudSession: mockSpawnCloudSession,
    routeSession: vi.fn().mockResolvedValue('local'),
    readPlanAutonomous: vi.fn().mockReturnValue(true),
    createWorktree: vi.fn((r, sid) => ({
      worktreePath: path.join(r, '.sessions', sid),
      branch: 'pde/session/' + sid,
    })),
    removeWorktree: vi.fn(),
    deleteBranch: vi.fn(),
    mergeSession: vi.fn(() => ({ ok: true })),
    recalculateFromArtifacts: vi.fn(),
    acquireLock: vi.fn(() => ({ acquired: true })),
    releaseLock: vi.fn(),
    analyzeDag: vi.fn().mockResolvedValue({ parallelizable: [], unsafe: [] }),
    checkFileOverlap: vi.fn(() => ({ overlapping: [] })),
    summarizeFailure: vi.fn().mockResolvedValue(''),
    triageConflicts: vi.fn().mockResolvedValue({}),
    pushPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    fetchPlanningState: vi.fn().mockResolvedValue({ ok: true }),
    mergePlanningFromCloud: vi.fn().mockResolvedValue({
      ok: true, conflicts: [], autoResolved: [],
    }),
  };

  const deps = Object.assign({}, defaults, depOverrides);

  const config = configOverride !== undefined
    ? configOverride
    : {
        dispatch: {
          remote: { preferred_backend: 'cloud' },
          cloud: { enabled: true, poll_interval: 50, idle_timeout: 300 },
        },
      };

  const coordinator = new DispatchCoordinator(tmpRoot, {
    maxConcurrent: 3,
    config: config,
    _deps: deps,
    ...rest,
  });

  return { coordinator, deps, tmpRoot };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| remote-managed.cjs always returns unavailable | detectManagedBackend() probes `claude auth status --json` | Phase 193 | Cloud dispatch activates on machines with claude.ai auth |
| RemoteAggregator is a no-op stub | RemoteAggregator wires CloudPoller | Phase 193 | Cloud session events flow to dashboard and tmux |
| Routing: local / docker / ssh / managed | Routing: local / docker / cloud / ssh / managed | Phase 193 | Cloud becomes a first-class routing target |
| sourceLabel: L / D / R | sourceLabel: L / D / C / R | Phase 193 | Cloud sessions show [C] in dashboard and tmux |

**Deprecated/outdated:**
- `github_connected` probe: Not present in `claude auth status --json` output as of v2.1.87. Use `authMethod === 'claude.ai'` instead.
- `--output-format json` flag for auth: Does not exist. Use `--json` flag.

## Open Questions

1. **`claude task start --remote` command existence**
   - What we know: `claude task` is not a registered CLI subcommand in v2.1.87. Invoking it passes the text as a conversational prompt.
   - What's unclear: Whether Anthropic will add `claude task` before this phase ships, or whether a different invocation pattern is correct.
   - Recommendation: Implement `spawnCloudSession()` with `_deps.execCommand` injection and handle exec failure gracefully. All Phase 193 success criteria verify via CLI stubs so tests fully pass regardless. Flag for manual integration testing once the feature ships. The stub-based test suite fully satisfies CLD-01 and CLD-02.

2. **routing_fallback event emission location**
   - What we know: CONTEXT.md says "emit `routing_fallback` system event at each fallback step" but does not specify whether the router or coordinator emits it.
   - What's unclear: Router is currently pure (no EventEmitter). Adding emission there requires injecting an emitter.
   - Recommendation: Emit `routing_fallback` in `coordinator.dispatch()` by comparing the originally-requested backend (from config) with the returned route result. This keeps the router pure. If `preferred_backend === 'cloud'` in config but `routeSession` returns `'ssh'` or `'local'`, emit the fallback event immediately after `routeSession` returns.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v20.20.0 | -- |
| vitest | Test runner | Yes | v4.1.1 | -- |
| claude CLI | Auth probe + task spawn | Yes | v2.1.87 | CLI stub via _deps.execCommand |
| `claude task` subcommand | CLD-01, CLD-02 | No | -- | All tests use stubs; production dispatch fails gracefully |
| `claude auth status --json` | CLD-08 | Yes | v2.1.87 | Returns `{ loggedIn, authMethod, ... }` (no `github_connected`) |

**Missing dependencies with no fallback:**
- None that block test execution. All cloud CLI calls are stubbed.

**Missing dependencies with fallback:**
- `claude task` subcommand: Not available in current CLI. `spawnCloudSession()` catches exec error and calls `onExit(sessionId, 1)`. Tests fully covered by stubs.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLD-01 | dispatch() routes to cloud backend, spawnCloudSession called | unit (DI) | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs` | No -- Wave 0 |
| CLD-02 | CloudPoller stops on non-running status, _handleExit triggered | unit (DI) | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs` | No -- Wave 0 |
| CLD-07 | Fallback chain cloud to ssh to local, routing_fallback event emitted | unit | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs` | No -- Wave 0 |
| CLD-08 | detectManagedBackend() returns available based on authMethod field | unit | `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs` | No -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/coordinator-cloud.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full dispatcher suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/coordinator-cloud.test.cjs` -- covers CLD-01, CLD-02, CLD-07, CLD-08

No framework gaps. vitest.config.ts already includes `tests/dispatcher/` via the `tests/**/*.{test,spec}.{cjs,...}` glob. Only the new test file is missing.

## Sources

### Primary (HIGH confidence)

- Live CLI probe: `claude auth status --json` on v2.1.87 -- actual JSON schema captured; no `github_connected` field present
- `/packages/dispatcher/lib/remote-ssh.cjs` -- async IIFE + synchronous kill handle pattern to mirror
- `/packages/dispatcher/lib/coordinator.cjs` -- _runDockerSession, CLOUD_BACKENDS array, dispatch flow
- `/packages/dispatcher/lib/aggregator.cjs` -- RemoteAggregator stub, watch() selection logic confirmed
- `/packages/dispatcher/lib/remote-router.cjs` -- routing rule structure to extend
- `/tests/dispatcher/coordinator-docker.test.cjs` -- exact test template to mirror

### Secondary (MEDIUM confidence)

- CONTEXT.md specifics section -- CloudPoller and RemoteAggregator code designs (verified compatible with existing interfaces)
- STATE.md decisions -- CLOUD_BACKENDS list, RemoteAggregator/TailCursor split decision

### Tertiary (LOW confidence)

- `claude task start --remote` command syntax -- not verified in running CLI; existence assumed from CONTEXT.md decisions; production behavior unknown until Anthropic ships the feature

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all modules are built-in or already installed; vitest confirmed v4.1.1
- Architecture: HIGH -- all integration points verified against live source files; DI patterns confirmed against coordinator-docker.test.cjs
- Auth probe schema: HIGH -- captured live from `claude auth status --json`; critical divergence from CONTEXT.md documented
- Cloud CLI (`claude task`): LOW -- subcommand does not exist in v2.1.87; all plan tasks must use stubs

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable internal codebase; LOW-confidence `claude task` CLI may stabilize sooner)
