# Phase 107: Nyquist Coverage - Research

**Researched:** 2026-03-23
**Domain:** node:test structural/behavioral testing for experiment infrastructure
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — auto-generated infrastructure phase with no user discussions.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | Full Nyquist regression suite (235+ tests) runs as pipeline integrity check before any experiment commit is promoted to main | Suite currently runs 1154 tests (1154 pass, 8 pre-existing failures unrelated to experiment infrastructure); nyquist-metric.cjs implements metric extraction; structural tests must assert the promote step references this check |
| INTG-02 | Experiment commits that pass the metric but fail Nyquist regression are automatically discarded (Nyquist is a hard floor, not the optimization target) | optimize.md Step 9 currently has no Nyquist guard — this phase must add one AND write the structural test that verifies it |
| INTG-03 | Existing PDE workflows produce byte-identical output when experiment infrastructure is present but no experiment is active (zero regression) | Current suite: 1154 pass / 8 fail; the 8 failures are pre-existing wiring gaps unrelated to experiment code; zero-regression subprocess test confirms this |
| INTG-04 | Nyquist tests cover experiment infrastructure: boundary enforcement, reset behavior, metric timeout, circuit breaker triggers | Tests exist across phases 100-106 for core behaviors; this phase adds 20+ NEW assertions targeting gaps: Nyquist hard-floor path, circuit breaker priority ordering, missing boundaries file rejection, _reset wrong-branch guard |
</phase_requirements>

## Summary

Phase 107 is a pure test-coverage phase. The experiment infrastructure (phases 99-106) is complete and fully functional — the task is to write Nyquist tests that verify the safety-critical properties that prevent experiment commits from corrupting the main branch.

The codebase currently has 1154 passing tests across 483 test suites. All 8 failures are pre-existing wiring gaps (GitHub TOOL_MAP entries, Figma/Linear/Pencil bridge calls, JSON manifest fields, workflow count check from v0.11) that are entirely unrelated to the experiment system. The test framework is `node:test` with `describe`/`test`/`assert` — structural tests use `fs.readFileSync` + `content.includes()`, while behavioral tests use `fs.mkdtempSync` temp repos.

**Critical finding:** Reading `workflows/optimize.md` Step 9 (Promotion Approval) directly confirms there is NO Nyquist pre-promote check — the step goes straight to `experiment promote --slug {slug}` without running `nyquist-metric.cjs` first. INTG-01 and INTG-02 mandate this check. Phase 107 must (a) add a Nyquist guard to Step 9 of optimize.md, and then (b) write structural tests that verify the guard is present. This is the primary implementation task alongside the 20+ new test assertions.

The four INTG requirements decompose into two test file groups: (1) structural tests that grep-check `workflows/optimize.md` for Nyquist hard-floor behavior (INTG-01, INTG-02), and (2) new behavioral unit tests for boundary enforcement edge cases, reset guard, metric timeout, and circuit breaker priority (INTG-03, INTG-04).

**Primary recommendation:** (1) Amend `workflows/optimize.md` Step 9 to add a Nyquist pre-promote check. (2) Create `tests/phase-107/` with two test files: `experiment-nyquist-integrity.test.mjs` (structural — INTG-01/02) and `experiment-regression-guard.test.mjs` (behavioral — INTG-03/04). Run full suite to confirm 1154+ pass.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | Node.js built-in | Test runner (describe/test/it) | Already used across all 483 suites in this repo |
| node:assert/strict | Node.js built-in | Assertions | All existing tests use this module |
| node:fs | Node.js built-in | Read source files for structural tests | All structural tests use fs.readFileSync |
| node:path | Node.js built-in | Path resolution | All tests use `path.resolve(__dirname, '../..')` for ROOT |
| node:os + node:child_process | Node.js built-in | Temp repo creation + subprocess invocation | makeRepo() + spawnSync pattern established in phase-100/102 |

No npm installs required. All modules are native Node.js. The experiment modules under test are already present.

### File Naming Pattern
```
tests/phase-107/experiment-nyquist-integrity.test.mjs
tests/phase-107/experiment-regression-guard.test.mjs
```
Both files use `.test.mjs` suffix — discovered automatically by `node --test tests/`.

## Architecture Patterns

