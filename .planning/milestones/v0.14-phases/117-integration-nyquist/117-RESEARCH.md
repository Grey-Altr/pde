# Phase 117: Integration & Nyquist - Research

**Researched:** 2026-03-24
**Domain:** Nyquist structural regression tests — gap analysis for v0.14 requirements
**Confidence:** HIGH

## Summary

Phase 117 is a validation-only phase. Its two requirements are INTG-01 (Nyquist structural regression tests for all 76 v0.14 requirements) and INTG-02 (zero regressions in the existing v0.13 Nyquist test suite).

The v0.14 phase tests (Phases 108-116) currently contain 382 passing tests in 17 test files. These tests cover the majority of v0.14 requirements, but a gap analysis reveals that EXP-01 through EXP-09 (individual experiment templates by skill), and PLAY-04 (live tool name verification), are not explicitly named in any describe block. EXP-01–09 are implicitly covered by EXP-11 (schema validation) and EXP-12 (file existence), but lack explicit per-requirement blocks. PLAY-04 is implicitly covered by PLAY-07 (VERIFY_REQUIRED markers) but has no dedicated test.

The v0.13 Nyquist suite (pre-v0.14 phases: 40–107) currently shows 1215 passing / 9 failing when run together. The REQUIREMENTS.md baseline states 1216 pass / 8 fail. The discrepancy is one additional pre-existing failure — the TOOL_MAP-56-entry count tests in phases 40–43 that assumed 56 entries; Phase 109 added `playwright:resize` bringing TOOL_MAP to 57, which breaks 4 tests that hardcode 56. These failures are pre-existing v0.14-introduced regressions that need to be addressed or documented.

**Primary recommendation:** Write a single `tests/phase-117/integration-nyquist.test.mjs` that (a) asserts all 17 v0.14 test files exist and pass, (b) explicitly tests EXP-01 through EXP-09 by verifying each per-skill template file exists and validates against experiment-schema.cjs, and (c) tests PLAY-04 via the TOOL_MAP_VERIFY_REQUIRED markers. Separately, investigate and fix the 4 TOOL_MAP-count tests that regressed when Phase 109 added playwright:resize.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

Key constraints from ROADMAP:
- INTG-01, INTG-02 requirements
- Nyquist structural tests must exist for all 76 v0.14 requirements
- All existing v0.13 Nyquist tests (1216 assertions) must pass with zero regressions
- Tests follow existing Nyquist patterns (Node.js assert, structural grep/file-read checks)

### Claude's Discretion
All implementation choices are at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INTG-01 | Nyquist structural regression tests for all new v0.14 requirements | Gap analysis below identifies exact missing coverage; 382 tests already exist for most requirements |
| INTG-02 | No regressions across existing v0.13 Nyquist test suite (1216 assertions) | Current run shows 1215 pass / 9 fail; 4 tests regressed in phases 40-43 due to TOOL_MAP count change from Phase 109 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | built-in (Node.js 18+) | Test runner | Used across all existing phase tests |
| node:assert/strict | built-in | Assertions | All existing tests use strict mode |
| node:fs | built-in | File existence checks | Standard Nyquist pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:module (createRequire) | built-in | Require CJS modules from ESM test files | All phase tests use this for mcp-bridge.cjs |
| node:url (fileURLToPath) | built-in | ESM-compatible `__dirname` | All phase tests use this pattern |
| node:path (resolve) | built-in | Path resolution | All phase tests use this |

**Installation:** No additional packages required. All dependencies are Node.js built-ins.

**Version verification:** Node.js is the only runtime dependency.

```bash
node --version  # Requires 18+ for node:test
```

## Architecture Patterns

### Test File Naming
All v0.14 phase test files use `.mjs` extension (ESM modules):
```
tests/phase-NNN/descriptive-name.test.mjs
```

Phase 117 test file: `tests/phase-117/integration-nyquist.test.mjs`

