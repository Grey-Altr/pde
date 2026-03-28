# Phase 149: Configuration & Commands - Research

**Researched:** 2026-03-27 (maxdepth update)
**Domain:** Config schema extension, CLI command creation, graceful degradation
**Confidence:** HIGH (all integration points verified in actual source code; no assumptions)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CFG-01 | New `dispatch` config block with enabled, max_local_sessions, max_remote_sessions, remote, routing fields | VALID_CONFIG_KEYS extension; remoteConfig shape already consumed by remote-router.cjs and remote-ssh.cjs; DispatchCoordinator constructor already reads `options.config.dispatch.remote` (line 138) |
| CFG-02 | `/gsd:sessions` command lists active sessions | New `pde:sessions` command + workflow; add `list-sessions` subcommand to pde-tools.cjs; reads registry.getAll() with live PID probing via _isPidAlive() pattern |
| CFG-03 | `/gsd:sessions stop <id>` stops a specific session | Add `stop-session` subcommand to pde-tools.cjs; PID-based SIGTERM for local; manual instructions for remote (SSH kill deferred post-v0.18) |
| CFG-04 | `/gsd:settings` exposes dispatch configuration | Extend existing `workflows/settings.md` to add dispatch section; VALID_CONFIG_KEYS must include dispatch.* before setConfigValue can write them |
| CFG-05 | Graceful degradation: dispatch disabled = exact current behavior | Guard checks at entry points only: pde-tools dispatch case + init.cjs --parallel flag; no changes to coordinator internals |
</phase_requirements>

---

## Summary

Phase 149 is a **configuration + commands layer** on top of the existing dispatcher infrastructure built in Phases 143-148. The coordinator, registry, and remote routing already support all needed functionality — this phase exposes them through config and CLI.

The work breaks into four areas: (1) extend VALID_CONFIG_KEYS with 11 `dispatch.*` keys and wire config reading to the DispatchCoordinator constructor call in pde-tools.cjs (currently missing — the dispatch case creates coordinator without passing config); (2) add two new pde-tools.cjs subcommands (`list-sessions`, `stop-session`) and create `pde:sessions` command/workflow; (3) extend the existing `workflows/settings.md` workflow to include the dispatch config block; (4) add dispatch.enabled guard checks at the two entry points.

**Critical finding from codebase verification:** The `dispatch` case in `pde-tools.cjs` (line 1078) creates `new DispatchCoordinator(cwd, { maxConcurrent, pluginDir })` — it does NOT pass `config`. This means `dispatch.remote` routing is currently non-functional even when set in config.json. Phase 149 must fix this wiring as the core of CFG-01.

**Command naming:** The requirements say `/gsd:sessions` and `/gsd:settings` but ALL 60+ existing PDE commands use the `pde:` namespace (`pde:execute-phase`, `pde:monitor`, `pde:settings`, etc.). The new commands should use `pde:sessions` and extend the existing `pde:settings` to follow convention. The planner must reconcile this with the ROADMAP wording.

**Primary recommendation:** Add 11 config keys, add 2 pde-tools.cjs subcommands, create `pde:sessions` command + workflow, extend `workflows/settings.md`, fix config wiring in dispatch case, add 2 guard checks. No new npm dependencies. Tests go in `tests/dispatcher/`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | Node 20.x (built-in) | Read/write config.json and dispatcher.pids | Existing config.cjs and registry.cjs pattern |
| Node.js process.kill | Node 20.x (built-in) | PID probing and session termination | Existing orphan.cjs + registry.cjs `_isPidAlive()` pattern |
| YAML frontmatter | Claude Code convention | Command/skill file format | All existing pde: commands |

### No New npm Dependencies

Zero new dependencies. All config, registry, and process management code uses Node.js built-ins. The `pde:sessions` command is a markdown file with YAML frontmatter calling pde-tools.cjs subcommands.

---

## Architecture Patterns

### Config System Extension (CFG-01)

**File:** `bin/lib/config.cjs`