### Recommended Project Structure
```
tests/
└── phase-107/
    ├── experiment-nyquist-integrity.test.mjs   # INTG-01, INTG-02 — structural
    └── experiment-regression-guard.test.mjs    # INTG-03, INTG-04 — behavioral
```

### Pattern 1: Structural Test (grep-check workflow files)
**What:** Read a workflow file with `fs.readFileSync`, assert that specific strings are present in correct order.
**When to use:** INTG-01/02 — verifying optimize.md contains Nyquist guard behavior before promote.
**Key technique:** Use `content.indexOf()` to compare positions of two strings (nyquist check must appear before promote call).

From `tests/phase-104/experiment-self-preset.test.mjs`:
```
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

test('INTG-01: workflows/optimize.md references nyquist-metric before experiment promote', () => {
  const content = fs.readFileSync(path.join(ROOT, 'workflows', 'optimize.md'), 'utf-8');
  const nyquistIdx = content.indexOf('nyquist-metric');
  const promoteIdx = content.indexOf('experiment promote');
  assert.ok(nyquistIdx !== -1, 'should reference nyquist-metric check');
  assert.ok(promoteIdx !== -1, 'should reference experiment promote');
  assert.ok(nyquistIdx < promoteIdx, 'Nyquist check must appear before experiment promote');
});
```

### Pattern 2: Behavioral Test with Temp Git Repo
**What:** Create an isolated git repo in `/tmp`, call underscore helpers directly, assert behavior.
**When to use:** INTG-04 boundary enforcement, reset guard, any test requiring git state.

The `makeRepo()` helper pattern from `tests/phase-100/experiment-state-machine.test.mjs`:
- `fs.mkdtempSync(path.join(os.tmpdir(), 'pde-intg-test-'))`
- `git init`, `git config user.email/name`, `git checkout -b main`
- Create baseline commit on main
- Write minimal `references/experiment-boundaries.md` with `protected_directories: [tests/, bin/, .planning/, references/]`
- Commit boundaries file
- Always wrap test in `try { ... } finally { cleanup(dir); }`

### Pattern 3: CJS Module Import in ESM Test Files
**What:** Use `createRequire` to import CJS experiment modules.
**When to use:** All behavioral tests that call `_init`, `_reset`, `_checkBoundaries`, `_evalMetric`, `_checkCircuitBreakers`.

```
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const experiment = require('../../bin/lib/experiment.cjs');
const runner = require('../../bin/lib/experiment-runner.cjs');
const { _checkCircuitBreakers } = require('../../bin/lib/experiment-report.cjs');
```

### Pattern 4: Subprocess Test for Zero-Regression (INTG-03)
**What:** Run `node bin/nyquist-metric.cjs` as a child process and assert pass count meets floor.
**When to use:** INTG-03 — confirming no regressions from experiment infrastructure being present.

Use `spawnSync` from `node:child_process`:
- `spawnSync('node', ['bin/nyquist-metric.cjs'], { cwd: ROOT, encoding: 'utf-8', timeout: 60000 })`
- Assert `status === 0`
- Parse last line of stdout as integer
- Assert `passCount >= 235` (original v0.12 baseline)

### Anti-Patterns to Avoid
- **Testing cmd* wrappers directly:** They call `output()`/`error()` which invoke `process.exit()`. Always test `_*` underscore helpers instead.
- **Asserting exact pass counts:** Assert `passCount >= 235` not `passCount === 1154` — the count grows as tests are added.
- **Using real project root as cwd for git tests:** Always use isolated tmpdir to avoid polluting the real repo's git state.
- **Testing optimize.md for Nyquist check before adding it:** The check does not yet exist in Step 9. The workflow amendment is a prerequisite to the structural test passing — implement in correct order.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git state management in tests | Custom git abstraction | `spawnSync`/`execSync` + `fs.mkdtempSync` (makeRepo pattern from phase-100) | Pattern already established and proven across 10+ test files |
| Nyquist pass count extraction | New parser | Read `bin/nyquist-metric.cjs` source — pattern is `/^# pass (\d+)/m` | Already implemented; just call the script as a subprocess |
| CJS module loading in ESM | Dynamic import | `createRequire(import.meta.url)` | All 21 existing experiment test files use this exact approach |
| Temp dir cleanup | OS-level cleanup scripts | `fs.rmSync(dir, { recursive: true, force: true })` in try/catch | Established best-effort cleanup pattern |

## Common Pitfalls

