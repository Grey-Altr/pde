# Phase 82: Integration Validation and Regression Audit — Research

**Researched:** 2026-03-21
**Domain:** Cross-type regression validation for a file-based AI-workflow pipeline — confirming zero regressions across 4 product types and validating partial milestone completion with 4 of 9 phases pending
**Confidence:** HIGH — all findings from direct codebase inspection and live test execution

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| (validation phase) | All 48 v0.11 requirements verified against delivered artifacts | Research enumerates which requirements are verifiable now vs pending phases 75-78 |

**Note:** Phase 82 is a validation-only phase. It owns no new functional requirements. Its job is to assert that the 4 completed phases (74, 79, 80, 81) introduced no regressions, and to characterize the partial completion state of the milestone.

</phase_requirements>

---

## Summary

Phase 82 is the final integration gate for the v0.11 Experience Product Type milestone. Of the 9 total phases (74-82), exactly 4 have been implemented: Phase 74 (foundation + regression infrastructure), Phase 79 (critique + HIG extensions), Phase 80 (print collateral), and Phase 81 (handoff production bible). The remaining 4 implementation phases (75-78: brief extensions, tokens, flows, wireframe) are pending. Phase 82 itself is the 9th phase.

The current test state is: 132 pass / 2 fail across 134 total tests spanning 6 test suites. The 2 failures are in Phase 64 tests — not new regressions introduced by v0.11 work, but pre-existing test drift: the manifest schema test has a hardcoded "14" field count that is now out of date (the manifest has grown to 16 coverage fields with `hasPrintCollateral` and `hasProductionBible` added in Phase 81), and the workflow pass-through test asserts that `hasStitchWireframes` is never set to `true` — a constraint that was relaxed in v0.9. These Phase 64 tests are the primary regression items Phase 82 must fix.

The "no new workflow files" architectural constraint is confirmed clean: `git diff --diff-filter=A v0.10..HEAD | grep "^workflows/"` returns zero results. The 14 workflow files modified during v0.11 are all pre-existing files with conditional blocks added in-place.

**Primary recommendation:** Phase 82 has two distinct jobs: (1) fix the 2 broken Phase 64 tests by updating their hardcoded counts to reflect legitimate schema evolution, and (2) write a milestone validation test suite that asserts the complete state of all 4 completed phases and documents the expected gaps for phases 75-78 as explicit `TODO` markers with phase references. The planner should structure this as two plans: Plan 01 fixes the broken tests and runs the full regression matrix; Plan 02 writes the milestone completion test and performs the git-based architectural constraint checks.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for all Nyquist assertions | Used in every prior phase test; zero npm dependency; identical to all existing test infrastructure |
| `node:assert/strict` | Node.js built-in | Strict equality assertions | Same pattern across all 6 existing test suites; `assert.ok`, `assert.strictEqual`, `assert.match` |
| `node:fs` `readFileSync` | Node.js built-in | Read workflow files and JSON manifests in tests | Established pattern — `readFileSync(join(ROOT, relPath), 'utf8')` |
| `node:path` `join`, `resolve` | Node.js built-in | Resolve file paths from test ROOT | ROOT pattern: `resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..')` |
| `node:child_process` `spawnSync` | Node.js built-in | Run pde-tools.cjs commands as child processes | Used in phase-64 for design.cjs self-test; available if needed for pde-tools version check |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `git diff --diff-filter=A v0.10..HEAD --name-only` | git built-in | Assert no new workflow files were added | Run as shell assertion in test or verification step; `--diff-filter=A` lists only added files |
| `git diff --name-only v0.10..HEAD` | git built-in | List all files changed during milestone | Audits the scope of v0.11 changes for architectural constraint verification |

**Installation:** No new packages. All test code uses Node.js built-ins. Git is already present.

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
└── phase-82/
    ├── regression-matrix.test.mjs        # Cross-type regression + Phase 64 fixes
    └── milestone-completion.test.mjs     # Milestone state audit + architectural constraints

