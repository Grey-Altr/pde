---
phase: 115-multi-candidate-experiments
verified: 2026-03-23T00:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 115: Multi-Candidate Experiments Verification Report

**Phase Goal:** Experiment iterations can generate and evaluate multiple variants simultaneously, selecting the best one
**Verified:** 2026-03-23
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | parseExperimentFile returns a candidates field defaulting to 3 when absent | VERIFIED | Line 112 of experiment-schema.cjs: `candidates: fm.candidates !== undefined ? parseInt(fm.candidates, 10) : 3` — test MULTI-04 confirms: 20/20 pass |
| 2 | JSONL_ROW_FIELDS includes candidates_evaluated, candidates_scores, best_candidate_index | VERIFIED | Lines 34-36 of experiment-schema.cjs; array frozen with 14 total entries |
| 3 | _resetToSha resets experiment branch to a specific SHA with branch guard | VERIFIED | Lines 200-208 of experiment-runner.cjs; returns `{ reset: false, reason: 'wrong_branch' }` when not on experiment/{slug} |
| 4 | pde-tools reset-to-sha subcommand routes to _resetToSha | VERIFIED | Lines 927-933 of pde-tools.cjs; `--sha` arg parsed, `runner._resetToSha(cwd, slug, targetSha)` called |
| 5 | optimize.md Step 7 dispatches N candidates per iteration when candidateCount > 1 | VERIFIED | Lines 305-365 of optimize.md; candidate loop FOR candidate_index = 1 to candidateCount; reset-to-sha used for clean slate |
| 6 | Best candidate is selected by argmax/argmin based on direction field | VERIFIED | optimize.md Step 7f: direction === 'max' selects highest metric_value; direction === 'min' selects lowest |
| 7 | After selection, branch is reset to best candidate SHA via reset-to-sha | VERIFIED | optimize.md Step 7f: `node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {best.sha}` |
| 8 | DISCARD resets to iteration baseline SHA | VERIFIED | optimize.md Step 7f: decision === 'DISCARD' triggers `reset-to-sha --sha {iterationBaselineSha}` |
| 9 | All-crash iteration resets to iteration baseline SHA | VERIFIED | optimize.md Step 7f: surviving is empty path resets to iterationBaselineSha |
| 10 | Circuit breakers apply per-iteration not per-candidate | VERIFIED | optimize.md Step 7i-7k unchanged; Steps 7d-7f (candidate loop + selection) complete before circuit breakers are evaluated |
| 11 | All Nyquist tests pass for MULTI-01 through MULTI-05 | VERIFIED | `node --test tests/phase-115/multi-candidate.test.mjs` — 20 tests / 20 pass / 0 fail |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/experiment-schema.cjs` | candidates field parsing + 3 new JSONL fields | VERIFIED | Contains `candidates_evaluated`, `candidates_scores`, `best_candidate_index` in JSONL_ROW_FIELDS (lines 34-36); `candidates:` parsing at line 112; exports confirmed |
| `bin/lib/experiment-runner.cjs` | _resetToSha helper function | VERIFIED | Function defined lines 200-208; branch guard at line 203; exported at line 218 |
| `bin/pde-tools.cjs` | reset-to-sha subcommand routing | VERIFIED | `else if (subcommand === 'reset-to-sha')` at line 927; routes to `runner._resetToSha`; listed in error message |
| `workflows/optimize.md` | Multi-candidate loop in Step 7 | VERIFIED | candidateCount stored in Step 1 (line 174); iterationBaselineSha, candidateResults, candidate loop, selection phase all present |
| `tests/phase-115/multi-candidate.test.mjs` | Nyquist coverage for MULTI-01 through MULTI-05 | VERIFIED | 5 describe blocks covering MULTI-01 through MULTI-05; 20 tests total; all pass |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/pde-tools.cjs` | `bin/lib/experiment-runner.cjs` | require and _resetToSha call | WIRED | `require('./lib/experiment-runner.cjs')` at line 928; `runner._resetToSha(cwd, slug, targetSha)` at line 932 |
| `bin/lib/experiment-runner.cjs` | `bin/lib/experiment-schema.cjs` | require JSONL_ROW_FIELDS | WIRED | `const { JSONL_ROW_FIELDS } = require('./experiment-schema.cjs')` at line 20; used in _writeJsonlRow loop |
| `workflows/optimize.md` | `bin/pde-tools.cjs` | experiment reset-to-sha subcommand call | WIRED | Five distinct `node bin/pde-tools.cjs experiment reset-to-sha --slug {slug} --sha {sha}` calls in Step 7 (lines 314, 361, 374, 389, 401) |
| `workflows/optimize.md` | `bin/lib/experiment-schema.cjs` | candidates field from parseExperimentFile | WIRED | Step 1 line 172: `candidateCount = experiment.md candidates if present, else 3 (MULTI-04 default)` — bound to parseExperimentFile output |