The existing config system uses a VALID_CONFIG_KEYS Set (line 14) with dot-notation support via `setConfigValue()`. Current keys include `mode`, `granularity`, `workflow.*`, `monitoring.*`, `experiment_defaults.*`. The `cmdConfigSet` function validates against this set (line 196).

Keys to add:

```javascript
// bin/lib/config.cjs — add to VALID_CONFIG_KEYS
'dispatch.enabled',
'dispatch.max_local_sessions',
'dispatch.max_remote_sessions',
'dispatch.remote.host',
'dispatch.remote.username',
'dispatch.remote.identity_file',
'dispatch.remote.repo_path',
'dispatch.remote.plugin_dir',
'dispatch.remote.preferred_backend',
'dispatch.remote.env',
'dispatch.routing.fallback_to_local',
```

**Config shape in .planning/config.json:**

```json
{
  "dispatch": {
    "enabled": true,
    "max_local_sessions": 3,
    "max_remote_sessions": 5,
    "remote": {
      "host": "remote.example.com",
      "username": "deploy",
      "identity_file": "~/.ssh/id_rsa",
      "repo_path": "/opt/project",
      "plugin_dir": "/opt/claude-pde",
      "preferred_backend": "ssh",
      "env": { "CUSTOM_VAR": "value" }
    },
    "routing": {
      "fallback_to_local": true
    }
  }
}
```

**Why these fields are already "known":** All `dispatch.remote.*` fields are consumed by `routeSession()` in remote-router.cjs (line 33: `opts.remoteConfig`) and `spawnRemoteSession()` in remote-ssh.cjs (lines 44-49). Registering them in VALID_CONFIG_KEYS makes them writable via `/pde:settings` or `pde-tools config-set`.

### Critical Wiring Gap: Config Not Passed to Coordinator

**File:** `bin/pde-tools.cjs` lines 1066-1086 (the `dispatch` case)

Current code (verified against actual source):

```javascript
case 'dispatch': {
  const { DispatchCoordinator } = require('../packages/dispatcher/lib/coordinator.cjs');
  const dispatchPhase = parseInt(args[1], 10);
  const dispatchPlan = parseInt(args[2], 10);
  // ...
  const maxConcurrent = maxConcurrentIdx !== -1 ? parseInt(args[maxConcurrentIdx + 1], 10) : 3;
  const pluginDir = DispatchCoordinator.resolvePluginDir();
  const coord = new DispatchCoordinator(cwd, { maxConcurrent, pluginDir });
  // CONFIG IS NOT PASSED — remote routing, max sessions not applied
  coord.dispatch(dispatchPhase, dispatchPlan).then(...)
```

**Fix required:** Load config before creating coordinator and pass it:

```javascript
case 'dispatch': {
  const { DispatchCoordinator } = require('../packages/dispatcher/lib/coordinator.cjs');
  const { loadConfig } = require('./lib/core.cjs');
  const dispatchPhase = parseInt(args[1], 10);
  const dispatchPlan = parseInt(args[2], 10);
  if (isNaN(dispatchPhase) || isNaN(dispatchPlan)) {
    error('Usage: pde-tools dispatch <phase> <plan> [--max-concurrent N]');
  }

  const config = loadConfig(cwd);

  // CFG-05: Guard — dispatch.enabled=false blocks dispatch
  if (config.dispatch && config.dispatch.enabled === false) {
    error('Dispatch is disabled (dispatch.enabled=false in config.json). Use: pde-tools init execute-phase <phase>');
  }

  const maxConcurrentIdx = args.indexOf('--max-concurrent');
  // CFG-01: Read max_local_sessions from config; --max-concurrent flag overrides
  const configMax = config.dispatch && config.dispatch.max_local_sessions ? config.dispatch.max_local_sessions : 3;
  const maxConcurrent = maxConcurrentIdx !== -1 ? parseInt(args[maxConcurrentIdx + 1], 10) : configMax;
  const pluginDir = DispatchCoordinator.resolvePluginDir();
  const coord = new DispatchCoordinator(cwd, { maxConcurrent, pluginDir, config });
  coord.dispatch(dispatchPhase, dispatchPlan).then(sid => {
    console.log(JSON.stringify({ ok: true, sessionId: sid }));
  }).catch(err => {
    console.error(JSON.stringify({ ok: false, error: err.message }));
    process.exit(1);
  });
  break;
}
```

