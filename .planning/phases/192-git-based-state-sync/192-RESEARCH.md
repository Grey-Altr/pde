# Phase 192: Git-Based State Sync - Research

**Researched:** 2026-03-30
**Domain:** Git operations (simple-git), session-scoped branch push/fetch/merge, direction-aware conflict resolution
**Confidence:** HIGH

## Summary

Phase 192 introduces `packages/dispatcher/lib/sync.cjs` — a new module that wraps simple-git to push `.planning/` state to a remote branch before cloud dispatch and merge it back afterward. The merge logic inverts the conflict strategy of the existing `merge.cjs`: STATE.md uses `--theirs` (cloud-written state wins) while ROADMAP.md and REQUIREMENTS.md use `--ours` (local orchestrator owns them). Concurrent cloud sessions are protected by the existing dispatcher.lock mutex already used in `coordinator.cjs`.

The implementation is low-risk because every structural pattern already exists: the push/fetch pattern is in `remote-ssh.cjs`, the conflict resolution pattern is in `merge.cjs`, the mutex pattern is in `lock.cjs`, and the DI/test fixture pattern is in `merge.test.cjs` and `coordinator-docker.test.cjs`. The only genuinely new work is installing simple-git in `packages/dispatcher/`, writing `sync.cjs`, wiring two call sites in `coordinator.cjs`, and writing a real-git fixture test suite.

**Primary recommendation:** Model `sync.cjs` on `remote-ssh.cjs` for async/error handling, model the test fixture on `merge.test.cjs` (bare repo + worktree clone), and use simple-git 3.33.0 (current npm latest) installed in `packages/dispatcher/`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Sync module location:** New `packages/dispatcher/lib/sync.cjs` — sits alongside merge.cjs, coordinator calls both
- **Git library:** simple-git npm package in packages/dispatcher/ — cleaner async API than execFileSync, required by SYN-07
- **Cloud merge direction:** Separate function `mergePlanningFromCloud(projectRoot, branch)` with INVERTED rules vs existing merge.cjs:
  - `--theirs` for STATE.md (cloud-written state survives)
  - `--ours` for ROADMAP.md, REQUIREMENTS.md (local orchestrator owns these)
- **Push timing:** Push AFTER worktree creation, BEFORE spawn
- **Sequential merge ordering:** Mutex via existing dispatcher.lock — reuse acquireLock/releaseLock around the merge-back operation
- **Testing strategy:** Temp directory fixtures with `git init --bare` remote + worktree clones — no mocking git, exercise actual push/fetch/merge
- **Push failure handling:** Fail the dispatch; emit system error event; fall back to local if `dispatch.routing.fallback_to_local` is true

### Claude's Discretion

None specified — all key decisions are locked.

### Deferred Ideas (OUT OF SCOPE)

- Conflict resolution UI in dashboard — future milestone
- Automatic retry on transient network errors — keep simple for now, fail fast
- Planning state encryption for cloud transit
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SYN-01 | Cloud container pushes .planning/ changes to a remote git branch on task completion | `pushPlanningState()` in sync.cjs; simple-git `push(remote, branch)` API confirmed |
| SYN-02 | Local orchestrator merges cloud branch using 3-way merge (v0.16 engine) | `mergePlanningFromCloud()` in sync.cjs, called after `fetchPlanningState()`; reuses git 3-way merge logic identical to merge.cjs |
| SYN-03 | Merge direction is cloud-to-local aware (not --ours for STATE.md on inbound sync) | Inverted OURS_ON_CONFLICT: STATE.md → `checkout --theirs`; ROADMAP.md + REQUIREMENTS.md → `checkout --ours` |
| SYN-04 | Concurrent cloud sessions push to separate branches with sequential merge ordering | Branch name: `pde/session/{sessionId}` is already session-scoped; `acquireLock/releaseLock` wraps `mergePlanningFromCloud()` call |
| SYN-07 | simple-git integration in isolated `packages/` directory for git sync operations | `npm install simple-git` in `packages/dispatcher/`; verified version 3.33.0 |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| simple-git | 3.33.0 | Async git operations (push, fetch, merge) | Cleaner Promise API vs execFileSync for multi-step async flows; required by SYN-07; already used in similar node-ssh pattern in this codebase |

