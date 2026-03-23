# Phase 100: Git State Machine - Research

**Researched:** 2026-03-23
**Domain:** Git operations in Node.js CJS — branch isolation, commit prefixing, state machine for experiment lifecycle
**Confidence:** HIGH

## Summary

Phase 100 builds `bin/lib/experiment.cjs` — a standalone CJS module implementing a git-backed state machine for experiment candidates. The module must commit experiment results to an isolated branch using a prefixed commit message, reset only those prefixed commits (never planning commits), promote the best result to main, and track session state in `EXPERIMENT-BEST.json`. Six new `experiment` subcommands are wired into `pde-tools.cjs` using the existing switch/case dispatch pattern.

The critical architectural decision from STATE.md is **branch isolation over git worktrees**: Claude Code has a confirmed `/ide worktree bug` as of March 2026. Experiments run on a dedicated `experiment/{slug}` branch (not a worktree), keeping experiment commits entirely separate from main until explicit promotion. The module must reuse `execGit` from `bin/lib/core.cjs` — no shell injection allowed, all git calls go through the execSync-backed wrapper.

The 300-line ceiling on `experiment.cjs` is a hard scope constraint from REQUIREMENTS.md. The module implements the git state machine only; boundary validation (reading `references/experiment-boundaries.md` for SAFE-04 enforcement) lives here as well since it is pre-commit validation. The module does NOT implement circuit breakers (Phase 103), metric evaluation (Phase 102), or experiment runner logic (Phase 102).

**Primary recommendation:** Implement `experiment.cjs` as a single CJS module under 300 lines that wraps `execGit` calls. Use the exact switch/case pattern from `pde-tools.cjs` for dispatch. Prefix all experiment commits with `experiment({slug}):` and check that prefix before any reset operation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Claude's Discretion
All implementation choices are Claude's discretion. Reusable assets:
- `bin/pde-tools.cjs` — existing CLI dispatch (subcommand pattern)
- `bin/lib/` — existing library modules for CJS utilities
- `references/experiment-boundaries.md` — Phase 99 output defining protected files/zones
- `protected-files.json` — protected file registry

Established patterns:
- CJS modules in bin/lib/ with structured JSON output
- pde-tools.cjs subcommand dispatch pattern
- git operations via execGit (wraps execSync) for safety

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GIT-01 | `bin/lib/experiment.cjs` module implements commit-candidate / tag / reset-to-baseline / promote-best state machine using `execGit` from existing `core.cjs` | `execGit` is exported from `core.cjs` — wraps execSync with shell injection prevention. Module must `require('./core.cjs')` and use this function for all git operations. |
| GIT-02 | Experiment commits use `experiment({slug}):` prefix — `git reset --hard HEAD~1` fires ONLY on commits matching this prefix, never on `planning:` or regular commits | Must read `git log --format=%s -1 HEAD` to check commit subject before reset. Rejection path: if HEAD commit does not match `/^experiment\([^)]+\):/` pattern, output structured error and exit. |
| GIT-03 | Experiments run in isolated git branch (not worktrees — confirmed bug) — experiment commits never appear in main branch history until explicitly promoted | `init` subcommand creates `experiment/{slug}` branch via `git checkout -b experiment/{slug}`. `promote` cherry-picks best commit into main. Baseline is stored as the SHA before branch creation. |
| GIT-04 | `EXPERIMENT-BEST.json` tracks the current best metric value, commit hash, and iteration number — enables session resumption | Written to `.planning/experiments/{slug}/EXPERIMENT-BEST.json` using fs.writeFileSync. Read on `status` subcommand. Contains `{ slug, bestMetric, bestCommit, iteration, baseline, branch }`. |
| GIT-05 | Six new `experiment` subcommands added to `pde-tools.cjs`: `init`, `commit`, `reset`, `promote`, `status`, `cleanup` | Add `case 'experiment':` to `pde-tools.cjs` switch statement. Delegate to experiment module functions. Pattern matches how `design`, `readiness`, `tracking` commands are handled — lazy `require('./lib/experiment.cjs')` inside the case block. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `child_process` | v20 (project runtime) | Underlying git execution via execSync | Already used by `execGit` in `core.cjs` — do not bypass |
| Node.js built-in `fs` | v20 | Write EXPERIMENT-BEST.json, read experiment-boundaries.md | CJS convention throughout bin/lib/ |
| Node.js built-in `path` | v20 | Path resolution for experiment dirs | CJS convention throughout bin/lib/ |
| `execGit` from `./core.cjs` | internal | All git operations | Shell-injection-safe wrapper; all lib modules use it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `output` from `./core.cjs` | internal | Structured JSON output + @file: overflow | All pde-tools commands use this for structured output |
| `error` from `./core.cjs` | internal | Error exit with message to stderr | All pde-tools commands use this for failures |
| `loadConfig` from `./core.cjs` | internal | Read .planning/config.json | For reading commit_docs flag and other config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `execGit` (established) | direct execSync calls | `execGit` already handles escaping and error normalization — no reason to bypass |
| branch isolation | git worktrees | Worktrees confirmed buggy in Claude Code /ide mode (March 2026) — use branch isolation |
| `git reset --hard HEAD~1` | `git revert` | Hard reset is correct for experiment candidates — we want to discard the commit entirely, not add a revert commit |

