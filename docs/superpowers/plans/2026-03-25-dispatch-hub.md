# Dispatch Hub (Remote Dashboard Layers 2-3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the PDE Remote Dashboard from a read-only monitor into a dispatch hub with pluggable execution backends, multi-session orchestration, and phase claiming.

**Architecture:** Pluggable `ExecutionBackend` interface routes dispatch requests to local relay, Vercel Sandbox (Agent SDK), or Vercel Functions (GitHub API). All backends emit events through the existing `/api/ingest` pipeline. Phase claiming via `@upstash/lock` with 60s lease. Dashboard gains ExecutionGrid, Dispatch form, and Execution detail pages.

**Tech Stack:** Next.js 16, @upstash/redis, @upstash/lock, @anthropic-ai/claude-agent-sdk, @vercel/sandbox, @octokit/rest, Clerk, shadcn/ui, Vitest

**Spec:** `docs/superpowers/specs/2026-03-25-remote-dashboard-layers-2-3-design.md`

---

## File Map

### New Files — Dashboard

| File | Responsibility |
|------|---------------|
| `dashboard/lib/dispatch.ts` | `DispatchManager` — routes requests to backends, manages execution registry |
| `dashboard/lib/phase-lock.ts` | Phase claiming via `@upstash/lock` with heartbeat renewal |
| `dashboard/lib/backends/types.ts` | `ExecutionBackend`, `DispatchRequest`, `ExecutionHandle`, `BackendCapabilities` interfaces |
| `dashboard/lib/backends/local.ts` | Local backend — writes commands to Redis for relay polling |
| `dashboard/lib/backends/agent-sdk.ts` | Agent SDK backend — spawns Vercel Sandbox with Claude agent |
| `dashboard/lib/backends/vercel-fn.ts` | Vercel Functions backend — GitHub API task runners |
| `dashboard/lib/github.ts` | Octokit wrapper for merge, PR, diff, branch, file operations |
| `dashboard/lib/execution-registry.ts` | Redis CRUD for execution records |
| `dashboard/app/api/dispatch/route.ts` | POST: create execution, GET: list executions |
| `dashboard/app/api/dispatch/[id]/route.ts` | GET: execution status, DELETE: cancel execution |
| `dashboard/app/api/commands/[sessionId]/route.ts` | GET: relay polls for dispatch commands |
| `dashboard/app/api/executions/[id]/merge/route.ts` | POST: trigger merge of completed execution |
| `dashboard/app/executions/page.tsx` | Execution grid page (multi-session view) |
| `dashboard/app/executions/[id]/page.tsx` | Execution detail page (server component) |
| `dashboard/app/executions/[id]/execution-detail-client.tsx` | Client-side execution detail with event stream |
| `dashboard/app/dispatch/page.tsx` | Dispatch form page |
| `dashboard/components/execution-card.tsx` | Card for ExecutionGrid — status, backend, phase, cost |
| `dashboard/components/execution-grid.tsx` | Grid of ExecutionCards with polling |
| `dashboard/components/execution-header.tsx` | Header for execution detail — backend, branch, timing |
| `dashboard/components/execution-actions.tsx` | Cancel, merge, view diff actions |
| `dashboard/components/dispatch-form.tsx` | Phase selector, backend selector, dispatch button |
| `dashboard/app/api/executions/route.ts` | GET: list all executions |
| `dashboard/app/api/phases/route.ts` | GET: fetch phases from ROADMAP.md via GitHub API |
| `dashboard/app/settings/actions.ts` | Server Actions for settings CRUD |
| `dashboard/components/backend-badge.tsx` | Icon badge for local/agent-sdk/vercel-fn |

### New Files — PDE Plugin

| File | Responsibility |
|------|---------------|
| `hooks/command-listener.cjs` | Tails relay output file, triggers phase execution on dispatch commands |

### Modified Files

| File | Change |
|------|--------|
| `hooks/start-relay.cjs` | Redirect stdout to file instead of `'ignore'` |
| `bin/lib/relay.cjs` | Add command poller (parallel to approval poller) |
| `dashboard/app/api/ingest/route.ts` | Execution registry updates on lifecycle events, auto-registration |
| `dashboard/components/layout/bottom-nav.tsx` | Add Executions + Dispatch tabs |
| `dashboard/app/settings/page.tsx` | Add project config, backend toggles, execution policies |
| `dashboard/lib/wire-schema.ts` | Add execution event type constants |
| `dashboard/package.json` | Add @upstash/lock, @octokit/rest dependencies |

### Test Files

