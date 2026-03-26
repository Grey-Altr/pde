# Remote Dashboard Layers 2-3: Dispatch Hub

**Date:** 2026-03-25
**Status:** Draft
**Milestone:** v0.18 (tentative)
**Depends on:** v0.17 Remote Dashboard (shipped)

## Problem

The PDE Remote Dashboard (v0.17) is a read-only monitor with one bidirectional capability (approval gates). Users cannot trigger work, offload execution to the cloud, or manage multiple parallel sessions from the dashboard. The laptop must be running and attended for PDE to execute phases.

## Solution

Transform the dashboard from a monitor into a **dispatch hub** — a control plane that can trigger, monitor, and merge work across multiple execution backends (local sessions, cloud-hosted Agent SDK agents, Vercel Functions, self-hosted compute).

## Goals

1. **Remote triggering** — Dispatch phases from the dashboard to a running local PDE session
2. **Cloud-hosted agents** — Spawn Agent SDK agents or Vercel Functions to execute PDE plans on remote infrastructure without a local machine
3. **Multi-session orchestration** — Unified view of all active executions (local + cloud) with phase claiming, merge management, and approval gates

## Non-Goals

- Running the full PDE Claude Code plugin in the cloud (that's v1.0 Standalone CLI)
- Multi-user/team collaboration (single-user trust model, harden later)
- Cost controls and spend caps (placeholder in settings, build later)
- Self-hosted backend implementation (interface defined, implementation deferred)

## Architecture

### Approach: Dispatch Hub with Pluggable Backends

A `DispatchManager` in the dashboard routes execution requests to one of several backends. All backends emit events through the existing `/api/ingest` pipeline. The dashboard renders events identically regardless of source.

```
                    ┌─────────────────────────────────────┐
                    │         Dashboard (Next.js)          │
                    │                                      │
                    │  ┌──────────┐  ┌──────────────────┐  │
                    │  │ Dispatch │  │ Execution Grid   │  │
                    │  │ Form     │  │ (multi-session)  │  │
                    │  └────┬─────┘  └───────▲──────────┘  │
                    │       │                │              │
                    │  ┌────▼────────────────┴──────────┐  │
                    │  │      Dispatch Manager           │  │
                    │  │  ┌─────────────────────────┐   │  │
                    │  │  │  Execution Registry     │   │  │
                    │  │  │  (Redis sorted sets)    │   │  │
                    │  │  └─────────────────────────┘   │  │
                    │  │  ┌─────────────────────────┐   │  │
                    │  │  │  Phase Lock Manager     │   │  │
                    │  │  │  (Redis SETNX + TTL)    │   │  │
                    │  │  └─────────────────────────┘   │  │
                    │  └──┬──────────┬──────────┬───────┘  │
                    │     │          │          │           │
                    └─────┼──────────┼──────────┼───────────┘
                          │          │          │
              ┌───────────▼┐  ┌─────▼──────┐  ┌▼───────────────┐
              │   Local    │  │  Agent SDK  │  │ Vercel Fn      │
              │   Backend  │  │  Backend    │  │ Backend        │
              │            │  │            │  │                │
              │ cmd→relay  │  │ spawn agent│  │ invoke runner  │
              │ →PDE       │  │ →git clone │  │ →run tests    │
              │            │  │ →execute   │  │ →validate     │
              └──────┬─────┘  └─────┬──────┘  └┬──────────────┘
                     │              │           │
                     └──────────────┴───────────┘
                                    │
                            POST /api/ingest
                          (existing pipeline)
```

### Core Abstraction: ExecutionBackend Interface

```typescript
interface ExecutionBackend {
  id: string;                    // 'local' | 'agent-sdk' | 'vercel-fn' | 'self-hosted'
  dispatch(request: DispatchRequest): Promise<ExecutionHandle>;
  cancel(executionId: string): Promise<void>;
  capabilities(): BackendCapabilities;
}

interface DispatchRequest {
  project_repo: string;          // git remote URL
  ref: string;                   // branch or commit to base work on
  phase: number;                 // phase number to execute
  plan?: string;                 // specific plan, or all plans in phase
  worktree_branch: string;       // branch name for isolated work
  env: Record<string, string>;   // secrets/config for execution
}

interface ExecutionHandle {
  execution_id: string;          // UUID
  backend: string;               // which backend is running this
  session_id: string;            // PDE session ID (for event stream)
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
}

interface BackendCapabilities {
  supports_streaming: boolean;   // can emit events in real-time
  supports_approval: boolean;    // can pause for approval gates
  max_concurrent: number;        // -1 for unlimited
  cost_model: 'free' | 'per-minute' | 'per-token';
}
```

### Execution Registry

All active executions tracked in Redis:

```
pde:default:executions
  Type: Sorted Set
  Score: Date.now()
  Members: execution_id
  Purpose: All active/recent executions across all backends

pde:default:execution:{execution_id}
  Type: Hash
  Fields: {
    backend: 'local' | 'agent-sdk' | 'vercel-fn' | 'self-hosted',
    session_id: string,
    phase: number,
    plan: string | null,
    worktree_branch: string,
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled',
    claimed_at: number,
    completed_at: number | null,
    repo: string,
    ref: string,
  }
  TTL: 7 days
```

Existing local sessions auto-register when the relay daemon sends its first `session_start` event — the ingest endpoint creates an execution record with `backend: 'local'`.

### Phase Claiming Protocol

Prevents two executors from working on the same phase:

```
pde:default:phase-lock:{repo_slug}:{phase}
  Type: String (execution_id)
  TTL: 1 hour (renewed by heartbeat every 30s)
  Note: repo_slug = owner/repo extracted from URL (e.g., "user/pde" from "https://github.com/user/pde.git")
```

**Implementation:** Use `@upstash/lock` package which handles atomic `SET ... NX PX`, Lua compare-and-delete for safe release, and UUID ownership tracking.

1. `lock.acquire()` — atomic `SET key uuid NX PX 60000` — first executor wins
2. Running executor calls `lock.extend(60000)` every 20s (heartbeat at TTL/3)
3. On completion/failure — `lock.release()` (Lua script: delete only if UUID matches)
4. Executor crash — lock auto-expires after 60 seconds

Lock is for efficiency, not correctness — Upstash async replication means theoretical double-claim during network partition. Application-level idempotency (check phase status before writing) provides safety net.

**Heartbeat implementation per backend:**

| Backend | Heartbeat source | Mechanism |
|---------|-----------------|-----------|
| Local | Dashboard polling loop | Dashboard polls execution status every 30s; if relay is alive (recent events), extends lock TTL via `EXPIRE` |
| Agent SDK | Ingest events | Each event from the agent hitting `/api/ingest` triggers a lock TTL renewal — no separate heartbeat needed |
| Vercel Functions | Task runner | Each task runner POSTs a heartbeat event before starting work; for short tasks (<60s) the initial TTL is sufficient |
| Self-hosted | Relay daemon events | Same as Agent SDK — ingest events renew lock TTL |

## Backend Implementations

### Local Backend

Extends the relay daemon with a **command poller** — same pattern as approval polling.

```
Dashboard → Redis command hash → Relay daemon polls every 3s → writes to output file → PDE tails file
```

**Relay output fix:** The relay daemon is currently spawned with `stdio: 'ignore'` (stdout is `/dev/null`). Must change `start-relay.cjs` to redirect stdout to a file: `fs.openSync('/tmp/pde-relay-{sessionId}-out.ndjson', 'a')` passed as the stdout fd in `spawn()` options. The command poller writes command NDJSON to stdout, which lands in this file.

**PDE-side change:** One new file `command-listener.cjs` — uses `TailCursor` (same class from relay.cjs) to tail the relay output file and triggers `/pde:execute-phase` when it sees dispatch commands.

**Acknowledgment protocol:** When PDE receives a command, it emits an `execution_acknowledged` event. If the dashboard doesn't see this event within 15 seconds, it retries the command (re-writes to Redis). After 3 retries with no ack, the dispatch is marked `failed` with reason "local session unresponsive."

**Limitation:** Requires a running local PDE session. If no relay is active, the local backend returns an error and the dashboard suggests a cloud backend.

### Agent SDK Backend

Spawns a Claude agent via **Vercel Sandbox** (`@vercel/sandbox`), which creates an isolated Firecracker microVM. The Agent SDK (`@anthropic-ai/claude-agent-sdk`) cannot run inside a regular Vercel Function — it spawns a persistent Claude Code CLI subprocess that requires filesystem access and long-running process support. Vercel Sandbox supports up to 5 hours of execution.

**Execution flow:**
1. Dashboard API route (`POST /api/dispatch`) creates a Vercel Sandbox instance
2. Sandbox installs Claude Code CLI and the Agent SDK
3. Agent SDK `query()` runs with streaming input mode, receiving:
   - System prompt with PDE execution instructions and conventions
   - PLAN.md content fetched from the git repo via GitHub API
   - Git repo URL and worktree branch name
   - Ingest URL and bearer token for event reporting
   - GitHub token (from `pde:default:settings`) injected via `options.env` for `git clone` and `git push` via HTTPS (clone URL rewritten to `https://{token}@github.com/{owner}/{repo}.git`)
   - Anthropic API key injected via `options.env` — never exposed to client
   - `maxBudgetUsd` and `maxTurns` as safety limits
4. Agent streams `SDKMessage` events which are translated and POSTed to `/api/ingest`
5. Cancellation via `AbortController` (triggered from dashboard DELETE endpoint)

**Key decision:** The agent reads PLAN.md directly instead of running the PDE plugin. This avoids the circular dependency of needing Claude Code to run a Claude Code plugin in the cloud. The agent's system prompt encodes PDE conventions (commit format, SUMMARY.md structure, Nyquist patterns).

**Fidelity mitigation:** Post-execution validation checks agent output against PDE conventions before merge. Worktree branch isolation ensures bad output never reaches main.

**Cold start:** ~12 seconds for the first `query()` call (CLI subprocess startup). Subsequent tool calls within the same session are 2-3 seconds.

**Cost:** Per API token (Sonnet 4.6: $3/$15 per 1M input/output tokens). A typical phase costs $2-10. Sandbox compute is separate (~$0.05/hour minimum). `maxBudgetUsd` prevents runaway costs.

**Reference implementation:** Vercel's official [Coding Agent Platform template](https://vercel.com/templates/next.js/coding-agent-platform) demonstrates this exact pattern.

### Vercel Functions Backend

For lightweight, well-defined tasks that don't need agent reasoning:
- Run test suites
- Run linters/formatters
- Generate VALIDATION.md from test results
- Run Nyquist assertion checks

**Git operations use the GitHub API (not git CLI):** Merges, PR creation, and branch management use the GitHub REST API via `@octokit/rest`. This avoids cloning repos in serverless functions entirely — no disk, no timeout issues, works within Hobby tier constraints. Specific endpoints:
- Merge: `POST /repos/{owner}/{repo}/merges` (merge commit) or `git.updateRef()` with `force: false` (fast-forward)
- PR creation: `POST /repos/{owner}/{repo}/pulls` + `PUT /repos/{owner}/{repo}/pulls/{n}/merge`
- Conflict check: `repos.compareCommitsWithBasehead()` — returns `status: 'diverged'` if conflicts possible
- Branch cleanup: `git.deleteRef()` after merge
- File reads: `repos.getContent()` for ROADMAP.md (base64 decoded, cached in Redis 5 min)

Rate limit: 5,000 requests/hour per PAT — more than sufficient.

Implemented as predefined task runners, not general-purpose execution. Covered by Vercel Hobby free tier.

## Event Pipeline Unification

All backends emit events through the existing `/api/ingest` endpoint:

| Backend | Mechanism |
|---------|-----------|
| Local | Relay daemon tails NDJSON, POSTs (unchanged from Layer 1) |
| Agent SDK | Agent calls `ingestReporterTool` which POSTs |
| Vercel Functions | Task runner POSTs directly |
| Self-hosted | Runs its own relay daemon |

### New Event Types

```
execution_queued        — dispatch accepted, waiting for backend
execution_started       — backend has begun work
execution_completed     — all tasks done, branch ready for merge
execution_failed        — unrecoverable error
execution_cancelled     — user cancelled from dashboard
phase_claimed           — SETNX succeeded
phase_released          — lock released
merge_requested         — user tapped merge
merge_completed         — worktree branch merged
merge_failed            — conflict or validation failure
```

### Wire Envelope — No Schema Change

Backend metadata carried in the existing `extensions` field:

```json
{
  "seq": 42,
  "session_id": "...",
  "event_type": "phase_started",
  "extensions": {
    "execution_id": "...",
    "backend": "agent-sdk",
    "worktree_branch": "pde/phase-140-agent"
  }
}
```

No wire protocol version bump.

**Expected `extensions` shape per event type:**

| Event Type | Required Extensions Keys |
|------------|-------------------------|
| `execution_queued` | `execution_id`, `backend`, `worktree_branch` |
| `execution_started` | `execution_id`, `backend` |
| `execution_completed` | `execution_id`, `backend`, `worktree_branch` |
| `execution_failed` | `execution_id`, `backend`, `error_message` |
| `execution_cancelled` | `execution_id` |
| `execution_acknowledged` | `execution_id` |
| `phase_claimed` | `execution_id`, `phase` |
| `phase_released` | `execution_id`, `phase` |
| `merge_requested` | `execution_id`, `worktree_branch`, `target_ref` |
| `merge_completed` | `execution_id`, `merge_sha` |
| `merge_failed` | `execution_id`, `error_message` |
| All Layer 1 events | (none required — backward compatible) |

The `extensions` field remains `z.record(z.string(), z.unknown()).optional()` in the wire schema. Execution-specific validation is applied in the ingest handler when `event_type` matches an execution event — not in the wire schema itself.

### Ingest Endpoint Changes

The ingest endpoint gains a branching handler for execution lifecycle events. After the existing Redis pipeline write (event storage + session metadata), an additional step processes execution events:

| Event Type | Redis Action |
|------------|-------------|
| `execution_queued` | `hset pde:default:execution:{eid} status queued` + `zadd pde:default:executions` |
| `execution_started` | `hset pde:default:execution:{eid} status running` |
| `execution_completed` | `hset pde:default:execution:{eid} status completed completed_at {ts}` |
| `execution_failed` | `hset pde:default:execution:{eid} status failed completed_at {ts}` |
| `execution_cancelled` | `hset pde:default:execution:{eid} status cancelled completed_at {ts}` |
| `phase_claimed` | (no-op — lock is set by dispatch endpoint, not ingest) |
| `phase_released` | `del pde:default:phase-lock:{repo_slug}:{phase}` |
| `merge_requested` | (no-op — stored in event stream only, merge endpoint handles action) |
| `merge_completed` | (no-op — stored in event stream only) |
| `merge_failed` | (no-op — stored in event stream only) |

The `execution_id` is read from `event.extensions.execution_id`. Events without this field are ignored by the execution handler (backward compatible with Layer 1 events).

Additionally, every event with a valid `extensions.execution_id` renews the phase lock TTL (`EXPIRE pde:default:phase-lock:{repo_slug}:{phase} {phase_lock_timeout}`), implementing the heartbeat mechanism.

**Auto-registration of local sessions:** When the ingest endpoint receives a `session_start` event with no `extensions.execution_id`, it creates an execution record with `backend: 'local'` and generates an execution_id, writing it to `pde:default:execution:{eid}` and linking it to the session via `pde:default:session:{sid} execution_id {eid}`.

## Post-Execution Validation & Merge

When a cloud agent completes, its work sits on a worktree branch.

**Validation pipeline (Vercel Function):**

1. `git diff main..worktree` — inspect changes
2. Commit message format check (Co-Authored-By present)
3. SUMMARY.md exists with required frontmatter
4. No secrets in diff (.env, credentials)
5. PLAN.md tasks all checked off

**Merge flow:**

- User taps "Merge" on completed execution (never auto-merged unless enabled in settings)
- Validation runs — pass: merge to target branch; fail: show failures, user decides (force merge / discard)
- Default: fast-forward if possible, merge commit if not
- Conflicts: surface diff in dashboard, user resolves locally or discards
- Post-merge: delete remote worktree branch, release phase lock, emit `merge_completed`

**Auto-merge option:** Configurable in settings. When enabled, validated executions merge automatically without user action. Validation must pass — no auto-merge on failure.

## Dashboard UI

### New Pages & Components

```
/dashboard                          (existing → multi-session home)
├── ExecutionGrid                   (card grid of all active executions)
│   ├── ExecutionCard[]
│   │   ├── StatusBadge             (reused)
│   │   ├── BackendBadge            (local/agent-sdk/vercel-fn icon)
│   │   ├── PhaseProgress           (compact variant)
│   │   ├── CostMeter               (compact variant — displays raw token counts, no cost controls)
│   │   └── ApprovalIndicator       (badge)
│   └── EmptyState                  ("No active executions" + dispatch CTA)
│
├── /sessions/{id}                  (existing, unchanged)
│
├── /dispatch                       (dispatch form)
│   ├── PhaseSelector               (dropdown — phases fetched from ROADMAP.md via GitHub API at render time, cached in Redis for 5 minutes)
│   ├── BackendSelector             (local/agent-sdk/vercel-fn radio)
│   ├── BranchConfig                (auto-generated worktree branch name)
│   └── DispatchButton              (confirm and dispatch)
│
└── /executions/{id}                (execution detail)
    ├── ExecutionHeader             (backend, phase, branch, timing)
    ├── SessionDetailClient         (reused for event stream)
    └── ExecutionActions            (cancel, merge, view diff)
```

### Navigation

Bottom tab nav updated:

```
Sessions | Executions | Dispatch | Settings
```

"Sessions" = raw Layer 1 monitoring. "Executions" = orchestration view. "Dispatch" = control plane.

### ExecutionGrid Data Flow

Polls `pde:default:executions` sorted set every 5 seconds. Each card subscribes independently to its execution's event stream via SSE/polling.

## API Endpoints

### New Endpoints

```
POST   /api/dispatch                — Create execution
GET    /api/dispatch/{id}           — Execution status
DELETE /api/dispatch/{id}           — Cancel execution
GET    /api/executions              — List all executions
POST   /api/executions/{id}/merge   — Trigger merge of completed execution
GET    /api/commands/{session_id}   — Relay polls for dispatch commands (Bearer auth)
```

### POST /api/dispatch

```
Auth: Clerk
Body: {
  phase: number,
  plan?: string,
  backend: 'local' | 'agent-sdk' | 'vercel-fn',
  repo?: string,       // defaults to configured repo
  ref?: string,        // defaults to configured default branch
}

Steps:
  1. Validate request
  2. SETNX phase lock — reject if claimed
  3. Generate execution_id and worktree_branch
  4. Write execution record to Redis
  5. Route to backend
  6. Return { execution_id, status: 'queued' }
```

### GET /api/commands/{session_id}

```
Auth: Bearer token (same as ingest)
Response:
  - Command found: 200 { command: 'execute_phase', phase: N, plan?: string, execution_id: string }
  - No command: 200 { pending: true }
  - Invalid session: 404
  - On read: delete command from Redis (consumed)
```

Note: "No command" returns 200 (not 404) to prevent the relay daemon's circuit breaker from counting empty polls as failures.

## Configuration & Settings

Settings page gains new sections:

```
Project Configuration
  - Repository URL, default branch, GitHub token

Compute Backends
  - Local: status indicator
  - Agent SDK: API key, default model, enabled toggle
  - Vercel Functions: enabled toggle (always available)
  - Self-hosted: endpoint URL, auth token, enabled toggle

Execution Policies
  - Auto-merge: off / on (validation pass required)
  - Max concurrent executions: 1-5
  - Default backend
  - Phase lock timeout: 30m / 1h / 2h

Cost Controls
  - Placeholder: "Cost controls coming in a future update"
```

All secrets stored server-side in Redis, never sent to client.

```
pde:default:settings
  Type: Hash
  Fields: repo_url, default_branch, github_token,
          anthropic_api_key, default_model,
          agent_sdk_enabled, self_hosted_enabled,
          self_hosted_url, self_hosted_token,
          auto_merge, max_concurrent,
          default_backend, phase_lock_timeout_ms
  TTL: never
```

## Security Model

**Phase 1 (this milestone):** Single-user trust.
- Secrets in Redis (Upstash encrypted at rest)
- Clerk auth for dashboard access
- Bearer token for relay/ingest
- GitHub token for git operations
- Anthropic API key for Agent SDK

**Future hardening (separate milestone):**
- Scoped short-lived tokens per execution
- Execution-level secret injection (not stored)
- Audit log of all dispatch/merge actions

## What Changes in Existing Code

| Component | Change | Scope |
|-----------|--------|-------|
| PDE plugin | New `command-listener.cjs` | 1 new file |
| Relay daemon (`relay.cjs`) | New command poller (parallel to approval poller) | ~40 lines |
| `/api/ingest` | Update execution registry on lifecycle events | ~20 lines |
| Dashboard pages | New Executions, Dispatch pages | 3 new pages |
| Dashboard components | ExecutionGrid, ExecutionCard, DispatchForm, etc. | ~8 new components |
| Settings page | New configuration sections | Extend existing |
| Navigation | Add Executions + Dispatch tabs | Minor |

## What Doesn't Change

- Wire protocol schema (extensions field absorbs new data)
- Event delivery infrastructure (SSE/polling)
- Approval gate flow
- PWA/push notification infrastructure
- All Layer 1 monitoring features
- Existing session detail page

## Risks

1. **Agent SDK fidelity drift** — Cloud agents may produce artifacts that don't match PDE conventions. Mitigated by: system prompt encoding conventions, post-execution validation, worktree isolation.

2. **Relay stdout is currently /dev/null** — `start-relay.cjs` spawns with `stdio: 'ignore'`, making the existing approval poller's stdout writes dead code. Must fix to file-based output before command polling works. Well-understood change (~10 lines).

3. **Relay command latency** — Local backend commands take up to 3 seconds (poll interval) to reach PDE. Acceptable for phase-level dispatch, not for real-time control.

4. **Vercel Sandbox costs** — Agent SDK execution requires Vercel Sandbox (~$0.05/hour compute) plus Claude API tokens ($2-10/phase). Free tier won't cover cloud agents — this is pay-per-use. `maxBudgetUsd` caps prevent runaway costs.

5. **Phase lock stale state** — If an executor crashes and the heartbeat stops, the lock expires after 60 seconds (reduced from 1 hour via @upstash/lock with 60s lease). Acceptable for single-user use.

6. **Sandbox cold start** — Agent SDK takes ~12 seconds for first `query()` call. Acceptable for phase-level dispatch (not real-time).

## Research References

- [Agent SDK TypeScript API](https://platform.claude.com/docs/en/agent-sdk/typescript) — `query()`, streaming, tools, cancellation
- [Hosting the Agent SDK](https://platform.claude.com/docs/en/agent-sdk/hosting) — Vercel Sandbox, Modal, E2B, Fly.io
- [Vercel Coding Agent Platform Template](https://vercel.com/templates/next.js/coding-agent-platform) — reference implementation
- [Vercel Sandbox + Agent SDK Guide](https://vercel.com/kb/guide/using-vercel-sandbox-claude-agent-sdk)
- [@upstash/lock](https://github.com/upstash/lock) — distributed locking with Lua scripts
- [@octokit/rest](https://github.com/octokit/rest.js) — GitHub API for serverless git operations
- [Vercel Workflow DevKit](https://vercel.com/docs/workflow) — alternative for step-decomposed durable execution