---

### Data-Flow Trace (Level 4)

These are workflow prose artifacts (optimize.md) and library modules — not UI components rendering dynamic data. Data-flow tracing at Level 4 is not applicable to workflow orchestration prose or pure library code.

| Artifact | Assessment |
|----------|-----------|
| `workflows/optimize.md` | Orchestration workflow document — data flow defined by the prose itself; validated via structural Nyquist tests (MULTI-05) |
| `bin/lib/experiment-schema.cjs` | Pure library: parseExperimentFile reads from disk; JSONL_ROW_FIELDS is a frozen constant — both verified by Nyquist tests |
| `bin/lib/experiment-runner.cjs` | Pure library: _resetToSha calls execGit; actual git behavior validated by branch-guard test in MULTI-01 |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All Phase 115 Nyquist tests pass | `node --test tests/phase-115/multi-candidate.test.mjs` | 20 tests / 20 pass / 0 fail | PASS |
| _resetToSha rejects wrong branch | Covered in MULTI-01 test suite | returns `{ reset: false, reason: 'wrong_branch' }` | PASS |
| parseExperimentFile defaults candidates to 3 | Covered in MULTI-04 test suite | result.candidates === 3 | PASS |
| JSONL schema has exactly 14 fields | Covered in MULTI-03 test suite | JSONL_ROW_FIELDS.length === 14 | PASS |
| Phase 114 regression (26/27) | `node --test tests/phase-114/` | 26 pass / 1 fail | NOTE — see below |

**Phase 114 regression note:** The single failing test is `JSONL_ROW_FIELDS has 11 fields (9 original + 2 new)` in tests/phase-114/visual-regression.test.mjs line 318. This test asserts `JSONL_ROW_FIELDS.length === 11` but Phase 115 Plan 01 extended the schema to 14 fields. This regression was documented by the executor in the Plan 02 SUMMARY as a known pre-existing conflict: "Out of scope per deviation rules" — the Phase 114 test hardcodes the field count at 11, which is incompatible with Phase 115's extension. The test expectation in Phase 114 is stale; the schema itself is correct. This does not block Phase 115 goal achievement.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| MULTI-01 | 115-01 | Multi-candidate experiment mode generates N variants per iteration | SATISFIED | _resetToSha exported and tested; optimize.md candidate loop dispatches N Task() calls; 3 Nyquist tests pass |
| MULTI-02 | 115-01 | Each candidate evaluated independently against same metric | SATISFIED | _evalMetric and _compareMetric signatures unchanged (3 params each); MULTI-02 Nyquist tests verify contracts |
| MULTI-03 | 115-01 | Best candidate selected and promoted (git commit), others discarded | SATISFIED | optimize.md Step 7f: argmax/argmin selection + reset-to-sha to winner SHA; DISCARD path resets to baseline; 5 JSONL schema tests pass |
| MULTI-04 | 115-01 | Candidate count configurable in experiment.md (default: 3) | SATISFIED | parseExperimentFile returns `candidates: fm.candidates !== undefined ? parseInt(fm.candidates, 10) : 3`; 3 Nyquist parse tests pass |
| MULTI-05 | 115-02 | Multi-candidate mode integrates with existing orchestrator loop (Phase 103 infrastructure) | SATISFIED | optimize.md Step 7 refactored with full candidate loop; candidateCount stored in Step 1; JSONL rows include candidates_evaluated, candidates_scores, best_candidate_index; 6 Nyquist structural tests pass |

All 5 MULTI requirement IDs declared in plan frontmatter are present in REQUIREMENTS.md and marked Complete. No orphaned requirements detected.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `tests/phase-114/visual-regression.test.mjs` | 318 | Hardcoded field count assertion `=== 11` now conflicts with Phase 115's 14-field schema | Info | Stale test; does not affect Phase 115 functionality. Schema extension is correct. Phase 114 test expectation needs update in a future cleanup pass. |

No stub patterns, placeholder comments, empty implementations, or disconnected props found in Phase 115 artifacts.

---

### Human Verification Required

None. All observable truths are verifiable programmatically. The orchestration workflow (optimize.md) is specified as executable prose validated by structural Nyquist tests.

---

### Gaps Summary

No gaps. All 11 must-have truths are verified. All 5 artifacts are present, substantive, and wired. All 5 MULTI requirement IDs are satisfied. All 20 Nyquist tests pass.

The single Phase 114 test regression (`JSONL_ROW_FIELDS has 11 fields`) is a stale test expectation conflict, not a Phase 115 defect. The executor documented this as expected and out-of-scope. The schema at 14 fields is correct per Phase 115 requirements.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