### New pde-tools Subcommands (CFG-02, CFG-03)

Add two new `case` entries to `bin/pde-tools.cjs`:

**`list-sessions` subcommand:**

```javascript
case 'list-sessions': {
  // node pde-tools.cjs list-sessions
  // Returns JSON array of all sessions with live PID status
  const { SessionRegistry } = require('../packages/dispatcher/lib/registry.cjs');
  const registry = new SessionRegistry(cwd).loadFromDisk();
  const sessions = [];
  for (const [id, entry] of registry.getAll()) {
    let liveStatus = entry.status;
    if (entry.status === 'running' && entry.pid > 0) {
      try { process.kill(entry.pid, 0); }
      catch (e) { if (e.code === 'ESRCH') liveStatus = 'orphaned'; }
    }
    const elapsed = entry.startedAt
      ? Math.floor((Date.now() - new Date(entry.startedAt).getTime()) / 1000)
      : null;
    sessions.push({
      id,
      phase: entry.phase,
      plan: entry.plan,
      status: liveStatus,
      backend: entry.backend || 'local',
      pid: entry.pid || null,
      startedAt: entry.startedAt || null,
      elapsedSeconds: elapsed,
    });
  }
  sessions.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
  output(sessions, raw, sessions.length === 0
    ? 'No sessions found'
    : sessions.map(s => {
        const elapsed = s.elapsedSeconds !== null
          ? `${Math.floor(s.elapsedSeconds / 60)}m ${s.elapsedSeconds % 60}s`
          : '—';
        return `${s.id.padEnd(20)} phase=${s.phase} plan=${s.plan} status=${s.status} backend=${s.backend} elapsed=${elapsed} pid=${s.pid || '—'}`;
      }).join('\n'));
  break;
}
```

**`stop-session` subcommand:**

```javascript
case 'stop-session': {
  // node pde-tools.cjs stop-session <sessionId>
  const sessionId = args[1];
  if (!sessionId) error('Usage: pde-tools stop-session <sessionId>');
  const { SessionRegistry } = require('../packages/dispatcher/lib/registry.cjs');
  const registry = new SessionRegistry(cwd).loadFromDisk();
  const entry = registry.get(sessionId);
  if (!entry) error(`Session not found: ${sessionId}`);
  if (entry.status !== 'running') {
    output({ stopped: false, reason: `Session already ${entry.status}` }, raw,
      `Session already ${entry.status}`);
    break;
  }
  if (entry.backend !== 'local') {
    const msg = `Cannot stop remote session via CLI. SSH to ${entry.remoteHost || 'remote host'} and run: pkill -f '${sessionId}'`;
    output({ stopped: false, remote: true, instructions: msg }, raw, msg);
    break;
  }
  // Guard: never kill PID 0 (remote sessions, unregistered sessions)
  if (entry.pid > 0) {
    try { process.kill(entry.pid, 'SIGTERM'); } catch (_) {}
    // Verify kill and escalate if needed (2s window)
    await new Promise(r => setTimeout(r, 2000));
    try {
      process.kill(entry.pid, 0);
      // Still alive — escalate
      try { process.kill(entry.pid, 'SIGKILL'); } catch (_) {}
    } catch (_) {}
  }
  registry.update(sessionId, { status: 'stopped' });
  const msg = `Session ${sessionId} stopped. Worktree preserved at ${entry.worktreePath}`;
  output({ stopped: true, sessionId, worktreePath: entry.worktreePath }, raw, msg);
  break;
}
```

Note: `stop-session` uses `await` — the `main()` function in pde-tools.cjs handles this via the pattern already established in the `dispatch` case (`.then()` chains). The `stop-session` case must be extracted to an async function or use `.then()`; the existing `dispatch` case demonstrates the pattern.