| File | Tests |
|------|-------|
| `dashboard/lib/__tests__/phase-lock.test.ts` | SETNX, release, heartbeat, expiry, contention |
| `dashboard/lib/__tests__/execution-registry.test.ts` | CRUD, auto-registration, status transitions |
| `dashboard/lib/__tests__/dispatch.test.ts` | Routing to backends, phase lock integration |
| `dashboard/lib/__tests__/github.test.ts` | Merge, PR, diff, branch delete, file read |
| `dashboard/lib/__tests__/backends/local.test.ts` | Command write, ack timeout, retry |
| `dashboard/lib/__tests__/backends/agent-sdk.test.ts` | Sandbox spawn, event translation, cancellation |
| `dashboard/lib/__tests__/backends/vercel-fn.test.ts` | Task runner dispatch, GitHub API calls |
| `dashboard/lib/__tests__/ingest-execution.test.ts` | Execution event handling in ingest endpoint |
| `dashboard/app/api/__tests__/dispatch.test.ts` | Dispatch API route integration |
| `dashboard/app/api/__tests__/commands.test.ts` | Command polling endpoint |
| `dashboard/app/api/__tests__/merge.test.ts` | Merge endpoint |
| `dashboard/lib/__tests__/settings.test.ts` | Settings CRUD and secret redaction |
| `tests/relay-commands.test.cjs` | Relay command poller unit tests |
| `tests/command-listener.test.cjs` | Command listener hook tests |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `dashboard/package.json`

- [ ] **Step 1: Install new packages**

Run: `cd dashboard && npm install @upstash/lock @octokit/rest`

Note: `@vercel/sandbox` and `@anthropic-ai/claude-agent-sdk` are deferred to Task 10 (Agent SDK backend) — install only when implementing that backend.

- [ ] **Step 2: Verify installation**

Run: `cd dashboard && node -e "require('@upstash/lock'); require('@octokit/rest'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

Stage `dashboard/package.json` and `dashboard/package-lock.json`, commit: "chore: add @upstash/lock and @octokit/rest dependencies"

---

## Task 2: Backend Type Definitions

**Files:**
- Create: `dashboard/lib/backends/types.ts`
- Modify: `dashboard/lib/wire-schema.ts`

- [ ] **Step 1: Write the type definitions**

Create `dashboard/lib/backends/types.ts` with interfaces: `ExecutionBackend`, `DispatchRequest`, `ExecutionHandle`, `BackendCapabilities`, `ExecutionRecord`, `ExecutionStatus` type, and `EXECUTION_EVENT_TYPES` constant array.

Key types:

```typescript
export interface ExecutionBackend {
  id: string;
  dispatch(request: DispatchRequest): Promise<ExecutionHandle>;
  cancel(executionId: string): Promise<void>;
  capabilities(): BackendCapabilities;
}

export interface DispatchRequest {
  project_repo: string;
  ref: string;
  phase: number;
  plan?: string;
  worktree_branch: string;
  env: Record<string, string>;
}

export interface ExecutionHandle {
  execution_id: string;
  backend: string;
  session_id: string;
  status: ExecutionStatus;
}

export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackendCapabilities {
  supports_streaming: boolean;
  supports_approval: boolean;
  max_concurrent: number;
  cost_model: 'free' | 'per-minute' | 'per-token';
}

export interface ExecutionRecord extends ExecutionHandle {
  phase: number;
  plan: string | null;
  worktree_branch: string;
  claimed_at: number;
  completed_at: number | null;
  repo: string;
  ref: string;
}

export const EXECUTION_EVENT_TYPES = [
  'execution_queued', 'execution_started', 'execution_completed',
  'execution_failed', 'execution_cancelled', 'execution_acknowledged',
  'phase_claimed', 'phase_released',
  'merge_requested', 'merge_completed', 'merge_failed',
] as const;

export type ExecutionEventType = typeof EXECUTION_EVENT_TYPES[number];
```

- [ ] **Step 2: Add execution event type constants to wire-schema.ts**

Read `dashboard/lib/wire-schema.ts` first. Import and re-export `EXECUTION_EVENT_TYPES` from `./backends/types`.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd dashboard && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

Stage both files, commit: "feat: add ExecutionBackend interface and execution event types"

---

## Task 3: Phase Lock Manager

**Files:**
- Create: `dashboard/lib/phase-lock.ts`
- Create: `dashboard/lib/__tests__/phase-lock.test.ts`

- [ ] **Step 1: Write failing tests**

Create `dashboard/lib/__tests__/phase-lock.test.ts` with mocked `@upstash/lock` and `../redis`. Tests:
- `acquire()` returns `{ acquired: true }` on success
- `acquire()` returns `{ acquired: false }` when lock exists
- `release()` calls `lock.release()` and removes from active locks
- `heartbeat()` calls `lock.extend()` with correct lease duration
- `lockKey()` generates `pde:default:phase-lock:{repoSlug}:{phase}`

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/phase-lock.test.ts`
Expected: FAIL — `PhaseLockManager` not found

