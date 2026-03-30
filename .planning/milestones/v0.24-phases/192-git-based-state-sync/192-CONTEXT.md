# Phase 192: Git-Based State Sync - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Mode:** Smart discuss (grey area proposals accepted)

<domain>
## Phase Boundary

Planning state (.planning/) is pushed to a remote git branch before cloud dispatch and merged back locally after completion, with correct merge direction so cloud-written STATE.md content survives the merge.

</domain>

<decisions>
## Implementation Decisions

### Sync Architecture
- **Sync module location:** New `packages/dispatcher/lib/sync.cjs` — sits alongside merge.cjs, coordinator calls both
- **Git library:** simple-git npm package in packages/dispatcher/ — cleaner async API than execFileSync, required by SYN-07
- **Cloud merge direction:** Separate function `mergePlanningFromCloud(projectRoot, branch)` with INVERTED rules vs existing merge.cjs:
  - `--theirs` for STATE.md (cloud-written state survives — cloud executor updated it)
  - `--ours` for ROADMAP.md, REQUIREMENTS.md (local orchestrator owns these)
  - This is the OPPOSITE of merge.cjs which uses `--ours` for all planning files
- **Push timing:** Push AFTER worktree creation, BEFORE spawn — worktree branch already has .planning/ committed; push that branch to origin

### Concurrency & Testing
- **Sequential merge ordering:** Mutex via existing dispatcher.lock — reuse acquireLock/releaseLock around the merge-back operation; coordinator already uses this pattern
- **Testing strategy:** Temp directory fixtures with `git init --bare` remote + worktree clones — no mocking git, tests exercise actual push/fetch/merge against real git operations
- **Push failure handling:** Fail the dispatch — cloud dispatch without state sync is useless; emit system error event, fall back to local dispatch if `dispatch.routing.fallback_to_local` is true

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/dispatcher/lib/merge.cjs` — Existing merge engine with `--ours` for planning files, `recalculateFromArtifacts()`, `OURS_ON_CONFLICT` constant
- `packages/dispatcher/lib/coordinator.cjs` — _handleExit merge flow (lines 435-503), dispatch flow, worktree creation
- `packages/dispatcher/lib/worktree.cjs` — Git worktree creation/removal, branch management
- `packages/dispatcher/lib/lock.cjs` — acquireLock/releaseLock mutex pattern
- `packages/dispatcher/lib/remote-ssh.cjs` — git push/fetch pattern for remote sessions (lines 66-72 push, lines 189-194 fetch)
- `packages/dispatcher/lib/registry.cjs` — Session tracking with backend field

### Established Patterns
- All git operations currently use `execFileSync` with array args (no shell interpretation)
- Session branches: `pde/session/{sessionId}` format
- Worktree paths: `.sessions/{sessionId}`
- Planning files auto-resolved: STATE.md, ROADMAP.md, REQUIREMENTS.md
- Agent memory conflicts concatenated (merge.cjs lines 68-80)
- Non-planning file conflicts abort merge, force human review

### Integration Points
- `coordinator.cjs dispatch()` — needs to call `pushPlanningState()` after worktree creation, before spawn
- `coordinator.cjs _handleExit()` — needs to call `fetchPlanningState()` + `mergePlanningFromCloud()` before existing merge flow
- `remote-router.cjs` — cloud/docker routes trigger state sync (local routes skip it)
- `packages/dispatcher/package.json` — add simple-git dependency

### Key Difference from Existing Merge
```
EXISTING merge.cjs (session merge):
  STATE.md     → --ours (session state wins over main)
  ROADMAP.md   → --ours (session state wins over main)
  REQUIREMENTS.md → --ours (session state wins over main)

NEW sync.cjs (cloud merge-back):
  STATE.md     → --theirs (cloud-written state survives)
  ROADMAP.md   → --ours (local orchestrator owns roadmap)
  REQUIREMENTS.md → --ours (local orchestrator owns requirements)
```

</code_context>

<specifics>
## Specific Ideas

### Function Signatures
```javascript
// sync.cjs — public API
async function pushPlanningState(projectRoot, branch) → { ok: boolean, error?: string }
async function fetchPlanningState(projectRoot, branch) → { ok: boolean, error?: string }
async function mergePlanningFromCloud(projectRoot, branch) → { ok: boolean, conflicts?: string[], autoResolved?: string[] }
```

### Coordinator Integration Points
```javascript
// In dispatch(), after worktree creation, before spawn:
if (backend === 'docker' || backend === 'ssh' || backend === 'managed' || backend === 'cloud') {
  const pushResult = await this._pushPlanningState(this._root, branch);
  if (!pushResult.ok && this._routingConfig.fallback_to_local) {
    // Downgrade to local dispatch
    backend = 'local';
  } else if (!pushResult.ok) {
    throw new Error(`State sync push failed: ${pushResult.error}`);
  }
}

// In _handleExit(), before mergeSession():
if (entry.backend !== 'local') {
  await this._fetchPlanningState(this._root, branch);
  await this._mergePlanningFromCloud(this._root, branch);
}
```

</specifics>

<deferred>
## Deferred Ideas

- Conflict resolution UI in dashboard — future milestone
- Automatic retry on transient network errors — keep simple for now, fail fast
- Planning state encryption for cloud transit — out of scope for v0.24

</deferred>
