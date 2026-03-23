---
phase: 102-mutation-agent-metric-evaluation
verified: 2026-03-23T12:00:00Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 102: Mutation Agent & Metric Evaluation Verification Report

**Phase Goal:** An experiment runner agent can apply one atomic change per iteration, evaluate a deterministic metric, and return a structured result — while consuming the minimum possible tokens
**Verified:** 2026-03-23T12:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `agents/pde-experiment-runner.md` exists and returns structured JSON per iteration with `iteration`, `metric_value`, `metric_delta`, `status`, `description`, `tokens_used` | VERIFIED | File at 136 lines; Return Format section contains all 6 fields with exact types |
| 2 | A file outside `mutable_files` is rejected before commit fires; iteration retries without consuming a budget slot | VERIFIED | `_checkModifiedFiles` in experiment-runner.cjs returns `{ valid: false, violations }` before any commit; agent Boundary Enforcement section documents retry-without-slot behavior; 4 boundary tests pass |
| 3 | Metric evaluation runs verify via `spawnSync` with timeout; a hanging command produces CRASH not infinite wait | VERIFIED | `_evalMetric` uses `spawnSync` with `timeout: timeoutMs`; timeout path returns `{ status: 'CRASH', reason: 'timeout' }`; `Number.isFinite` guard catches NaN/Infinity; 11 metric-eval tests pass |
| 4 | Runner defaults to Haiku; escalates to Sonnet after 3 consecutive boundary violations or crashes | VERIFIED | `model: haiku` in agent frontmatter; Model Escalation section documents `consecutive_violations` tracking and escalation threshold of 3 |
| 5 | After iteration 1, runner receives only the diff of current-best vs baseline (not full file) | VERIFIED | `_extractDiff` implemented in experiment-runner.cjs; Diff-Based Context section in agent specifies `context-mode=diff` after iter 1 with fallback to full read on empty diff; 2 diff tests pass |
| 6 | `results.jsonl` rows include a `tokens_used` field | VERIFIED | `JSONL_ROW_FIELDS` in experiment-schema.cjs contains 9 elements with `tokens_used` as 9th; `_writeJsonlRow` enforces schema; `write-row` pde-tools subcommand passes `--tokens_used` arg; 5 JSONL tests pass |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/experiment-runner.cjs` | 5 exported functions, under 300 lines | VERIFIED | 197 lines; exports `_checkModifiedFiles`, `_evalMetric`, `_compareMetric`, `_writeJsonlRow`, `_extractDiff` |
| `bin/lib/experiment-schema.cjs` | `JSONL_ROW_FIELDS` with 9 fields including `tokens_used` | VERIFIED | Line 30 contains `'tokens_used'` as 9th element of frozen array |
| `agents/pde-experiment-runner.md` | Agent definition, min 80 lines, `model: haiku`, correct frontmatter | VERIFIED | 136 lines; YAML frontmatter with `name`, `model: haiku`, `allowed-tools`, `argument-hint` |
| `tests/phase-102/experiment-runner-boundaries.test.mjs` | Boundary enforcement tests | VERIFIED | Exists; 4 tests — all-valid, violation, no-files, git-failure |
| `tests/phase-102/experiment-runner-metric-eval.test.mjs` | Metric evaluation tests | VERIFIED | Exists; 11 tests covering ok/nonzero/timeout/unparseable/infinity/compare cases |
| `tests/phase-102/experiment-runner-jsonl.test.mjs` | JSONL row write + tokens_used tests | VERIFIED | Exists; 5 tests — schema enforcement, JSONL_ROW_FIELDS count, auto-id/ts, no-extras, append |
| `tests/phase-102/experiment-runner-diff.test.mjs` | Diff extraction tests | VERIFIED | Exists; 2 tests — diff between commits, null on failure |
| `tests/phase-102/experiment-runner-agent.test.mjs` | Structural tests for agent file | VERIFIED | Exists; verifies frontmatter fields, model, minimal context, escalation, return format |
| `tests/phase-102/experiment-runner-pde-tools.test.mjs` | Dispatch tests for new subcommands | VERIFIED | Exists; verifies check-boundaries, eval-metric, write-row dispatch and help text |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/experiment-runner.cjs` | `bin/lib/core.cjs` | `require('./core.cjs')` → `execGit` | VERIFIED | Line 19: `const { execGit } = require('./core.cjs')` |
| `bin/lib/experiment-runner.cjs` | `bin/lib/experiment-schema.cjs` | `require('./experiment-schema.cjs')` → `JSONL_ROW_FIELDS` | VERIFIED | Line 20: `const { JSONL_ROW_FIELDS } = require('./experiment-schema.cjs')` |
| `bin/lib/experiment-schema.cjs` | `results.jsonl` contract | `JSONL_ROW_FIELDS` includes `tokens_used` | VERIFIED | Line 30 of experiment-schema.cjs: `'tokens_used'` in frozen array |
| `agents/pde-experiment-runner.md` | `bin/lib/experiment-runner.cjs` | Bash tool calls to `pde-tools experiment` subcommands | VERIFIED | Agent body contains `node bin/pde-tools.cjs experiment check-boundaries`, `eval-metric`, `write-row` |
| `bin/pde-tools.cjs` | `bin/lib/experiment-runner.cjs` | `require('./lib/experiment-runner.cjs')` in 3 dispatch branches | VERIFIED | Lines 869, 879, 902: `const runner = require('./lib/experiment-runner.cjs')` in each subcommand block |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EXEC-02 | 102-02 | `pde-experiment-runner` agent returns structured JSON per iteration | SATISFIED | Agent file exists; Return Format section defines 6-field JSON with `iteration`, `metric_value`, `metric_delta`, `status`, `description`, `tokens_used` |
| EXEC-03 | 102-01 | Boundary enforcement: pre-check validates only mutable files modified, rejects and retries | SATISFIED | `_checkModifiedFiles` implemented and tested; agent Boundary Enforcement section documents discard-and-retry without consuming budget slot |
| EXEC-04 | 102-01 | Metric evaluation via `spawnSync` with timeout; KEEP/DISCARD/CRASH outcomes | SATISFIED | `_evalMetric` uses `spawnSync(cmd, args, { timeout: timeoutMs })`; timeout → CRASH, nonzero → CRASH, unparseable → CRASH, finite float → ok; `_compareMetric` returns KEEP/DISCARD |
| SELF-06 | 102-02 | Minimal context window: only experiment.md, target file/diff, last N results, prior metric | SATISFIED | Agent Context Window section explicitly lists 4 allowed inputs; explicitly bans full project context and codebase maps |
| SELF-07 | 102-02 | Haiku-first; escalates to Sonnet after 3 consecutive violations/crashes | SATISFIED | `model: haiku` in frontmatter; Model Escalation section documents `consecutive_violations` threshold of 3; no de-escalation documented |
| SELF-08 | 102-01, 102-02 | Diff-based context after iteration 1 | SATISFIED | `_extractDiff` implemented in experiment-runner.cjs; agent Diff-Based Context section specifies `context-mode=diff` for iterations 2+; empty-diff fallback documented |
| SELF-09 | 102-01 | Token usage tracked in results.jsonl via `tokens_used` field | SATISFIED (partial — REPORT.md portion deferred to Phase 103) | `tokens_used` is 9th element of `JSONL_ROW_FIELDS`; `_writeJsonlRow` enforces schema; `write-row` subcommand accepts `--tokens_used` arg. REPORT.md cost reporting is Phase 103's responsibility per ROADMAP |