.planning/phases/82-integration-validation-and-regression-audit/
├── 82-RESEARCH.md    (this file)
├── 82-01-PLAN.md     (regression matrix + Phase 64 test fixes)
└── 82-02-PLAN.md     (milestone completion audit + architectural constraint assertions)
```

### Pattern 1: Phase 64 Test Update — Canonical Field Count Drift

**What:** The Phase 64 manifest schema test has a hardcoded `14` for the `designCoverage` field count. Phase 81 legitimately added `hasPrintCollateral` and `hasProductionBible`, making the actual count 16. The fix is to update the CANONICAL_FIELDS list, the hardcoded count, and the test comment to reflect the new canonical state. This is a test maintenance fix, not a regression in the codebase.

**When to use:** Any time a new `designCoverage` field is added by a phase, the Phase 64 canonical test must be updated as part of that phase. Phase 82 retroactively performs this update for the two fields added in Phase 81.

**Example:**

```javascript
// tests/phase-64/manifest-schema.test.mjs — updated CANONICAL_FIELDS
const CANONICAL_FIELDS = [
  'hasDesignSystem',
  'hasWireframes',
  'hasFlows',
  'hasHardwareSpec',
  'hasCritique',
  'hasIterate',
  'hasHandoff',
  'hasIdeation',
  'hasCompetitive',
  'hasOpportunity',
  'hasMockup',
  'hasHigAudit',
  'hasRecommendations',
  'hasStitchWireframes',
  'hasPrintCollateral',      // Added Phase 80/81
  'hasProductionBible',      // Added Phase 81
];
// Update count assertion from 14 → 16
assert.strictEqual(keys.length, 16, ...);
```

### Pattern 2: Phase 64 Test Update — hasStitchWireframes True Constraint

**What:** The Phase 64 workflow pass-through test asserts that `hasStitchWireframes` is never set to `true` in any workflow file. This was Phase 64's "schema extension only" constraint, but v0.9 legitimately activated the flag in `wireframe.md` (when Stitch generates a wireframe, the flag is set true). The fix is to relax this assertion to only check that the flag is present in the `manifest-set-top-level designCoverage` call — not that it is never `true`.

**When to use:** The assertion `hasStitchWireframes must not be set to true` was correct at Phase 64 completion. Post-v0.9, it is a stale constraint. Phase 82 updates the test comment to document the relaxation.

**Example:**

```javascript
// tests/phase-64/workflow-pass-through.test.mjs — updated assertion
// The old assertion checked: content does not contain 'hasStitchWireframes: true'
// The v0.9 wireframe.md now correctly sets this flag when --use-stitch is active.
// The Phase 64 invariant to preserve is: all 12 workflow files include the field
// in their manifest-set-top-level call. The activation state is v0.9 behavior.
test('all 12 workflow files include hasStitchWireframes in manifest-set-top-level designCoverage call', () => {
  // ... (existing test content passes — keep this)
});
// Remove or relax the 'must not be set to true' test
```

### Pattern 3: Cross-Type Regression Matrix Execution

**What:** Running all existing Nyquist test suites in sequence and confirming zero regressions in software/hardware/hybrid pipeline paths. The matrix already exists — Phase 82 runs it comprehensively and documents results.

**When to use:** Phase 82 Plan 01 runs these as the regression pass:

```bash
# Full regression run — expected result after Phase 64 test fixes:
node --test \
  tests/phase-64/manifest-schema.test.mjs \
  tests/phase-64/workflow-pass-through.test.mjs \
  tests/phase-74/experience-regression.test.mjs \
  tests/phase-79/critique-hig-extensions.test.mjs \
  tests/phase-80/print-collateral.test.mjs \
  tests/phase-81/handoff-production-bible.test.mjs \
  tests/phase-82/regression-matrix.test.mjs
# Expected: 0 failures
```

### Pattern 4: Milestone Completion Audit Test (Partial Validation)

**What:** A test file that documents the expected completion state of the milestone — which phases are done, which are pending, and what the pending phases' branch sites look like. For phases 75-78, the audit asserts that the Phase 74 stubs are still in place (confirming no accidental content was added), and documents that sub-type coverage for full experience pipelines will be validated once phases 75-78 are implemented.

**When to use:** Phase 82 Plan 02.

```javascript
// tests/phase-82/milestone-completion.test.mjs

