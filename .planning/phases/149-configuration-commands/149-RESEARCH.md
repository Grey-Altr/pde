# Phase 149: Configuration & Commands - Research

**Researched:** 2026-03-27
**Domain:** Config schema extension, CLI command creation, graceful degradation
**Confidence:** HIGH (all integration points verified in existing codebase; patterns established in prior phases)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CFG-01 | New `dispatch` config block with enabled, max_local_sessions, max_remote_sessions, remote, routing fields | VALID_CONFIG_KEYS extension + ensureConfigFile() default; remoteConfig shape already consumed by router/ssh |
| CFG-02 | `/gsd:sessions` command lists active sessions | New command + workflow reading registry.getAll() with live PID probing |
| CFG-03 | `/gsd:sessions stop <id>` stops a specific session | PID-based SIGTERM for local; manual instructions for remote (SSH kill deferred) |
| CFG-04 | `/gsd:settings` exposes dispatch configuration | Existing /pde:settings workflow reads config.json; dispatch block auto-visible once added |
| CFG-05 | Graceful degradation: dispatch disabled = exact current behavior | Check dispatch.enabled in init.cjs and pde-tools.cjs dispatch command; error loudly on --parallel when disabled |
</phase_requirements>

---

## Summary

Phase 149 is a **configuration + commands layer** on top of the existing dispatcher infrastructure built in Phases 143-146. The coordinator, registry, and remote routing already support all needed functionality — this phase exposes them through config and CLI.

The work breaks into three areas: (1) extend VALID_CONFIG_KEYS with a `dispatch` block and wire it to the DispatchCoordinator constructor, (2) create `/gsd:sessions` command for listing/stopping sessions via registry inspection, (3) ensure `dispatch.enabled=false` makes the system behave identically to pre-v0.18.

**Primary recommendation:** Add 11 new config keys to VALID_CONFIG_KEYS, create one new command file + workflow, and add 3 guard checks (pde-tools dispatch command, init.cjs --parallel flag, /gsd:sessions commands). No new npm dependencies.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs | Node 20.x (built-in) | Read/write config.json and dispatcher.pids | Existing config.cjs and registry.cjs pattern |
| Node.js process.kill | Node 20.x (built-in) | PID probing and session termination | Existing orphan.cjs pattern |
| YAML frontmatter | Claude Code convention | Command/skill file format | All existing /gsd: and /pde: commands |

### No New npm Dependencies

Zero new dependencies. All config, registry, and process management code uses Node.js built-ins. The `/gsd:sessions` command is a markdown file with YAML frontmatter calling existing pde-tools.cjs subcommands.

---

## Architecture Patterns

### Config System Extension (CFG-01)

**File:** `bin/lib/config.cjs`

The existing config system uses a VALID_CONFIG_KEYS Set with dot-notation support. Current keys include `mode`, `granularity`, `workflow.*`, `monitoring.*`, `experiment_defaults.*`.

New keys to add:

```javascript
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

**Config shape:**

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

**Why these fields:** All `dispatch.remote.*` fields are already consumed by `routeSession()` (remote-router.cjs line 33) and `spawnRemoteSession()` (remote-ssh.cjs lines 44-49). We just need to register them in VALID_CONFIG_KEYS and wire config to the coordinator constructor.

### Config Wiring to DispatchCoordinator

**File:** `packages/dispatcher/lib/coordinator.cjs` (line 130)

Currently reads: `this._remoteConfig = (options.config && options.config.dispatch && options.config.dispatch.remote) || null;`

Extend to also read:

```javascript
this._dispatchConfig = options.config && options.config.dispatch ? options.config.dispatch : null;
this._dispatchEnabled = this._dispatchConfig ? this._dispatchConfig.enabled !== false : true;
this._maxLocalSessions = this._dispatchConfig ? (this._dispatchConfig.max_local_sessions || 3) : 3;
this._maxRemoteSessions = this._dispatchConfig ? (this._dispatchConfig.max_remote_sessions || 0) : 0;
```

**File:** `bin/pde-tools.cjs` (line 677) — currently passes `maxConcurrent` directly; needs to load config and pass the dispatch block.

### Session List Command (CFG-02)

**File to create:** `commands/gsd-sessions.md`

```yaml
---
name: gsd:sessions
description: List active dispatch sessions
argument-hint: "[stop <id>]"
allowed-tools: [Bash, Read]
---
```

The workflow reads `.planning/dispatcher.pids` via `SessionRegistry.getAll()` and formats output. For each session with `status: "running"`, probe the PID with `process.kill(pid, 0)` to verify liveness (existing pattern from orphan.cjs).

**Output format:**

```
ID              Phase  Plan  Status   Backend  Elapsed    PID
p149-1-abc123   149    1     running  local    2m 34s     12345
p149-2-def456   149    2     running  ssh      1m 12s     —
p148-1-ghi789   148    1     complete local    —          —

