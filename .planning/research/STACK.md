# Stack Research — Cloud Dispatch, Container Isolation, Git State Sync, Intelligent Routing

**Domain:** Cloud dispatch (claude --remote), Docker container execution, git-based .planning/ sync, intelligent routing, dashboard remote session integration
**Researched:** 2026-03-30
**Confidence:** HIGH (claude --remote, Agent SDK, devcontainer), MEDIUM (routing heuristics, git sync integration patterns)

---

## Context: What Already Exists (Do Not Rebuild)

The following infrastructure is validated and production-hardened in PDE v0.17–v0.18. New work integrates with these, it does not replace them.

| Component | Location | What It Does |
|-----------|----------|--------------|
| `DispatchCoordinator` | `packages/dispatcher/lib/coordinator.cjs` | Full session lifecycle: queue, registry, worktree, merge, SSH |
| `remote-router.cjs` | `packages/dispatcher/lib/remote-router.cjs` | Decision tree: `'local' | 'ssh' | 'managed'`; currently returns `'managed'` as unavailable stub |
| `remote-managed.cjs` | `packages/dispatcher/lib/remote-managed.cjs` | Stub returning `available: false` — **this is the primary extension point** |
| `SessionRegistry` | `packages/dispatcher/lib/registry.cjs` | Crash-recoverable `.planning/dispatcher.pids` with PID probing |
| `relay.cjs` | `bin/lib/relay.cjs` | TailCursor + BatchQueue + CircuitBreaker; HTTP POST to dashboard |
| `relay-protocol.cjs` | `bin/lib/relay-protocol.cjs` | Wire envelope schema (WireEnvelopeSchema) |
| Dashboard | `dashboard/` | Next.js 15, Clerk auth, SSE streaming, Upstash Redis, approval gates |
| `node-ssh` | `packages/dispatcher/lib/remote-ssh.cjs` | SSH remote execution backend (RMT-01–03) |

---

## Recommended Stack for New Capabilities

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `claude --remote` (CLI flag) | CLI v2.1.51+ | Cloud dispatch: creates Anthropic-managed VM sessions from terminal | Official, zero infrastructure — clones repo to cloud VM, runs Claude Code, pushes branch. No NDJSON streaming; session tracked via `/tasks` and session ID in JSON output |
| `claude remote-control` (CLI command) | CLI v2.1.51+ | Local session exposed to remote devices / dashboard bridge | Outbound-only HTTPS to Anthropic API; no inbound ports; enables steering from dashboard |
| `dockerode` | `4.0.10` | Docker Engine API for container-based session dispatch | Only production-ready Node.js Docker SDK (1,271+ dependents); Docker's own `node-sdk` is experimental |
| `simple-git` | `3.33.0` | Git operations for .planning/ state sync: commit, push, fetch, diff, status | Wraps system git with promise API; lighter than isomorphic-git (no pure-JS overhead); already proven pattern in PDE's 3-way merge system |
| `@anthropic-ai/claude-agent-sdk` | `0.2.87` | TypeScript Agent SDK for programmatic session queries: `listSessions()`, `getSessionInfo()`, session ID capture | Official SDK; enables `resume`, `fork`, `continue` patterns; exposes session JSONL on disk |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `node-ssh` | already installed | SSH remote dispatch | Continue using for SSH backend — do not replace |
| `@anthropic-ai/sdk` | `0.80.0` | Anthropic REST API client | Already installed; use for Analytics API (`/v1/organizations/usage_report/claude_code`) to surface remote session cost in dashboard |
| Built-in `node:child_process` | Node built-in | Spawning `claude --remote` and `claude remote-control` as subprocesses | Same pattern as `spawn.cjs` — zero deps, proven, CLAUDECODE= env prefix NOT used for --remote |
| `dockerode` modem options | via dockerode | Docker socket vs TCP connection | Use `socketPath: '/var/run/docker.sock'` for local; `host + port + ca/cert/key` for remote Docker |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `claude --remote --output-format json` | Capture cloud session ID at spawn time | Returns `{ session_id, result }` JSON; session ID used for `/tasks` polling and teleport |
| `docker pull anthropics/claude-code:latest` | Official Claude Code devcontainer image | Node.js 20, ZSH, git, firewall rules pre-configured; use as base for dispatcher container runs |
| `claude devcontainer` reference | `.devcontainer/Dockerfile` from `anthropics/claude-code` | Standard security model: firewall, `--dangerously-skip-permissions`, scoped credentials |