describe('v0.11 milestone completion state audit', () => {
  // Completed phases
  test('Phase 74: experience detection and branch site infrastructure complete', () => {
    // Asserts: brief.md has 5 sub-types, 14 files have experience stubs
    // (already covered by phase-74 tests — this is a pass-through summary)
  });

  test('Phase 79: critique and HIG experience branches complete', () => {
    // Asserts: critique.md has 7 perspectives, hig.md has 7 physical domains
    // (already covered by phase-79 tests)
  });

  test('Phase 80: print collateral experience branches complete', () => {
    // Asserts: wireframe.md has FLY/SIT/PRG generation blocks
    // (already covered by phase-80 tests)
  });

  test('Phase 81: handoff production bible experience branch complete', () => {
    // Asserts: handoff.md has BIB generation, 6 sections, NEVER guards
    // (already covered by phase-81 tests)
  });

  // Pending phases — Phase 74 stubs still in place
  test('Phase 75 pending: flows.md brief extension stub is present (not filled)', () => {
    const content = readFileSync(join(ROOT, 'workflows/flows.md'), 'utf8');
    assert.ok(content.includes('Phase 74 stub'), 'flows.md: Phase 74 stub should still be present (Phase 77 not yet implemented)');
  });

  test('Phase 76 pending: system.md experience token stub is present (not filled)', () => {
    const content = readFileSync(join(ROOT, 'workflows/system.md'), 'utf8');
    assert.ok(content.includes('Phase 74 stub'), 'system.md: Phase 74 stub should still be present (Phase 76 not yet implemented)');
  });

  test('Phase 77 pending: wireframe.md floor plan stub is present (not filled)', () => {
    const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');
    assert.ok(content.includes('Phase 74 stub'), 'wireframe.md: Phase 74 stub should still be present (Phase 78 not yet implemented)');
  });
});
```

### Pattern 5: Architectural Constraint Verification via Git

**What:** The "no new workflow files" constraint is verified by diffing against the v0.10 tag using `--diff-filter=A` (added files only), then filtering for `workflows/`. An empty result confirms compliance.

**Critical:** The `v0.10` git tag exists and is a reliable boundary. `git diff --diff-filter=A v0.10..HEAD --name-only | grep "^workflows/"` currently returns empty — confirmed clean.

**Example (as test task action):**

```bash
# Assert no new workflow files added during v0.11 milestone:
NEW_WORKFLOWS=$(git diff --diff-filter=A v0.10..HEAD --name-only | grep "^workflows/" || true)
if [ -n "$NEW_WORKFLOWS" ]; then
  echo "REGRESSION: New workflow files were added during v0.11:"
  echo "$NEW_WORKFLOWS"
  exit 1