**Installation:**
```bash
# No new npm dependencies — uses only Node.js builtins and existing project modules
```

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/experiment.cjs    # NEW: git state machine (< 300 lines)
bin/pde-tools.cjs         # MODIFIED: add case 'experiment' dispatch
.planning/experiments/    # Created by experiment init subcommand
  {slug}/
    EXPERIMENT-BEST.json  # Agent-produced: session resumption state
```

### Pattern 1: execGit Usage (from core.cjs)
**What:** All git operations go through `execGit(cwd, args)` — array-based args with injection prevention
**When to use:** Every single git operation in experiment.cjs

The `execGit` function is exported from `bin/lib/core.cjs` lines 130-148. It takes `(cwd, args)` where `args` is a string array. It escapes arguments that contain special characters using shell quoting, then calls `execSync('git ' + escaped.join(' '), { cwd, stdio: 'pipe', encoding: 'utf-8' })`. It returns `{ exitCode, stdout, stderr }` — it never throws.

Key behavior: the safe-chars regex is `^[a-zA-Z0-9._\-/=:@]+$`. Arguments containing `(` or `)` (like a commit message `experiment(my-slug): description`) fail this test and get shell-quoted — that is correct and intentional.

### Pattern 2: CJS Module Export Shape (from existing lib modules)
**What:** Module exports named functions; pde-tools.cjs does lazy require inside the case block
**When to use:** All lib modules follow this pattern — see design.cjs, readiness.cjs, tracking.cjs

Module structure:
```javascript
'use strict';
const fs = require('fs');
const path = require('path');
const { execGit, output, error } = require('./core.cjs');

// ... implementation functions ...

