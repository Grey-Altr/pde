# Phase 193: Cloud Web Backend - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Smart discuss (grey area proposals accepted)

<domain>
## Phase Boundary

Users can dispatch an autonomous phase to an Anthropic-managed cloud VM via claude --remote, receive synthetic NDJSON progress events via CloudPoller, and have the container auto-teardown with state synced back on completion.

</domain>

<decisions>
## Implementation Decisions

### Cloud Session Lifecycle
- **Cloud dispatch module:** New `packages/dispatcher/lib/remote-cloud.cjs` — parallel to remote-ssh.cjs, contains spawnCloudSession() + CloudPoller
- **Session spawn:** Shell out to `claude task start --remote "<prompt>"` via child_process — captures task ID from stdout, all auth handled by CLI
- **Status polling:** CloudPoller class polling `claude task status <id> --json` every 5 seconds — emits synthetic NDJSON events (cloud_heartbeat, session_end, cloud_error) to aggregator's onLine callback
- **RemoteAggregator:** Wire CloudPoller INTO RemoteAggregator — RemoteAggregator.start() creates a CloudPoller that calls the onLine callback with synthetic events; RemoteAggregator.stop() clears the polling interval

### Auth Probe & Fallback
- **Cloud availability detection:** `claude auth status --output-format json` — parse for github_connected field; if command fails or no GitHub auth, return unavailable
- **Fallback chain:** cloud → SSH → local — if cloud probe returns unavailable, try SSH if configured, else fall to local; emit `routing_fallback` system event at each fallback step
- **Testing strategy:** CLI stub injection via `_deps.execCommand` on all functions — never call real `claude` CLI in tests; fixture JSON responses for auth/task commands

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/remote-ssh.cjs` — Pattern to mirror: async IIFE + sync kill handle, NDJSON write, onLine/onExit
- `packages/dispatcher/lib/remote-managed.cjs` — Stub with detectManagedBackend(); to be populated
- `packages/dispatcher/lib/remote-router.cjs` — Routing tree; 'managed' probe already exists, needs cloud routing
- `packages/dispatcher/lib/aggregator.cjs` — RemoteAggregator stub (no-op start/stop); cloud routes here
- `packages/dispatcher/lib/coordinator.cjs` — CLOUD_BACKENDS array, dispatch flow, _handleExit with sync
- `packages/dispatcher/lib/sync.cjs` — pushPlanningState/fetchPlanningState/mergePlanningFromCloud (Phase 192)

### Established Patterns
- CLI stub injection: `_deps.execCommand` function parameter for testability
- Async IIFE + synchronous kill handle return (remote-ssh.cjs)
- Synthetic NDJSON: events written to `/tmp/pde-session-{relayId}.ndjson` for aggregator
- RemoteAggregator selected when `sessionType === 'cloud'` in aggregator.cjs
- Routing fallback: probe → if unavailable, fall through to next rule
- System events: `{ type: 'system', subtype: 'routing_fallback', from: 'cloud', to: 'ssh' }`

### Integration Points
- `remote-managed.cjs` — replace stub detectManagedBackend() with real OAuth probe
- `remote-router.cjs` — add 'cloud' routing target with fallback chain
- `coordinator.cjs` — add `_runCloudSession()` method, import spawnCloudSession
- `aggregator.cjs` — populate RemoteAggregator with CloudPoller wiring
- `tmux-fanout.cjs` — sourceLabel('cloud') should return 'C'
- Config keys: dispatch.cloud.enabled, dispatch.cloud.idle_timeout, dispatch.cloud.poll_interval

</code_context>

<specifics>
## Specific Ideas

### CloudPoller Design
```javascript
class CloudPoller {
  constructor(taskId, onLine, opts = {}) {
    this._taskId = taskId;
    this._onLine = onLine;
    this._interval = opts.pollInterval || 5000;
    this._execCommand = opts._execCommand || defaultExecCommand;
    this._timer = null;
  }
  start() {
    this._timer = setInterval(() => this._poll(), this._interval);
  }
  stop() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
  async _poll() {
    const status = await this._execCommand(`claude task status ${this._taskId} --json`);
    const parsed = JSON.parse(status);
    this._onLine({
      event_type: parsed.status === 'running' ? 'cloud_heartbeat' : 'session_end',
      session_id: this._taskId,
      ts: new Date().toISOString(),
      cloud_status: parsed.status,
    });
    if (parsed.status !== 'running') this.stop();
  }
}
```

### RemoteAggregator Wiring
```javascript
class RemoteAggregator {
  constructor(filePath, onLine) {
    this._filePath = filePath;
    this._onLine = onLine;
    this._poller = null;
  }
  start(pollInterval, opts = {}) {
    // Extract taskId from filePath convention: /tmp/pde-session-{taskId}.ndjson
    const taskId = path.basename(this._filePath, '.ndjson').replace('pde-session-', '');
    this._poller = new CloudPoller(taskId, (event) => {
      this._onLine(JSON.stringify(event));
    }, { pollInterval, ...opts });
    this._poller.start();
  }
  stop() {
    if (this._poller) this._poller.stop();
  }
}
```

</specifics>

<deferred>
## Deferred Ideas

- Real NDJSON streaming from cloud (requires Anthropic API changes) — future
- Multi-region cloud dispatch — out of scope for v0.24
- Cloud session cost tracking/billing integration — future milestone

</deferred>