---

## Installation

```bash
# New dispatcher additions
npm install dockerode simple-git @anthropic-ai/claude-agent-sdk

# Type declarations for Docker
npm install -D @types/dockerode
```

> `node-ssh`, `@anthropic-ai/sdk`, and all existing dispatcher deps are already installed.
> Do NOT install `isomorphic-git` — it adds pure-JS git overhead without benefit when system git is guaranteed present.
> Do NOT install `nodegit` — requires native bindings, breaks on Node version changes.

---

## Architecture of New Capabilities

### 1. Cloud Dispatch via `claude --remote`

**Current state:** `remote-managed.cjs` returns `available: false` with documented rationale: "no NDJSON streaming, research preview."

**What has changed (2026-03-30):** `claude --remote` is now production-available for Pro/Max/Team/Enterprise. It creates a **GitHub-connected cloud VM session**, not a programmatic NDJSON stream. The architecture is inherently async:

```
claude --remote "Fix auth bug" --output-format json
  → { session_id: "web-abc123", result: "Task started..." }
  → Monitor via /tasks (CLI) or claude.ai/code (web)
  → Session pushes branch when done; create PR from web UI
  → Optional: claude --teleport <session-id> to pull back to local
```

**Integration point:** Replace `detectManagedBackend()` stub in `remote-managed.cjs` with actual probe:

```javascript
// Probe: verify claude CLI >= v2.1.51, authenticated with claude.ai OAuth (not API key)
// Spawn: childProcess.execFileSync(['claude', '--remote', prompt, '--output-format', 'json'])
// Track: session_id written to SessionRegistry with backend: 'managed', no local PID
// Limitation: no NDJSON relay; relay.cjs cannot tail cloud sessions
```

**Key constraint:** `claude --remote` requires `claude.ai` OAuth authentication (not `ANTHROPIC_API_KEY`). The `CLAUDECODE=` env prefix used for local spawns is NOT needed for `--remote` (it runs in a separate cloud process).

**Session tracking difference:** Local/SSH sessions use PID + NDJSON relay. Cloud sessions use `session_id` string only. Registry needs new status fields: `'cloud_running' | 'cloud_complete'`.

### 2. Docker Container Dispatch

Use `dockerode` to spawn isolated `claude -p` sessions inside containers. This is NOT `claude --remote` — it runs Claude Code locally in a Docker sandbox, not on Anthropic cloud.

```javascript
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Pattern: create container -> attach streams -> run claude -p -> collect output
const container = await docker.createContainer({
  Image: 'node:20-slim', // or anthropics/claude-code devcontainer image
  Cmd: ['claude', '-p', prompt, '--output-format', 'stream-json', '--allowedTools', 'Read,Edit,Bash'],
  Env: [
    `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY}`,
    'CLAUDECODE=',  // prevents nested session error
  ],
  HostConfig: {
    Binds: [`${projectRoot}:/workspace:rw`],
    AutoRemove: true,
  },
  WorkingDir: '/workspace',
});
```

**Output capture:** Container stdout is NDJSON (`--output-format stream-json`) — compatible with existing relay infrastructure. `onLine` callback routes through existing `Aggregator` and `relay.cjs`.