- [ ] **Step 3: Implement PhaseLockManager**

Create `dashboard/lib/phase-lock.ts` using `@upstash/lock`:
- `LEASE_MS = 60_000` (60s)
- `acquire(repoSlug, phase, executionId)` — creates Lock with `{ id, redis, lease: LEASE_MS, retry: { attempts: 1, delay: 0 } }`, calls `lock.acquire()`
- `release(repoSlug, phase)` — calls `lock.release()` on stored lock
- `heartbeat(repoSlug, phase)` — calls `lock.extend(LEASE_MS)`
- Static `lockKey(repoSlug, phase)` — returns `pde:default:phase-lock:${repoSlug}:${phase}`
- Export singleton `phaseLockManager`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard && npx vitest run lib/__tests__/phase-lock.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add PhaseLockManager with @upstash/lock"

---

## Task 4: Execution Registry

**Files:**
- Create: `dashboard/lib/execution-registry.ts`
- Create: `dashboard/lib/__tests__/execution-registry.test.ts`

- [ ] **Step 1: Write failing tests**

Mock `../redis`. Tests:
- `createExecution()` calls pipeline with zadd + hset + expire
- `getExecution()` returns record from hgetall
- `getExecution()` returns null for missing ID
- `updateExecutionStatus()` calls hset with new status
- `updateExecutionStatus()` includes completed_at when provided
- `listExecutions()` fetches from sorted set and hydrates each record
- `autoRegisterLocalSession()` creates record with `backend: 'local'`

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/execution-registry.test.ts`

- [ ] **Step 3: Implement execution registry**

Create `dashboard/lib/execution-registry.ts`:
- `EXECUTIONS_KEY = 'pde:default:executions'`
- `EXECUTION_PREFIX = 'pde:default:execution:'`
- `TTL_SECONDS = 7 * 24 * 60 * 60` (7 days)
- Functions: `createExecution`, `getExecution`, `listExecutions`, `updateExecutionStatus`, `autoRegisterLocalSession`
- Use Redis pipeline for atomic writes

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard && npx vitest run lib/__tests__/execution-registry.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add execution registry with Redis CRUD"

---

## Task 5: Ingest Endpoint — Execution Event Handling

**Files:**
- Modify: `dashboard/app/api/ingest/route.ts`
- Create: `dashboard/lib/__tests__/ingest-execution.test.ts`

- [ ] **Step 1: Read the existing ingest route**

Read `dashboard/app/api/ingest/route.ts` to understand the current pipeline.

- [ ] **Step 2: Write failing tests for execution event handling**

Test:
- `execution_started` event updates execution record to `status: 'running'`
- `execution_completed` event updates to `status: 'completed'` with `completed_at`
- `execution_failed` event updates to `status: 'failed'`
- `session_start` event without `extensions.execution_id` triggers `autoRegisterLocalSession`
- Events with `extensions.execution_id` renew phase lock TTL
- Layer 1 events (no execution_id in extensions) pass through unchanged

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/ingest-execution.test.ts`

- [ ] **Step 4: Implement execution event handler**

Add a `handleExecutionEvents(events)` function called from the ingest route after the existing Redis pipeline. For each event:
1. Check `event.extensions?.execution_id` — skip if absent (Layer 1 backward compat)
2. Switch on `event_type`:
   - `execution_started/completed/failed/cancelled` → `updateExecutionStatus()`
   - `phase_released` → `phaseLockManager.release()`
3. Renew phase lock TTL on any event with execution_id
4. Special case: `session_start` without execution_id → `autoRegisterLocalSession()`
5. On `execution_completed`: check `auto_merge` setting — if enabled, read execution record, call validation + merge flow from Task 13 inline. If validation fails, skip auto-merge and let user handle manually.