fi
echo "PASS: No new workflow files added during v0.11 milestone"
```

This check can be run as a Bash command in the PLAN verification step, or as a `spawnSync('git', ...)` assertion inside the test file.

### Pattern 6: Skill Registry Verification

**What:** The "13 pipeline skills" referenced in Success Criterion 4 refers to the 13 workflow commands: recommend, competitive, opportunity, ideate, brief, system, flows, wireframe, critique, iterate, mockup, hig, handoff. Verification means confirming that each workflow file (a) contains an experience branch site and (b) contains no Phase 74 stubs that should have been replaced by v0.11 completed phases (critique, hig, handoff, wireframe print sections). The 4 workflows with pending phases (flows, system, wireframe floor plan, brief) legitimately still have Phase 74 stubs.

**Skill registry verification approach:** Check that:
1. All 13 skill workflow files are present at their expected paths
2. Each contains the `experience` keyword (confirming branch site from FNDX-02)
3. The workflows whose experience branches were implemented (critique, hig, handoff, wireframe) contain their specific implementation keywords (not stubs)

```javascript
// Verified implementation indicators per workflow:
const EXPERIENCE_IMPLEMENTED = {
  'workflows/critique.md': 'Experience Perspective 1: Safety',
  'workflows/hig.md': 'Physical HIG Domain 1: Wayfinding',
  'workflows/handoff.md': 'Production Bible',
  'workflows/wireframe.md': 'GENERATE_FLY',
};
const EXPERIENCE_STUB_EXPECTED = [
  'workflows/flows.md',      // Phase 77 pending
  'workflows/system.md',     // Phase 76 pending
  'workflows/brief.md',      // Phase 75 pending (brief detection exists, extensions pending)
  'workflows/iterate.md',    // Phase 74 stub — no dedicated implementation phase planned
  'workflows/ideate.md',     // Phase 74 stub — no dedicated implementation phase planned
  'workflows/competitive.md', // Phase 74 stub
  'workflows/opportunity.md', // Phase 74 stub
  'workflows/recommend.md',  // Phase 74 stub
  'workflows/mockup.md',     // Phase 74 stub
  'workflows/build.md',      // Phase 74 comment — no behavior needed
];
```

### Anti-Patterns to Avoid

- **Asserting full experience pipeline completion when phases 75-78 are pending:** The milestone completion test must NOT assert that a full experience pipeline run produces all experience artifacts. It must only assert what phases 74, 79, 80, and 81 promised to deliver.
- **Running end-to-end pipeline execution in Nyquist tests:** Nyquist tests are structural — they read file content. They do NOT spawn `pde:build` or `pde:critique` commands against live projects. Those belong in human verification steps, not automated tests.
- **Updating Phase 64 tests by deleting them:** The Phase 64 tests establish the baseline schema. The fix is to update the counts and field lists, not to remove assertions. The test file must still verify all 12 workflows include the `hasStitchWireframes` field.
- **Asserting strict field count when future phases may add flags:** The corrected Phase 64 test should assert `>= 16` or update the count whenever a new coverage flag is added. Alternatively, the canonical field list is the source of truth and the count is derived from `CANONICAL_FIELDS.length` — making future additions automatically correct.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Counting coverage fields | Custom manifest parser | `Object.keys(manifest.designCoverage).filter(k => k !== '_comment').length` | Already the pattern in phase-64/manifest-schema.test.mjs; works correctly |
| "No new workflow files" check | Git log parser | `git diff --diff-filter=A v0.10..HEAD --name-only` | Shell command; single authoritative source; `v0.10` tag is reliable boundary |
| Cross-type regression assertions | New test infrastructure | Extend existing `tests/phase-74/experience-regression.test.mjs` or reference its patterns | All FNDX assertions already pass; the regression matrix IS these tests |
| Sub-type coverage for pending phases | Speculative test assertions for phases 75-78 | Documented `TODO` markers with phase references in milestone-completion.test.mjs | Phases 75-78 not implemented yet — testing non-existent behavior produces false failures |

**Key insight:** Phase 82 is a validation coordinator, not a new feature phase. The majority of the work is running existing tests, fixing two known test drift issues, and documenting the partial state honestly.

---

## Common Pitfalls

### Pitfall 1: Mistaking Test Drift for Regression

**What goes wrong:** The Phase 64 manifest schema test failure (`16 !== 14`) and workflow pass-through failure (`hasStitchWireframes must not be true`) are reported as new v0.11 regressions. An engineer unfamiliar with the history investigates the wrong files.

**Why it happens:** The tests have hardcoded counts established at Phase 64 (v0.9) and were never updated when later phases legitimately changed the invariants they tested.

**How to avoid:** Before investigating a test failure, check whether the assertion is about an invariant that was intentionally changed by a later phase. The Phase 64 schema test comment says "14 canonical fields" but the manifest now correctly has 16. The fix is test maintenance, not code rollback.

**Warning signs:** A failing test describes behavior that is documented as intentional in a later phase's DECISIONS or STATE.md.

### Pitfall 2: Asserting Full Experience Pipeline Completion When Phases 75-78 Are Pending

**What goes wrong:** Plan writes a test that says "running a full experience pipeline produces brief + tokens + flows + floor plan + critique + handoff." This test fails because tokens, flows, and floor plan are not implemented yet.

**Why it happens:** The phrase "each of the 5 experience sub-types can be exercised through the full pipeline" in Success Criterion 2 sounds like an end-to-end run requirement.

**How to avoid:** Success Criterion 2 must be scoped to "the pipeline stages that ARE implemented for experience products." The test structure must explicitly document which stages are pending and mark them as `todo()` or skip them with a `// Phase 7{5-8} pending` comment.

**Warning signs:** A test asserts the existence of `SYS-experience-tokens.json` or a floor plan HTML file before Phase 76 and Phase 78 are implemented.

### Pitfall 3: "Byte-Identical Outputs" for Template-Based Generation

**What goes wrong:** The phase goal says "software, hardware, and hybrid projects produce byte-identical outputs to pre-milestone baselines." Phase 82 tries to generate actual pipeline artifacts and compare them byte-for-byte against stored baselines. This is infeasible in a Nyquist structural test.

**Why it happens:** The phrase "byte-identical" sounds like output comparison, but PDE's output is AI-generated markdown — it is never literally byte-identical across runs.

**How to avoid:** "Byte-identical" in this context means "the workflow files that generate software/hardware/hybrid artifacts are unchanged in their software/hardware/hybrid code paths." The validation is structural: grep for the expected software code paths and confirm they are unmodified by v0.11 experience additions. The Phase 74 FNDX-03 test already asserts this for `brief.md`. Phase 82 extends this pattern to critique, hig, handoff, and wireframe: each should contain their existing software code paths unmodified adjacent to the new experience blocks.

**Warning signs:** A plan task says "generate a software project and compare output files."

### Pitfall 4: Missing the Phase 64 CANONICAL_FIELDS Update Side Effect

**What goes wrong:** Updating the count in `manifest-schema.test.mjs` from 14 → 16 without updating the `CANONICAL_FIELDS` array means the "field order" test passes but the "count" test fails with a different error, or vice versa.