### Pitfall 1: CRITICAL — optimize.md Has No Nyquist Pre-Promote Check
**What goes wrong:** `workflows/optimize.md` Step 9 currently goes straight to `node bin/pde-tools.cjs experiment promote --slug {slug}` with no Nyquist regression check. If the structural test is written first, it will fail until the workflow is amended.
**Why it happens:** Nyquist pre-promote check was not implemented in prior phases (phases 100-106 built the mechanism, but the orchestrator never calls it before promotion).
**How to avoid:** The plan MUST sequence: Task 1 = amend optimize.md Step 9 to add Nyquist guard. Task 2 = write structural tests that verify the guard is present. Both tasks are needed for INTG-01/02.
**Warning signs:** If a structural test passes on the current optimize.md (before any amendments) it is a false positive — check what keyword it is matching.

### Pitfall 2: Asserting Exact Nyquist Pass Count
**What goes wrong:** A test asserts `passCount === 1154` — the number will change after Phase 107 adds new tests, causing instant failure.
**Why it happens:** Writing a snapshot test instead of a floor test.
**How to avoid:** Always assert `passCount >= 235` (original v0.12 baseline). This matches the success criteria language ("235+ Nyquist suite passes").

### Pitfall 3: Temp Repos Not Cleaned Up on Test Failure
**What goes wrong:** When a behavioral test throws before cleanup, temp repos accumulate in `/tmp`.
**Why it happens:** Missing `try { ... } finally { cleanup(dir); }` wrapper.
**How to avoid:** Every test that calls `makeRepo()` must use try/finally for cleanup — same pattern as all phase-100/102 tests.

### Pitfall 4: Re-testing Already-Covered Behavior
**What goes wrong:** Phase 107 adds tests that duplicate phase-100/103 coverage, resulting in fewer than 20 genuinely new assertions.
**Why it happens:** The path of least resistance is to copy existing tests with minor variations.
**How to avoid:** The genuine gaps are: (a) Nyquist hard-floor in promote path — ZERO tests exist for this, (b) `_checkBoundaries` missing boundaries file case — not in phase-100 tests, (c) circuit breaker priority ordering — not tested in phase-103, (d) INTG-03 subprocess zero-regression test — completely new. Target these gaps first.

### Pitfall 5: mkdtempSync boundaries file must match test assertions
**What goes wrong:** `makeRepo()` creates a minimal boundaries file; if the test calls `_checkBoundaries(dir, ['tests/some.test.mjs'])` but the minimal boundaries file doesn't include `tests/` in `protected_directories`, the test will fail unexpectedly.
**Why it happens:** The MINIMAL_BOUNDARIES constant in the test file must include the directories being tested.
**How to avoid:** Use the same protected_directories list as in `references/experiment-boundaries.md`: `tests/`, `bin/`, `.planning/`, `references/`. Match what the production file defines.

## What Nyquist Hard-Floor Logic in optimize.md Needs to Look Like

INTG-01 and INTG-02 require that Step 9 of optimize.md includes a Nyquist check before `experiment promote`. The check must:

1. Run `node bin/nyquist-metric.cjs` and capture the pass count
2. Compare against `baselinePassCount` (captured at Step 6 as the baseline metric, since the self-preset uses nyquist_pass_count as its metric)
3. If pass count < baselinePassCount: display a message that the experiment fails the Nyquist hard floor, run `experiment cleanup --slug {slug}` instead of promote, and abort
4. Only if pass count >= baselinePassCount: proceed with the existing promote logic

The structural test then checks:
- `workflows/optimize.md` contains `nyquist-metric` reference
- The nyquist-metric reference appears BEFORE the `experiment promote` reference
- The workflow describes discarding on Nyquist regression (not just failing silently)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No experiment tests | 21 test files across phases 100-106 | v0.13 | Full coverage of git state machine, runner, report, events |
| Nyquist as binary pass/fail | Nyquist as metric floor (pass count IS the metric) | Phase 104 | Partial-regression detection; nyquist-metric.cjs always exits 0 |
| No promote guard | Nyquist hard-floor before promote (to be added in Phase 107) | Phase 107 | Prevents metric-passing but Nyquist-failing experiments from reaching main |

## Open Questions