module.exports = {
  cmdExperimentInit,
  cmdExperimentCommit,
  cmdExperimentReset,
  cmdExperimentPromote,
  cmdExperimentStatus,
  cmdExperimentCleanup,
};
```

### Pattern 3: Structured JSON Output (from commands.cjs)
**What:** All commands call `output(result, raw, rawValue)` — supports `--raw` flag for plain text
**When to use:** Every public function in experiment.cjs

Example shape:
```javascript
function cmdExperimentStatus(cwd, slug, raw) {
  const stateFile = path.join(cwd, '.planning', 'experiments', slug, 'EXPERIMENT-BEST.json');
  if (!fs.existsSync(stateFile)) {
    output({ found: false, slug }, raw, 'not-found');
    return;
  }
  const best = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  output({ found: true, ...best }, raw, best.bestCommit || 'none');
}
```

### Pattern 4: Commit Prefix Boundary Check (GIT-02 core logic)
**What:** Before any `git reset --hard HEAD~1`, check HEAD commit subject against prefix
**When to use:** `resetToBaseline` / `reset` subcommand — ONLY function that calls reset

Implementation sketch:
```javascript
function cmdExperimentReset(cwd, slug, raw) {
  const logResult = execGit(cwd, ['log', '--format=%s', '-1', 'HEAD']);
  if (logResult.exitCode !== 0) error('Could not read HEAD commit subject');

  const expectedPrefix = 'experiment(' + slug + '):';
  if (!logResult.stdout.startsWith(expectedPrefix)) {
    output({
      reset: false,
      reason: 'prefix_mismatch',
      head_subject: logResult.stdout,
      expected_prefix: expectedPrefix,
    }, raw, 'rejected');
    return;
  }

  const resetResult = execGit(cwd, ['reset', '--hard', 'HEAD~1']);
  if (resetResult.exitCode !== 0) error('Reset failed: ' + resetResult.stderr);
  output({ reset: true }, raw, 'reset');
}
```

### Pattern 5: Branch Isolation for GIT-03
**What:** Experiment commits live on `experiment/{slug}` branch; main branch log is never polluted
**When to use:** `init` creates the branch; `cleanup` deletes it; `promote` cherry-picks selectively

Implementation sketch for init:
```javascript
function cmdExperimentInit(cwd, slug, raw) {
  const baseResult = execGit(cwd, ['rev-parse', 'HEAD']);
  if (baseResult.exitCode !== 0) error('Could not read HEAD SHA');
  const baseline = baseResult.stdout;

  const branchName = 'experiment/' + slug;
  const branchResult = execGit(cwd, ['checkout', '-b', branchName]);
  if (branchResult.exitCode !== 0) error('Branch creation failed: ' + branchResult.stderr);

  const expDir = path.join(cwd, '.planning', 'experiments', slug);
  fs.mkdirSync(expDir, { recursive: true });
  const state = { slug, baseline, bestMetric: null, bestCommit: null, iteration: 0, branch: branchName };
  fs.writeFileSync(path.join(expDir, 'EXPERIMENT-BEST.json'), JSON.stringify(state, null, 2));

  output({ initialized: true, branch: branchName, baseline }, raw, branchName);
}
```

Implementation sketch for promote (cherry-pick of best commit):
```javascript
function cmdExperimentPromote(cwd, slug, raw) {
  const best = readBest(cwd, slug);
  if (!best || !best.bestCommit) {
    output({ promoted: false, reason: 'no_best_commit' }, raw, 'no-best');
    return;
  }

  // Switch back to main
  const checkoutResult = execGit(cwd, ['checkout', 'main']);
  if (checkoutResult.exitCode !== 0) error('Could not switch to main: ' + checkoutResult.stderr);

  // Cherry-pick only the best commit (keeps main history clean per GIT-03)
  const cherryResult = execGit(cwd, ['cherry-pick', best.bestCommit]);
  if (cherryResult.exitCode !== 0) error('Cherry-pick failed: ' + cherryResult.stderr);

  output({ promoted: true, commit: best.bestCommit, slug }, raw, best.bestCommit);
}
```

### Pattern 6: pde-tools.cjs Dispatch Addition
**What:** Add `case 'experiment':` to the main switch in pde-tools.cjs using lazy require
**When to use:** This is the exact pattern used for `design`, `readiness`, `tracking`, `shard-plan`

The `case 'experiment':` block should be added inside the main `switch (command)` block in `pde-tools.cjs`. The lazy require pattern (`const experiment = require('./lib/experiment.cjs')` inside the case) is consistent with how `design` is loaded at line 521. Args are parsed with `args.indexOf('--slug')` and friends.

### Anti-Patterns to Avoid
- **Using execSync directly:** Always use `execGit` from core.cjs — it handles escaping and normalizes exit codes
- **Shell string construction:** Never concatenate slug or paths into shell strings — use array args
- **Resetting without prefix check:** `git reset --hard HEAD~1` must be guarded by the prefix check — this is the most destructive operation in the module
- **Writing to protected directories:** EXPERIMENT-BEST.json goes to `.planning/experiments/{slug}/` ONLY — never to `.planning/` root, never to `bin/`
- **Exceeding 300 lines:** Circuit breakers, metric eval, and runner logic are not in scope for Phase 100
- **Fast-forward merge for promote:** Use `git cherry-pick {bestCommit}` — not `git merge` — to keep main history clean

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shell-safe git execution | Custom exec wrapper | `execGit` from `core.cjs` | Already handles escaping, error normalization, stdio piping |
| Structured output | Custom JSON writer | `output(result, raw, rawValue)` from `core.cjs` | Handles @file: overflow for large payloads, respects `--raw` flag |
| Config reading | Manual JSON.parse | `loadConfig(cwd)` from `core.cjs` | Handles migration, defaults, nested config formats |
| Path normalization | Custom logic | `path.join` + `toPosixPath` from `core.cjs` | Cross-platform safety |

**Key insight:** The entire existing `core.cjs` is the utility layer — experiment.cjs should be a thin state machine on top of it, not a reimplementation.

## Common Pitfalls

### Pitfall 1: Reset Without Branch Check
**What goes wrong:** `git reset --hard HEAD~1` on a `planning:` commit permanently destroys planning history
**Why it happens:** The reset subcommand is called on the wrong branch or wrong commit
**How to avoid:** Check both (a) commit subject starts with `experiment({slug}):` AND (b) current branch is `experiment/{slug}` before executing reset
**Warning signs:** No prefix check before reset call; no branch verification before destructive operations

### Pitfall 2: Experiment Commits Leaking to Main
**What goes wrong:** Experiment iteration commits appear in `git log` on the main branch
**Why it happens:** Working directly on main instead of the isolated `experiment/{slug}` branch
**How to avoid:** `init` always creates and switches to the experiment branch; `promote` cherry-picks only the bestCommit SHA; `cleanup` deletes the experiment branch
**Warning signs:** No `git checkout -b` in init; promote uses `git merge` with fast-forward

### Pitfall 3: EXPERIMENT-BEST.json Written to Wrong Location
**What goes wrong:** Session state written to `.planning/` root or repo root — violates the planning state protection constraint
**Why it happens:** Hardcoded path without slug subdirectory
**How to avoid:** Path must be `.planning/experiments/{slug}/EXPERIMENT-BEST.json` — create with `fs.mkdirSync(dir, { recursive: true })`
**Warning signs:** Path missing the `experiments/{slug}` segment

### Pitfall 4: Promote Using Fast-Forward Merge
**What goes wrong:** All intermediate experiment commits appear in main branch history (violates GIT-03)
**Why it happens:** `git merge experiment/{slug}` with fast-forward brings every iteration commit
**How to avoid:** Use `git cherry-pick {bestCommit}` — picks only the single best result commit. This satisfies GIT-03: "experiment commits never appear in main until explicitly promoted"
**Warning signs:** `git merge` without `--squash`; no cherry-pick of specific SHA

### Pitfall 5: 300-Line Ceiling Exceeded
**What goes wrong:** Feature creep pulls boundary validation, circuit breakers, or metric eval into experiment.cjs
**Why it happens:** These seem naturally related to the state machine
**How to avoid:** Boundary validation is in scope (SAFE-04 validation). Circuit breakers belong in Phase 103. Metric eval belongs in Phase 102. If line count approaches 280, audit for scope creep.
**Warning signs:** spawnSync calls (metric eval), time-check loops (circuit breakers), YAML parsing beyond experiment-boundaries.md frontmatter

### Pitfall 6: execGit Argument Structure for Commit Messages
**What goes wrong:** Commit message with `experiment(slug): text` fails due to parentheses
**Why it happens:** The `execGit` escaping uses shell quoting — parentheses trigger quoting — but the final command is still correct
**How to avoid:** Each git argument is one array element. `['commit', '-m', 'experiment(' + slug + '): ' + description]` works correctly because execGit quotes elements containing special chars
**Warning signs:** Splitting a commit message across multiple array elements

## Code Examples

### execGit signature and behavior (source: bin/lib/core.cjs lines 130-148)

The function accepts `(cwd: string, args: string[])` and returns `{ exitCode: number, stdout: string, stderr: string }`. It never throws — failures are indicated by `exitCode !== 0`. Safe-chars regex: `^[a-zA-Z0-9._\-/=:@]+$`. Arguments outside this set are shell-quoted with single quotes.

Usage:
```javascript
const { execGit } = require('./core.cjs');