### Session List/Stop Command (CFG-02, CFG-03)

**File to create:** `commands/sessions.md`

```yaml
---
name: pde:sessions
description: List active dispatch sessions or stop a specific session
argument-hint: "[stop <id>]"
allowed-tools:
  - Bash
  - Read
---
<objective>
List or stop active PDE dispatch sessions.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/sessions.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/sessions.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

**File to create:** `workflows/sessions.md`

The workflow shells out to pde-tools.cjs subcommands to keep logic in testable Node.js code. Pattern matches existing `workflows/settings.md` structure.

### Settings Enhancement (CFG-04)

The existing `workflows/settings.md` workflow presents settings interactively via `AskUserQuestion`. It currently handles: model_profile, workflow.research, workflow.plan_check, workflow.verifier, workflow.auto_advance, workflow.nyquist_validation, workflow.ui_phase, workflow.ui_safety_gate, git.branching_strategy.

**Extension required:** Add a new question group for dispatch settings. The workflow must be modified — it does NOT auto-discover config.json keys. The existing pattern reads specific known keys and presents them as named questions.

New questions to add to the AskUserQuestion call in settings.md:

```
{
  question: "Enable dispatch (parallel session execution)?",
  header: "Dispatch",
  options: [
    { label: "Disabled (Default)", description: "Single-session mode — no behavioral change from pre-v0.18" },
    { label: "Enabled", description: "Use --parallel flag to dispatch concurrent sessions" }
  ]
},
{
  question: "Max local concurrent sessions (when dispatch enabled)?",
  header: "Max Local",
  options: [
    { label: "1" }, { label: "2" }, { label: "3 (Recommended)" },
    { label: "4" }, { label: "5" }
  ]
}
```

Write config using `pde-tools config-set dispatch.enabled true/false` and `pde-tools config-set dispatch.max_local_sessions 3`.

### Graceful Degradation (CFG-05)

Two guard checks at entry points — nowhere else:

**1. pde-tools.cjs `dispatch` case:** (shown in wiring fix above)

**2. init.cjs `cmdInitExecutePhase` when `--parallel` is passed:**

```javascript
// bin/lib/init.cjs — inside cmdInitExecutePhase
const isParallel = !!(opts && opts.parallel);
if (isParallel) {
  const config = loadConfig(cwd);  // already loaded above
  if (config.dispatch && config.dispatch.enabled === false) {
    error('Dispatch disabled (dispatch.enabled=false in .planning/config.json). Cannot use --parallel flag.');
  }
}
```

**Default when dispatch block absent from config:** `dispatch.enabled` defaults to `true` when the key is absent — matching pre-v0.18 behavior where dispatch was unconditionally available via `--parallel`. Do not add dispatch block to `ensureConfigFile()` defaults — existing users should not get an unexpected config change.

**No registry writes when dispatch is disabled** — `.planning/dispatcher.pids` is never created/updated. Existing file (from prior sessions) is left alone.

### Recommended Project Structure

```
commands/
├── sessions.md              # NEW: /pde:sessions command YAML
workflows/
├── sessions.md              # NEW: session list/stop workflow logic
├── settings.md              # MODIFIED: add dispatch settings questions
bin/lib/
├── config.cjs               # MODIFIED: add dispatch.* to VALID_CONFIG_KEYS
bin/
├── pde-tools.cjs            # MODIFIED: fix config wiring, add list-sessions + stop-session cases, add guard
├── lib/init.cjs             # MODIFIED: add dispatch.enabled guard when --parallel
packages/dispatcher/lib/
├── coordinator.cjs          # NO CHANGE: already reads options.config.dispatch.remote (line 138)
```

### Anti-Patterns to Avoid

- **Checking dispatch.enabled in coordinator internals:** Only check at entry points (pde-tools dispatch case, init.cjs --parallel). Once inside coordinator, dispatch is assumed enabled.
- **Deleting dispatcher.pids when dispatch is disabled:** Leave it alone — it's harmless and useful for debugging past sessions.
- **Killing PID 0:** Remote sessions store `pid: 0`. Guard with `if (entry.pid > 0)` before `process.kill()` — `process.kill(0, 'SIGTERM')` sends SIGTERM to the entire process group.
- **Silent --parallel ignore:** Don't silently ignore `--parallel` when dispatch is disabled. Fail loud so the user knows their config is mismatched.
- **Hardcoding defaults in multiple places:** `dispatch.max_local_sessions` default (3) belongs only in the pde-tools dispatch case fallback, not scattered across coordinator.cjs.
- **Adding dispatch block to ensureConfigFile():** This would modify config.json for all existing users on next run. Do NOT do this. The dispatch block should only appear in config.json when the user explicitly sets it.
- **Using `gsd:` namespace for new commands:** ALL existing 60+ commands use `pde:` prefix. New commands MUST use `pde:sessions` (not `gsd:sessions`). The ROADMAP wording uses `gsd:` colloquially but the implementation convention is `pde:`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config validation | Custom validator for dispatch fields | VALID_CONFIG_KEYS set membership check in config.cjs | Established pattern, dot-notation support already works (verified line 196) |
| Session table formatting | Custom table renderer | Template literals with padEnd() in pde-tools output | Same approach as all existing pde-tools output |
| PID liveness check | Custom health monitor | `process.kill(pid, 0)` in try/catch | Standard POSIX pattern; already implemented as `_isPidAlive()` in registry.cjs (line 176) |
| Remote session kill | SSH exec in sessions command | Manual instructions for user | Complex (needs credentials), deferred to post-v0.18 |
| Session list logic | Inline workflow bash | `pde-tools list-sessions` subcommand | Keeps logic testable in CJS; workflow stays thin shell wrapper |

---

## Common Pitfalls

### Pitfall 1: Dispatch Disabled but Old Registry Exists

**What goes wrong:** User disables dispatch, but `.planning/dispatcher.pids` from a previous session exists. `/pde:sessions` reads it and shows stale data.

**How to avoid:** Check `dispatch.enabled` before reading registry. If disabled, return "Dispatch disabled" without reading the file.

**Warning signs:** User sees sessions listed that they know are gone.

### Pitfall 2: Killing PID 0 on Remote Sessions

**What goes wrong:** Remote sessions have `pid: 0` in registry (confirmed in coordinator.cjs: "5. Register in registry (with placeholder pid 0)"). `process.kill(0, 'SIGTERM')` sends SIGTERM to the entire process group (all processes in current group) — catastrophic.

**How to avoid:** Always guard: `if (entry.pid > 0)` before any `process.kill()` call. This is the same pattern used by `_isPidAlive()` in registry.cjs.

### Pitfall 3: Config Corruption

**What goes wrong:** config.json is malformed JSON. `loadConfig()` throws; init.cjs or pde-tools crashes.

**How to avoid:** Existing `loadConfig()` wraps JSON.parse in try/catch and returns defaults when file is unreadable. Verify the dispatch block being absent (no dispatch key in config) is treated identically to `dispatch.enabled = true` — the default is enabled.

### Pitfall 4: Race Between Stop and Completion

**What goes wrong:** User runs `pde-tools stop-session p149-1-abc` just as the session completes naturally. The PID is gone (ESRCH), but completion artifacts haven't been merged yet.

**How to avoid:** Check status before killing. If status is already `complete` or `merge_pending`, don't kill — return "Session already {status}". The `stop-session` case must read fresh status from disk before acting.

### Pitfall 5: `stop-session` Async Pattern in CJS pde-tools

**What goes wrong:** `pde-tools.cjs` uses a synchronous `switch` dispatch in `main()`. The `stop-session` case needs `await` for the 2-second kill-verify window.

**How to avoid:** Extract the stop logic into an async function and call it with `.then()/.catch()`, matching the existing `dispatch` case pattern at line 1079. Do NOT add `await` at the top level of the `switch` block — it breaks the synchronous dispatch pattern.

### Pitfall 6: Wrong Command Namespace

**What goes wrong:** Developer creates `commands/gsd-sessions.md` with `name: gsd:sessions` following the ROADMAP wording. This creates a command under an unknown namespace that doesn't match the installed plugin.

**How to avoid:** Use `name: pde:sessions` — all existing commands verified to use `pde:` prefix. The ROADMAP says `gsd:sessions` colloquially (the project is built with the GSD engine) but the plugin's command namespace is `pde:`.

### Pitfall 7: Missing `async` in stop-session due to setTimeout

**What goes wrong:** The `stop-session` case uses `setTimeout` wrapped in a Promise for the kill verification delay. If the case isn't properly async, the process exits before the verification completes.

**How to avoid:** Wrap in an immediately-invoked async function and resolve before calling `output()`. Or use the simpler approach: omit the verify step for MVP, just SIGTERM and update registry — let the next `list-sessions` call show the updated status via PID probe.

---

## Code Examples

Verified patterns from actual source code:

### VALID_CONFIG_KEYS Extension

```javascript
// bin/lib/config.cjs — extend the Set at line 14
const VALID_CONFIG_KEYS = new Set([
  // ... existing keys unchanged ...
  'dispatch.enabled',
  'dispatch.max_local_sessions',
  'dispatch.max_remote_sessions',
  'dispatch.remote.host',
  'dispatch.remote.username',
  'dispatch.remote.identity_file',
  'dispatch.remote.repo_path',
  'dispatch.remote.plugin_dir',
  'dispatch.remote.preferred_backend',
  'dispatch.remote.env',
  'dispatch.routing.fallback_to_local',
]);
```

Source: verified against `bin/lib/config.cjs` lines 14-30 (actual file).

### DispatchCoordinator Constructor — Already Reads dispatch.remote

```javascript
// packages/dispatcher/lib/coordinator.cjs line 138 — already wired
this._remoteConfig = (options.config && options.config.dispatch && options.config.dispatch.remote) || null;
```

This means the coordinator ALREADY handles the dispatch.remote block correctly — the only missing link is `pde-tools.cjs` not passing `config` to the constructor. Phase 149 only needs to fix the pde-tools wiring.

Source: verified against `packages/dispatcher/lib/coordinator.cjs` lines 102-140.

### Registry getAll() Return Shape

```javascript
// packages/dispatcher/lib/registry.cjs line 125
getAll() {
  return new Map(this._map);  // copy, not reference
}
// Entry shape (from _flush and register):
// { pid, phase, plan, worktreePath, branch, status, startedAt, backend?, remoteHost? }
```

Source: verified against `packages/dispatcher/lib/registry.cjs` lines 75-84 and 125-127.

### PID Liveness Check (existing pattern)

```javascript
// packages/dispatcher/lib/registry.cjs lines 176-185
function _isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code !== 'ESRCH';  // EPERM = alive but no permission
  }
}
```

Use this pattern (or import the function) in `list-sessions`. Source: verified.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Config keys as flat top-level | Nested dot-notation blocks (workflow.*, monitoring.*) | Phase 58+ | New dispatch.* block follows this pattern |
| Tests in tests/phase-NNN/ | Dispatcher tests in tests/dispatcher/ | Phase 143+ | Phase 149 tests MUST go in tests/dispatcher/, not tests/phase-149/ |
| Command name: gsd:* | All commands use pde:* prefix | All phases | New sessions command must use pde:sessions |

**Verified test file pattern for v0.18 phases:**

All phases 143-148 created their tests in `tests/dispatcher/`. Confirmed files:
- `tests/dispatcher/registry.test.cjs` (Phase 143)
- `tests/dispatcher/spawn.test.cjs` (Phase 144)
- `tests/dispatcher/coordinator-smoke.test.cjs` (Phase 144)
- `tests/dispatcher/remote-router.test.cjs` (Phase 146)
- `tests/dispatcher/tmux-fanout.test.cjs` (Phase 148)

There are NO `tests/phase-143/` through `tests/phase-148/` directories. Phase 149 tests MUST go in `tests/dispatcher/`.

---

## Open Questions

1. **Command naming: `pde:sessions` vs `gsd:sessions`**
   - What we know: ROADMAP says `gsd:sessions`; all 60+ existing commands use `pde:` prefix; no `gsd:` commands exist in the plugin
   - What's unclear: Whether this phase is intentionally adding a new `gsd:` namespace, or whether ROADMAP uses `gsd:` colloquially
   - Recommendation: Use `pde:sessions` to match convention. Planner should note this discrepancy and document the decision.

2. **Settings workflow: AskUserQuestion for dispatch vs direct cat**
   - What we know: `workflows/settings.md` uses interactive AskUserQuestion; just `cat .planning/config.json` for dispatch inspection is simpler
   - What's unclear: Whether CFG-04 requires interactive dispatch editing or just display
   - Recommendation: Extend the existing interactive settings workflow with dispatch enable/max_local questions. Don't create a separate dispatch-only settings view.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Config loading, PID probing, registry | Yes | v20.20.0 | — |
| process.kill() | PID liveness check and session stop | Yes (POSIX) | built-in | — |
| VALID_CONFIG_KEYS pattern | Config validation | Yes (bin/lib/config.cjs) | — | — |
| SessionRegistry | Session list/stop | Yes (packages/dispatcher/lib/registry.cjs) | — | — |
| loadConfig() | Config reading in pde-tools dispatch case | Yes (bin/lib/core.cjs) | — | — |

**Missing dependencies with no fallback:** None. All functionality uses Node.js built-ins and existing PDE modules.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 |
| Config file | vitest.config.ts (project root) |
| Test include pattern | `tests/**/*.{test,spec}.{cjs,mjs,js,ts}` |
| Quick run command | `npx vitest run tests/dispatcher/config-dispatch.test.cjs tests/dispatcher/sessions.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

