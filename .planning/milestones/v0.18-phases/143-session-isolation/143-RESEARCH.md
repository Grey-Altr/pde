# Phase 143: Session Isolation - Research

**Researched:** 2026-03-26
**Domain:** Git worktree lifecycle management, write protocol migration, CJS package architecture
**Confidence:** HIGH

## Summary

Phase 143 establishes the correctness prerequisite for all v0.18 parallel execution. It introduces a session-scoped write protocol where executor agents write COMPLETE.json and COMPLETED-REQS.md to phase directories instead of mutating shared STATE.md or REQUIREMENTS.md during execution. A new `packages/dispatcher/` CJS package handles worktree create/merge/cleanup, orphan detection, and nuclear reset.

The entire technical foundation is already proven: git worktree add/remove works correctly with git 2.48.1 (verified live). Programmatic parsing of `git worktree list --porcelain` works. Process liveness probing via `process.kill(pid, 0)` correctly distinguishes live from dead PIDs. Atomic lock file creation via Node.js O_EXCL flag works. The merge lifecycle — create worktree, commit artifact, merge back, cleanup — completed successfully in a live test against this repo.

**Primary recommendation:** Implement `packages/dispatcher/` as three focused CJS modules (worktree.cjs, merge.cjs, orphan.cjs), gate new write paths on `PDE_SESSION_ID` env var, and handle `.planning/STATE.md` and `.planning/REQUIREMENTS.md` conflicts with scripted `git checkout --ours` post-merge. No external dependencies required for phase 143.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Sessions live in `.sessions/<session-id>` at project root — separate from `.claude/worktrees/` (Claude Code's own system)
- **D-02:** `.sessions/` added to `.gitignore` — worktrees are ephemeral, never committed
- **D-03:** Session branch naming: `pde/session/<session-id>` (per design spec)
- **D-04:** Completion marker is `COMPLETE.json` written to the phase directory with structured metadata: `{ session_id, exit_code, duration_ms, completed_at, phase, plan }` — machine-parseable for post-merge recalculation
- **D-05:** `COMPLETED-REQS.md` written to phase directory with YAML frontmatter matching existing requirements format — lists requirement IDs satisfied by this session's work
- **D-06:** Both artifacts are the source of truth for post-merge STATE.md and REQUIREMENTS.md recalculation
- **D-07:** Big-bang switchover — no compatibility shim. This is phase 143, nothing depends on the old protocol in v0.18 yet
- **D-08:** New write paths only activate when `PDE_SESSION_ID` env var is present — existing pre-v0.18 workflows continue unchanged
- **D-09:** Executor writes COMPLETE.json + COMPLETED-REQS.md to phase directory instead of STATE.md/REQUIREMENTS.md during execution
- **D-10:** STATE.md, ROADMAP.md progress, and REQUIREMENTS.md checkboxes are recalculated from disk artifacts post-merge by the dispatcher
- **D-11:** Git default recursive merge for source code files
- **D-12:** `.planning/STATE.md` and `.planning/REQUIREMENTS.md` use "ours" strategy on merge conflicts — dispatcher recalculates from artifacts anyway, so session-side writes are discarded
- **D-13:** Agent memory files (`.planning/agent-memory/`) are append-only — concatenate on conflict
- **D-14:** `.planning/config.json` is snapshot-at-spawn, never written during session execution — no merge conflicts possible
- **D-15:** Orphan detection triggers on PDE startup commands (`/gsd:progress`, `/gsd:execute-phase`, `/gsd:autonomous`) — not every command
- **D-16:** Detection presents adopt/kill/ignore options via `AskUserQuestion` when orphaned worktrees are found
- **D-17:** Nuclear reset (`/gsd:sessions reset`) skips the prompt — kills all sessions, removes all worktrees, prunes all branches unconditionally
- **D-18:** New `packages/dispatcher/` directory — CJS package, zero npm dependencies in phase 143 (Agent SDK added in phase 145)
- **D-19:** Plugin root (`bin/`) stays zero-npm-dependency — dispatcher is invoked via `node packages/dispatcher/...`
- **D-20:** Core modules in phase 143: `lib/worktree.cjs` (create/remove/list), `lib/merge.cjs` (merge-back + recalculate), `lib/orphan.cjs` (detection + cleanup)

### Claude's Discretion

- Naming convention for session IDs (short hash, UUID, timestamp-based — whatever is most debuggable)
- Exact git merge driver configuration vs scripted post-merge recalculation
- Whether recalculation reads COMPLETE.json files or uses git log/diff to determine what changed
- Internal error handling and retry logic for git operations

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ISO-01 | Dispatcher can create a git worktree with dedicated branch for a new session | Verified: `git worktree add .sessions/<id> -b pde/session/<id>` works (live test passed) |
| ISO-02 | Dispatcher can merge a completed session branch back to parent with auto-resolve for .planning/ metadata | Verified: `git merge` + scripted `git checkout --ours` for conflict resolution |
| ISO-03 | Dispatcher can clean up worktrees and branches after successful merge | Verified: `git worktree remove` + `git branch -d` sequence works (live test passed) |
| ISO-04 | Orphaned sessions detected on PDE startup with adopt/kill/ignore options | Verified: `git worktree list --porcelain` parsing + `process.kill(pid, 0)` liveness detection |
| ISO-05 | Nuclear reset command kills all sessions, removes all worktrees, prunes all branches | `worktree list --porcelain` iterate, `worktree remove -f` + `branch -D` per session |
| ISO-06 | Executor agents write completion markers to phase directory instead of STATE.md | Gate on `PDE_SESSION_ID` env var in pde-tools.cjs state write paths |
| ISO-07 | Executor agents write phase-local COMPLETED-REQS.md instead of REQUIREMENTS.md | Gate on `PDE_SESSION_ID` in `requirements mark-complete` subcommand |
| ISO-08 | Executor agents write session-scoped agent-memory files instead of shared memories.md | Write to `.planning/agent-memory/{role}/memories-{session-id}.md` pattern |
| ISO-09 | Dispatcher recalculates STATE.md, ROADMAP.md progress, and REQUIREMENTS.md from disk post-merge | `merge.cjs` reads COMPLETE.json files post-merge, calls existing `pde-tools.cjs` recalculation logic |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:child_process | built-in (Node 20.20.0) | Execute git commands via execFileSync/spawnSync | Zero dependency, already used throughout project |
| node:fs | built-in | Read/write artifacts, lock files | Zero dependency |
| node:path | built-in | Path manipulation | Zero dependency |
| node:crypto | built-in (randomUUID) | Session ID generation | Already used in event-bus.cjs |
| node:os | built-in | tmpdir for NDJSON paths | Already used in event-bus.cjs |
| git 2.48.1 | system | Worktree lifecycle | Available, tested — all required features confirmed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.1 (root node_modules/.bin/vitest) | Test runner for dispatcher unit tests | All dispatcher unit tests |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Scripted conflict resolution (checkout --ours) | .gitattributes custom merge driver | Scripted is simpler for phase 143; driver requires registration in .git/config. Both work. |
| `process.kill(pid, 0)` | OS-level pidfile + ps command | kill(pid,0) is portable, single-call, correct ESRCH semantics |
| Phase-scoped session ID (e.g., `p143-abc123`) | UUID v4 or timestamp-based | Phase-scoped is most debuggable — correlates session to phase immediately in logs |

**No new npm packages:** `packages/dispatcher/` is a new directory with zero node_modules in phase 143.

## Architecture Patterns

### Recommended Project Structure

```
packages/dispatcher/
  package.json          # { "name": "pde-dispatcher", "type": "commonjs" }
  index.cjs             # entry: exports { createSession, mergeSession, cleanupSession, detectOrphans, resetAll }
  lib/
    worktree.cjs        # ISO-01, ISO-03, ISO-05
    merge.cjs           # ISO-02, ISO-09
    orphan.cjs          # ISO-04, ISO-05

tests/dispatcher/       # picked up by root vitest.config.ts
  worktree.test.cjs     # ISO-01, ISO-03
  merge.test.cjs        # ISO-02, ISO-09
  orphan.test.cjs       # ISO-04, ISO-05
  artifacts.test.cjs    # ISO-06, ISO-07, ISO-08
```

Note: vitest.config.ts `include` pattern is `tests/**/*.{test,spec}.{cjs,mjs,js,ts}`. Tests under `tests/dispatcher/` are automatically discovered by the existing root vitest config — no additional config required.

### Pattern 1: Git Worktree Lifecycle (worktree.cjs)

**What:** Thin CJS wrapper around git worktree subcommands using execFileSync. All arguments passed as array (no shell interpretation).

**When to use:** All create/remove/list operations for PDE sessions.

```javascript
// packages/dispatcher/lib/worktree.cjs
'use strict';
const { execFileSync } = require('node:child_process');
const path = require('node:path');

function createWorktree(projectRoot, sessionId) {
  const worktreePath = path.join(projectRoot, '.sessions', sessionId);
  const branch = 'pde/session/' + sessionId;
  execFileSync('git', ['worktree', 'add', worktreePath, '-b', branch], {
    cwd: projectRoot, stdio: 'pipe'
  });
  return { worktreePath, branch };
}

function removeWorktree(projectRoot, sessionId, opts) {
  const force = opts && opts.force;
  const worktreePath = path.join(projectRoot, '.sessions', sessionId);
  const args = ['worktree', 'remove'];
  if (force) args.push('-f');
  args.push(worktreePath);
  execFileSync('git', args, { cwd: projectRoot, stdio: 'pipe' });
}

function deleteBranch(projectRoot, branch, opts) {
  const force = opts && opts.force;
  execFileSync('git', ['branch', force ? '-D' : '-d', branch], {
    cwd: projectRoot, stdio: 'pipe'
  });
}

function listSessionWorktrees(projectRoot) {
  const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: projectRoot, encoding: 'utf8', stdio: 'pipe'
  });
  return output.trim().split('\n\n').map(block => {
    const entry = {};
    for (const line of block.trim().split('\n')) {
      const spaceIdx = line.indexOf(' ');
      const key = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
      const val = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1);
      entry[key] = val;
    }
    return entry;
  }).filter(e => e.branch && e.branch.startsWith('refs/heads/pde/session/'));
}

module.exports = { createWorktree, removeWorktree, deleteBranch, listSessionWorktrees };
```

### Pattern 2: Merge-Back with Selective Conflict Resolution (merge.cjs)

**What:** Merge session branch to parent; when conflicts exist, auto-resolve .planning/ metadata files with "ours" strategy; surface source code conflicts to user.

**When to use:** After session execution completes with exit code 0.

```javascript
// packages/dispatcher/lib/merge.cjs
'use strict';
const { execFileSync } = require('node:child_process');

// Files always recalculated post-merge — discard session-side writes if conflicted
const OURS_ON_CONFLICT = [
  '.planning/STATE.md',
  '.planning/REQUIREMENTS.md',
  '.planning/ROADMAP.md',
];

function mergeSession(projectRoot, sessionId) {
  const branch = 'pde/session/' + sessionId;
  try {
    execFileSync('git', ['merge', branch, '--no-edit'], {
      cwd: projectRoot, stdio: 'pipe'
    });
    return { ok: true, conflicts: [] };
  } catch (_mergeErr) {
    // Identify conflicted files
    const conflictOutput = execFileSync(
      'git', ['diff', '--name-only', '--diff-filter=U'],
      { cwd: projectRoot, encoding: 'utf8', stdio: 'pipe' }
    );
    const conflicts = conflictOutput.trim().split('\n').filter(Boolean);

    const planningConflicts = conflicts.filter(f => f.startsWith('.planning/'));
    const sourceConflicts = conflicts.filter(f => !f.startsWith('.planning/'));

    // Auto-resolve .planning/ metadata with "ours" (keep parent version)
    for (const file of planningConflicts) {
      execFileSync('git', ['checkout', '--ours', '--', file], {
        cwd: projectRoot, stdio: 'pipe'
      });
      execFileSync('git', ['add', '--', file], {
        cwd: projectRoot, stdio: 'pipe'
      });
    }

    if (sourceConflicts.length === 0) {
      execFileSync('git', ['commit', '--no-edit'], {
        cwd: projectRoot, stdio: 'pipe'
      });
      return { ok: true, conflicts: planningConflicts, autoResolved: planningConflicts };
    }

    // Source conflicts need human — abort merge, preserve both branches
    execFileSync('git', ['merge', '--abort'], { cwd: projectRoot, stdio: 'pipe' });
    return { ok: false, conflicts: sourceConflicts, needsHuman: true };
  }
}

module.exports = { mergeSession };
```

### Pattern 3: Orphan Detection (orphan.cjs)

**What:** Scan `.sessions/` worktrees, cross-reference with session registry + process liveness.

```javascript
// packages/dispatcher/lib/orphan.cjs
'use strict';
const { listSessionWorktrees } = require('./worktree.cjs');

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== 'ESRCH'; }
}

function detectOrphans(projectRoot, sessionRegistry) {
  // sessionRegistry: Map<sessionId, { pid, status, ... }>
  const sessionWorktrees = listSessionWorktrees(projectRoot);
  const orphans = [];

  for (const wt of sessionWorktrees) {
    const sessionId = wt.branch.replace('refs/heads/pde/session/', '');
    const entry = sessionRegistry ? sessionRegistry.get(sessionId) : null;
    const alive = entry ? isProcessAlive(entry.pid) : false;

    if (!entry || !alive) {
      orphans.push({
        sessionId,
        worktreePath: wt.worktree,
        branch: wt.branch.replace('refs/heads/', ''),
        status: entry ? 'dead_process' : 'unregistered',
      });
    }
  }
  return orphans; // caller presents adopt/kill/ignore via AskUserQuestion
}

module.exports = { detectOrphans, isProcessAlive };
```

### Pattern 4: Session-Gated Write Protocol in pde-tools.cjs

**What:** Gate new write paths on `PDE_SESSION_ID` env var. When set, write to phase directory instead of shared files. Existing non-session callers are completely unaffected.

```javascript
// In pde-tools.cjs — modify requirements mark-complete case
case 'requirements': {
  if (args[1] === 'mark-complete') {
    const sessionId = process.env.PDE_SESSION_ID;
    if (sessionId) {
      // ISO-07: write phase-local COMPLETED-REQS.md to phase directory
      writeCompletedReqs(cwd, sessionId, reqIds, args[2]);
    } else {
      requirements.cmdMarkComplete(cwd, reqIds);
    }
  }
  break;
}

// For state record-session (ISO-06):
// When PDE_SESSION_ID set, write COMPLETE.json to phase dir
// instead of updating STATE.md session continuity fields
```

### Pattern 5: COMPLETE.json Artifact Format

```json
{
  "session_id": "p143-8bc9ec",
  "exit_code": 0,
  "duration_ms": 142000,
  "completed_at": "2026-03-26T20:00:00.000Z",
  "phase": 143,
  "plan": 1
}
```

Written to: `.planning/phases/{N}-{name}/COMPLETE.json`

### Pattern 6: COMPLETED-REQS.md Format

```markdown
---
session_id: p143-8bc9ec
phase: 143
plan: 1
completed_at: "2026-03-26T20:00:00.000Z"
requirements:
  - ISO-01
  - ISO-02
  - ISO-03
---

# Completed Requirements

Requirements satisfied by session p143-8bc9ec executing Phase 143, Plan 1.
```

Written to: `.planning/phases/{N}-{name}/COMPLETED-REQS.md`

### Pattern 7: Atomic Lock File

```javascript
// packages/dispatcher/lib/lock.cjs  (or inline in index.cjs)
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function acquireLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.planning', 'dispatcher.lock');
  try {
    // 'wx' = O_WRONLY | O_CREAT | O_EXCL — atomic, throws EEXIST if locked
    const fd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
    fs.closeSync(fd);
    return { acquired: true, lockPath };
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    // Check if stale
    try {
      const data = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      try { process.kill(data.pid, 0); return { acquired: false }; } // live
      catch { fs.unlinkSync(lockPath); return acquireLock(projectRoot); } // stale
    } catch { return { acquired: false }; }
  }
}

function releaseLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.planning', 'dispatcher.lock');
  try { fs.unlinkSync(lockPath); } catch {}
}

module.exports = { acquireLock, releaseLock };
```

### Anti-Patterns to Avoid

- **Using `git merge -X ours` globally:** This discards ALL session changes including source code. Use `git checkout --ours FILE` selectively for specific .planning/ files after detecting conflict.
- **Using Claude CLI's `--worktree` flag for PDE sessions:** Claude Code manages `.claude/worktrees/agent-*` independently. PDE creates `.sessions/` worktrees via direct `git worktree add` in worktree.cjs — do not use Claude's native worktree flag.
- **Catching all execFileSync errors silently:** Git errors during worktree/merge operations need to surface. Only NDJSON write failures should be swallowed (event-bus.cjs pattern).
- **Using `execSync` with template literals containing user input:** Use `execFileSync(cmd, [arg1, arg2])` to pass arguments as array — no shell interpretation, no injection risk.
- **Parsing `git worktree list` without `--porcelain`:** Human-readable output is not stable across git versions. Always use `--porcelain`.
- **Scanning all worktrees for orphans:** Filter by `refs/heads/pde/session/*` branch prefix. The repo currently has 66 Claude Code worktrees under `refs/heads/worktree-agent-*` — those must be ignored.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worktree create/delete | Custom directory manipulation | `git worktree add/remove` | git handles refs, locks, metadata — custom dirs leave orphaned git state |
| Merge conflict detection | Diff file parsing | `git diff --name-only --diff-filter=U` | git already knows what's conflicted |
| Process liveness check | PID file + ps command parsing | `process.kill(pid, 0)` | One call, correct ESRCH semantics, no parsing |
| Mutual exclusion | Rolling writes or sleep-retry | `fs.openSync(path, 'wx')` O_EXCL | Atomic by kernel guarantee; handles EEXIST cleanly |
| Branch listing | String matching on git output | `git worktree list --porcelain` | Structured output, whitespace-safe, machine-stable |

**Key insight:** Git's own worktree plumbing is the session container. Every custom directory manipulation introduces a new source of orphaned state that git doesn't know about.

## Runtime State Inventory

> Phase 143 introduces a new system (.sessions/) and a new env var (PDE_SESSION_ID). It does not rename or refactor existing strings. This section confirms no migration is needed.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | NDJSON session files at `/tmp/pde-session-{id}.ndjson` — existing events use UUID v4 from event-bus.cjs | None — new PDE session files appear alongside existing ones; existing files unaffected |
| Live service config | config.json `monitoring.session_id` — Layer 1 dashboard session, separate from PDE dispatcher sessions | None — two different session concepts coexist with no naming conflict |
| OS-registered state | None — no scheduled tasks reference session IDs | None required |
| Secrets/env vars | `PDE_SESSION_ID` — new env var introduced in phase 143 | New; no existing value to migrate |
| Build artifacts | None — dispatcher is a new package with no prior build artifacts | None required |

**Nothing found requiring migration** — phase 143 introduces new state, does not rename existing state.

## Common Pitfalls

### Pitfall 1: Claude Code .claude/worktrees Picked Up as Orphaned PDE Sessions

**What goes wrong:** Orphan detection scans `git worktree list`, finds 66 Claude Code worktrees, reports them as orphaned PDE sessions.

**Why it happens:** Both systems use git worktrees in the same repo. The PDE branch prefix `pde/session/*` is distinct from Claude's `worktree-agent-*` but only if the filter is applied.

**How to avoid:** In `listSessionWorktrees()`, filter to `refs/heads/pde/session/*` only. This is already in the reference implementation above.

**Warning signs:** Orphan detection reporting dozens of "orphaned sessions" on first startup.

### Pitfall 2: Worktree Add Fails When .sessions Directory Already Exists

**What goes wrong:** `git worktree add .sessions/abc123 -b pde/session/abc123` fails because `.sessions/abc123` exists from a prior crashed session.

**Why it happens:** `git worktree add` requires an empty or non-existent target path.

**How to avoid:** Before calling `createWorktree()`, call `git worktree prune` to remove stale administrative files, then check `fs.existsSync(worktreePath)`. If it exists and is not in `git worktree list`, it's a true orphan — handle before creating new session.

**Warning signs:** `execFileSync` throws with "fatal: 'path' already exists".

### Pitfall 3: STATE.md Receives Session's Stale Data Even Without Conflict

**What goes wrong:** Session writes to STATE.md fields that parent also changed, but in different fields — no conflict, so git merges both. Dispatcher recalculates from artifacts — but STATE.md has incorrect intermediate session data.

**Why it happens:** "Ours" strategy only triggers on conflict. Non-conflicting field edits both land.

**How to avoid:** D-09 decision handles this: executors MUST NOT write to STATE.md at all when `PDE_SESSION_ID` is set. The session-gating in pde-tools.cjs must cover ALL state-write subcommands (`state update`, `state patch`, `state advance-plan`, `state record-session`, `state add-decision`, `state add-blocker`).

**Warning signs:** STATE.md `stopped_at` or `current_plan` showing session-specific values after merge.

### Pitfall 4: Branch -d Fails After Squash Merge

**What goes wrong:** `git branch -d pde/session/abc123` fails with "not fully merged."

**Why it happens:** `-d` checks that the branch is reachable from HEAD. After regular merge, this passes. After squash merge, it fails.

**How to avoid:** Use `git merge` (never `--squash`) for session branches. Keep `-d` as default; use `-D` only in nuclear reset path. This is already reflected in the reference implementation.

**Warning signs:** `execFileSync` throws with "error: The branch 'pde/session/...' is not fully merged."

### Pitfall 5: .sessions/ Not In .gitignore Causes Accidental Staging

**What goes wrong:** `git add -A` or `git status` treats `.sessions/` as untracked directory content and tries to stage session worktree files into the parent commit.

**Why it happens:** `.sessions/` is not currently in `.gitignore`.

**How to avoid:** Add `.sessions/` to `.gitignore` as the first task in Wave 1. Git worktree mechanics are unaffected by .gitignore (the worktree directory is registered in `.git/worktrees/`, not tracked as a file).

**Warning signs:** `git status` shows `.sessions/` as untracked directory.

### Pitfall 6: COMPLETE.json Written Before Final Commit

**What goes wrong:** Executor writes COMPLETE.json, crashes before git commit. Dispatcher merges and sees the marker — but the session's work commits never landed.

**Why it happens:** COMPLETE.json is the signal to the dispatcher that work is done.

**How to avoid:** COMPLETE.json is the LAST thing written and committed in a session. Order: (1) do all work, (2) commit all work, (3) write COMPLETE.json + COMPLETED-REQS.md, (4) commit the artifacts. Dispatcher reads COMPLETE.json only after merge completes — so all preceding commits are guaranteed to be in parent.

**Warning signs:** STATE.md shows phase complete but SUMMARY.md is missing.

### Pitfall 7: Orphan Detection Prompts During Active Healthy Sessions

**What goes wrong:** Orphan detection fires on `/gsd:progress`, finds 3 running sessions, prompts adopt/kill/ignore for all of them.

**Why it happens:** Detection logic doesn't distinguish "active and healthy" from "orphaned."

**How to avoid:** Phase 143 builds the foundation; phase 144 adds the registry. In phase 143, orphan detection should only fire when there are session worktrees with no corresponding live process. A session in the registry with a live PID is NOT orphaned. For phase 143 (no parallel sessions yet), the registry is empty — any pde/session/* worktree found at startup is by definition orphaned (no dispatcher is running).

**Warning signs:** User gets prompts during normal execution flow.

## Code Examples

Verified patterns from live testing against this repo (2026-03-26):

### Full Worktree Lifecycle (verified live)

```bash
# Create — git 2.48.1 confirmed
git worktree add .sessions/p143-abc123 -b pde/session/p143-abc123
# Preparing worktree (new branch 'pde/session/p143-abc123')
# HEAD is now at 3dbbcc8

# Commit artifact in session
cd .sessions/p143-abc123
git add -A && git commit -m "feat: session complete"

# Back in main repo — merge back
git merge pde/session/p143-abc123 --no-edit
# Fast-forward (or merge commit if diverged)

# Cleanup
git worktree remove .sessions/p143-abc123
git branch -d pde/session/p143-abc123
```

### Parsing Worktree List Porcelain (verified Node.js 20.20.0)

```javascript
const { execFileSync } = require('node:child_process');
const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
  encoding: 'utf8'
});
// Each worktree block separated by blank line
const entries = output.trim().split('\n\n').map(block => {
  const entry = {};
  for (const line of block.trim().split('\n')) {
    const spaceIdx = line.indexOf(' ');
    const key = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
    const val = spaceIdx === -1 ? '' : line.slice(spaceIdx + 1);
    entry[key] = val;
  }
  return entry;
});
// Filter to PDE sessions only
const pde = entries.filter(e =>
  e.branch && e.branch.startsWith('refs/heads/pde/session/')
);
```

### Process Liveness (verified Node.js 20.20.0)

```javascript
function isAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e.code !== 'ESRCH'; } // ESRCH = no such process (dead)
}
// isAlive(99999) -> false (ESRCH)
// isAlive(process.pid) -> true
```

### Atomic Lock File (verified Node.js 20.20.0)

```javascript
const fs = require('node:fs');
// 'wx' = O_WRONLY | O_CREAT | O_EXCL — throws EEXIST if file exists
const fd = fs.openSync('/tmp/pde-test.lock', 'wx');
fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now() }));
fs.closeSync(fd);
// Verified: creates lock. Second attempt throws { code: 'EEXIST' }.
```

### Selective Conflict Resolution After Merge

```bash
# After git merge exits non-zero:
git diff --name-only --diff-filter=U   # list conflicted files
# For each .planning/STATE.md or .planning/REQUIREMENTS.md conflict:
git checkout --ours -- .planning/STATE.md
git add -- .planning/STATE.md
git commit --no-edit
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Executor writes STATE.md directly during execution | Executor writes COMPLETE.json to phase dir; dispatcher recalculates post-merge | Phase 143 | Eliminates .planning/ merge conflicts by construction |
| Single shared REQUIREMENTS.md updated inline | Phase-local COMPLETED-REQS.md; dispatcher unions post-merge | Phase 143 | Multiple sessions can complete requirements without conflict |
| No worktree lifecycle management | packages/dispatcher/ manages full lifecycle | Phase 143 | Foundation for parallel execution in phases 144+ |

**Deprecated/outdated after this phase (when `PDE_SESSION_ID` is set):**
- Direct `pde-tools.cjs requirements mark-complete` from executor
- Direct `pde-tools.cjs state record-session` from executor
- Direct `pde-tools.cjs state update/patch` from executor

## Open Questions

1. **Agent-memory session-scoped naming (D-13)**
   - What we know: Files in `.planning/agent-memory/` are role-based subdirs (executor, planner, planner, verifier, debugger). Current subdirs are all empty.
   - What's unclear: Exact filename pattern for session-scoped writes (`memories-{session-id}.md` in which subdirectory?).
   - Recommendation: Claude's discretion. Suggested: `.planning/agent-memory/{role}/memories-{session-id}.md`. Post-merge, dispatcher concatenates all `memories-*.md` into `memories.md` per role, applying the 50-entry cap mentioned in the design spec.

2. **Which pde-tools.cjs subcommands need session-gating**
   - What we know: D-09 explicitly covers STATE.md and REQUIREMENTS.md writes. D-10 covers ROADMAP.md.
   - What's unclear: `state record-metric`, `state add-decision`, `state add-blocker` all write to STATE.md — need gating too.
   - Recommendation: Gate ALL subcommands that write to STATE.md, REQUIREMENTS.md, or ROADMAP.md when `PDE_SESSION_ID` is set. The complete list should be audited during implementation by grepping for `fs.writeFileSync` calls in `bin/lib/state.cjs` and `bin/lib/requirements.cjs`.

3. **pde-tools.cjs `phase complete` during session execution**
   - What we know: `phase complete` writes to STATE.md and REQUIREMENTS.md.
   - What's unclear: Should executor call `phase complete` at end of session?
   - Recommendation: No — post-merge recalculation via `merge.cjs` + `recalculateFromArtifacts()` is the only path that should update phase completion status. Document this explicitly in executor write protocol.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| git | ISO-01, ISO-02, ISO-03, ISO-04, ISO-05 | Yes | 2.48.1 | None needed |
| node | All dispatcher code | Yes | 20.20.0 | None needed |
| vitest | Test suite | Yes | 4.1.1 (root node_modules/.bin/vitest) | None needed |
| claude CLI | Referenced in design (phase 144 spawning) | Yes | 2.1.84 | — |

**Missing dependencies with no fallback:** None.

**Note on Claude CLI `--worktree` flag:** Claude Code 2.1.84 has a native `-w/--worktree [name]` flag that creates worktrees under `.claude/worktrees/agent-*`. This is Claude Code's own parallelism mechanism — completely separate from PDE sessions. PDE dispatcher creates worktrees under `.sessions/` via direct `git worktree add` calls. Do NOT use Claude's `--worktree` flag to create PDE sessions.

**Note on Claude CLI `--worktree` skills-loading fix:** STATE.md records a concern: "Confirm March 2026 --worktree skills-loading fix is present before Phase 143 execution." Claude Code 2.1.84 is the current installed version. Phase 143 does not use Claude's `--worktree` flag itself (that's phase 144), so this concern applies to phase 144 execution, not phase 143 implementation.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.1 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `node_modules/.bin/vitest run tests/dispatcher/` |
| Full suite command | `node_modules/.bin/vitest run tests/` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ISO-01 | `createWorktree()` creates git worktree + branch at `.sessions/<id>` | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | Wave 0 |
| ISO-02 | `mergeSession()` merges branch, auto-resolves `.planning/` conflicts | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | Wave 0 |
| ISO-03 | `removeWorktree()` + `deleteBranch()` leaves no git artifacts | unit | `node_modules/.bin/vitest run tests/dispatcher/worktree.test.cjs` | Wave 0 |
| ISO-04 | `detectOrphans()` finds worktrees with dead PIDs | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | Wave 0 |
| ISO-05 | Nuclear reset removes all pde/session/* worktrees + branches | unit | `node_modules/.bin/vitest run tests/dispatcher/orphan.test.cjs` | Wave 0 |
| ISO-06 | When `PDE_SESSION_ID` set, COMPLETE.json written to phase dir | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | Wave 0 |
| ISO-07 | When `PDE_SESSION_ID` set, COMPLETED-REQS.md written to phase dir | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | Wave 0 |
| ISO-08 | When `PDE_SESSION_ID` set, agent-memory writes are session-scoped | unit | `node_modules/.bin/vitest run tests/dispatcher/artifacts.test.cjs` | Wave 0 |
| ISO-09 | `recalculateFromArtifacts()` reads COMPLETE.json and updates STATE.md | unit | `node_modules/.bin/vitest run tests/dispatcher/merge.test.cjs` | Wave 0 |

### Sampling Rate

- **Per task commit:** `node_modules/.bin/vitest run tests/dispatcher/`
- **Per wave merge:** `node_modules/.bin/vitest run tests/`
- **Phase gate:** Full suite green (3 existing passing + new dispatcher tests) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/dispatcher/worktree.test.cjs` — covers ISO-01, ISO-03
- [ ] `tests/dispatcher/merge.test.cjs` — covers ISO-02, ISO-09
- [ ] `tests/dispatcher/orphan.test.cjs` — covers ISO-04, ISO-05
- [ ] `tests/dispatcher/artifacts.test.cjs` — covers ISO-06, ISO-07, ISO-08
- [ ] `packages/dispatcher/package.json` — CJS package definition
- [ ] `packages/dispatcher/index.cjs` — entry point
- [ ] `packages/dispatcher/lib/worktree.cjs` — core module
- [ ] `packages/dispatcher/lib/merge.cjs` — core module
- [ ] `packages/dispatcher/lib/orphan.cjs` — core module

## Project Constraints (from established project patterns — no CLAUDE.md at project root)

- **CJS throughout:** All new files must be `*.cjs` with `'use strict'` at top. No ESM in `bin/` or `packages/dispatcher/`.
- **Zero npm dependencies for plugin root (`bin/`):** packages/dispatcher/ is a separate CJS package. `bin/pde-tools.cjs` must remain zero-dep and must not require dispatcher modules.
- **No top-level side effects:** Match the pattern in event-bus.cjs — use lazy-require inside function bodies.
- **NDJSON events swallow errors silently:** Match the `safeAppendEvent` pattern — event log failures must never crash PDE workflows.
- **execFileSync over execSync with template literals:** Pass git arguments as arrays to `execFileSync(cmd, [arg1, arg2])` — no shell interpretation.
- **vitest for tests:** All test files use vitest globals (`describe`, `it`, `expect`). `vitest.config.ts` has `globals: true` and discovers `tests/**/*.test.cjs` automatically.
- **Subcommand dispatch pattern:** New dispatcher entry point follows `process.argv` subcommand dispatch pattern established in `pde-tools.cjs`.

## Sources

### Primary (HIGH confidence)

- Live testing — full git worktree lifecycle verified (create, commit, merge, remove, branch delete) — 2026-03-26, this repo, git 2.48.1
- Live testing — `git worktree list --porcelain` parsing — Node.js 20.20.0, 67 entries parsed
- Live testing — `process.kill(pid, 0)` liveness detection — ESRCH for dead PIDs confirmed
- Live testing — atomic lock file with O_EXCL flag — EEXIST on second acquire confirmed
- `docs/superpowers/specs/2026-03-26-distributed-execution-design.md` — Sections 1 (Session Isolation), 6 (Merge Strategy), 7 (Observability), 10 (Error Handling), 11 (Testing)
- `.planning/phases/143-session-isolation/143-CONTEXT.md` — locked decisions D-01 through D-20
- `bin/lib/event-bus.cjs` — session ID, NDJSON, safeAppendEvent patterns
- `vitest.config.ts` — test runner config, include patterns, globals: true
- `tests/relay-approval.test.cjs` — confirmed vitest globals pattern in CJS test files
- `git --version` output — confirmed git 2.48.1 installed
- `claude --help` output — confirmed `--worktree` is Claude's own flag (not for PDE sessions)

### Secondary (MEDIUM confidence)

- git man pages (worktree, merge, branch) — flags verified against installed git 2.48.1 binary

### Tertiary (LOW confidence)

- None — all critical claims verified against live system

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are Node.js built-ins or already installed; verified with live tests
- Architecture: HIGH — design spec is canonical; patterns verified against existing CJS codebase conventions; live git tests passed
- Pitfalls: HIGH — discovered via live testing (worktree lifecycle) + code analysis (STATE.md write paths, Claude worktree coexistence)

**Research date:** 2026-03-26
**Valid until:** 2026-09-26 (stable git/Node APIs; git 2.48.1 + Node 20 LTS long-lived)