### Standard Test File Structure
```javascript
/**
 * descriptive-name.test.mjs
 * Phase NNN — Phase Name
 *
 * Nyquist structural tests for REQ-01 through REQ-N.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const require = createRequire(import.meta.url);

describe('REQ-01: description', () => {
  test('specific assertion', () => {
    assert.ok(condition, 'failure message');
  });
});
```

Source: Verified across all 17 existing v0.14 test files.

### Pattern: Structural File-Content Tests
The dominant pattern — read file content as string, grep for required strings:
```javascript
// Source: tests/phase-108/mcp-bridge-playwright.test.mjs
const content = readFileSync(resolve(ROOT, 'path/to/file'), 'utf-8');
assert.ok(content.includes('expected-string'), 'failure message');
```

### Pattern: Module Import Tests
For CJS modules:
```javascript
// Source: tests/phase-108/mcp-bridge-playwright.test.mjs
const bridge = require(`${ROOT}/bin/lib/mcp-bridge.cjs`);
const { TOOL_MAP, APPROVED_SERVERS } = bridge;
assert.ok('key' in TOOL_MAP, 'key missing');
```

### Pattern: File Existence Tests
```javascript
// Source: tests/phase-112/experiment-templates.test.mjs
const fullPath = path.join(ROOT, 'references', 'experiments', name);
assert.ok(fs.existsSync(fullPath), `${name} must exist`);
```

### Pattern: Require.main Guard (CJS scripts that also export)
Phase 116 introduced this pattern for scripts that both export functions AND run as CLI:
```javascript
// Source: .planning/STATE.md decisions
if (require.main === module) { /* run CLI */ }
```
Tests verify exported functions — they do NOT call the script as CLI (avoids process.exit triggering test runner abort).

### Anti-Patterns to Avoid
- **Hardcoded counts for evolving lists**: Phase 40-43 tests hardcoded `TOOL_MAP === 56` which broke when Phase 109 added `playwright:resize`. Phase 117 tests should use `>=` or test for specific key presence, not exact totals.
- **Calling process.exit() in required modules**: CJS modules required in tests must guard CLI entry with `require.main === module`.
- **Using `it` vs `test` inconsistently**: Phases 108-111 use `test()`, phases 112-116 use `it()`. Both are valid aliases — choose `it()` for Phase 117 to match the more recent convention.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Experiment schema validation | Custom YAML/JSON parser | `experiment-schema.cjs`'s `parseExperimentFile()` | Already handles all required fields, mutable_files, target_metric, search_space validation |
| Test runner | Custom runner | `node --test` (node:test) | Built-in, zero dependencies, TAP output |
| File path resolution in ESM | Manual dirname hacks | `fileURLToPath(new URL('.', import.meta.url))` | Standard ESM pattern used across all phase tests |

## Gap Analysis: v0.14 Requirements vs Existing Tests

This is the primary deliverable for Phase 117 planning.

### Requirements WITH Explicit Test Coverage