- [ ] **Step 5: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/ingest-execution.test.ts`
Expected: All pass

- [ ] **Step 6: Run full dashboard test suite to verify no regressions**

Run: `cd dashboard && npx vitest run`
Expected: All existing tests still pass

- [ ] **Step 7: Commit**

Stage both files, commit: "feat: handle execution lifecycle events in ingest endpoint"

---

## Task 6: Commands API Endpoint

**Files:**
- Create: `dashboard/app/api/commands/[sessionId]/route.ts`
- Create: `dashboard/app/api/__tests__/commands.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- GET with valid session_id and pending command returns 200 + command JSON
- GET with valid session_id and no command returns 200 + `{ pending: true }`
- GET with invalid Bearer token returns 401
- Command is deleted from Redis after read (consumed)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run app/api/__tests__/commands.test.ts`

- [ ] **Step 3: Implement the commands endpoint**

Create `dashboard/app/api/commands/[sessionId]/route.ts`:
- GET handler with Bearer token auth (reuse `validateBearerToken` from `@/lib/auth`)
- Read from `pde:default:commands:{sessionId}` via `redis.hgetall()`
- If empty: return `NextResponse.json({ pending: true })` (200)
- If found: delete key, return command JSON (200)

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run app/api/__tests__/commands.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add /api/commands endpoint for relay command polling"

---

## Task 7: Local Backend

**Files:**
- Create: `dashboard/lib/backends/local.ts`
- Create: `dashboard/lib/__tests__/backends/local.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- `dispatch()` writes command to Redis at `pde:default:commands:{session_id}`
- `dispatch()` returns ExecutionHandle with `status: 'queued'`
- `dispatch()` throws if no active local session found
- `cancel()` does not throw
- `capabilities()` returns correct values

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/local.test.ts`

- [ ] **Step 3: Implement local backend**

Create `dashboard/lib/backends/local.ts` implementing `ExecutionBackend`:
- `dispatch()`: find most recent session via `redis.zrange('pde:default:sessions', 0, 0, { rev: true })`, write command hash to `pde:default:commands:{sessionId}`
- `cancel()`: no-op (PDE controls its own execution)
- `capabilities()`: `{ supports_streaming: true, supports_approval: true, max_concurrent: 1, cost_model: 'free' }`

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/local.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add local execution backend (relay command dispatch)"

---

## Task 8: GitHub API Wrapper

**Files:**
- Create: `dashboard/lib/github.ts`
- Create: `dashboard/lib/__tests__/github.test.ts`

- [ ] **Step 1: Write failing tests**

Mock Octokit. Test:
- `mergeBranch()` calls `repos.merge()` with correct owner/repo/base/head
- `fastForwardMerge()` calls `git.updateRef()` with `force: false`
- `createPR()` calls `pulls.create()` and returns PR URL
- `deleteBranch()` calls `git.deleteRef()` with `heads/branchName` format
- `getFileContent()` decodes base64 content from `repos.getContent()`
- `compareBranches()` returns divergence status and file list
- `getRepoSlug()` extracts `owner/repo` from various URL formats

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/github.test.ts`

- [ ] **Step 3: Implement GitHub wrapper**

Create `dashboard/lib/github.ts`:
- Lazy-initialize Octokit with token from `pde:default:settings`
- `getRepoSlug(url)` — parse `owner/repo` from GitHub URL
- `mergeBranch(owner, repo, base, head, message)` — `repos.merge()`
- `fastForwardMerge(owner, repo, base, headSha)` — `git.updateRef({ force: false })`
- `createPR(owner, repo, head, base, title, body)` — `pulls.create()`
- `deleteBranch(owner, repo, branch)` — `git.deleteRef({ ref: 'heads/' + branch })`
- `getFileContent(owner, repo, path, ref)` — `repos.getContent()`, decode base64
- `compareBranches(owner, repo, base, head)` — `repos.compareCommitsWithBasehead()`

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/github.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add GitHub API wrapper for serverless git operations"

---

## Task 9: Vercel Functions Backend

**Files:**
- Create: `dashboard/lib/backends/vercel-fn.ts`
- Create: `dashboard/lib/__tests__/backends/vercel-fn.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- `dispatch()` with merge task calls `github.mergeBranch()`
- `dispatch()` with validate task runs validation checks
- `dispatch()` with create-pr task calls `github.createPR()`
- `capabilities()` returns `cost_model: 'free'`

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/vercel-fn.test.ts`

- [ ] **Step 3: Implement Vercel Functions backend**

Create `dashboard/lib/backends/vercel-fn.ts`. Predefined task runners:

- **merge**: calls `github.mergeBranch()` then `github.deleteBranch()`
- **create-pr**: calls `github.createPR()`
- **delete-branch**: calls `github.deleteBranch()`
- **validate**: runs 5-step validation pipeline using GitHub API:
  1. `github.compareBranches()` → get diff files list
  2. Check each commit message in diff for `Co-Authored-By:` (via `repos.compareCommitsWithBasehead()` → `data.commits[].commit.message`)
  3. `github.getFileContent()` for SUMMARY.md — verify it exists and has frontmatter (`---` delimiters)
  4. Check diff file list for `.env`, `credentials`, `secret`, `token` patterns → flag if found
  5. `github.getFileContent()` for PLAN.md — verify all `- [x]` checkboxes (no unchecked `- [ ]` remaining)

  Returns `{ valid: boolean, failures: string[] }`

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/vercel-fn.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add Vercel Functions backend (GitHub API task runners)"