**CRITICAL:** Tests MUST go in `tests/dispatcher/`, NOT `tests/phase-149/`. Verified: all phases 143-148 used `tests/dispatcher/` exclusively. There is NO `tests/phase-143/` through `tests/phase-148/` directory.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | VALID_CONFIG_KEYS includes all 11 dispatch.* keys | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-01 | setConfigValue writes dispatch.max_local_sessions to config.json | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-01 | DispatchCoordinator reads dispatch config from options.config | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-02 | list-sessions subcommand returns session array with live status | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | No — Wave 0 |
| CFG-02 | list-sessions marks orphaned sessions (dead PID) | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | No — Wave 0 |
| CFG-03 | stop-session sends SIGTERM to local session PID | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | No — Wave 0 |
| CFG-03 | stop-session returns manual instructions for remote sessions | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | No — Wave 0 |
| CFG-03 | stop-session guards against pid=0 | unit | `npx vitest run tests/dispatcher/sessions.test.cjs` | No — Wave 0 |
| CFG-05 | dispatch case errors when dispatch.enabled=false | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-05 | --parallel flag errors when dispatch.enabled=false | unit | `npx vitest run tests/dispatcher/config-dispatch.test.cjs` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/dispatcher/config-dispatch.test.cjs tests/dispatcher/sessions.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- `tests/dispatcher/config-dispatch.test.cjs` — covers CFG-01, CFG-05 guard checks
- `tests/dispatcher/sessions.test.cjs` — covers CFG-02 (list), CFG-03 (stop), PID guard

