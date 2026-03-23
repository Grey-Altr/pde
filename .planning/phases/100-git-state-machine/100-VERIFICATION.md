---
phase: 100-git-state-machine
verified: 2026-03-23T10:00:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 100: Git State Machine Verification Report

**Phase Goal:** A reliable git state machine exists as a standalone CJS module that can commit experiment candidates, tag best results, and reset to baseline without touching regular planning commits
**Verified:** 2026-03-23T10:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | experiment.cjs exports commitCandidate, resetToBaseline, promoteBest, and all 6 cmd functions | VERIFIED | `module.exports` at line 274 exports all 6 cmd* functions plus 7 underscore helpers; 289 lines total |
| 2 | Reset only fires on commits with experiment slug prefix — rejects planning commits without change | VERIFIED | `_reset` double-guards: checks branch name AND commit subject prefix; returns `reset: false, reason: prefix_mismatch` or `wrong_branch` without any git mutation; test coverage at lines 279 and 301 |
| 3 | Experiment commits live on experiment/slug branch, never on main until promoted | VERIFIED | `_init` creates `experiment/${slug}` branch via `git checkout -b`; `_promote` uses `cherry-pick` (not merge) per GIT-03; all 23 unit tests use isolated temp git repos |
| 4 | EXPERIMENT-BEST.json written to .planning/experiments/slug/ with correct schema after commit | VERIFIED | `bestJsonPath` constructs path `.planning/experiments/${slug}/EXPERIMENT-BEST.json`; `writeBest` creates dirs recursively; `_init` writes `{slug, branch, baseline, bestMetric: null, bestCommit: null, iteration: 0}` matching required schema |
| 5 | Boundary validation reads references/experiment-boundaries.md and rejects out-of-bounds files | VERIFIED | `_checkBoundaries` reads `references/experiment-boundaries.md` via `fs.readFileSync`; uses line-by-line YAML frontmatter parser; checks exact-match protected_files and prefix-match protected_directories |
| 6 | All 6 experiment subcommands dispatch correctly from pde-tools.cjs | VERIFIED | `case 'experiment'` block at lines 835–866; lazy-require `./lib/experiment.cjs`; routes all 6 subcommands; error on unknown/missing |
| 7 | Each subcommand produces structured JSON output | VERIFIED | All cmd* wrappers call `output(result, raw)` from core.cjs; integration tests parse stdout as JSON; 6/6 dispatch tests pass |
| 8 | Unknown experiment subcommand produces a helpful error message listing available subcommands | VERIFIED | `else` branch at line 863: `error('Unknown experiment subcommand. Available: init, commit, reset, promote, status, cleanup')` |

**Score:** 8/8 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/experiment.cjs` | Git state machine CJS module | VERIFIED | 289 lines (under 300-line ceiling); `module.exports` present; all 7 exported public + 7 underscore helpers |
| `tests/phase-100/experiment-state-machine.test.mjs` | Unit tests with temp git repos | VERIFIED | 23 tests, 23 passing, 0 failing; covers all behaviors from plan spec |
| `bin/pde-tools.cjs` | Experiment subcommand dispatch | VERIFIED | `case 'experiment'` block lines 835–866; usage comment lines 159–164; lazy-require pattern |
| `tests/phase-100/experiment-dispatch.test.mjs` | Dispatch integration tests | VERIFIED | 6 tests, 6 passing, 0 failing; spawns pde-tools.cjs process; parses JSON output |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bin/lib/experiment.cjs` | `bin/lib/core.cjs` | `require('./core.cjs')` | WIRED | Line 12: `const { execGit, output, error } = require('./core.cjs')` — all git ops use `execGit` exclusively, no direct `child_process` usage |
| `bin/lib/experiment.cjs` | `references/experiment-boundaries.md` | `fs.readFileSync` in `_checkBoundaries` | WIRED | Lines 196–202: reads file at `path.join(cwd, 'references', 'experiment-boundaries.md')`; file exists and has correct YAML frontmatter |
| `bin/pde-tools.cjs` | `bin/lib/experiment.cjs` | Lazy require inside `case 'experiment'` block | WIRED | Line 837: `const experiment = require('./lib/experiment.cjs')` inside case block — consistent with design case lazy-require pattern |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GIT-01 | 100-01 | `bin/lib/experiment.cjs` implements commit-candidate / tag / reset-to-baseline / promote-best state machine using `execGit` from `core.cjs` | SATISFIED | Module exists, 289 lines, all operations go through `execGit`, no direct `child_process` |
| GIT-02 | 100-01 | Experiment commits use `experiment({slug}):` prefix — reset fires ONLY on commits matching this prefix, never on `planning:` or regular commits | SATISFIED | `_commit` uses `experiment(${slug}): ${description}` prefix; `_reset` checks `subjectResult.stdout.startsWith(...)` before any git mutation |
| GIT-03 | 100-01 | Experiments run in isolated git branch — experiment commits never appear in main branch history until explicitly promoted | SATISFIED | `_init` creates `experiment/${slug}` branch; `_promote` uses `cherry-pick` (not merge) — `git cherry-pick state.bestCommit` at line 167 |
| GIT-04 | 100-01 | `EXPERIMENT-BEST.json` tracks current best metric value, commit hash, and iteration number | SATISFIED | State file schema includes `bestMetric`, `bestCommit`, `iteration`; updated on each `_commit`; read by `_status`, `_promote`, `_cleanup` |
| GIT-05 | 100-02 | Six new `experiment` subcommands added to `pde-tools.cjs`: init, commit, reset, promote, status, cleanup | SATISFIED | `case 'experiment'` block routes all 6 subcommands; usage comment documents all 6 with flags; 6 integration tests pass |