---

## Task 10: Agent SDK Backend (Stub)

**Files:**
- Create: `dashboard/lib/backends/agent-sdk.ts`
- Create: `dashboard/lib/__tests__/backends/agent-sdk.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- `dispatch()` returns ExecutionHandle with `status: 'queued'` and `backend: 'agent-sdk'`
- `dispatch()` throws if Agent SDK is not enabled in settings
- `dispatch()` throws if Anthropic API key is missing
- `capabilities()` returns `{ supports_streaming: true, supports_approval: false, max_concurrent: 3, cost_model: 'per-token' }`
- `cancel()` does not throw

Note: Full Vercel Sandbox integration is deferred. This task creates a functional stub.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/agent-sdk.test.ts`

- [ ] **Step 3: Implement Agent SDK backend stub**

Create `dashboard/lib/backends/agent-sdk.ts`:
- `dispatch()`: validate settings (API key, enabled), create execution record with `status: 'queued'`, add TODO comment for Vercel Sandbox spawn with reference to spec
- `cancel()`: no-op stub (TODO: AbortController integration)
- `capabilities()`: return correct values

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/backends/agent-sdk.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add Agent SDK backend stub (Sandbox integration deferred)"

---

## Task 11: Dispatch Manager

**Files:**
- Create: `dashboard/lib/dispatch.ts`
- Create: `dashboard/lib/__tests__/dispatch.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- `dispatch()` acquires phase lock before dispatching
- `dispatch()` rejects with error if phase is already locked
- `dispatch()` routes to correct backend based on `backend` field
- `dispatch()` creates execution record in registry
- `dispatch()` generates worktree branch name: `pde/phase-{N}-{backend}`
- `dispatch()` releases lock on backend dispatch failure
- `dispatch()` reads project config from settings for defaults
- `repoSlug()` extracts `owner/repo` from GitHub URLs

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/dispatch.test.ts`

- [ ] **Step 3: Implement DispatchManager**

Create `dashboard/lib/dispatch.ts`:
- Backend registry: `{ local: LocalBackend, 'agent-sdk': AgentSdkBackend, 'vercel-fn': VercelFnBackend }`
- `getSettings()` — reads `pde:default:settings` hash
- `repoSlug(url)` — extract `owner/repo` from URL
- `dispatch(opts)` — acquire lock, route to backend, create execution record, release lock on failure
- Re-export `getExecution`, `listExecutions` from execution-registry

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/dispatch.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage both files, commit: "feat: add DispatchManager with backend routing and phase locking"

---

## Task 12: Dispatch & Executions API Routes

**Files:**
- Create: `dashboard/app/api/dispatch/route.ts`
- Create: `dashboard/app/api/dispatch/[id]/route.ts`
- Create: `dashboard/app/api/executions/route.ts`
- Create: `dashboard/app/api/__tests__/dispatch.test.ts`

- [ ] **Step 1: Write failing tests**

Test:
- POST `/api/dispatch` with valid body returns 200 + `{ execution_id, status: 'queued' }`
- POST with missing phase returns 400
- POST with unknown backend returns 400
- POST when phase is locked returns 409
- GET `/api/executions` lists all executions
- GET `/api/dispatch/{id}` returns execution details
- DELETE `/api/dispatch/{id}` marks execution as cancelled

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run app/api/__tests__/dispatch.test.ts`

- [ ] **Step 3: Implement API routes**

`dashboard/app/api/dispatch/route.ts`:
- POST: Clerk auth, zod validate `{ phase, plan?, backend, repo?, ref? }`, call `dispatch()`, return handle

`dashboard/app/api/dispatch/[id]/route.ts`:
- GET: Clerk auth, `getExecution(id)`, return record or 404
- DELETE: Clerk auth, `updateExecutionStatus(id, 'cancelled')`, release phase lock

`dashboard/app/api/executions/route.ts`:
- GET: Clerk auth, call `listExecutions()`, return array (separate from dispatch per spec)

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run app/api/__tests__/dispatch.test.ts`
Expected: All pass

- [ ] **Step 5: Commit**

Stage all files, commit: "feat: add /api/dispatch endpoint for execution management"

---

## Task 13: Merge API Route

**Files:**
- Create: `dashboard/app/api/executions/[id]/merge/route.ts`
- Create: `dashboard/app/api/__tests__/merge.test.ts`

- [ ] **Step 1: Write failing test**