**Why it happens:** There are two places to update: the `CANONICAL_FIELDS` array (lines 19-34) and the `assert.strictEqual(keys.length, 14, ...)` assertion. If only one is updated, the test remains broken.

**How to avoid:** Add `hasPrintCollateral` and `hasProductionBible` to the `CANONICAL_FIELDS` array AND update `14` → `16` in the assertion. Run the test after each edit to confirm.

**Warning signs:** `node --test tests/phase-64/manifest-schema.test.mjs` still fails after editing one but not both.

### Pitfall 5: Treating `hasPrintCollateral` and `hasProductionBible` as Permanent Flags for All Product Types

**What goes wrong:** Phase 82 tests assert that `hasPrintCollateral` and `hasProductionBible` are `false` in software/hardware/hybrid fixture manifests — then later when these are set to `true` for experience projects, the assertion breaks.

**Why it happens:** The Phase 64 pattern for `hasStitchWireframes` was "false everywhere as schema extension only." But `hasPrintCollateral` and `hasProductionBible` CAN be set to `true` for experience products.

**How to avoid:** Phase 82 should only assert presence of the fields, not their default values in fixture files. The existing Phase 81 Nyquist tests handle the `true`/`false` activation logic correctly.

---

## Code Examples

### Example 1: Updated manifest-schema.test.mjs CANONICAL_FIELDS

```javascript
// tests/phase-64/manifest-schema.test.mjs — Phase 82 update
// Source: direct inspection of templates/design-manifest.json showing 16 coverage fields

const CANONICAL_FIELDS = [
  'hasDesignSystem',
  'hasWireframes',
  'hasFlows',
  'hasHardwareSpec',
  'hasCritique',
  'hasIterate',
  'hasHandoff',
  'hasIdeation',
  'hasCompetitive',
  'hasOpportunity',
  'hasMockup',
  'hasHigAudit',
  'hasRecommendations',
  'hasStitchWireframes',
  'hasPrintCollateral',      // Added Phase 80/81 — experience print artifacts
  'hasProductionBible',      // Added Phase 81 — experience production bible
];
// ...
assert.strictEqual(
  keys.length,
  16,
  `${relPath}: designCoverage has ${keys.length} fields, expected 16. Got: ${keys.join(', ')}`
);
```

### Example 2: Updated workflow-pass-through.test.mjs — Relax the True Constraint

```javascript
// tests/phase-64/workflow-pass-through.test.mjs — Phase 82 update
// Remove or replace the 'hasStitchWireframes must not be set to true' test.
// v0.9 Phase 66 legitimately activated hasStitchWireframes in wireframe.md
// when --use-stitch flag is passed. The test is now stale.
// The invariant to preserve (and which still passes) is:
// "all 12 workflow files include hasStitchWireframes in manifest-set-top-level designCoverage call"

// Update the test name/comment on the currently-failing test:
test('wireframe.md activates hasStitchWireframes when --use-stitch flag is passed (v0.9 behavior)', () => {
  const content = readWorkflow('workflows/wireframe.md');
  assert.ok(
    content.includes('hasStitchWireframes'),
    'wireframe.md: must contain hasStitchWireframes (can be true when Stitch active)'
  );
  // No longer assert it must be false — v0.9 correctly sets it to true
});
```

### Example 3: No-New-Workflow-Files Git Assertion

```javascript
// tests/phase-82/regression-matrix.test.mjs
// Source: git diff command pattern; v0.10 tag confirmed present

import { spawnSync } from 'child_process';

test('no new workflow files added during v0.11 milestone', () => {
  const result = spawnSync('git', [
    'diff',
    '--diff-filter=A',
    'v0.10..HEAD',
    '--name-only',
  ], { cwd: ROOT, encoding: 'utf8' });

  assert.strictEqual(result.status, 0, 'git diff command failed');

  const newFiles = result.stdout.split('\n').filter(f => f.startsWith('workflows/'));
  assert.strictEqual(
    newFiles.length,
    0,
    `New workflow files were added during v0.11: ${newFiles.join(', ')}`
  );
});
```

### Example 4: Skill Registry Verification — All 13 Skills Have Experience Branch

```javascript
// tests/phase-82/regression-matrix.test.mjs
// Confirms success criterion 4: "skill registry confirms all 13 pipeline skills are operational"
// "Operational" = file exists AND contains experience branch site (FNDX-02 passed)

const THIRTEEN_PIPELINE_SKILLS = [
  'workflows/recommend.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/ideate.md',
  'workflows/brief.md',
  'workflows/system.md',
  'workflows/flows.md',
  'workflows/wireframe.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/mockup.md',
  'workflows/hig.md',
  'workflows/handoff.md',
];

test('all 13 pipeline skills are present and contain experience branch site', () => {
  for (const relPath of THIRTEEN_PIPELINE_SKILLS) {
    const fullPath = join(ROOT, relPath);
    assert.ok(existsSync(fullPath), `${relPath}: skill file missing`);
    const content = readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('experience'), `${relPath}: missing experience branch site`);
  }
});
```