### Supporting (already present, no install needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:child_process execFileSync | built-in | Fallback git ops where sync is sufficient | Existing merge.cjs conflict resolution (checkout --ours/--theirs, add, commit) |
| node:fs | built-in | Read/write planning files during conflict resolution | Same as merge.cjs pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-git | execFileSync array args | sync-only; already used in merge.cjs and worktree.cjs; no real downside for this codebase but SYN-07 explicitly requires simple-git |
| simple-git | nodegit / isomorphic-git | heavier native bindings; simple-git is pure JS subprocess wrapper, same environment as existing tools |

**Installation:**
```bash
cd packages/dispatcher && npm install simple-git
```

**Version verification:** `npm view simple-git version` → `3.33.0` (confirmed 2026-03-30)

---

## Architecture Patterns

### New File: `packages/dispatcher/lib/sync.cjs`

```
packages/dispatcher/
├── lib/
│   ├── sync.cjs          ← NEW: pushPlanningState, fetchPlanningState, mergePlanningFromCloud
│   ├── merge.cjs         ← Existing: mergeSession (session→main direction, --ours for all planning)
│   ├── coordinator.cjs   ← Modified: two call sites added
│   ├── lock.cjs          ← Unchanged: acquireLock/releaseLock reused by sync.cjs
│   └── remote-router.cjs ← Unchanged: determines backend
├── package.json          ← Modified: add simple-git dependency
└── index.cjs             ← Modified: re-export sync module
```

### Pattern 1: simple-git Instantiation (CJS)

```javascript
// Source: https://github.com/steveukx/git-js/blob/main/simple-git/typings/simple-git.d.ts
const simpleGit = require('simple-git');

// Instantiate with baseDir (all ops relative to this):
const git = simpleGit(projectRoot);
```

### Pattern 2: pushPlanningState

```javascript
// Commit .planning/ on the session branch, push to origin
async function pushPlanningState(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);

  // Stage .planning/ changes only
  await git.add('.planning/');

  // Commit — may be empty if no changes (--allow-empty guards against that)
  // Use raw() for --allow-empty since commit() doesn't expose it simply
  await git.raw(['commit', '--allow-empty', '--no-verify', '-m', 'pde: sync planning state']);

  // Push session branch to origin
  await git.push('origin', branch);

  return { ok: true };
}
```

Note: The session worktree is already on `branch` (created by `createWorktree`). Pushing that branch to origin is the state sync. The git object operates on `projectRoot` but the session branch head includes the .planning/ state because the worktree is checked out on that branch.