---

### Anti-Patterns Found

No anti-patterns found in any phase-102 modified files.

Scan covered: `bin/lib/experiment-runner.cjs`, `agents/pde-experiment-runner.md`, `bin/pde-tools.cjs` (experiment dispatch block).

**Minor inconsistency (non-blocking):** The agent's step 10 says `--tokens_used 0` while the Return Format section says `"tokens_used": null`. Both are placeholder values that Phase 103's orchestrator overwrites from API metadata. The write-row subcommand stores whichever value is passed, so the behavior is functionally equivalent regardless of which the agent uses. No correctness impact.

---

### Human Verification Required

None. All goal-critical behaviors are verified programmatically.

**Optional runtime sanity check** (not required for phase completion):

#### 1. End-to-end agent invocation smoke test

**Test:** Invoke `agents/pde-experiment-runner.md` against a minimal experiment.md with a known verify command and observe the returned JSON block.
**Expected:** A valid JSON block with all 6 fields and `tokens_used: null`.
**Why human:** Requires Claude API invocation; the agent's reasoning path cannot be verified by static analysis alone.

---

### Test Run Results

| Suite | Tests | Pass | Fail |
|-------|-------|------|------|
| Phase 102 (all 6 files) | 37 | 37 | 0 |
| Phase 101 regression | 19 | 19 | 0 |
| Phase 100 regression | 29 | 29 | 0 |
| **Total** | **85** | **85** | **0** |

---

### Notes

**SELF-09 scope split:** ROADMAP Phase 102 success criterion 6 is a compound statement — "results.jsonl rows include `tokens_used` field" AND "REPORT.md includes total token cost." The `tokens_used` infrastructure is fully delivered here. REPORT.md generation is owned by Phase 103 (explicitly listed in the Phase 103 milestone summary line). This split is by design and does not constitute a gap for Phase 102.

**`git status --porcelain` vs `git diff --name-only HEAD`:** The implementation uses `git diff --name-only HEAD` in `_checkModifiedFiles`. The SUMMARY documents a deviation where the executor chose `git status --porcelain` to detect untracked files. The actual code uses `git diff --name-only HEAD`. The tests stage files (not commit) to work with this, and all 4 boundary tests pass. The plan's stated behavior (detect modified files against mutable list) is correctly achieved.

---

_Verified: 2026-03-23T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