Create `dashboard/app/api/__tests__/merge.test.ts`. Test:
- POST with completed execution triggers merge and returns result
- POST with non-completed execution returns 400
- POST with merge conflict returns 409 with diff data
- POST triggers branch cleanup and lock release on success

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement merge route**

POST handler:
1. Clerk auth
2. Get execution from registry — verify status is `completed`
3. Read settings for GitHub token and repo
4. Call `github.compareBranches()` for conflict check
5. If clean: `github.mergeBranch()`, `github.deleteBranch()`, update status, release lock
6. If conflicts: return 409 with diff

- [ ] **Step 4: Run tests**

Expected: All pass

- [ ] **Step 5: Commit**

Stage files, commit: "feat: add /api/executions/{id}/merge endpoint"

---

## Task 14: Relay — Fix stdout and Add Command Poller

**Files:**
- Modify: `hooks/start-relay.cjs`
- Modify: `bin/lib/relay.cjs`
- Create: `tests/relay-commands.test.cjs`

- [ ] **Step 1: Write failing tests for command poller**

Create `tests/relay-commands.test.cjs` testing:
- `getCommands()` returns parsed JSON on 200
- `getCommands()` returns `null` on 200 with `{ pending: true }`
- `getCommands()` returns `null` on network error (never rejects)
- Command poller writes command NDJSON to stdout when command received

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/relay-commands.test.cjs`

- [ ] **Step 3: Fix start-relay.cjs stdout redirect**

Read `hooks/start-relay.cjs`. Find the `spawn()` call (around line 80) which currently has `stdio: 'ignore'`.

Change it to redirect stdout to a file:
1. Before the `spawn()` call, add:
   ```javascript
   const outPath = path.join(os.tmpdir(), 'pde-relay-' + sessionId + '-out.ndjson');
   const outFd = fs.openSync(outPath, 'a');
   ```
2. Change the spawn option from `stdio: 'ignore'` to `stdio: ['ignore', outFd, 'ignore']`
3. After `child.unref()`, add `fs.closeSync(outFd);` to release the fd in the hook process (the relay subprocess inherits the fd independently)

**Note:** The existing approval poller in `relay.cjs` already writes to `process.stdout` (line ~439). After this fix, both approval responses AND command data will appear in the output file as mixed NDJSON lines. The `command-listener.cjs` (Task 15) filters by `type` field to handle only dispatch commands.

- [ ] **Step 4: Add getCommands() to relay.cjs**

Read `bin/lib/relay.cjs`. Add a `getCommands()` function following the exact pattern of `getApprovalResponse()` (same HTTP client, same error handling, always resolves). URL: `ingestUrl.replace(/\/api\/ingest\/?$/, '/api/commands')` + `/${sessionId}`.

- [ ] **Step 5: Add command poll timer to startRelay()**

Inside `startRelay()`, add a `setInterval` at 3000ms. On each tick:
1. Call `getCommands(commandUrl, bearerToken, sessionId)`
2. If result is not null and `result.pending !== true`: write NDJSON to stdout
3. Format: `{ type: 'dispatch_command', ...commandData }`

Add the timer reference to the `stop()` cleanup.

- [ ] **Step 6: Run tests**

Run: `node --test tests/relay-commands.test.cjs`
Expected: All pass

- [ ] **Step 7: Run existing relay tests to verify no regressions**

Run: `node --test tests/phase-134/test-relay-protocol.cjs tests/phase-134/test-relay-batch.cjs tests/phase-134/test-relay-circuit.cjs tests/phase-134/test-relay-tail.cjs tests/relay-approval.test.cjs tests/relay-downsample.test.cjs`
Expected: All pass

- [ ] **Step 8: Commit**

Stage all three files, commit: "feat: fix relay stdout routing, add command poller"

---

## Task 15: PDE Command Listener Hook

**Files:**
- Create: `hooks/command-listener.cjs`
- Create: `tests/command-listener.test.cjs`
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Write failing tests**

Create `tests/command-listener.test.cjs` testing:
- Reads NDJSON lines from relay output file
- Parses `dispatch_command` type events
- Ignores non-command events (approval_response, etc.)
- Writes `execution_acknowledged` event to session NDJSON on command receipt

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/command-listener.test.cjs`

- [ ] **Step 3: Implement command-listener.cjs**

The listener is a SessionStart hook (async: true) that:
1. Reads session ID from `.planning/config.json`
2. Watches relay output file at `/tmp/pde-relay-{sessionId}-out.ndjson`
3. Uses a simplified tail loop (poll every 1s, read new lines)
4. On `dispatch_command` line: write `execution_acknowledged` event to session NDJSON
5. All errors silently swallowed (exit 0)