### Example 5: Software Code Path Preservation Check

```javascript
// tests/phase-82/regression-matrix.test.mjs
// Validates success criterion 1: "zero software/hardware/hybrid regressions detected"
// Method: assert that known software code paths are still present in modified workflows

describe('software product type paths unaffected by v0.11 experience additions', () => {
  test('critique.md still contains WCAG perspective logic for software products', () => {
    const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf8');
    assert.ok(content.includes('WCAG'), 'critique.md: WCAG software critique path must remain');
    assert.ok(content.includes('POUR'), 'critique.md: POUR analysis must remain for software');
  });

  test('hig.md still contains WCAG audit for non-experience products', () => {
    const content = readFileSync(join(ROOT, 'workflows/hig.md'), 'utf8');
    assert.ok(content.includes('WCAG'), 'hig.md: WCAG path must remain for software products');
  });

  test('handoff.md still contains TypeScript interface generation for software products', () => {
    const content = readFileSync(join(ROOT, 'workflows/handoff.md'), 'utf8');
    assert.ok(content.includes('TypeScript'), 'handoff.md: TypeScript interface generation must remain');
    assert.ok(content.includes('HND'), 'handoff.md: HND artifact code must remain');
  });

  test('wireframe.md still contains standard HTML wireframe generation for software products', () => {
    const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');
    assert.ok(content.includes('WFR'), 'wireframe.md: WFR artifact code must remain for software');
  });
});
```

---

## Partial Validation Handling

This section is the primary research finding for Phase 82 and addresses the fundamental tension: phases 75-78 are not yet implemented, but Phase 82 must still pass as the "milestone gate."

### What CAN Be Validated Now

| Success Criterion | Validatable Now | Approach |
|-------------------|-----------------|----------|
| SC-1: Zero software/hardware/hybrid regressions across 14 branch sites | YES | All 4 completed-phase Nyquist suites already pass for software/hardware/hybrid isolation; add explicit assertions per Example 5 above |
| SC-2: Each of 5 sub-types exercises full pipeline with expected artifact set | PARTIAL — only for stages in completed phases | Assert artifacts for critique (CRIT perspectives), hig (physical HIG domains), handoff (BIB), wireframe (FLY/SIT/PRG); mark flows/tokens/floor-plan/timeline as pending with `todo()` markers |
| SC-3: No new workflow files added during milestone | YES | Git command assertion; already confirmed clean by direct codebase inspection |
| SC-4: Skill registry confirms all 13 pipeline skills operational for software and experience | YES for "operational as in file exists + has branch site" | Assert file existence + `experience` presence for all 13; assert implementation keywords for the 4 completed phases |

### Handling Pending Phases 75-78 in Tests

The correct approach is the `todo()` marker in `node:test`:

```javascript
test.todo('Phase 75 pending: experience brief captures promise statement (BREF-01)');
test.todo('Phase 76 pending: SYS-experience-tokens.json generated (DSYS-07)');
test.todo('Phase 77 pending: temporal flow diagram generated (FLOW-01)');
test.todo('Phase 78 pending: floor plan wireframe generated (WIRE-01)');
```

`test.todo()` in `node:test` marks tests as intended but not yet implemented. They appear in the output as `# todo` entries, do not count as failures, and survive `node --test` without causing a non-zero exit code. This correctly represents the milestone state: Phase 82 is the final phase of v0.11, but v0.11 is architecturally incomplete pending phases 75-78.

**CRITICAL:** The milestone completion test should NOT fail because phases 75-78 are not done. Phase 82's job is to gate what HAS been implemented, not to block on what hasn't. The `todo()` markers serve as the documented roadmap for whoever completes phases 75-78 later.

### Flows.md, System.md, Wireframe.md — Phase 74 Stubs Still Present

These 3 files (plus brief.md for extensions) still have Phase 74 stub comments because phases 75-78 have not been implemented. The milestone completion test MUST assert that these stubs are STILL present — this confirms no accidental content was added to these files outside their planned phases.