**Clarification from code:** The worktree path is `.sessions/{sessionId}` and it is checked out on `pde/session/{sessionId}`. The `.planning/` directory inside the worktree has the same content as the main repo (it's a shared directory via worktree). For push to include planning state, we need to commit .planning/ changes in the worktree, then push from the worktree's perspective — OR push the session branch from the main repo root after confirming .planning/ is committed there.

**Key insight from CONTEXT.md:** "worktree branch already has .planning/ committed; push that branch to origin." This means: push happens from the main projectRoot (same as `git push origin pde/session/...`), because the worktree branch ref is accessible from the main repo.

```javascript
// Simpler — push from main repo root, branch already has what it needs
const git = simpleGit(projectRoot);
await git.push('origin', branch);
```

### Pattern 3: fetchPlanningState

```javascript
async function fetchPlanningState(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);
  await git.fetch('origin', branch);
  return { ok: true };
}
```

### Pattern 4: mergePlanningFromCloud (INVERTED direction)

This cannot use simple-git's merge() for the conflict resolution phase — conflict resolution requires `git checkout --ours/--theirs` which simple-git wraps, but the existing project convention uses `execFileSync` for those steps (merge.cjs lines 44-57). Follow the same pattern for conflict resolution to stay consistent:

```javascript
// Source: merge.cjs conflict resolution pattern (lines 29-65)
// INVERTED: STATE.md → --theirs, ROADMAP.md + REQUIREMENTS.md → --ours
const CLOUD_THEIRS = ['.planning/STATE.md'];
const CLOUD_OURS   = ['.planning/REQUIREMENTS.md', '.planning/ROADMAP.md'];

async function mergePlanningFromCloud(projectRoot, branch, _git) {
  const git = _git || simpleGit(projectRoot);

  try {
    // Attempt clean merge of the remote-tracking branch
    await git.merge(['origin/' + branch, '--no-edit']);
    return { ok: true, conflicts: [], autoResolved: [] };
  } catch (_mergeErr) {
    // Detect conflicting files
    const conflictOutput = execFileSync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
    );
    const conflicts = conflictOutput.trim().split('\n').filter(Boolean);

    const planningConflicts = conflicts.filter(f => f.startsWith('.planning/'));
    const sourceConflicts   = conflicts.filter(f => !f.startsWith('.planning/'));

    if (sourceConflicts.length > 0) {
      execFileSync('git', ['merge', '--abort'], { cwd: projectRoot, stdio: 'pipe' });
      return { ok: false, conflicts: sourceConflicts, needsHuman: true };
    }

    for (const file of planningConflicts) {
      const strategy = CLOUD_THEIRS.includes(file) ? '--theirs' : '--ours';
      execFileSync('git', ['checkout', strategy, '--', file],
        { cwd: projectRoot, stdio: 'pipe' });
      execFileSync('git', ['add', '--', file],
        { cwd: projectRoot, stdio: 'pipe' });
    }

    execFileSync('git', ['commit', '--no-edit'],
      { cwd: projectRoot, stdio: 'pipe' });

    return { ok: true, conflicts: planningConflicts, autoResolved: planningConflicts };
  }
}
```

### Pattern 5: Coordinator Integration Points

```javascript
// coordinator.cjs — dispatch(), after createWorktree(), before queue.add():
const CLOUD_BACKENDS = ['docker', 'ssh', 'managed', 'cloud'];
if (CLOUD_BACKENDS.includes(backend)) {
  const syncResult = await this._pushPlanningState(this._root, branch);
  if (!syncResult.ok) {
    const fallback = this._routingConfig && this._routingConfig.fallback_to_local;
    if (fallback) {
      backend = 'local';
    } else {
      this._releaseLock(this._root);
      throw new Error('State sync push failed: ' + syncResult.error);
    }
  }
}

// coordinator.cjs — _handleExit(), before this._mergeSession():
if (this._getBackend(sessionId) !== 'local') {
  const lockResult = this._acquireLock(this._root);
  try {
    await this._fetchPlanningState(this._root, branch);
    await this._mergePlanningFromCloud(this._root, branch);
  } finally {
    this._releaseLock(this._root);
  }
}
```

Note: `backend` must be stored in registry (it already is — `registry.cjs` stores `backend` field in each session entry). Retrieve with `this._registry.get(sessionId).backend`.

### Pattern 6: Error Handling

Follow the `async IIFE` pattern from `remote-ssh.cjs` — errors at the top-level promise catch emit a system event and call `onExit` with code 1. For sync.cjs, return `{ ok: false, error: err.message }` to let coordinator decide fallback.

```javascript
async function pushPlanningState(projectRoot, branch, _git) {
  try {
    const git = _git || simpleGit(projectRoot);
    await git.push('origin', branch);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
```

### Pattern 7: DI for Testability

Follow `coordinator.cjs` pattern: constructor accepts `_deps` object. For `sync.cjs`, each exported function accepts an optional `_git` argument (simple-git instance) — this avoids module-level `vi.mock()` hoisting issues in CJS tests.

```javascript
// In coordinator constructor:
const syncModule = require('./sync.cjs');
this._pushPlanningState  = deps.pushPlanningState  || syncModule.pushPlanningState;
this._fetchPlanningState = deps.fetchPlanningState || syncModule.fetchPlanningState;
this._mergePlanningFromCloud = deps.mergePlanningFromCloud || syncModule.mergePlanningFromCloud;
```

### Anti-Patterns to Avoid

- **Mixing simple-git and execFileSync for the same logical operation:** Use simple-git for push/fetch/merge-initiation; use execFileSync for conflict resolution steps (checkout --ours/--theirs, add, commit) — this mirrors the existing codebase split.
- **Using `git.merge()` then expecting to catch JS Error for conflicts:** simple-git throws a `GitError` on merge conflict; catch it and then use execFileSync for conflict detection and resolution (same pattern as merge.cjs line 29).
- **Committing from main repo root when session changes are in the worktree:** Commits in the session happen inside the worktree path (`.sessions/{sessionId}`), not the main repo root. The push from the main repo root of the session branch ref captures those commits.
- **Holding the lock during push (slow network op):** lock.cjs is released before spawn. Push happens after lock release (between createWorktree and queue.add) — this is the correct window already established by the coordinator.
- **Using shell string commands with execFileSync:** Project convention requires array args to execFileSync (enforced throughout codebase). Never use `execFileSync('git merge origin/' + branch)` — use `execFileSync('git', ['merge', 'origin/' + branch, ...])`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Async git push/fetch | Custom child_process wrapper | simple-git 3.33.0 | Handles stderr parsing, exit codes, promise rejection, all edge cases |
| Bare repo test fixture | Custom test git infrastructure | `git init --bare` + worktree clones via execFileSync (same as merge.test.cjs) | Already validated pattern in this codebase |
| Session-scoped branch naming | Custom naming scheme | `pde/session/{sessionId}` — already established convention | Used by createWorktree, merge.cjs, remote-ssh.cjs |
| Lock for sequential merges | Custom mutex | `acquireLock/releaseLock` from lock.cjs | Already handles stale lock detection, cloud session types |

**Key insight:** Every structural concern is already solved. The implementation is assembly of proven pieces, not invention.

---

## Common Pitfalls

### Pitfall 1: simple-git merge conflict detection
**What goes wrong:** `git.merge()` throws a `GitResponseError` (subclass of `Error`) on conflict, but the thrown object does not enumerate the conflicting files — you must still call `git diff --name-only --diff-filter=U` afterward.
**Why it happens:** simple-git wraps git's exit code 1 as a thrown error; it doesn't parse MERGE_HEAD or conflict markers.
**How to avoid:** Catch the error, then use `execFileSync('git', ['diff', '--name-only', '--diff-filter=U'], ...)` exactly as merge.cjs does at line 31.
**Warning signs:** Attempting to read `.files` or `.conflicts` on the caught error — those fields are not guaranteed.

### Pitfall 2: Push target is the remote-tracking branch after fetch
**What goes wrong:** After `fetchPlanningState()` fetches `origin/pde/session/{sessionId}`, the local branch `pde/session/{sessionId}` still exists as a local branch. `mergePlanningFromCloud()` must merge `origin/{branch}` (the remote-tracking ref), not the local branch.
**Why it happens:** `git fetch origin branch` updates `origin/branch` (FETCH_HEAD or remote-tracking), not the local branch.
**How to avoid:** Merge `'origin/' + branch`, not `branch`. Explicit in the pattern above.

### Pitfall 3: Worktree vs main repo confusion for staging
**What goes wrong:** Calling `git.add('.planning/')` from the main `projectRoot` stages main-branch .planning/ files, not the session worktree's version.
**Why it happens:** The session worktree lives at `.sessions/{sessionId}` — a different working tree. The .planning/ directory is shared (symlinked or a real directory) between the main repo and worktrees.
**How to avoid:** The CONTEXT.md decision is: "worktree branch already has .planning/ committed; push that branch to origin." This means the push from main repo root of the session branch is sufficient — no staging needed from the main repo. The commit of .planning/ changes has already happened inside the worktree's own git operations during the session.

### Pitfall 4: Git config missing in temp repo fixtures
**What goes wrong:** `git commit` fails in temp repos without `user.email` and `user.name` config.
**Why it happens:** git requires identity for commits.
**How to avoid:** Replicate the `makeTempRepo()` pattern from merge.test.cjs exactly: `git config user.email 'test@pde.test'`, `git config user.name 'PDE Test'`, `git config commit.gpgsign false`.

### Pitfall 5: simple-git `merge()` takes options array, not flags string
**What goes wrong:** `git.merge('origin/branch --no-edit')` passes the whole thing as the branch name.
**Why it happens:** simple-git's `merge(options)` takes a `TaskOptions` (array or object), not a string.
**How to avoid:** Use array form: `git.merge(['origin/' + branch, '--no-edit'])`.

### Pitfall 6: OURS_ON_CONFLICT interaction with cloud merge direction
**What goes wrong:** If `mergePlanningFromCloud()` is called after `mergeSession()` in the same exit handler, OURS_ON_CONFLICT in merge.cjs would have already written the main-branch version of STATE.md — then cloud merge would overwrite it with `--theirs`.
**Why it happens:** The CONTEXT.md specifies cloud merge happens BEFORE `mergeSession()`: `_fetchPlanningState` → `_mergePlanningFromCloud` → existing `mergeSession()`.
**How to avoid:** Preserve the call order: cloud sync completes first, then the existing session merge runs. Document this order constraint explicitly in coordinator.cjs comments.

---

## Code Examples

### simple-git CJS instantiation and push
```javascript
// Source: https://github.com/steveukx/git-js (v3.33.0)
const simpleGit = require('simple-git');
const git = simpleGit('/path/to/repo');
await git.push('origin', 'pde/session/p192-1-abc123');
```

### simple-git fetch
```javascript
// Fetches origin/pde/session/... into remote-tracking ref
await git.fetch('origin', 'pde/session/p192-1-abc123');
```

### simple-git merge with conflict catch
```javascript
try {
  await git.merge(['origin/pde/session/p192-1-abc123', '--no-edit']);
} catch (gitErr) {
  // Conflict detected — resolve with execFileSync per merge.cjs pattern
  const conflicts = execFileSync('git', ['diff', '--name-only', '--diff-filter=U'],
    { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' })
    .trim().split('\n').filter(Boolean);
}
```

### Bare repo test fixture (real git)
```javascript
// Source: merge.test.cjs makeTempRepo() pattern
const { execFileSync } = require('node:child_process');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

function makeBareRemote() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-bare-'));
  execFileSync('git', ['init', '--bare', dir], { stdio: 'pipe' });
  return dir;
}

function makeClone(bareRemote) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pde-sync-clone-'));
  execFileSync('git', ['clone', bareRemote, dir], { stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'test@pde.test'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', 'PDE Test'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, stdio: 'pipe' });
  return dir;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| execFileSync for all git ops | simple-git for async multi-step flows | Phase 192 (new) | Non-blocking push/fetch; cleaner error propagation |
| --ours for all planning files (merge.cjs) | --theirs for STATE.md, --ours for ROADMAP/REQUIREMENTS (sync.cjs) | Phase 192 (new) | Cloud-written progress survives merge-back |

---

## Open Questions

1. **Does the worktree's .planning/ share the main repo's copy, or is it independent?**
   - What we know: Git worktrees share the same `.git` directory but have independent working trees. The `.planning/` directory in the worktree is a real independent copy, not a symlink.
   - What's unclear: Whether the cloud executor commits .planning/ changes in the worktree before the session ends (it should — that's the PDE executor's job).
   - Recommendation: The plan should include a test that creates a cloud-side commit in the worktree's .planning/, pushes it, and verifies that content is visible in the main repo after fetch+merge.

2. **`dispatch.routing.fallback_to_local` config key location**
   - What we know: CONTEXT.md references `dispatch.routing.fallback_to_local`. Current `coordinator.cjs` uses `dispatch.remote` and `dispatch.docker` blocks.
   - What's unclear: Whether `routing` is a new sub-key or whether fallback is determined from existing config keys.
   - Recommendation: Introduce `config.dispatch.routing.fallback_to_local` as a new optional boolean. Default to `false` (fail the dispatch, don't silently downgrade). The planner should define this clearly.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| git | push/fetch/merge operations | yes | system git | — |
| simple-git (npm) | SYN-07 | not yet installed | 3.33.0 (npm latest) | none — must install |
| node.js | runtime | yes | >=20 (from package.json engines) | — |

**Missing dependencies with no fallback:**
- `simple-git` must be installed in `packages/dispatcher/` via `npm install simple-git` — this is a Wave 0 task.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/dispatcher/sync.test.cjs` |
| Full suite command | `npx vitest run tests/dispatcher/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYN-01 | pushPlanningState commits + pushes to real bare remote | integration (real git) | `npx vitest run tests/dispatcher/sync.test.cjs` | No — Wave 0 |
| SYN-02 | fetchPlanningState + mergePlanningFromCloud brings cloud changes into local | integration (real git) | `npx vitest run tests/dispatcher/sync.test.cjs` | No — Wave 0 |
| SYN-03 | STATE.md takes cloud content; ROADMAP.md keeps local content | integration (real git) | `npx vitest run tests/dispatcher/sync.test.cjs` | No — Wave 0 |
| SYN-04 | Two concurrent sessions use separate branches; lock prevents race on merge-back | integration (real git) | `npx vitest run tests/dispatcher/sync.test.cjs` | No — Wave 0 |
| SYN-07 | simple-git in packages/dispatcher/package.json, not root | unit (file check) | `npx vitest run tests/dispatcher/sync.test.cjs` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/dispatcher/sync.test.cjs`
- **Per wave merge:** `npx vitest run tests/dispatcher/`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/dispatcher/sync.test.cjs` — covers SYN-01 through SYN-04, SYN-07
- [ ] `packages/dispatcher/lib/sync.cjs` — new module
- [ ] simple-git install: `cd packages/dispatcher && npm install simple-git` — must run before tests

---

## Sources

### Primary (HIGH confidence)
- `packages/dispatcher/lib/merge.cjs` — Existing conflict resolution pattern, OURS_ON_CONFLICT list, execFileSync array arg convention
- `packages/dispatcher/lib/coordinator.cjs` — Dispatch lifecycle, DI pattern, backend routing, lock usage, `_handleExit` flow
- `packages/dispatcher/lib/remote-ssh.cjs` — Async IIFE + push/fetch pattern, error handling, DI shape
- `packages/dispatcher/lib/lock.cjs` — acquireLock/releaseLock mutex, cloud-aware PID handling (INF-01 already applied)
- `packages/dispatcher/lib/worktree.cjs` — Session branch naming convention, worktree path convention
- `tests/dispatcher/merge.test.cjs` — makeTempRepo() fixture pattern, git config requirements, cleanup pattern
- `tests/dispatcher/remote-ssh.test.cjs` — DI mock pattern, async settle() pattern, vi.fn() injection

### Secondary (MEDIUM confidence)
- `https://github.com/steveukx/git-js/blob/main/simple-git/typings/simple-git.d.ts` — Confirmed push/fetch/merge/commit TypeScript signatures for v3.33.0
- `npm view simple-git version` → 3.33.0 (verified 2026-03-30)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — simple-git version verified against npm registry; method signatures verified from TypeScript typings
- Architecture: HIGH — all patterns exist verbatim in the codebase; research is reading existing code, not extrapolating
- Pitfalls: HIGH — remote-tracking branch confusion and worktree staging confusion are well-known git patterns confirmed by reading the actual worktree/merge code

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (simple-git is stable; vitest config is pinned)