For MVP, the acknowledged event is emitted but actual phase triggering requires user interaction (the command is surfaced as a notification). Full auto-execution is a future enhancement.

- [ ] **Step 4: Register in hooks.json**

Read `hooks/hooks.json`. Find the `SessionStart` section and its `hooks` array. Add the following entry after the `start-relay.cjs` entry:

```json
{
  "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/command-listener.cjs\"",
  "async": true
}
```

This goes inside `hooks.SessionStart[0].hooks[]` (the array that already contains `emit-event.cjs` and `start-relay.cjs`).

- [ ] **Step 5: Run tests**

Run: `node --test tests/command-listener.test.cjs`
Expected: All pass

- [ ] **Step 6: Commit**

Stage all three files, commit: "feat: add command listener hook for local dispatch"

---

## Task 16: Dashboard UI — Backend Badge and Execution Card

**Files:**
- Create: `dashboard/components/backend-badge.tsx`
- Create: `dashboard/components/execution-card.tsx`

- [ ] **Step 1: Create BackendBadge component**

Small badge showing backend type: `local` (laptop icon), `agent-sdk` (cloud icon), `vercel-fn` (zap icon). Use shadcn Badge with variant styling.

- [ ] **Step 2: Create ExecutionCard component**

Card showing: StatusBadge (reused), BackendBadge, phase number, PhaseProgress (compact), CostMeter (compact, raw token counts), ApprovalIndicator, relative timestamp. Use shadcn Card. 44px minimum touch targets. Props: `execution: ExecutionRecord`.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

Stage both files, commit: "feat: add BackendBadge and ExecutionCard components"

---

## Task 17: Dashboard UI — Execution Grid Page

**Files:**
- Create: `dashboard/app/executions/page.tsx`
- Create: `dashboard/components/execution-grid.tsx`

- [ ] **Step 1: Create ExecutionGrid component**

Client component: fetches `GET /api/dispatch` every 5s, renders grid of ExecutionCards, shows empty state with dispatch CTA. Grid: 1 col mobile, 2 tablet, 3 desktop.

- [ ] **Step 2: Create executions page**

Server component rendering ExecutionGrid. Title: "Executions".

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`

- [ ] **Step 4: Commit**

Stage files, commit: "feat: add Executions page with multi-session grid"

---

## Task 18: Dashboard UI — Dispatch Form Page

**Files:**
- Create: `dashboard/app/dispatch/page.tsx`
- Create: `dashboard/components/dispatch-form.tsx`

- [ ] **Step 1: Create DispatchForm component**

Client component with: phase dropdown (fetched from `/api/phases` — see step below), backend radio group (local/agent-sdk/vercel-fn), auto-generated branch name preview, dispatch button. POSTs to `/api/dispatch`, shows loading, redirects to execution detail on success, shows error on 409 (phase locked). Use shadcn Select, RadioGroup, Button, Input.

Before building the form, create `dashboard/app/api/phases/route.ts`:
- GET handler: Clerk auth, read settings for repo/branch, call `github.getFileContent(owner, repo, 'ROADMAP.md', ref)`, parse phase numbers from lines matching `Phase \d+:`, cache result in Redis with 5-minute TTL (`pde:default:phases-cache`), return `{ phases: [{ number, name, status }] }`
- This endpoint powers the PhaseSelector dropdown

- [ ] **Step 2: Create dispatch page**

Server component rendering DispatchForm. Title: "Dispatch".

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`

- [ ] **Step 4: Commit**

Stage files, commit: "feat: add Dispatch page with phase/backend selection form"

---

## Task 19: Dashboard UI — Execution Detail Page

**Files:**
- Create: `dashboard/app/executions/[id]/page.tsx`
- Create: `dashboard/app/executions/[id]/execution-detail-client.tsx`
- Create: `dashboard/components/execution-header.tsx`
- Create: `dashboard/components/execution-actions.tsx`

- [ ] **Step 1: Create ExecutionHeader**

Shows: BackendBadge, phase number, worktree branch, claimed_at, elapsed time.

- [ ] **Step 2: Create ExecutionActions**

Actions by status: running → Cancel, completed → Merge + View Diff, failed → View Logs. Merge POSTs to `/api/executions/{id}/merge`. Cancel DELETEs `/api/dispatch/{id}`.

- [ ] **Step 3: Create execution-detail-client.tsx**

Client component: uses `useEventStream` for this execution's session_id, renders ExecutionHeader + SessionDetail (reused) + ExecutionActions.

- [ ] **Step 4: Create page.tsx**

