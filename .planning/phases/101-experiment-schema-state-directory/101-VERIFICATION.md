---
phase: 101-experiment-schema-state-directory
verified: 2026-03-23T00:00:00Z
status: passed
score: 10/10 must-haves verified
re_verification: false
---

# Phase 101: Experiment Schema and State Directory Verification Report

**Phase Goal:** The experiment file format, state directory structure, config defaults, and experiment phase type are fully defined so that an operator can declare an experiment and know exactly where results will appear
**Verified:** 2026-03-23
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | A valid experiment.md with all required fields parses to a structured object with metric, direction, verify, mutable_files, budget | VERIFIED | parseExperimentFile returns valid:true with all 6 fields; test ok 13 passes |
| 2  | An invalid experiment.md missing required fields returns an error listing exactly which fields are missing | VERIFIED | error message "experiment.md is missing required fields: metric"; test ok 15 passes |
| 3  | An invalid direction value (not min/max) returns a clear error | VERIFIED | error "direction must be "min" or "max""; test ok 16 passes |
| 4  | ensureExperimentDirs creates .planning/experiments/ parent directory idempotently | VERIFIED | mkdirSync with recursive:true; tests ok 6-9 pass including idempotency |
| 5  | patchExperimentConfig adds experiment_defaults block to config.json without overwriting existing values | VERIFIED | returns {patched:false, reason:'already_exists'} on second call; tests ok 1-5 pass |
| 6  | experiment.md template exists with correct YAML frontmatter schema | VERIFIED | templates/experiment.md has slug, metric, direction, verify, mutable_files, immutable_files, iteration_budget, time_budget_minutes |
| 7  | JSONL_ROW_FIELDS constant exports the results.jsonl schema fields as a machine-readable contract for Phase 102 consumers | VERIFIED | Object.freeze(['id','iteration','ts','commit','metric_value','metric_delta','status','description']); tests ok 11-12 pass |
| 8  | After experiment init, the per-slug directory contains EXPERIMENT-BEST.json | VERIFIED | End-to-end test ok 10 passes — slug dir and EXPERIMENT-BEST.json created by Phase 100 init |
| 9  | A reference document defines the experiment phase type format with target metric, search space, iteration budget, and keep/discard threshold fields | VERIFIED | references/experiment-phase-type.md contains all four fields plus recognition rules |
| 10 | ensure-dirs and patch-config subcommands are wired into pde-tools.cjs dispatch | VERIFIED | Lines 862-867 of pde-tools.cjs; slug guard updated; error message lists all 8 subcommands |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bin/lib/experiment-schema.cjs` | Schema parsing, directory init, config patching, JSONL row schema contract | VERIFIED | 190 lines (under 300-line ceiling); exports all 6 required symbols |
| `templates/experiment.md` | User-facing experiment.md template with correct schema | VERIFIED | Contains slug, metric, direction, mutable_files, iteration_budget, time_budget_minutes, immutable_files |
| `references/experiment-phase-type.md` | Canonical definition of experiment phase type format for ROADMAP.md | VERIFIED | Contains Type, Target Metric, Search Space, Iteration Budget, example entry, recognition rules |
| `tests/phase-101/experiment-schema.test.mjs` | Unit tests for schema parsing and validation | VERIFIED | 7 substantive tests covering valid parse, defaults, missing fields, invalid direction, missing file, array normalization, null slug |
| `tests/phase-101/experiment-dirs.test.mjs` | Tests for directory creation including end-to-end slug structure validation | VERIFIED | 4 unit tests + 1 end-to-end test via CLI; all pass |
| `tests/phase-101/experiment-config.test.mjs` | Tests for config patching | VERIFIED | 5 substantive tests covering patch, idempotency, non-overwrite, missing config creation, value preservation |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `bin/lib/experiment-schema.cjs` | `bin/lib/frontmatter.cjs` | `require('./frontmatter.cjs').extractFrontmatter` | WIRED | Line 13: `const { extractFrontmatter } = require('./frontmatter.cjs')` |
| `bin/lib/experiment-schema.cjs` | `bin/lib/core.cjs` | `require('./core.cjs')` | WIRED | Line 12: `const { output, error } = require('./core.cjs')` |
| `bin/lib/experiment-schema.cjs` | Phase 102 consumers | `JSONL_ROW_FIELDS` exported constant | WIRED | Exported at line 184; frozen array with 8 fields; verified by tests |
| `bin/pde-tools.cjs` | `bin/lib/experiment-schema.cjs` | `require('./lib/experiment-schema.cjs')` | WIRED | Lines 863 and 866; both ensure-dirs and patch-config branches require the module |
| `references/experiment-phase-type.md` | `.planning/ROADMAP.md` | Format convention consumed by future experiment phases | WIRED | Document defines the format; ROADMAP.md uses standard phase entries; format contract established for Phase 103+ |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| EXEC-01 | 101-01 | experiment.md file format: YAML frontmatter (metric, direction, verify, mutable_files, immutable_files, budget) + markdown prose | SATISFIED | parseExperimentFile validates all required fields; templates/experiment.md demonstrates the schema |
| EXEC-05 | 101-01 | JSONL results log at .planning/experiments/{slug}/results.jsonl — each row: {id, iteration, ts, commit, metric_value, metric_delta, status, description} | SATISFIED | JSONL_ROW_FIELDS frozen constant exports the 8-field schema; Phase 102 imports this rather than hardcoding |
| EXEC-06 | 101-01 | Experiment state directory at .planning/experiments/{slug}/ with experiment.md copy, results.jsonl, EXPERIMENT-BEST.json, and final REPORT.md | SATISFIED (Phase 101 boundary) | _ensureExperimentDirs creates parent dir; end-to-end test confirms EXPERIMENT-BEST.json created by Phase 100 init; experiment.md copy and results.jsonl are Phase 102's scope (documented boundary) |
| CMD-03 | 101-02 | Experiment phase type recognized in ROADMAP.md — defined by target metric, search space, iteration budget, and keep/discard threshold | SATISFIED | references/experiment-phase-type.md defines all four fields plus two-field recognition rule (Type + Target Metric) |
| OBS-03 | 101-01 | .planning/experiments/ directory created by ensure-dirs in design.cjs (or equivalent setup path) | SATISFIED | cmdEnsureExperimentDirs in experiment-schema.cjs; wired via pde-tools.cjs `experiment ensure-dirs` subcommand |
| OBS-04 | 101-01 | Experiment config template added to .planning/config.json with default budgets, thresholds, and cost estimate toggle | SATISFIED | _patchExperimentConfig adds experiment_defaults block with 5 values: iteration_budget:50, time_budget_minutes:60, consecutive_failure_limit:5, no_progress_limit:10, cost_estimate_enabled:true |

All 6 requirement IDs from phase plans are accounted for. No orphaned requirements detected for Phase 101 in REQUIREMENTS.md.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `references/experiment-phase-type.md` | 23 | `placeholder` word | Info | Intentional: describes `**Plans**: TBD` as the canonical ROADMAP placeholder for experiment phases — not a code stub |

No blockers or warnings found. The single info-level match is legitimate documentation prose.

### Human Verification Required

None. All behavior verified programmatically:
- Schema parsing tested with real file I/O in temp directories
- Directory creation tested with real filesystem calls
- Config patching tested with real JSON read/write
- End-to-end CLI test confirmed via spawnSync against pde-tools.cjs
- Phase 100 regression: 29 tests pass

### Gaps Summary

No gaps. All 10 truths verified, all artifacts are substantive and wired, all 6 requirements satisfied, 19 Phase 101 tests pass, 29 Phase 100 regression tests pass, and experiment.cjs remains at 289 lines (300-line ceiling respected).

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