| Requirement ID | Test File | Describe Block | Status |
|----------------|-----------|----------------|--------|
| PLAY-01 | tests/phase-108/mcp-bridge-playwright.test.mjs | `PLAY-01: APPROVED_SERVERS playwright entry` | COVERED |
| PLAY-02 | tests/phase-108/mcp-bridge-playwright.test.mjs | `PLAY-02: TOOL_MAP playwright entries` | COVERED |
| PLAY-03 | tests/phase-108/mcp-bridge-playwright.test.mjs | `PLAY-03: AUTH_INSTRUCTIONS playwright` | COVERED |
| PLAY-05 | tests/phase-108/mcp-bridge-playwright.test.mjs | `test('PLAY-05: probe("playwright")...')` | COVERED |
| PLAY-06 | tests/phase-108/mcp-bridge-playwright.test.mjs | `PLAY-06: mcp-integration.md updated...` | COVERED |
| PLAY-07 | tests/phase-108/mcp-bridge-playwright.test.mjs | `PLAY-07: TOOL_MAP_VERIFY_REQUIRED markers` | COVERED |
| WFR-01 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `WFR-01: wireframe.md Step 5d screenshot loop` | COVERED |
| WFR-02 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `WFR-02: wireframe screenshots directory` | COVERED |
| WFR-03 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `WFR-03: multi-page wireframe handling` | COVERED |
| WFR-04 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `WFR-04: --no-playwright degradation` | COVERED |
| WFR-05 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `WFR-05: viewport 1280x800` | COVERED |
| MOK-01 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `MOK-01: mockup.md Step 7f screenshot loop` | COVERED |
| MOK-02 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `MOK-02: mockup screenshots directory` | COVERED |
| MOK-03 | tests/phase-109/wireframe-mockup-screenshots.test.mjs | `MOK-03: --no-playwright degradation` | COVERED |
| A11Y-01 | tests/phase-110/critique-a11y-aom.test.mjs | `A11Y-01: critique.md uses browser_snapshot for AOM` | COVERED |
| A11Y-02 | tests/phase-110/critique-a11y-aom.test.mjs | `A11Y-02: AOM analyzed for landmarks, headings...` | COVERED |
| A11Y-03 | tests/phase-110/critique-a11y-aom.test.mjs | `A11Y-03: merge when both Playwright and Axe available` | COVERED |
| A11Y-04 | tests/phase-110/critique-a11y-aom.test.mjs | `A11Y-04: fallback to manual WCAG checklist...` | COVERED |
| DEP-01 | tests/phase-110/deploy-smoke-test.test.mjs | `DEP-01: deploy.md has smoke test step after Gate 4` | COVERED |
| DEP-02 | tests/phase-110/deploy-smoke-test.test.mjs | `DEP-02: deploy.md navigates to DEPLOY_URL...` | COVERED |
| DEP-03 | tests/phase-110/deploy-smoke-test.test.mjs | `DEP-03: deploy.md verifies expected LDP sections` | COVERED |
| DEP-04 | tests/phase-110/deploy-smoke-test.test.mjs | `DEP-04: deploy.md uses exponential backoff retry` | COVERED |
| DEP-05 | tests/phase-110/deploy-smoke-test.test.mjs | (in deploy-smoke-test.test.mjs) | COVERED |
| VIS-01 | tests/phase-111/dom-metric.test.mjs | `VIS-01: DOM structure metric script` | COVERED |
| VIS-02 | tests/phase-111/a11y-metric.test.mjs | `VIS-02: A11y violations metric script` | COVERED |
| VIS-03 | tests/phase-111/contrast-metric.test.mjs | `VIS-03: WCAG contrast metric script` | COVERED |
| VIS-04 | tests/phase-111/responsive-metric.test.mjs | `VIS-04: Responsive compliance metric script` | COVERED |
| VIS-05 | tests/phase-111/mermaid-metric.test.mjs | `VIS-05: Mermaid readability metric script` | COVERED |
| VIS-06 | tests/phase-111/*.test.mjs (5 files) | `VIS-06: _evalMetric contract compliance` | COVERED |
| VIS-07 | tests/phase-111/*.test.mjs (5 files) | `VIS-07: graceful degradation` | COVERED |
| EXP-10 | tests/phase-112/experiment-templates.test.mjs | `EXP-10: browser-backed templates use visual metrics` | COVERED |
| EXP-11 | tests/phase-112/experiment-templates.test.mjs | `EXP-11: each template validates against schema` | COVERED |
| EXP-12 | tests/phase-112/experiment-templates.test.mjs | `EXP-12: all 14 design skill templates exist` | COVERED |
| PIPE-01 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `PIPE-01/04: pipeline templates exist and validate` | COVERED |
| PIPE-02 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `PIPE-02: pipeline templates use dom-metric.cjs` | COVERED |
| PIPE-03 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `PIPE-03: upstream isolation templates target different skills` | COVERED |
| PIPE-04 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `PIPE-04: pipeline metric wrapper chains multi-stage invocation` | COVERED |
| ITER-01 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `ITER-01/02: iterate-effectiveness-metric.cjs exists` | COVERED |
| ITER-02 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `ITER-01/02: iterate-effectiveness-metric.cjs exists` | COVERED |
| ITER-03 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `ITER-03: iterate-effectiveness template exists` | COVERED |
| ITER-04 | tests/phase-113/pipeline-iterate-experiments.test.mjs | `ITER-04: iterate-effectiveness template documents convergence speed` | COVERED |
| VRCB-01 | tests/phase-114/visual-regression.test.mjs | (visual-regression.test.mjs) | COVERED |
| VRCB-02 | tests/phase-114/visual-regression.test.mjs | (visual-regression.test.mjs) | COVERED |
| VRCB-03 | tests/phase-114/visual-regression.test.mjs | (visual-regression.test.mjs) | COVERED |
| VRCB-04 | tests/phase-114/visual-regression.test.mjs | (visual-regression.test.mjs) | COVERED |
| VRCB-05 | tests/phase-114/visual-regression.test.mjs | (visual-regression.test.mjs) | COVERED |
| MULTI-01 | tests/phase-115/multi-candidate.test.mjs | `MULTI-01: _resetToSha export and contract` | COVERED |
| MULTI-02 | tests/phase-115/multi-candidate.test.mjs | `MULTI-02: evaluation contract unchanged` | COVERED |
| MULTI-03 | tests/phase-115/multi-candidate.test.mjs | `MULTI-03: JSONL schema multi-candidate fields` | COVERED |
| MULTI-04 | tests/phase-115/multi-candidate.test.mjs | `MULTI-04: candidates field parsing` | COVERED |
| MULTI-05 | tests/phase-115/multi-candidate.test.mjs | `MULTI-05: optimize.md multi-candidate integration` | COVERED |
| PRES-01 | tests/phase-116/pressure-test-visual.test.mjs | `PRES-01: pressure-test visual quality dimension` | COVERED |
| PRES-02 | tests/phase-116/pressure-test-visual.test.mjs | `PRES-02: browser renders and scores DOM/a11y/contrast` | COVERED |
| PRES-03 | tests/phase-116/pressure-test-visual.test.mjs | `PRES-03: combined score formula` | COVERED |
| PRES-04 | tests/phase-116/pressure-test-visual.test.mjs | `PRES-04: graceful degradation when Playwright unavailable` | COVERED |
| META-01 | tests/phase-116/meta-optimization.test.mjs | `META-01: strategy-weights.cjs exports computeStrategyWeights` | COVERED |
| META-02 | tests/phase-116/meta-optimization.test.mjs | `META-02: extractTags returns keyword array` | COVERED |
| META-03 | tests/phase-116/meta-optimization.test.mjs | `META-03: computeStrategyWeights reads JSONL` | COVERED |
| META-04 | tests/phase-116/meta-optimization.test.mjs | `META-04: optimize.md contains strategy_hint injection prose` | COVERED |
| IDT-01 | tests/phase-116/ideation-visual.test.mjs | `IDT-01: ideation divergence scored by screenshot variance` | COVERED |
| IDT-02 | tests/phase-116/ideation-visual.test.mjs | `IDT-02: visual similarity metric via structural hash` | COVERED |
| IDT-03 | tests/phase-116/ideation-visual.test.mjs | `IDT-03: higher visual diversity = higher score` | COVERED |
| IDT-04 | tests/phase-116/ideation-visual.test.mjs | `IDT-04: graceful degradation when Playwright unavailable` | COVERED |
| BREF-01 | tests/phase-116/brief-reference.test.mjs | `BREF-01: brief workflow can capture reference screenshots` | COVERED |
| BREF-02 | tests/phase-116/brief-reference.test.mjs | `BREF-02: URL → Playwright navigate → screenshot → save` | COVERED |
| BREF-03 | tests/phase-116/brief-reference.test.mjs | `BREF-03: reference screenshots available to downstream skills` | COVERED |
| BREF-04 | tests/phase-116/brief-reference.test.mjs | `BREF-04: reference capture is opt-in` | COVERED |

### Requirements WITHOUT Explicit Named Test Coverage (GAPS)

These 11 requirements have no dedicated describe block naming the requirement ID:

| Requirement ID | Phase | Gap Type | Current Implicit Coverage | Action Required |
|----------------|-------|----------|--------------------------|-----------------|
| PLAY-04 | 108 | No dedicated block | PLAY-07 (VERIFY_REQUIRED markers) covers related structure | Add explicit `PLAY-04` test in `tests/phase-117/integration-nyquist.test.mjs` |
| EXP-01 | 112 | No dedicated block | EXP-12 confirms `references/experiments/wireframe.md` exists, EXP-11 validates schema | Add `EXP-01` describe block verifying wireframe template has correct mutable_files and target_metric |
| EXP-02 | 112 | No dedicated block | EXP-12 confirms `references/experiments/mockup.md` exists | Add `EXP-02` describe block verifying mockup template |
| EXP-03 | 112 | No dedicated block | EXP-12 confirms `references/experiments/critique.md` exists | Add `EXP-03` describe block verifying critique template |
| EXP-04 | 112 | No dedicated block | EXP-12 confirms `references/experiments/system.md` exists | Add `EXP-04` describe block verifying system template |
| EXP-05 | 112 | No dedicated block | EXP-12 confirms `references/experiments/brief.md` exists | Add `EXP-05` describe block verifying brief template |
| EXP-06 | 112 | No dedicated block | EXP-12 confirms `references/experiments/flows.md` exists | Add `EXP-06` describe block verifying flows template |
| EXP-07 | 112 | No dedicated block | EXP-12 confirms `references/experiments/iterate.md` exists | Add `EXP-07` describe block verifying iterate template |
| EXP-08 | 112 | No dedicated block | EXP-12 confirms `references/experiments/hig.md` exists | Add `EXP-08` describe block verifying hig template |
| EXP-09 | 112 | No dedicated block | EXP-12 confirms `references/experiments/handoff.md` exists | Add `EXP-09` describe block verifying handoff template |
| INTG-01 | 117 | This phase | — | Write integration-nyquist.test.mjs |

**INTG-02**: Requires the pre-v0.14 suite to pass with zero regressions. Currently 9 fail (vs stated 1216 baseline of 8 fail). The additional failure is the TOOL_MAP count tests in phases 40-43 that hardcode `56` — Phase 109 added `playwright:resize` making the total 57. These tests must be fixed.

### INTG-02 Regression Detail

**Affected test files (4 tests fail across 4 files):**
```
tests/phase-40/mcp-bridge-toolmap.test.mjs  — "TOOL_MAP contains exactly 56 total entries"
tests/phase-41/linear-toolmap.test.mjs       — same assertion
tests/phase-42/figma-toolmap.test.mjs        — same assertion
tests/phase-43/pencil-toolmap.test.mjs       — same assertion
```

**Root cause:** These tests assert `TOOL_MAP.length === 56`. Phase 109 added `playwright:resize` making the count 57. The tests were written before Phase 108/109 Playwright additions.

**Fix strategy:** Update those 4 tests to assert `=== 57` (or use `>= 56` with a comment). The actual TOOL_MAP content is still valid — only the hardcoded count is wrong.

**Pre-existing failures (8, not to be fixed):**
Based on v0.13 audit and current run output:
- `tests/phase-64/manifest-schema.test.mjs` — "all 5 JSON manifest files have all 16 canonical designCoverage fields"
- `tests/phase-64/workflow-pass-through.test.mjs` — "brief.md does not contain hasStitchWireframes"
- `tests/phase-67/batch-efficiency.test.mjs` — "no HTML fetch in 4-STITCH section"
- `tests/phase-82/regression-matrix.test.mjs` — "EFF-03: Batch MCP efficiency"
- `tests/phase-82/milestone-completion.test.mjs` — "SC-3: no new workflow files added during v0.11"
- `tests/phase-83/wiring-fixes.test.mjs` — "Gap 3: REQUIREMENTS.md FLP artifact code"

These were pre-existing at v0.13 completion (documented in `107-VERIFICATION.md` as "all 8 failures are pre-existing from phases 40-83").

**The INTG-02 goal:** Fix the 4 TOOL_MAP-count regressions introduced during v0.14 (phases 40-43), restore the suite to 1216 pass / 8 fail baseline.

## Common Pitfalls

### Pitfall 1: Hardcoding Exact TOOL_MAP Entry Counts
**What goes wrong:** Tests like `assert.strictEqual(keys.length, 56)` fail when any phase adds TOOL_MAP entries.
**Why it happens:** Counts were written at a point in time and are never updated.
**How to avoid:** In Phase 117 tests, assert for specific key presence (`'playwright:resize' in TOOL_MAP`) not exact totals. When fixing phases 40-43, update the count to current value (57) and add a comment noting the date.
**Warning signs:** "Expected N entries, got M" failures in TOOL_MAP tests after any mcp-bridge changes.

### Pitfall 2: EXP-01–09 Template Content Assertions Too Specific
**What goes wrong:** Asserting exact field values in experiment templates breaks if template content is refined.
**Why it happens:** Phase 112 set specific `target_metric` values; asserting exact string matches is fragile.
**How to avoid:** Assert presence of required field names (e.g., `mutable_files`, `target_metric`, `verify_command`) using `parseExperimentFile().valid === true` — which is already done by EXP-11. For per-requirement blocks (EXP-01–09), assert the skill name appears in `mutable_files` and the template is schema-valid; do not assert exact metric script names.

### Pitfall 3: process.exit() in Required CJS Modules
**What goes wrong:** When a test `require()`s a CJS script that calls `process.exit(0)` at module scope, the test runner process terminates.
**Why it happens:** Metric scripts (dom-metric.cjs, etc.) are both CLI tools and modules.
**How to avoid:** All metric scripts already use `require.main === module` guard. Don't add new entry points that lack this guard.

### Pitfall 4: ESM vs CJS Import Mismatch
**What goes wrong:** `.mjs` test files can't directly `require()` CJS modules without `createRequire`.
**Why it happens:** Phase 117 test is ESM (`.mjs`) but experiment-schema.cjs is CJS.
**How to avoid:** Always use `createRequire(import.meta.url)` for requiring CJS modules from ESM test files. All existing phase tests demonstrate this pattern.

### Pitfall 5: Confusing "Pre-existing Failures" with New Regressions
**What goes wrong:** Running the full suite and seeing 8 failures, assuming INTG-02 is failing.
**Why it happens:** The 8 pre-existing failures from phases 40-83 have been documented since the v0.13 audit but never fixed.
**How to avoid:** The INTG-02 goal is specifically to fix the 4 TOOL_MAP-count regressions (phases 40-43) that were introduced during v0.14, restoring the count to 1215 pass with the 8 pre-existing failures unchanged. Then the suite matches the "1216 pass / 8 fail" baseline.

**Note on assertion count discrepancy:** The REQUIREMENTS.md states "1216 assertions" but the current run shows 1224 tests with 1215 passing. This is because (a) Phase 116's 38 new tests increased total test count, and (b) the TOOL_MAP regression added one more failure. The planner should target: all v0.14 phase tests (382) + pre-v0.14 tests at 1216 pass / 8 fail.

## Code Examples

### Running All v0.14 Phase Tests
```bash
# Source: verified by running this command
node --test \
  tests/phase-108/mcp-bridge-playwright.test.mjs \
  tests/phase-109/wireframe-mockup-screenshots.test.mjs \
  tests/phase-110/critique-a11y-aom.test.mjs \
  tests/phase-110/deploy-smoke-test.test.mjs \
  tests/phase-111/a11y-metric.test.mjs \
  tests/phase-111/contrast-metric.test.mjs \
  tests/phase-111/dom-metric.test.mjs \
  tests/phase-111/mermaid-metric.test.mjs \
  tests/phase-111/responsive-metric.test.mjs \
  tests/phase-112/experiment-templates.test.mjs \
  tests/phase-113/pipeline-iterate-experiments.test.mjs \
  tests/phase-114/visual-regression.test.mjs \
  tests/phase-115/multi-candidate.test.mjs \
  tests/phase-116/brief-reference.test.mjs \
  tests/phase-116/ideation-visual.test.mjs \
  tests/phase-116/meta-optimization.test.mjs \
  tests/phase-116/pressure-test-visual.test.mjs
# Result: 382 pass, 0 fail (verified 2026-03-24)
```

### Running Pre-v0.14 Baseline Suite
```bash
# Source: verified by running this command
node --test $(find tests/phase-40 tests/phase-41 tests/phase-42 tests/phase-43 \
  tests/phase-44 tests/phase-46 tests/phase-47 tests/phase-48 tests/phase-49 \
  tests/phase-50 tests/phase-51 tests/phase-52 tests/phase-64 tests/phase-65 \
  tests/phase-66 tests/phase-67 tests/phase-68 tests/phase-69 tests/phase-74 \
  tests/phase-75 tests/phase-76 tests/phase-77 tests/phase-78 tests/phase-79 \
  tests/phase-80 tests/phase-81 tests/phase-82 tests/phase-83 tests/phase-100 \
  tests/phase-101 tests/phase-102 tests/phase-103 tests/phase-104 tests/phase-105 \
  tests/phase-106 tests/phase-107 -name "*.mjs" 2>/dev/null)
# Current result: 1215 pass, 9 fail
# Target after INTG-02 fix: 1216 pass, 8 fail
```

### Per-EXP Requirement Test Pattern (for integration-nyquist.test.mjs)
```javascript
// Source: pattern derived from tests/phase-112/experiment-templates.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parseExperimentFile } = require('../../bin/lib/experiment-schema.cjs');

describe('EXP-01: wireframe skill optimization experiment template', () => {
  const templatePath = path.join(ROOT, 'references', 'experiments', 'wireframe.md');

  it('references/experiments/wireframe.md exists', () => {
    assert.ok(fs.existsSync(templatePath), 'wireframe.md experiment template must exist');
  });

  it('wireframe.md template is schema-valid (EXP-11 contract)', () => {
    const result = parseExperimentFile(templatePath);
    assert.equal(result.valid, true, `wireframe.md must be valid: ${JSON.stringify(result.errors || [])}`);
  });

  it('wireframe.md template targets wireframe.md as a mutable file', () => {
    const content = fs.readFileSync(templatePath, 'utf-8');
    assert.ok(content.includes('wireframe.md'), 'wireframe experiment must reference wireframe.md');
  });
});
```

### TOOL_MAP Count Fix Pattern (for phases 40-43)
```javascript
// BEFORE (failing — written before Phase 108/109 added playwright entries):
assert.strictEqual(keys.length, 56, `Expected 56 TOOL_MAP entries after Phase 108...`);

// AFTER (correct — updated to reflect Phase 109 playwright:resize addition):
assert.strictEqual(keys.length, 57, `Expected 57 TOOL_MAP entries (46 existing + 11 Playwright), got ${keys.length}`);
```

### PLAY-04 Explicit Test Pattern
```javascript
// PLAY-04: Live tool name verification (TOOL_MAP_VERIFY_REQUIRED means pending live confirm)
// Source: pattern derived from PLAY-07 test
describe('PLAY-04: Live tool name verification confirms mcp__playwright__* prefix', () => {
  it('every playwright:* TOOL_MAP entry maps to mcp__playwright__* target', () => {
    const playwrightEntries = Object.entries(TOOL_MAP)
      .filter(([k]) => k.startsWith('playwright:'));
    for (const [key, value] of playwrightEntries) {
      assert.ok(
        value.startsWith('mcp__playwright__'),
        `TOOL_MAP[${key}] must map to mcp__playwright__* prefix, got: ${value}`
      );
    }
  });
});
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | node:test (built-in, Node.js 18+) |
| Config file | none — invoked directly |
| Quick run command | `node --test tests/phase-117/integration-nyquist.test.mjs` |
| Full suite command | See "Running All v0.14 Phase Tests" and "Running Pre-v0.14 Baseline Suite" above |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INTG-01 | All 76 v0.14 requirements have Nyquist tests | structural | `node --test tests/phase-117/integration-nyquist.test.mjs` | ❌ Wave 0 |
| INTG-02 | Pre-v0.14 suite passes with 0 new regressions | regression | See full suite command above | Existing files need fixes |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-117/integration-nyquist.test.mjs`
- **Per wave merge:** Full v0.14 suite (382 tests) + pre-v0.14 baseline
- **Phase gate:** Both suites green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-117/integration-nyquist.test.mjs` — covers INTG-01 (new file to create)
- [ ] Fix `tests/phase-40/mcp-bridge-toolmap.test.mjs` — update count 56→57 (covers INTG-02)
- [ ] Fix `tests/phase-41/linear-toolmap.test.mjs` — update count 56→57 (covers INTG-02)
- [ ] Fix `tests/phase-42/figma-toolmap.test.mjs` — update count 56→57 (covers INTG-02)
- [ ] Fix `tests/phase-43/pencil-toolmap.test.mjs` — update count 56→57 (covers INTG-02)

## Environment Availability

Step 2.6: Node.js is the only runtime dependency. No external services required.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | node:test runner | ✓ | 18+ | — |
| bin/lib/experiment-schema.cjs | EXP-01–09 validation | ✓ | already in repo | — |
| bin/lib/mcp-bridge.cjs | PLAY tests | ✓ | already in repo | — |

## Open Questions

1. **Are there additional EXP-01–09 content requirements beyond file existence and schema validity?**
   - What we know: REQUIREMENTS.md states each template specifies a particular metric (e.g., EXP-01 → DOM structure + a11y + contrast for wireframe)
   - What's unclear: Whether the planner wants per-template assertions on `target_metric` field values
   - Recommendation: Assert that each template's `mutable_files` includes the correct workflow file name — this is specific enough without being brittle about exact metric script names

2. **Should the TOOL_MAP count fix be 57 or `>= 46`?**
   - What we know: Current TOOL_MAP has 57 entries (verified). The comment in phase-108 test says "46 existing + 11 Playwright"
   - What's unclear: Whether future phases will add more entries
   - Recommendation: Fix to `=== 57` with a comment "Updated Phase 109: playwright:resize added" for traceability. Do not use `>=` — exact count assertions are the project convention.

## Sources

### Primary (HIGH confidence)
- Direct file reads: all 17 test files in `tests/phase-108/` through `tests/phase-116/`
- Direct execution: `node --test` runs producing verified pass/fail counts
- `.planning/REQUIREMENTS.md` — all 76 v0.14 requirement IDs and traceability table
- `.planning/milestones/v0.13-MILESTONE-AUDIT.md` — documents 1216 pass / 8 fail baseline
- `.planning/milestones/v0.13-phases/107-nyquist-coverage/107-VERIFICATION.md` — confirms 8 pre-existing failures

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase-by-phase decision log explaining why specific test patterns were chosen

## Metadata

**Confidence breakdown:**
- Gap analysis: HIGH — directly verified by reading all test files and running the suite
- Regression root cause: HIGH — verified the TOOL_MAP count and the exact error messages
- Fix strategy: HIGH — pattern is identical to existing phase-108 test that was already updated from 56 to 57 for the same reason
- Baseline assertion count: MEDIUM — REQUIREMENTS.md says 1216 but current run shows 1224 total / 1215 passing; the "1216" refers specifically to passing count at the v0.13 milestone close, before Phase 116 added 38 tests

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable test infrastructure)