Server component fetching execution by ID, rendering client component.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`

- [ ] **Step 6: Commit**

Stage all files, commit: "feat: add Execution detail page with header, actions, event stream"

---

## Task 20: Navigation Update

**Files:**
- Modify: `dashboard/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Read existing bottom-nav.tsx**

- [ ] **Step 2: Add Executions and Dispatch tabs**

Add between Sessions and Settings: Executions (list icon, `/executions`), Dispatch (play icon, `/dispatch`). Final order: Sessions | Executions | Dispatch | Settings. Maintain 44px touch targets and safe-area-inset.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`

- [ ] **Step 4: Commit**

Stage file, commit: "feat: add Executions and Dispatch tabs to bottom nav"

---

## Task 21: Settings Page Extensions

**Files:**
- Modify: `dashboard/app/settings/page.tsx`
- Create: `dashboard/app/settings/actions.ts`
- Create: `dashboard/lib/__tests__/settings.test.ts`

- [ ] **Step 1: Write failing tests for settings CRUD**

Create `dashboard/lib/__tests__/settings.test.ts`. Test:
- `saveSettings()` writes to `pde:default:settings` hash via `redis.hset()`
- `getSettings()` reads from `pde:default:settings` hash
- `getPublicSettings()` excludes sensitive fields (`github_token`, `anthropic_api_key`, `self_hosted_token`)
- Settings persist across reads/writes

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard && npx vitest run lib/__tests__/settings.test.ts`

- [ ] **Step 3: Create settings Server Actions**

Create `dashboard/app/settings/actions.ts` with `'use server'` directive:
- `saveProjectConfig(formData)` — writes `repo_url`, `default_branch`, `github_token` to Redis
- `saveBackendConfig(formData)` — writes `anthropic_api_key`, `default_model`, `agent_sdk_enabled`, etc.
- `savePolicyConfig(formData)` — writes `auto_merge`, `max_concurrent`, `default_backend`, `phase_lock_timeout_ms`
- `getPublicSettings()` — returns settings with secrets redacted

- [ ] **Step 4: Run tests**

Run: `cd dashboard && npx vitest run lib/__tests__/settings.test.ts`
Expected: All pass

- [ ] **Step 5: Read existing settings page**

Read `dashboard/app/settings/page.tsx` to understand current layout.

- [ ] **Step 6: Add Project Configuration section**

Fields: Repository URL, Default branch, GitHub token (password input). Submit calls `saveProjectConfig` Server Action.

- [ ] **Step 7: Add Compute Backends section**

Local status indicator, Agent SDK (API key + model + toggle), Vercel Functions (toggle), Self-hosted (greyed out "coming soon").

- [ ] **Step 8: Add Execution Policies section**

Auto-merge toggle (with note: "validation must pass"), max concurrent (1-5), default backend select, phase lock timeout select (30m/1h/2h).

- [ ] **Step 9: Verify TypeScript compiles**

Run: `cd dashboard && npx tsc --noEmit`

- [ ] **Step 10: Commit**

Stage all files, commit: "feat: add project config, backend, and policy settings"

---

## Task 22: Integration Test — Full Dispatch Flow

**Files:**
- Create: `dashboard/lib/__tests__/dispatch-integration.test.ts`

- [ ] **Step 1: Write integration test**

Full flow (mocked Redis and GitHub):
1. Configure settings
2. POST dispatch with `{ phase: 140, backend: 'local' }`
3. Verify phase lock acquired
4. Verify execution record created
5. Verify command in Redis
6. GET commands returns the command
7. Simulate `execution_completed` via ingest
8. Verify status updated
9. POST merge
10. Verify GitHub API called
11. Verify lock released

- [ ] **Step 2: Run integration test**

Run: `cd dashboard && npx vitest run lib/__tests__/dispatch-integration.test.ts`
Expected: All pass

- [ ] **Step 3: Run full test suite**

Run: `cd dashboard && npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

Stage file, commit: "test: add full dispatch flow integration test"

---

## Task 23: Final Verification

- [ ] **Step 1: Run all dashboard tests**

Run: `cd dashboard && npx vitest run`
Expected: All pass

- [ ] **Step 2: Run all PDE relay tests**

Run: `node --test tests/phase-134/test-relay-protocol.cjs tests/phase-134/test-relay-batch.cjs tests/phase-134/test-relay-circuit.cjs tests/phase-134/test-relay-tail.cjs tests/relay-approval.test.cjs tests/relay-downsample.test.cjs tests/relay-commands.test.cjs tests/command-listener.test.cjs`
Expected: All pass

- [ ] **Step 3: TypeScript type check**

Run: `cd dashboard && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Final commit if needed**

Stage any cleanup, commit: "chore: final cleanup and test verification"