// Correct: each argument is a separate array element
const result = execGit(cwd, ['log', '--format=%s', '-1', 'HEAD']);
if (result.exitCode !== 0) { /* handle */ }
const subject = result.stdout; // "experiment(my-slug): iteration 3 — prose v2"
```

### EXPERIMENT-BEST.json schema
```json
{
  "slug": "prose-optimization-v1",
  "branch": "experiment/prose-optimization-v1",
  "baseline": "abc1234",
  "bestMetric": 87.5,
  "bestCommit": "def5678",
  "iteration": 12
}
```

### Boundary check reading experiment-boundaries.md (SAFE-04)

The file at `references/experiment-boundaries.md` has YAML frontmatter listing `protected_files[]` and `protected_directories[]`. Use a simple line-by-line frontmatter parser — no external YAML library needed. Extract lines under `protected_files:` and `protected_directories:` YAML list headers. The function returns `{ protected_files: string[], protected_directories: string[] }` and is called once per `init` operation to validate the planned mutable_files list.

### pde-tools.cjs dispatch addition location

The new `case 'experiment':` block goes in the main `switch (command)` statement in `pde-tools.cjs`. Modeled on the `design` case (lines 519-546), which uses lazy require and delegates to named functions from the lib module. The `--slug` flag is the primary arg for all 6 subcommands. Additional flags for `commit`: `--metric` (float), `--description` (string).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| git worktrees for isolation | branch isolation (`git checkout -b`) | March 2026 (Claude Code /ide worktree bug confirmed) | Experiment branches instead of worktrees |
| Commit messages with no prefix | `experiment({slug}):` prefix convention | Phase 100 (new) | Enables safe prefix-guarded reset |

**Deprecated/outdated:**
- git worktrees for experiment isolation: confirmed buggy in Claude Code /ide mode — use branch isolation

## Open Questions

1. **Promote strategy: cherry-pick vs squash merge**
   - What we know: GIT-03 requires experiment commits not appear in main until promoted; the best commit should appear in main after promotion
   - What's unclear: Whether to cherry-pick the bestCommit SHA (cleanest history) or use `git merge --squash` (single new commit combining all kept iterations)
   - Recommendation: Cherry-pick of `bestCommit` SHA is cleanest — only one commit appears in main with the actual best result. Document this choice explicitly in PLAN.md.

2. **Slug validation scope**
   - What we know: `execGit` escaping handles special chars; git branch names have constraints (no `..`, no spaces, etc.)
   - What's unclear: Whether slug validation belongs in Phase 100 or is a caller contract
   - Recommendation: Add a simple slug validation regex in `cmdExperimentInit` — reject slugs with chars outside `[a-z0-9-]`. Fits within line budget and prevents cryptic git errors.

3. **pde-tools.cjs is a protected file — but Phase 100 CAN edit it**
   - What we know: `bin/pde-tools.cjs` is in `protected_files` in experiment-boundaries.md and protected-files.json
   - What's clear: The restriction applies to the EXPERIMENT RUNNER modifying it during experiments. Phase 100 implementation (developer/agent building the phase) CAN and MUST edit it to add the dispatch case.
   - Recommendation: Document this distinction clearly in PLAN.md — this is planned code, not experiment mutation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test` + `node:assert/strict`) |