No orphaned requirements — all 5 GIT requirements (GIT-01 through GIT-05) are claimed by plans 100-01 and 100-02 and verified present.

### Anti-Patterns Found

No blockers or warnings found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bin/lib/experiment.cjs` | 28 | `return null` in `readBest` catch block | Info | Intentional — sentinel value for "file not found" state; checked by all callers |
| `bin/lib/experiment.cjs` | 41 | `return {}` in `parseFrontmatter` | Info | Intentional — early return when file has no YAML frontmatter; safe fallback |

Neither pattern is a stub — both are valid functional returns in error-handling paths.

### Human Verification Required

None. All behavioral properties are fully verifiable programmatically:

- Branch isolation: verified via temp git repos in tests
- Prefix guard: verified by test at line 279 (non-experiment commit rejected)
- Branch guard: verified by test at line 301 (wrong branch rejected)
- Cherry-pick promotion: verified via `git cherry-pick` call at line 167
- JSON output: verified by dispatch integration tests parsing stdout

### Anti-Pattern Scan: No Issues

Scanned `bin/lib/experiment.cjs`, `bin/pde-tools.cjs` (case block), both test files for:
- TODO/FIXME/PLACEHOLDER comments: none found
- Empty implementations (`=> {}`, `return null` as stub): none — all `return null`/`return {}` are guarded error paths
- Console.log-only handlers: none
- Unconnected state: all state variables (slug, branch, baseline, bestMetric, bestCommit, iteration) are read and returned in `_status`
- Direct `child_process` usage: none — all git operations via `execGit` from `core.cjs`

### Test Results

```
tests/phase-100/experiment-state-machine.test.mjs
  # tests 23 | # pass 23 | # fail 0

tests/phase-100/experiment-dispatch.test.mjs
  # tests 6 | # pass 6 | # fail 0
```

All documented commit hashes verified present in git history:
- `6d61d0d` — test(100-01): add failing tests
- `8aa4b30` — feat(100-01): implement experiment.cjs
- `4c607c4` — test(100-02): add failing dispatch tests
- `7218567` — feat(100-02): wire experiment subcommands

### Gaps Summary

No gaps. Phase goal fully achieved.

The git state machine exists as a standalone CJS module (`bin/lib/experiment.cjs`, 289 lines, under the 300-line ceiling). It is wired to `core.cjs` exclusively for git operations, reads `experiment-boundaries.md` for boundary validation, enforces double-guarded reset (branch check AND prefix check), uses cherry-pick for promotion to keep main history clean, and tracks best-metric state in `EXPERIMENT-BEST.json`. All 6 subcommands are accessible via the standard `pde-tools.cjs` CLI interface. All 29 tests pass (23 unit + 6 integration).

---

_Verified: 2026-03-23T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