*(CFG-04 settings workflow extension is tested via source-inspection pattern, matching the Phase 147 precedent in failure-card.test.ts)*

---

## Integration Points Summary

### Files to Modify

| File | Changes | Verified Location |
|------|---------|-------------------|
| `bin/lib/config.cjs` | Add 11 dispatch.* keys to VALID_CONFIG_KEYS | lines 14-30 |
| `bin/pde-tools.cjs` | Fix config wiring in dispatch case; add list-sessions + stop-session cases; add dispatch.enabled guard | lines 1066-1086 |
| `bin/lib/init.cjs` | Add dispatch.enabled guard when --parallel flag passed | line 14 (isParallel check) |
| `workflows/settings.md` | Add dispatch enable/max_local questions to AskUserQuestion call | interactive workflow |

### Files to Create

| File | Purpose |
|------|---------|
| `commands/sessions.md` | `/pde:sessions` command YAML (name: pde:sessions) |
| `workflows/sessions.md` | Session list/stop workflow — thin wrapper calling pde-tools subcommands |
| `tests/dispatcher/config-dispatch.test.cjs` | Config extension + guard check unit tests |
| `tests/dispatcher/sessions.test.cjs` | Session list/stop unit tests |

### Files Unchanged

| File | Why No Changes |
|------|----------------|
| `packages/dispatcher/lib/coordinator.cjs` | Already reads `options.config.dispatch.remote` (line 138); no changes needed |
| `packages/dispatcher/lib/registry.cjs` | `getAll()`, `get()`, `update()` already support all CFG-02/03 needs |
| `packages/dispatcher/lib/remote-router.cjs` | Already consumes remoteConfig — fixing wiring in pde-tools is sufficient |
| `packages/dispatcher/lib/remote-ssh.cjs` | Already consumes remoteConfig fields |