1. **Exact wording for optimize.md Nyquist guard**
   - What we know: Step 9 needs a Nyquist check before promote; the baseline pass count is available from Step 6 when the self-preset is used (metric IS nyquist_pass_count); for arbitrary experiments the baseline may not be a Nyquist count
   - What's unclear: Should the guard run Nyquist unconditionally for ALL experiments, or only when `verify: node bin/nyquist-metric.cjs`?
   - Recommendation: Run unconditionally for all experiments — this is the "hard floor" design in INTG-01. Read the baseline from `nyquist-metric.cjs` at Step 6 regardless of which metric the experiment uses, compare at Step 9. If the Nyquist pass count has dropped below its own baseline (not the experiment metric baseline), discard.

2. **20+ assertion distribution**
   - What we know: Two test files; success criteria requires 20+ new assertions
   - Recommended distribution: `experiment-nyquist-integrity.test.mjs` (INTG-01/02) — ~8 structural assertions; `experiment-regression-guard.test.mjs` (INTG-03/04) — ~14 behavioral assertions including subprocess zero-regression test, boundary edge cases, reset guard, circuit breaker ordering
   - Total: ~22 new assertions across the two files

3. **Pre-existing 8 failures**
   - What we know: All 8 failing tests are in unrelated areas (TOOL_MAP GitHub entries, Figma/Linear/Pencil bridge calls, JSON manifest fields, v0.11 workflow count)
   - Phase 107 risk: Zero — experiment infrastructure does not touch TOOL_MAP, bridge.call, JSON manifests, or workflow count. These failures will remain as-is after Phase 107.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 22+) |
| Config file | none — `node --test tests/` discovers all `.test.mjs` files automatically |
| Quick run command | `node --test tests/phase-107/` |
| Full suite command | `node --test tests/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | Nyquist regression suite runs before experiment promote | structural | `node --test tests/phase-107/experiment-nyquist-integrity.test.mjs` | Wave 0 |
| INTG-02 | Experiment commit failing Nyquist is automatically discarded | structural | `node --test tests/phase-107/experiment-nyquist-integrity.test.mjs` | Wave 0 |
| INTG-03 | Zero regression — experiment infra present but no active experiment | subprocess unit | `node --test tests/phase-107/experiment-regression-guard.test.mjs` | Wave 0 |
| INTG-04 | Tests cover boundary enforcement, reset behavior, metric timeout, circuit breakers | behavioral unit | `node --test tests/phase-107/experiment-regression-guard.test.mjs` | Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-107/`
- **Per wave merge:** `node --test tests/`
- **Phase gate:** Full suite green (1154+ pass, no new failures) before `/pde:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-107/experiment-nyquist-integrity.test.mjs` — covers INTG-01, INTG-02
- [ ] `tests/phase-107/experiment-regression-guard.test.mjs` — covers INTG-03, INTG-04
- [ ] `workflows/optimize.md` amendment — add Nyquist pre-promote guard to Step 9 (prerequisite for INTG-01/02 structural tests to pass)

*(No framework install needed — node:test is built-in)*

## Sources

### Primary (HIGH confidence)
- Direct inspection: `bin/lib/experiment.cjs` (289 lines) — complete
- Direct inspection: `bin/lib/experiment-runner.cjs` (197 lines) — complete
- Direct inspection: `bin/lib/experiment-report.cjs` (279 lines) — complete
- Direct inspection: `bin/lib/experiment-schema.cjs` (190 lines) — complete
- Direct inspection: `workflows/optimize.md` — confirmed Step 9 has no Nyquist guard
- Direct inspection: `bin/nyquist-metric.cjs` — confirmed exit-0 contract and `# pass` regex
- Live test run: `node --test tests/` — 1162 total tests, 1154 pass, 8 fail (confirmed current baseline)
- All 21 test files in `tests/phase-100/` through `tests/phase-106/` — patterns verified
- `references/experiment-boundaries.md` — complete protected_files and protected_directories lists

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions log — all architectural decisions for phases 99-106
- `.planning/REQUIREMENTS.md` — INTG-01 through INTG-04 requirement definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node:test is the established framework with 483 existing suites; no new dependencies needed
- Architecture: HIGH — makeRepo/structural patterns are directly observable in 21 existing test files in this repo
- Pitfalls: HIGH — Pitfall 1 (missing Nyquist pre-promote check) is verified by direct inspection of optimize.md Step 9; other pitfalls are observable from the existing test patterns

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable test infrastructure)