```javascript
test('flows.md still has Phase 74 stub (Phase 77 not yet implemented)', () => {
  const content = readFileSync(join(ROOT, 'workflows/flows.md'), 'utf8');
  assert.ok(content.includes('Phase 74 stub'), 'flows.md Phase 74 stub must remain until Phase 77 is implemented');
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 64 CANONICAL_FIELDS: 14 fields | Phase 82 updated: 16 fields (`hasPrintCollateral`, `hasProductionBible` added) | Phase 81 added flags; Phase 82 updates test | Phase 64 schema test must be updated before running full regression suite |
| Phase 64: `hasStitchWireframes` never `true` | Phase 66 activated `hasStitchWireframes` in wireframe.md | v0.9 Phase 66 | Phase 64 workflow-pass-through test assertion must be relaxed |
| Experience stubs in critique, hig, handoff, wireframe | Full experience implementations (Phases 79, 80, 81) | v0.11 Phases 79-81 | Phase 74 stubs replaced in these 4 files; the other 9 still have stubs |
| `test(... assert)` with 14 across 14 | With 2 Phase 64 test failures pre-Phase 82 | Phase 81 completion | Phase 82 restores green test suite |

**Current test state (pre-Phase 82):**
- Phase 74: 7/7 pass
- Phase 79: 20/20 pass
- Phase 80: 23/23 pass
- Phase 81: 72/72 pass
- Phase 64 manifest-schema: 5/6 pass (1 failure: hardcoded count 14 vs actual 16)
- Phase 64 workflow-pass-through: 5/6 pass (1 failure: stale `hasStitchWireframes: true` assertion)

**Target state after Phase 82:**
- All 6 existing test suites: 100% pass
- Phase 82 regression-matrix.test.mjs: all assertions green
- Phase 82 milestone-completion.test.mjs: all implemented assertions green, todo() markers for phases 75-78

---

## Open Questions

1. **Scope of "full pipeline" for experience sub-type validation (SC-2)**
   - What we know: 4 of 9 phases are done; the phases done cover critique, hig, handoff, and print
   - What's unclear: Whether the planner should write tests that attempt to validate a "partial" experience pipeline run, or whether the test should strictly assert what the 4 completed phases deliver
   - Recommendation: Assert only what the completed phases deliver. Write `test.todo()` for phases 75-78 pipeline stages. Phase 82 is a gate on current completeness, not a prediction of future completeness.

2. **`fixture-rerun` manifest field counts**
   - What we know: `fixture-rerun` has `hasPrintCollateral: false` and `hasProductionBible: false` — these were added by Phase 81
   - What's unclear: Whether the Phase 64 `fixture-rerun` test that checks all 13 pre-Stitch fields are `true` needs updating (it also checks slice(0, 13) and may fail if the count changes)
   - Recommendation: The Phase 64 test at line 126 uses `CANONICAL_FIELDS.slice(0, 13)` — this slice is safe since the 13 original fields remain at positions 0-12 in the updated array. The test should still pass after the field-count fix.

3. **Whether Phase 82 should add regression tests for phases 75-78 stubs**
   - What we know: 10 Phase 74 stubs remain across 9 workflows (flows, system, wireframe, iterate, mockup, competitive, opportunity, recommend, ideate, build)
   - What's unclear: Whether Phase 82 should assert these stubs' EXACT text (brittle) or just presence (more durable)
   - Recommendation: Assert presence of `Phase 74 stub` string for the 3 workflows with pending implementation phases (flows, system, wireframe). For the others (iterate, mockup, etc.) no phase is planned to fill them, so no assertion needed. The existing FNDX-04 test already confirms no sub-type structural branching exists.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (v18+) |
| Config file | None — standalone `.mjs` files |
| Quick run command | `node --test tests/phase-82/regression-matrix.test.mjs` |
| Full suite command | `node --test tests/phase-64/*.mjs tests/phase-74/*.mjs tests/phase-79/*.mjs tests/phase-80/*.mjs tests/phase-81/*.mjs tests/phase-82/*.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File |
|--------|----------|-----------|-------------------|------|
| SC-1 | Zero software/hardware/hybrid regressions across 14 branch sites | structural | `node --test tests/phase-82/regression-matrix.test.mjs` | Wave 0 |
| SC-1 | Software paths preserved in critique/hig/handoff/wireframe | structural | `node --test tests/phase-82/regression-matrix.test.mjs` | Wave 0 |
| SC-2 | Experience sub-types produce expected artifacts (completed phases only) | structural | `node --test tests/phase-82/milestone-completion.test.mjs` | Wave 1 |
| SC-3 | No new workflow files added | git assertion | `node --test tests/phase-82/regression-matrix.test.mjs` | Wave 0 |
| SC-4 | All 13 pipeline skills have experience branch sites and are present | structural | `node --test tests/phase-82/regression-matrix.test.mjs` | Wave 0 |
| Phase 64 fix | manifest-schema.test.mjs: update 14 → 16, add 2 new CANONICAL_FIELDS | structural | `node --test tests/phase-64/manifest-schema.test.mjs` | Plan 01 |
| Phase 64 fix | workflow-pass-through.test.mjs: relax hasStitchWireframes: true assertion | structural | `node --test tests/phase-64/workflow-pass-through.test.mjs` | Plan 01 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-64/manifest-schema.test.mjs tests/phase-64/workflow-pass-through.test.mjs`
- **Per wave merge:** `node --test tests/phase-64/*.mjs tests/phase-74/*.mjs tests/phase-82/*.mjs`
- **Phase gate:** Full suite green: `node --test tests/phase-64/*.mjs tests/phase-74/*.mjs tests/phase-79/*.mjs tests/phase-80/*.mjs tests/phase-81/*.mjs tests/phase-82/*.mjs`

### Wave 0 Gaps

- [ ] `tests/phase-82/regression-matrix.test.mjs` — covers SC-1, SC-3, SC-4, and Phase 64 integration assertions; written before Phase 64 test edits so initial run shows the 2 existing failures
- [ ] `tests/phase-82/milestone-completion.test.mjs` — covers SC-2 with `test.todo()` for phases 75-78; written after Phase 64 fixes are confirmed

---

## Sources

### Primary (HIGH confidence)

- `tests/phase-64/manifest-schema.test.mjs` (direct codebase inspection) — hardcoded 14-field count at line 87; CANONICAL_FIELDS array at lines 19-34; the exact 2 fields to add confirmed from `templates/design-manifest.json` lines 124-125
- `tests/phase-64/workflow-pass-through.test.mjs` (direct codebase inspection) — `hasStitchWireframes must not be true` assertion; confirmed stale because v0.9 Phase 66 activated the flag
- `tests/phase-74/experience-regression.test.mjs` (direct live test run) — 7/7 pass; PIPELINE_WORKFLOW_FILES canonical list
- `tests/phase-79/critique-hig-extensions.test.mjs` (direct live test run) — 20/20 pass
- `tests/phase-80/print-collateral.test.mjs` (direct live test run) — 23/23 pass
- `tests/phase-81/handoff-production-bible.test.mjs` (direct live test run) — 72/72 pass
- `git diff --diff-filter=A v0.10..HEAD --name-only | grep '^workflows/'` (direct git command) — returns empty; no new workflow files confirmed
- `templates/design-manifest.json` (direct codebase inspection) — 16 designCoverage fields confirmed at lines 108-126
- `.planning/phases/74-foundation-and-regression-infrastructure/74-VERIFICATION.md` (project document) — 7/7 tests green; all FNDX requirements satisfied; workflow file counts confirmed
- `.planning/phases/79-critique-and-hig-extensions/79-VERIFICATION.md` (project document) — 20/20 tests green; all 15 CRIT/PHIG requirements satisfied
- `.planning/phases/80-print-collateral/80-VERIFICATION.md` (project document) — 23/23 tests green; all 4 PRNT requirements satisfied
- `.planning/phases/81-handoff-production-bible/81-VERIFICATION.md` (project document) — 72/72 tests green; all 6 HDOF requirements satisfied
- `.planning/REQUIREMENTS.md` (project document) — requirement status confirmed; 22 complete, 11 pending (BREF, DSYS, FLOW, WIRE)
- `.planning/STATE.md` (project document) — architectural constraints confirmed; `v0.10` tag present; no new workflow files constraint locked

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 82 success criteria — authoritative definition of the 4 validation requirements Phase 82 must satisfy
- `node:test` `test.todo()` API — verified behavior: marks test as intended-but-pending, does not fail, appears in output as `# todo` count

### Tertiary (LOW confidence)

- None — all findings grounded in direct codebase inspection and live test execution

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all tools are Node.js built-ins used in every prior phase; zero new infrastructure
- Architecture: HIGH — two specific failing tests with documented root causes; git command verified clean; test count numbers confirmed by live execution
- Pitfalls: HIGH — all pitfalls derived from actual current test state and documented constraints in STATE.md; not speculative
- Partial validation handling: HIGH — `test.todo()` is the correct `node:test` mechanism; phases 75-78 status confirmed by REQUIREMENTS.md and ROADMAP.md

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — no external dependencies; codebase is the reference; test counts are exact)