---

## Sources

### Primary (HIGH confidence)

All claims verified against actual source files:

- `bin/lib/config.cjs` — VALID_CONFIG_KEYS pattern (lines 14-30), setConfigValue dot-notation (lines 147-179), ensureConfigFile (lines 51-123)
- `packages/dispatcher/lib/coordinator.cjs` — constructor options.config consumption (lines 102-140), confirmed `_remoteConfig` read at line 138
- `packages/dispatcher/lib/registry.cjs` — getAll(), get(), update() methods; `_isPidAlive()` function (lines 176-185); dispatcher.pids JSON shape
- `packages/dispatcher/lib/remote-router.cjs` — routeSession remoteConfig shape (line 33-46)
- `bin/pde-tools.cjs` — dispatch case actual source (lines 1066-1086): confirmed config NOT passed to constructor
- `bin/lib/init.cjs` — cmdInitExecutePhase source (lines 10-88), isParallel flag at line 14, loadConfig() call at line 16
- `commands/settings.md` — `name: pde:settings` (verified line 2)
- `workflows/settings.md` — full interactive settings workflow; requires explicit extension for dispatch
- All commands sampled: `execute-phase.md`, `plan-phase.md`, `autonomous.md`, `monitor.md` — ALL use `pde:` prefix
- `tests/dispatcher/` directory listing — confirmed all v0.18 tests in this location; NO phase-143 through phase-148 test dirs exist