**Why `dockerode` over Docker CLI subprocess:** Structured API for container lifecycle (create/start/attach/wait/remove), proper stream multiplexing (stdout/stderr demux via `dockerode`'s `modem.demuxStream`), and programmatic cleanup on session failure.

### 3. Git-Based `.planning/` State Sync

Use `simple-git` to sync `.planning/` state across machines (local to remote worktree, remote VM to local after cloud session).

```javascript
const simpleGit = require('simple-git');
const git = simpleGit(projectRoot);

// Pre-dispatch: commit .planning/ snapshot to session branch
await git.add('.planning/');
await git.commit(`chore(pde): pre-dispatch snapshot [phase ${phase}]`);
await git.push('origin', sessionBranch);

// Post-cloud-session: fetch branch and extract .planning/ changes
await git.fetch('origin', sessionBranch);
const diff = await git.diff([`origin/${sessionBranch}`, '--', '.planning/']);
```

**Integration:** Plugs into existing `mergeSession()` in `merge.cjs`. The 3-way merge (v0.16) already handles `.planning/` conflicts. `simple-git` replaces raw `execFileSync('git', [...])` calls with a promise-based API that is easier to test (DI pattern already used throughout `coordinator.cjs`).

**Sync trigger events:**
- Pre-dispatch: snapshot `.planning/STATE.md`, `phases/`, `dispatcher.pids`
- Post-SSH/container exit: existing `mergeSession()` path unchanged
- Post-cloud (`claude --remote`): poll for branch push, then `git fetch` + `mergeSession()`

### 4. Intelligent Routing Heuristics

Extend `routeSession()` in `remote-router.cjs`. Current decision tree has 5 rules; add rules 3a–3d before the existing managed-backend check:

```
Decision tree (extended):
1. !isAutonomous                         → 'local'   (interactive always local)
2. !remoteConfig.host && !docker         → 'local'   (no remote configured)
3a. taskProfile.hasSecretFiles           → 'local'   (credentials visible to container/cloud)
3b. taskProfile.estimatedTokens > 100k   → 'managed' (cloud for large context, avoids SSH timeout)
3c. taskProfile.requiresGUI              → 'local'   (Playwright, screen capture need local)
3d. docker.available && !requiresGit     → 'docker'  (isolation for untrusted repos)
4. preferred_backend === 'managed'       → probe managed → 'managed' or fall through
5. remoteConfig.host set                 → 'ssh'
6. default                               → 'local'
```

**Routing signal sources (statically analyzable from PLAN.md):**
- `taskProfile.hasSecretFiles`: grep PLAN.md for `~/.ssh`, `.env`, `AWS_`, `ANTHROPIC_API_KEY` references
- `taskProfile.estimatedTokens`: count lines in task file times heuristic (same chars/4 pattern as token meter)
- `taskProfile.requiresGUI`: check for Playwright MCP tool references, screenshot steps
- `taskProfile.requiresGit`: check for `git worktree`, `git push`, merge steps (Docker can't git push without credentials)

**Implementation:** All signals are static regex/line-count — zero LLM, less than 100ms, same philosophy as `idle-suggestions.cjs`.

### 5. Dashboard Remote Session Integration

The existing dashboard (`dashboard/`) uses Clerk auth, Upstash Redis, SSE events, and approval gates. New cloud sessions need:

**New session status types** in `SessionRegistry` and dashboard display:
```typescript
type SessionStatus =
  | 'running'        // existing: local/SSH with PID
  | 'failed'         // existing
  | 'complete'       // existing
  | 'orphaned'       // existing
  | 'cloud_running'  // NEW: claude --remote, no local PID
  | 'cloud_complete' // NEW: branch pushed, PR-ready
  | 'docker_running' // NEW: container-isolated local
```

**Cloud session polling:** Since `claude --remote` sessions have no NDJSON relay, dashboard polls via:
```
GET /api/sessions -> includes cloud sessions with session_id
cloud sessions: status checked via claude CLI `claude tasks --output-format json` or Anthropic Analytics API
```

**Teleport action:** Dashboard adds a "Pull local" action for `cloud_complete` sessions:
```bash
claude --teleport <session-id>
# Verifies: same repo, clean git state, branch available on remote
# Loads conversation history into local terminal session
```

**No new dashboard framework dependencies** — all additions use existing Next.js API routes, Upstash Redis for cloud session state, and SSE for real-time updates. The relay daemon's circuit breaker and HTTP batching patterns already handle intermittent connectivity.

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `dockerode` | `docker` CLI subprocess via `execFileSync` | No structured stream multiplexing; harder to handle attach/detach lifecycle; error handling is string parsing |
| `dockerode` | `@docker/sdk` (official Docker Node SDK) | Marked experimental; 14 stars on GitHub vs dockerode's maturity; APIs may change |
| `simple-git` | Raw `execFileSync(['git', ...])` calls | Already used throughout dispatcher, but promise API + DI makes testing cleaner; same system git requirement |
| `simple-git` | `isomorphic-git` | Pure-JS overhead with no benefit when system git is guaranteed; no SSH support without polyfills |
| `simple-git` | `nodegit` | Native C++ bindings break across Node versions; incompatible with PDE's zero-native-deps philosophy |
| Static routing heuristics | ML-based task classifier | Overkill for 4 routing targets; adds inference latency; static regex achieves sufficient accuracy for the relevant signals |
| `claude --remote` (cloud VM) | Self-hosted runner (EC2/GCP) | `claude --remote` eliminates infra management; Anthropic-managed VM has pre-configured devcontainer image |
| Polling for cloud session status | WebSocket subscription | `claude --remote` has no programmatic subscription API (research preview limitation); polling via `claude tasks --json` is the documented pattern |

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `isomorphic-git` | Pure-JS implementation; no SSH; slower; over-engineered for CLI dispatch use case | `simple-git` wrapping system git |
| `nodegit` | Native bindings; install failures common; project convention is zero native deps | `simple-git` |
| `ws` (WebSocket library) | Dashboard already uses SSE (EventSource); adding WS adds protocol complexity with no gain | Existing `relay.cjs` SSE pattern |
| `bullmq` / Redis queues | `ConcurrencyQueue` (`queue.cjs`) already handles dispatch queuing | `packages/dispatcher/lib/queue.cjs` |
| `pm2` / process supervisor | Relay daemon already has circuit breaker; SSH has managed backend fallback | Existing `relay.cjs` CircuitBreaker |
| Docker Compose | Single-container dispatch; Compose adds YAML config overhead without benefit for per-session isolation | `dockerode` createContainer() directly |
| Kubernetes | Overkill for single-machine development tool; session lifetime is minutes not hours | `dockerode` for isolation |
| `@anthropic-ai/claude-agent-sdk` for spawning | SDK is for multi-turn agent conversations, not one-shot dispatch | `claude -p` CLI subprocess (existing pattern in `spawn.cjs`) |

---

## Stack Patterns by Variant

**If deploying cloud dispatch (`claude --remote`):**
- Use `childProcess.spawn(['claude', '--remote', prompt, '--output-format', 'json'])` from `remote-managed.cjs`
- Capture `session_id` from JSON output, write to registry with `backend: 'managed'`
- Poll `claude tasks --output-format json` every 30s for status updates
- No relay daemon involvement (no NDJSON to tail)
- Requires `claude.ai` OAuth auth — check `claude auth status` before routing

**If deploying Docker container dispatch:**
- Use `dockerode` createContainer with project bind mount + `CLAUDECODE=` env
- Attach to container stdout BEFORE starting (avoid buffering race)
- Route NDJSON lines through existing `aggregator.cjs` `onLine` callback
- Register container ID (not PID) in SessionRegistry with `backend: 'docker'`

**If only adding git state sync:**
- `simple-git` replaces raw `execFileSync` calls in `merge.cjs` and `remote-ssh.cjs`
- `.planning/` files auto-committed pre-dispatch using existing session branch pattern
- Post-cloud-session fetch + `mergeSession()` unchanged

**If Team/Enterprise plan (Remote Control server mode):**
- `claude remote-control --spawn worktree --capacity 32` enables multi-session server mode
- Each web session gets own git worktree (matches PDE's existing worktree isolation model)
- No new dashboard API needed — Remote Control UI is claude.ai/code

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `dockerode@4.0.10` | Node.js 18+ | Requires Docker Engine >= 25 for full API compat; `socketPath` default works on macOS/Linux |
| `simple-git@3.33.0` | Node.js 18+, git 2.x+ | Wraps system git — git must be on PATH (guaranteed in PDE environment) |
| `@anthropic-ai/claude-agent-sdk@0.2.87` | Node.js 18+ | TypeScript-first; use from `.mjs` or with `esm` interop in `.cjs` files |
| `claude --remote` | CLI v2.1.51+ | Check `claude --version`; requires claude.ai OAuth (not API key) |
| `claude remote-control` | CLI v2.1.51+ | Team/Enterprise requires admin toggle at `claude.ai/admin-settings/claude-code` |

---

## Critical Constraint: `claude --remote` Authentication

`claude --remote` requires `claude.ai` OAuth authentication. It does NOT work with `ANTHROPIC_API_KEY`. This means:

1. The machine running `remote-managed.cjs` must have `claude auth login` completed with a claude.ai subscription
2. `detectManagedBackend()` must probe auth status: `claude auth status --output-format json`
3. If `ANTHROPIC_API_KEY` is set in environment, `claude --remote` will fail with "Remote Control requires a claude.ai subscription"
4. The `CLAUDECODE=` environment variable trick (used for SSH dispatch) must NOT be set when invoking `claude --remote`
5. Cloud sessions work with GitHub repos only — GitLab and other hosts are not supported

**Probe implementation in `detectManagedBackend()`:**
```javascript
// 1. Check claude version >= 2.1.51
// 2. Verify auth: claude auth status --output-format json -> { authenticated: true, type: 'oauth' }
// 3. Verify not API key mode: check ANTHROPIC_API_KEY not set
// 4. Return { available: true } only when all pass
```

---

## Sources

- [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web) — `claude --remote` architecture, GitHub-only repos, cloud VM lifecycle, setup scripts, teleport — HIGH confidence (official docs, fetched 2026-03-30)
- [Run Claude Code programmatically](https://code.claude.com/docs/en/headless) — `--output-format`, `--bare`, session ID capture, `stream-json` format — HIGH confidence (official docs, fetched 2026-03-30)
- [Remote Control docs](https://code.claude.com/docs/en/remote-control) — `claude remote-control`, `--spawn worktree`, outbound-only architecture, v2.1.51 requirement — HIGH confidence (official docs, fetched 2026-03-30)
- [Agent SDK Sessions](https://platform.claude.com/docs/en/agent-sdk/sessions) — `listSessions()`, `getSessionInfo()`, `resume`, `fork`, session file locations — HIGH confidence (official docs, fetched 2026-03-30)
- [devcontainer reference](https://code.claude.com/docs/en/devcontainer) — Docker isolation model, firewall rules, `--dangerously-skip-permissions` pattern — HIGH confidence (official docs, fetched 2026-03-30)
- [dockerode npm](https://www.npmjs.com/package/dockerode) — version 4.0.10, 1,271 dependents — MEDIUM confidence (npm registry verified via `npm show dockerode version`)
- [simple-git npm](https://www.npmjs.com/package/simple-git) — version 3.33.0, 7,483 dependents — MEDIUM confidence (npm registry verified via `npm show simple-git version`)
- `packages/dispatcher/lib/remote-managed.cjs` — v0.18 stub with documented constraints (RMT-06) — source code read directly
- `packages/dispatcher/lib/remote-router.cjs` — existing routing decision tree (5 rules) — source code read directly

---

*Stack research for: PDE cloud dispatch, container isolation, git state sync, intelligent routing*
*Researched: 2026-03-30*