3 sessions (2 running, 1 complete)
```

### Session Stop (CFG-03)

**Three-step flow:**

1. Load registry, find session by ID
2. If `backend === 'local'`: `process.kill(pid, 'SIGTERM')`, wait 2s, verify with `process.kill(pid, 0)`, escalate to SIGKILL if needed
3. Update registry: `entry.status = 'stopped'`

For remote sessions: return manual instructions ("Cannot stop remote session. SSH to {host} and kill: `pkill -f 'p{sessionId}'`"). Full remote kill deferred to post-v0.18.

### Settings Enhancement (CFG-04)

The existing `/pde:settings` workflow reads all of config.json. Once the `dispatch` block is added to config, it automatically appears in settings output. No workflow changes needed — just verify the display includes the dispatch section.

### Graceful Degradation (CFG-05)

Three guard checks:

1. **pde-tools.cjs dispatch command:** Check `dispatch.enabled` before dispatching. If false: `error('Dispatch is disabled. Use: pde-tools init execute-phase <phase>')`

2. **init.cjs cmdInitExecutePhase:** Check `dispatch.enabled` when `--parallel` is passed. If disabled: error loudly ("Dispatch disabled, cannot use --parallel") — fail-fast prevents user confusion.

3. **/gsd:sessions commands:** Return "Dispatch disabled. No sessions to manage." when dispatch.enabled is false.

**No registry writes** when dispatch is disabled — `.planning/dispatcher.pids` is never created/updated.

### Recommended Project Structure

```
commands/
├── gsd-sessions.md          # NEW: /gsd:sessions command YAML
workflows/
├── gsd-sessions.md          # NEW: session list/stop workflow logic
bin/lib/
├── config.cjs               # MODIFIED: add dispatch.* to VALID_CONFIG_KEYS
bin/
├── pde-tools.cjs            # MODIFIED: wire config to coordinator, add dispatch.enabled guard
├── lib/init.cjs             # MODIFIED: add dispatch.enabled guard for --parallel
packages/dispatcher/lib/
├── coordinator.cjs           # MODIFIED: read dispatch config in constructor
```

### Anti-Patterns to Avoid

- **Checking dispatch.enabled in every dispatcher module:** Only check at the entry points (pde-tools.cjs, init.cjs). Once inside the coordinator, dispatch is assumed enabled.
- **Deleting dispatcher.pids when dispatch is disabled:** Leave it alone. Old registry is harmless and useful for debugging.
- **Trying to kill PID 0:** Remote sessions store `pid: 0` in the registry. Guard with `if (entry.pid > 0)` before `process.kill()`.
- **Silent --parallel ignore:** Don't silently ignore --parallel when dispatch is disabled. Fail loud so the user knows their config is wrong.
- **Hardcoding defaults in multiple places:** Define defaults once in config.cjs `ensureConfigFile()`, not scattered across coordinator.cjs and pde-tools.cjs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config validation | Custom validator for dispatch fields | VALID_CONFIG_KEYS set membership check | Established pattern, dot-notation support already works |
| Session table formatting | Custom table renderer | Template literals with padEnd() | Same approach as existing pde-tools output |
| PID liveness check | Custom health monitor | `process.kill(pid, 0)` in try/catch | Standard POSIX pattern, already in orphan.cjs |
| Remote session kill | SSH exec in /gsd:sessions | Manual instructions for user | Complex (needs credentials), deferred to post-v0.18 |

---

## Common Pitfalls

### Pitfall 1: Dispatch Disabled but Old Registry Exists

**What goes wrong:** User disables dispatch, but `.planning/dispatcher.pids` from a previous session exists. `/gsd:sessions list` reads it and shows stale data.

**How to avoid:** Check `dispatch.enabled` before reading registry. If disabled, return "Dispatch disabled" without reading the file.

### Pitfall 2: Killing PID 0 on Remote Sessions

**What goes wrong:** Remote sessions have `pid: 0` in registry. `process.kill(0, 'SIGTERM')` sends SIGTERM to the entire process group (all processes in current group).

**How to avoid:** Guard: `if (entry.pid > 0) { process.kill(entry.pid, 'SIGTERM'); }` — never call kill on pid 0.

### Pitfall 3: Config Corruption

**What goes wrong:** config.json is malformed JSON. The config loader crashes, taking down init.cjs.

**How to avoid:** Existing `loadConfig()` wraps JSON.parse in try/catch and returns defaults. Verify this handles the dispatch block being absent (should be equivalent to `dispatch.enabled = true` — default is enabled, matching pre-v0.18 behavior where dispatch was unconditionally available).

### Pitfall 4: Race Between Stop and Completion

**What goes wrong:** User runs `/gsd:sessions stop p149-1-abc` just as the session completes naturally. The PID is gone (ESRCH), but the session's completion artifacts haven't been merged yet.

**How to avoid:** Check status before killing. If status is already `complete` or `merge_pending`, don't kill — report "Session already completed."

### Pitfall 5: ensureConfigFile() Overwriting User Config

**What goes wrong:** Adding a default `dispatch` block to `ensureConfigFile()` overwrites existing user config on next run.

**How to avoid:** `ensureConfigFile()` only runs when config.json doesn't exist. Once it exists, the function is a no-op. Verify this behavior. For adding dispatch defaults to an existing config, use a migration pattern (check if `dispatch` key exists, add if not).

---

## Code Examples

### Adding Dispatch Config Keys

```javascript
// bin/lib/config.cjs — add to VALID_CONFIG_KEYS
const VALID_CONFIG_KEYS = new Set([
  // ... existing keys ...
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

### Guard Check in pde-tools.cjs

```javascript
// bin/pde-tools.cjs — dispatch command
case 'dispatch': {
  const config = loadConfig(cwd);
  if (config.dispatch && config.dispatch.enabled === false) {
    error('Dispatch is disabled (dispatch.enabled=false in config.json). Use: pde-tools init execute-phase <phase>');
  }
  // ... proceed with dispatch
}
```

### Guard Check in init.cjs

```javascript
// bin/lib/init.cjs — cmdInitExecutePhase
const isParallel = !!(opts && opts.parallel);
if (isParallel) {
  const config = loadConfig(cwd);
  if (config.dispatch && config.dispatch.enabled === false) {
    error('Dispatch disabled (dispatch.enabled=false). Cannot use --parallel flag.');
  }
}
```

### Session List with PID Probing

```javascript
// Example for workflow/CLI
function listSessions(projectRoot) {
  const registry = new SessionRegistry(projectRoot).loadFromDisk();
  const sessions = registry.getAll();
  const result = [];
  for (const [id, entry] of sessions) {
    let liveStatus = entry.status;
    if (entry.status === 'running' && entry.pid > 0) {
      try { process.kill(entry.pid, 0); } catch (e) {
        if (e.code === 'ESRCH') liveStatus = 'orphaned';
      }
    }
    result.push({ id, phase: entry.phase, plan: entry.plan, pid: entry.pid,
      status: liveStatus, backend: entry.backend || 'local', startedAt: entry.startedAt });
  }
  return result.sort((a, b) => (a.startedAt || '').localeCompare(b.startedAt || ''));
}
```

### Session Stop

```javascript
// Example for workflow/CLI
function stopSession(projectRoot, sessionId) {
  const registry = new SessionRegistry(projectRoot).loadFromDisk();
  const entry = registry.get(sessionId);
  if (!entry) throw new Error(`Session not found: ${sessionId}`);
  if (entry.status !== 'running') return `Session already ${entry.status}`;
  if (entry.backend !== 'local') {
    return `Cannot stop remote session. SSH to ${entry.remoteHost} and kill: pkill -f '${sessionId}'`;
  }
  if (entry.pid > 0) {
    try { process.kill(entry.pid, 'SIGTERM'); } catch (_) {}
    // Wait briefly, then check
    setTimeout(() => {
      try { process.kill(entry.pid, 0); process.kill(entry.pid, 'SIGKILL'); } catch (_) {}
    }, 2000);
  }
  registry.update(sessionId, { status: 'stopped' });
  return `Session ${sessionId} stopped. Worktree preserved at ${entry.worktreePath}`;
}
```

### Command File

```yaml
# commands/gsd-sessions.md
---
name: gsd:sessions
description: List active dispatch sessions
argument-hint: "[stop <id>]"
allowed-tools: [Bash, Read]
---

<objective>
List or stop active dispatch sessions.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/gsd-sessions.md
</execution_context>

<process>
Execute the workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/gsd-sessions.md.
Pass any $ARGUMENTS to the workflow process.
</process>
```

---

## Resolved Questions

1. **How to handle --parallel when dispatch.enabled=false** — RESOLVED: Error loudly
   - "Dispatch disabled, cannot use --parallel" — fail-fast prevents user confusion
   - Silent ignore hides misconfiguration; user would wonder why phases run sequentially
   - Consistent with existing PDE pattern of failing loud on invalid state

2. **Should /gsd:settings show full config or dispatch block only?** — RESOLVED: Full config
   - Existing /pde:settings already displays all of config.json
   - Once dispatch block is added to config, it auto-appears — zero workflow changes needed
   - No need to create a separate dispatch-only view

3. **Remote session kill** — RESOLVED: Local-only for v0.18
   - SSH kill requires storing and reusing credentials, which is complex
   - Return clear manual instructions: "SSH to {host} and kill: pkill -f '{sessionId}'"
   - Full remote kill deferred to post-v0.18

4. **Mid-session disable (dispatch.enabled toggled while sessions active)** — RESOLVED: Active sessions continue
   - Active sessions are already in flight — cannot be recalled
   - New dispatch commands are rejected
   - Registry is NOT cleared (harmless, useful for debugging)
   - `/gsd:sessions list` still shows active sessions even when disabled (they're still running)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 20+ | Config loading, PID probing, registry | Yes | v20.20.0 | — |
| process.kill() | PID liveness check and session stop | Yes (POSIX) | — | — |
| VALID_CONFIG_KEYS pattern | Config validation | Yes (config.cjs) | — | — |
| SessionRegistry | Session list/stop | Yes (packages/dispatcher/lib/registry.cjs) | — | — |

**Missing dependencies with no fallback:**
- None. All functionality uses Node.js built-ins and existing PDE modules.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/phase-149/` |
| Full suite command | `npx vitest run tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CFG-01 | VALID_CONFIG_KEYS includes dispatch.* keys | unit | `npx vitest run tests/phase-149/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-01 | setConfigValue sets dispatch.max_local_sessions | unit | `npx vitest run tests/phase-149/config-dispatch.test.cjs` | No — Wave 0 |
| CFG-02 | listSessions returns formatted session data | unit | `npx vitest run tests/phase-149/sessions.test.cjs` | No — Wave 0 |
| CFG-02 | listSessions probes PID liveness | unit | `npx vitest run tests/phase-149/sessions.test.cjs` | No — Wave 0 |
| CFG-03 | stopSession kills local PID and updates registry | unit | `npx vitest run tests/phase-149/sessions.test.cjs` | No — Wave 0 |
| CFG-03 | stopSession returns manual instructions for remote | unit | `npx vitest run tests/phase-149/sessions.test.cjs` | No — Wave 0 |
| CFG-05 | dispatch disabled → --parallel errors loudly | unit | `npx vitest run tests/phase-149/graceful-degradation.test.cjs` | No — Wave 0 |
| CFG-05 | dispatch disabled → init returns single-session context | unit | `npx vitest run tests/phase-149/graceful-degradation.test.cjs` | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/phase-149/`
- **Per wave merge:** `npx vitest run tests/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- `tests/phase-149/config-dispatch.test.cjs` — covers CFG-01
- `tests/phase-149/sessions.test.cjs` — covers CFG-02, CFG-03
- `tests/phase-149/graceful-degradation.test.cjs` — covers CFG-05

---

## Integration Points Summary

### Files to Modify

| File | Changes |
|------|---------|
| `bin/lib/config.cjs` | Add 11 dispatch.* keys to VALID_CONFIG_KEYS; add dispatch defaults to ensureConfigFile() |
| `packages/dispatcher/lib/coordinator.cjs` | Read dispatch.enabled, max_local_sessions, max_remote_sessions from options.config |
| `bin/pde-tools.cjs` | Load config and pass to coordinator; add dispatch.enabled guard in dispatch command |
| `bin/lib/init.cjs` | Add dispatch.enabled guard when --parallel flag is passed |

### Files to Create

| File | Purpose |
|------|---------|
| `commands/gsd-sessions.md` | /gsd:sessions command YAML |
| `workflows/gsd-sessions.md` | Session list/stop workflow logic |
| `tests/phase-149/config-dispatch.test.cjs` | Config extension unit tests |
| `tests/phase-149/sessions.test.cjs` | Session list/stop unit tests |
| `tests/phase-149/graceful-degradation.test.cjs` | CFG-05 tests |

### Files Unchanged (Already Support Needed Functionality)

| File | Why No Changes |
|------|----------------|
| `packages/dispatcher/lib/registry.cjs` | getAll(), get(), update() already support all CFG-02/03 needs |
| `packages/dispatcher/lib/remote-router.cjs` | Already consumes remoteConfig fields |
| `packages/dispatcher/lib/remote-ssh.cjs` | Already consumes remoteConfig fields |

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/config.cjs` — VALID_CONFIG_KEYS pattern, setConfigValue dot-notation, ensureConfigFile
- `packages/dispatcher/lib/coordinator.cjs` — options.config consumption, _remoteConfig read (line 130)
- `packages/dispatcher/lib/registry.cjs` — getAll(), get(), update() methods, dispatcher.pids JSON shape
- `packages/dispatcher/lib/remote-router.cjs` — routeSession remoteConfig shape (line 33)
- `packages/dispatcher/lib/remote-ssh.cjs` — spawnRemoteSession remoteConfig fields (lines 44-49)
- `packages/dispatcher/lib/orphan.cjs` — process.kill(pid, 0) liveness pattern
- `bin/pde-tools.cjs` — dispatch command (line 1066-1086), --parallel flag handling
- `bin/lib/init.cjs` — cmdInitExecutePhase, isParallel flag (line 14)
- `commands/settings.md` — existing /pde:settings command pattern
- `workflows/settings.md` — existing settings workflow pattern

---

## Project Constraints (from STATE.md Accumulated Context)

- `packages/dispatcher/` is CJS — no ESM unless dynamic import() bridge
- Plugin root (bin/) stays zero-npm-dependency — bash scripts and node built-ins only
- DI via constructor parameter injection for testability (not vi.mock)
- Array args to child_process — no shell interpolation in spawn calls
- All new modules follow existing naming patterns

---

## Metadata

**Confidence breakdown:**
- Config system: HIGH — VALID_CONFIG_KEYS is a well-established pattern with dot-notation; extension is mechanical
- Session commands: HIGH — Registry already has getAll() and PID probing pattern from orphan.cjs
- Graceful degradation: HIGH — Three guard checks at entry points; existing code path is untouched when dispatch is disabled
- Remote session kill: MEDIUM — Deferred to post-v0.18; manual instructions are a known UX compromise

**Research date:** 2026-03-27
**Valid until:** 2026-06-27 (config patterns and registry API are stable)