---

## Project Constraints (from STATE.md Accumulated Context)

- `packages/dispatcher/` is CJS — no ESM unless dynamic import() bridge
- Plugin root (bin/) stays zero-npm-dependency — bash scripts and node built-ins only
- DI via constructor parameter injection for testability (not vi.mock)
- Array args to child_process — no shell interpolation in spawn calls
- All new modules follow existing naming patterns
- Tests for dispatcher phases go in `tests/dispatcher/`, NOT `tests/phase-NNN/`
- New commands use `pde:` namespace prefix, NOT `gsd:` (despite ROADMAP wording)

---

## Metadata

**Confidence breakdown:**
- Config system extension: HIGH — VALID_CONFIG_KEYS is well-established; extension is mechanical; verified current key set
- Config wiring fix (critical): HIGH — confirmed gap in actual pde-tools.cjs line 1078; fix is straightforward
- pde-tools subcommands: HIGH — new cases follow existing pattern (dispatch case); registry API verified
- Sessions command: HIGH — follows exact same pattern as existing settings.md/workflows/settings.md pair
- Settings workflow extension: HIGH — workflow structure verified; know exactly where to add dispatch questions
- Graceful degradation: HIGH — two guard checks at entry points; existing code path untouched when disabled
- Test file location: HIGH — confirmed tests/dispatcher/ pattern; all phases 143-148 verified to use it
- Command namespace: HIGH — all 60+ commands use pde:; ROADMAP gsd: wording is colloquial, not prescriptive

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (config patterns and registry API are stable; Node.js built-ins are stable)