| Config file | none — tests run directly with `node --test` |
| Quick run command | `node --test tests/phase-100/*.test.mjs` |
| Full suite command | `node --test "tests/**/*.test.mjs"` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GIT-01 | `experiment.cjs` exports all core state machine functions | unit | `node --test tests/phase-100/experiment-state-machine.test.mjs` | Wave 0 |
| GIT-02 | `reset` rejects non-experiment-prefixed commits without modifying anything | unit | `node --test tests/phase-100/experiment-state-machine.test.mjs` | Wave 0 |
| GIT-03 | experiment commits stay on isolated branch until promote | unit (git inspection) | `node --test tests/phase-100/experiment-state-machine.test.mjs` | Wave 0 |
| GIT-04 | `EXPERIMENT-BEST.json` written with correct schema after commit | unit | `node --test tests/phase-100/experiment-state-machine.test.mjs` | Wave 0 |
| GIT-05 | all 6 `experiment` subcommands dispatch correctly from pde-tools.cjs | unit (process spawn) | `node --test tests/phase-100/experiment-dispatch.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-100/*.test.mjs`
- **Per wave merge:** `node --test "tests/**/*.test.mjs"`
- **Phase gate:** Full suite green before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-100/experiment-state-machine.test.mjs` — covers GIT-01, GIT-02, GIT-03, GIT-04
- [ ] `tests/phase-100/experiment-dispatch.test.mjs` — covers GIT-05

Note: Tests for GIT-02 and GIT-03 that involve actual git operations need a temp git repo setup using `fs.mkdtempSync` + a git init call. This is the appropriate approach for testing git state machine behavior in isolation without polluting the real project repo.

## Sources

### Primary (HIGH confidence)
- `bin/lib/core.cjs` — `execGit` function signature, `output`/`error` helpers, all git utility functions
- `bin/pde-tools.cjs` — switch/case dispatch pattern, lazy require pattern for lib modules, complete command list
- `bin/lib/commands.cjs` — cmdCommit pattern for git operations with structured output
- `references/experiment-boundaries.md` — YAML frontmatter structure, validation rules, SAFE-04 spec
- `.planning/STATE.md` — branch isolation decision (worktrees rejected, March 2026)
- `.planning/REQUIREMENTS.md` — exact requirement text for GIT-01 through GIT-05

### Secondary (MEDIUM confidence)
- `tests/phase-74/experience-regression.test.mjs` — test file structure, `node:test` import pattern, ROOT resolution pattern
- `tests/phase-40/ci-status.test.mjs` — `describe`/`it` pattern for workflow structure tests
- `.planning/config.json` — `nyquist_validation: true` confirmed (Validation Architecture section included)

### Tertiary (LOW confidence)
- None — all critical claims backed by direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct inspection of core.cjs, commands.cjs, pde-tools.cjs
- Architecture: HIGH — dispatch pattern extracted verbatim from design case block; state machine logic derived directly from GIT-01..05 requirements; branch isolation confirmed in STATE.md
- Pitfalls: HIGH — reset safety requirement is explicit in GIT-02; branch isolation rationale recorded in STATE.md; 300-line ceiling in REQUIREMENTS.md out-of-scope table

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable — no external dependencies; all findings from project source)
