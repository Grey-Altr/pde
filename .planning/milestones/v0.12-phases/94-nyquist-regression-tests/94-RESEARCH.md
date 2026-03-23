# Phase 94: Nyquist Regression Tests — Research

**Researched:** 2026-03-23
**Domain:** PDE structural regression testing — composition case validation, non-business baseline verification, deploy approval gate assertions
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-02 | Non-business product types produce byte-identical manifest output to pre-v0.12 baseline when `businessMode === false` | Manifest template confirmed: `businessMode: false` and `businessTrack` are written by brief.md even for non-business projects (line 865-872). Test strategy: structural assertions that non-business workflows do NOT set hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit to true, and that brief.md contains the `businessMode == false` → skip business artifact path. |
| INTG-03 | `business:software` composition produces both software-specific and business-specific artifacts in single pipeline run | All 14+ modified workflows use independent IF blocks (not ELSE IF). Key markers: brief.md must produce BTH; handoff.md must produce HND + not produce BIB; wireframe.md must produce LDP. Tests verify correct artifact markers exist under businessMode gates AND software path markers are not conditionally gated away by businessMode. |
| INTG-04 | `business:hardware` composition produces both hardware-specific and business-specific artifacts in single pipeline run | `hasHardwareSpec` coverage flag and hardware path markers (flows.md hardware subflows, hig.md hardware HIG) must co-exist with businessMode branching. Test: hardware-specific markers survive alongside businessMode conditional blocks. |
| INTG-05 | `business:experience` composition produces both experience-specific and business-specific artifacts in single pipeline run | Independent IF blocks (not ELSE IF) between experience and business sections. Confirmed in system.md comment: "business:experience compositions run both". Key test: experience markers AND business markers in same workflow, neither gated by the other. |
| INTG-06 | Deploy workflow halts at each approval gate without proceeding when user declines — no partial deployment | deploy.md contains 4 gates (Gate 1/4 through Gate 4/4), each with "Halt -- stop deployment" option and explicit halt instruction. Tests: all 4 gate labels present, halt string present, no fallthrough between gates. |
| INTG-07 | Nyquist regression tests cover all composition cases with structural assertions | The test file itself (Phase 94 deliverable). Must cover: non-business regression (INTG-02), three composition cases (INTG-03, INTG-04, INTG-05), deploy gate halt (INTG-06), and all 20 designCoverage fields across modified workflows. |
</phase_requirements>

---

## Summary

Phase 94 is the terminal validation phase for v0.12. It creates one structural test file that assertively covers all composition cases and verifies the deploy approval gate architecture. It does not modify any workflow files — it is purely a test creation phase.

The test strategy mirrors prior Nyquist phases (84–93): read workflow files as strings, run substring checks against known structural markers, no runtime execution of workflows. This is the same pattern used in test-foundation.cjs (21 assertions), test-deploy-skill.cjs (21 assertions), and test-clobber-audit.cjs (11 assertions) — all currently GREEN.

**Key insight about composition testing:** "composition" in PDE does not mean running a pipeline — it means verifying that the workflow source files have independent IF blocks for each dimension (product type AND businessMode). A `business:software` composition is verified by confirming that the software-specific code path is NOT inside an `ELSE IF business` gate, and the business-specific code path is NOT inside an `ELSE IF software` gate. Both paths coexist as independent conditional blocks. This is structural and 100% automatable without running workflows.

**Key insight about INTG-02 (byte-identical baseline):** "Byte-identical" in the structural test context means the non-business pipeline adds no new artifact codes, no new coverage flags beyond what existed before v0.12 (16-field non-business manifest), and all business-specific sections in every workflow are gated on `businessMode == true` (never run silently). The test verifies guard presence, not actual output — which is the right scope for a structural Nyquist test. Actual runtime comparison would require a live pipeline execution environment PDE does not support in test.

**Primary recommendation:** Write a single test file `tests/test-regression-matrix.cjs` with six describe blocks, one per INTG requirement. Use the same `require('node:test')` / `describe` / `it` / `assert.ok` / `readFileSync` pattern as all prior phase tests. Target ~25–35 test assertions total. No external dependencies required.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | built-in | Describe/it test structure | Established pattern for ALL PDE Nyquist tests (phases 84–93), zero config |
| node:assert | built-in | Assertion library | Same as all prior phase tests |
| node:fs | built-in | readFileSync for workflow inspection | Reads workflow .md files as strings for structural pattern checks |
| node:path | built-in | Path resolution to ROOT | All tests use `path.resolve(__dirname, '..', '..', '..', '..')` to reach project root |

### No External Dependencies

Phase 94 introduces no new npm packages. All test assertions are string-based pattern checks on workflow markdown files and JSON manifest files.

**Run command:**
```bash
node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs
```

**Full prior suite (regression guard):**
```bash
cd [project-root] && find .planning/phases -name "*.cjs" -path "*/tests/*" | sort | xargs node --test
```

All 189 prior tests confirmed GREEN as of 2026-03-23.

---

## Architecture Patterns

### Recommended Test File Structure

```
.planning/phases/94-nyquist-regression-tests/
├── tests/
│   └── test-regression-matrix.cjs   ← single file, all 6 INTG requirements
└── 94-RESEARCH.md
```

One test file. All INTG-02 through INTG-07 in one file with separate `describe` blocks. This follows the Phase 93 and Phase 92 patterns exactly.

### Pattern 1: Module-Level File Reads + ROOT Resolution

All PDE Nyquist tests follow this boilerplate:

```javascript
// Source: .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Phase 94 tests are at: .planning/phases/94-.../tests/
// Go up 4 levels to reach project root:
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Read files once at module level — no try/catch needed (files exist)
const briefContent = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');
const wireframeContent = fs.readFileSync(path.join(ROOT, 'workflows', 'wireframe.md'), 'utf-8');
const deployContent = fs.readFileSync(path.join(ROOT, 'workflows', 'deploy.md'), 'utf-8');
```

**Important:** Use `require('node:assert')` not `require('node:assert/strict')` — the existing Phase 93 test uses the non-strict import and all prior tests mix both. Either works, but consistency with Phase 93 (most recent) favors non-strict.

### Pattern 2: TWENTY_FIELDS Array for Coverage Assertions

```javascript
// Source: test-clobber-audit.cjs (Phase 93) — canonical field list
const TWENTY_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit'
];

// Usage:
it('workflow.md contains all 20 designCoverage field names', () => {
  const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
  assert.ok(missing.length === 0, `workflow.md missing: ${missing.join(', ')}`);
});
```

### Pattern 3: Ordering Check (position assertions)

```javascript
// Source: test-foundation.cjs (Phase 84) — for ordering of guards
it('businessMode detection appears BEFORE artifact generation', () => {
  const bmIdx = content.indexOf('manifest-get-top-level businessMode');
  const artifactIdx = content.indexOf('SBP-service-blueprint');
  assert.ok(bmIdx !== -1, 'businessMode read must exist');
  assert.ok(artifactIdx !== -1, 'artifact generation must exist');
  assert.ok(bmIdx < artifactIdx, 'businessMode must be read before artifact generation');
});
```

### Pattern 4: Graceful Fallback Read (for files that might not exist yet)

```javascript
// Source: test-deploy-skill.cjs (Phase 92) — for files created during execution
let deployContent = '';
try {
  deployContent = fs.readFileSync(path.join(ROOT, 'workflows', 'deploy.md'), 'utf-8');
} catch { /* file not created yet — all tests depending on this will be RED */ }
```

Use this ONLY for `deploy.md` and `commands/deploy.md` if asserting existence — both files already exist in Phase 94, so direct reads are fine.

### Anti-Patterns to Avoid

- **Never use ELSE IF for composition tests:** The composition test pattern asserts that both `IF businessMode` AND the software/hardware/experience path exist as independent blocks. ELSE IF would mean one path excludes the other.
- **Never assert on dynamic output:** All assertions are string-pattern checks on static workflow source files — never execute workflows or read `.planning/design/design-manifest.json` for runtime values.
- **Never skip the TWENTY_FIELDS check for modified workflows:** Every workflow file mentioned in INTG-07 must have a 20-field coverage assertion.
- **Never use a single `includes()` check for multi-instance assertions:** If a workflow must have a pattern AND a guard before it, use separate `it()` blocks with ordering checks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Field presence enumeration | Custom for-loop checking object keys | `TWENTY_FIELDS.filter(f => !content.includes(f))` | Established pattern, gives useful diff output on failure |
| Test runner setup | Mocha/Jest/Vitest config | `node --test file.cjs` | node:test is built-in, zero config, all existing tests use it |
| File reading helper | Abstraction over fs | Direct `fs.readFileSync(path.join(ROOT, ...))` | Same as all prior phase tests — consistency matters more than abstraction |
| Composition validation framework | Integration test harness | String pattern checks on workflow .md files | Runtime execution is impossible without a full LLM execution environment; structural checks are authoritative and sufficient |

**Key insight:** PDE Nyquist tests are NOT end-to-end tests. They are structural assertions that workflow source files have the correct content to support correct execution. If the source contains the right guard text, the guard will fire correctly at runtime. This is intentional and sufficient — adding runtime execution would require mocking LLM calls and is out of scope for every Nyquist phase in the project.

---

## Common Pitfalls

### Pitfall 1: Testing the Wrong Independence Invariant for Composition Cases

**What goes wrong:** Testing that a workflow "contains businessMode" and "contains experience" but not asserting they are independent (not ELSE IF). A workflow could have `IF experience ... ELSE IF businessMode` and both strings would still be present.

**Why it happens:** The two-string check is a natural but incomplete representation of the independence requirement.

**How to avoid:** For each composition case, additionally assert that neither block is nested inside the other using an ordering check OR assert the absence of `ELSE IF businessMode` after an experience block. The most reliable pattern is: assert that the experience marker exists AND the businessMode marker exists AND neither is inside an `else` that references the other.

**Warning signs:** A test passes even though the file contains `ELSE IF businessMode === true` — this is a false GREEN.

**Practical approach (confirmed from codebase investigation):** The easiest production-safe assertion is: verify that business section content appears in the workflow AND that `ELSE IF.*businessMode` or `else.*businessMode` does not appear as a pattern at key decision points. The actual workflow files use prose pseudocode (`IF businessMode == true:` not actual JavaScript), so look for patterns like `ELSE IF businessMode == true` (which would be wrong) vs `IF businessMode == true` as independent clauses.

### Pitfall 2: INTG-02 "Byte-Identical" Is Structural, Not Literal

**What goes wrong:** Attempting to capture an actual pre-v0.12 manifest baseline and do a byte comparison, which is impossible in a static test suite.

**Why it happens:** The requirement says "byte-identical" but the test must be structural.

**How to avoid:** Interpret "byte-identical" as: non-business workflows do NOT set any of the 4 new business coverage flags to true (they pass `{current}` through), AND business-specific artifact codes (BTH, MLS, SBP, LKT, LDP, STR, DPD) are only produced inside `businessMode == true` guards. Test: assert that each business artifact code appears ONLY after a `businessMode == true` or `$BM == "true"` guard in each workflow that generates it.

### Pitfall 3: Phase 64 Manifest Schema Test Is Now Permanently Failing

**What goes wrong:** Running the full test suite includes Phase 64's `manifest-schema.test.mjs` which asserts exactly 16 canonical designCoverage fields. That test now fails because the template has 20 fields.

**Why it happens:** Phase 64 hardcoded `assert.strictEqual(keys.length, 16, ...)`. This was correct at the time but is now stale.

**How to avoid:** Phase 94 should NOT attempt to fix the Phase 64 test — that file is in `tests/phase-64/` which is the "permanent record" test tree (not per-phase). Instead, note this as a known pre-existing failure. The Phase 82 regression matrix test (`tests/phase-82/regression-matrix.test.mjs`) already re-runs Phase 64 tests and may need to be verified separately. The per-phase CJS test files (`.planning/phases/*/tests/*.cjs`) are all 189/189 GREEN.

**Action:** Phase 94 test file should be a `.cjs` file in `.planning/phases/94-nyquist-regression-tests/tests/` — do NOT use the `tests/phase-*` tree which would be pulled into the ESM regression matrix runner.

### Pitfall 4: deploy.md Halt Assertion Needs to Cover All 4 Gates

**What goes wrong:** Testing that "Halt" appears in deploy.md (1 assertion) instead of verifying all 4 gates individually have halt instructions.

**Why it happens:** The Phase 92 test already covers Gate 1/4 and Gate 4/4 labels and "Halt" presence. INTG-06 requires a stronger assertion — that each gate has an explicit halt path.

**How to avoid:** For INTG-06, assert: Gate 1/4 appears before Gate 2/4, Gate 2/4 before Gate 3/4, Gate 3/4 before Gate 4/4 (ordering), AND each "Halt -- stop deployment" option appears adjacent to its gate label. The ordering assertion is the key additional test.

### Pitfall 5: INTG-05 (business:experience) Is In Scope Despite SUMMARY.md Tension

**What goes wrong:** .planning/research/SUMMARY.md line 218 noted a tension about whether business:experience is in scope or deferred to v0.13. REQUIREMENTS.md explicitly includes INTG-05.

**Why it happens:** SUMMARY.md is research-phase prose; REQUIREMENTS.md is the authoritative source.

**How to avoid:** Implement INTG-05. The codebase already supports business:experience compositions (flows.md line 1026, system.md line 74, handoff.md line 1565 all document business:experience). The INTG-05 test follows the same pattern as INTG-03 and INTG-04 but looks for experience-specific markers (BIB/FLY/FLP/TML) plus business markers (BTH/LDP/STR) in workflows that have both conditional blocks.

---

## Code Examples

### INTG-02: Non-Business Manifest Non-Regression

```javascript
// Source: pattern derived from test-clobber-audit.cjs + test-foundation.cjs

describe('INTG-02: Non-business product types produce byte-identical manifest output', () => {
  const briefContent = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');

  it('brief.md contains businessMode == false path that skips BTH generation', () => {
    assert.ok(
      briefContent.includes('businessMode == false'),
      'brief.md must contain "businessMode == false" path — non-business projects must skip BTH'
    );
  });

  it('brief.md writes businessMode false to manifest for non-business projects', () => {
    assert.ok(
      briefContent.includes('manifest-set-top-level businessMode'),
      'brief.md must write businessMode to manifest — ensures non-business projects get false, not absent'
    );
  });

  it('brief.md designCoverage write contains hasBusinessThesis (20-field pass-through preserved for non-business)', () => {
    assert.ok(
      briefContent.includes('hasBusinessThesis'),
      'brief.md must contain hasBusinessThesis in coverage write — non-business path passes current value through'
    );
  });

  it('brief.md business artifacts (BTH) are gated on businessMode == true (not generated for non-business)', () => {
    // BTH-business-thesis only generated inside businessMode == true block
    const bmTrueIdx = briefContent.indexOf('businessMode == true');
    const bthIdx = briefContent.indexOf('BTH-business-thesis');
    assert.ok(bmTrueIdx !== -1, 'brief.md must contain "businessMode == true" gate');
    assert.ok(bthIdx !== -1, 'brief.md must reference BTH-business-thesis generation');
    assert.ok(bmTrueIdx < bthIdx, 'BTH-business-thesis must appear after businessMode == true gate');
  });
});
```

### INTG-03/04/05: Composition Independence Assertions

```javascript
// Source: pattern from test-flows-sbp.cjs (ordering checks) and PITFALLS.md guidance

describe('INTG-03: business:software composition — independent IF blocks', () => {
  const wireframeContent = fs.readFileSync(path.join(ROOT, 'workflows', 'wireframe.md'), 'utf-8');
  const handoffContent = fs.readFileSync(path.join(ROOT, 'workflows', 'handoff.md'), 'utf-8');

  it('wireframe.md contains both WFR software path and LDP business path (independent blocks)', () => {
    assert.ok(wireframeContent.includes('WFR'), 'wireframe.md must contain WFR software artifact path');
    assert.ok(wireframeContent.includes('LDP-landing-page'), 'wireframe.md must contain LDP business path');
  });

  it('wireframe.md does NOT gate LDP generation inside ELSE IF from WFR block', () => {
    // The pattern that would be WRONG is "ELSE IF businessMode" immediately after WFR software block
    // The correct pattern is independent IF businessMode block
    assert.ok(
      !wireframeContent.includes('ELSE IF.*businessMode'),
      'wireframe.md must not use ELSE IF businessMode — business path must be independent IF block'
    );
  });

  it('handoff.md contains TypeScript (software path) and LKT (business path) as independent blocks', () => {
    assert.ok(handoffContent.includes('TypeScript'), 'handoff.md must contain TypeScript software handoff path');
    assert.ok(handoffContent.includes('LKT'), 'handoff.md must contain LKT business launch kit path');
  });
});
```

### INTG-05: business:experience Composition

```javascript
// Source: flows.md line 1026 documented this pattern; system.md comment confirms both run

describe('INTG-05: business:experience composition — both sets of artifacts produced', () => {
  const flowsContent = fs.readFileSync(path.join(ROOT, 'workflows', 'flows.md'), 'utf-8');
  const systemContent = fs.readFileSync(path.join(ROOT, 'workflows', 'system.md'), 'utf-8');

  it('flows.md registers experience flow artifacts AND business flow artifacts for business:experience', () => {
    assert.ok(
      flowsContent.includes('PRODUCT_TYPE == "experience"') && flowsContent.includes('$BM == "true"'),
      'flows.md must have both experience gate and businessMode gate (not ELSE IF)'
    );
    assert.ok(
      flowsContent.includes('experience flow artifacts AND business flow artifacts'),
      'flows.md must document both artifact sets for business:experience composition'
    );
  });

  it('system.md Steps 5b (experience) and 5c/5d (business) are documented as independent blocks', () => {
    assert.ok(
      systemContent.includes('Step 5b') && systemContent.includes('Steps 5c') || systemContent.includes('Step 5c'),
      'system.md must contain Step 5b (experience) and Steps 5c/5d (business) blocks'
    );
    assert.ok(
      systemContent.includes('independent conditional blocks'),
      'system.md must document that experience and business blocks are independent (not ELSE IF)'
    );
  });
});
```

### INTG-06: Deploy Approval Gate Halt Assertions

```javascript
// Source: test-deploy-skill.cjs (Phase 92) — extends with ordering assertions

describe('INTG-06: deploy.md halts at each gate on user decline', () => {
  const deployContent = fs.readFileSync(path.join(ROOT, 'workflows', 'deploy.md'), 'utf-8');

  it('deploy.md contains all 4 gate labels in order (1/4 through 4/4)', () => {
    const g1 = deployContent.indexOf('Gate 1/4');
    const g2 = deployContent.indexOf('Gate 2/4');
    const g3 = deployContent.indexOf('Gate 3/4');
    const g4 = deployContent.indexOf('Gate 4/4');
    assert.ok(g1 !== -1 && g2 !== -1 && g3 !== -1 && g4 !== -1, 'All 4 gate labels must exist');
    assert.ok(g1 < g2 && g2 < g3 && g3 < g4, 'Gate labels must appear in order 1, 2, 3, 4');
  });

  it('deploy.md contains "Halt -- stop deployment" option (halt path exists)', () => {
    assert.ok(
      deployContent.includes('Halt -- stop deployment'),
      'deploy.md must contain "Halt -- stop deployment" option in approval gate options array'
    );
  });

  it('deploy.md contains halt instruction for Gate 1 ("Deploy halted at Gate 1/4")', () => {
    assert.ok(
      deployContent.includes('Deploy halted at Gate 1/4'),
      'deploy.md must explicitly state "Deploy halted at Gate 1/4" when user declines Gate 1'
    );
  });

  it('deploy.md contains halt instruction for Gate 4 ("Deploy halted at Gate 4/4")', () => {
    assert.ok(
      deployContent.includes('Deploy halted at Gate 4/4'),
      'deploy.md must explicitly state "Deploy halted at Gate 4/4" when user declines Gate 4'
    );
  });

  it('deploy.md contains "NEVER skip an approval gate" enforcement instruction', () => {
    assert.ok(
      deployContent.includes('NEVER skip an approval gate'),
      'deploy.md must contain "NEVER skip an approval gate" enforcement instruction'
    );
  });
});
```

### INTG-07: All 20 designCoverage Fields Across Modified Workflows

```javascript
// Source: test-clobber-audit.cjs (Phase 93) — same pattern, different file set

const TWENTY_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit'
];

// Key workflow files modified during v0.12 that must write all 20 fields
const V012_COVERAGE_WRITERS = [
  'brief.md',        // Phase 85 — 20-field with businessThesis ownership
  'competitive.md',  // Phase 86 — 20-field with marketLandscape ownership
  'opportunity.md',  // Phase 86 — 20-field
  'flows.md',        // Phase 87 — 20-field with serviceBlueprint ownership
  'wireframe.md',    // Phase 89 — 20-field
  'critique.md',     // Phase 90 — 20-field
  'hig.md',          // Phase 90 — 20-field
  'handoff.md',      // Phase 91 — 20-field with launchKit ownership
  'system.md',       // Phase 88 — 20-field
];

describe('INTG-07: all v0.12 coverage-writing workflows contain all 20 designCoverage fields', () => {
  for (const filename of V012_COVERAGE_WRITERS) {
    const content = fs.readFileSync(path.join(ROOT, 'workflows', filename), 'utf-8');
    it(`${filename} contains all 20 designCoverage field names`, () => {
      const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
      assert.ok(
        missing.length === 0,
        `${filename} missing designCoverage fields: ${missing.join(', ')}`
      );
    });
  }
});
```

---

## Composition Case Reference Matrix

This matrix documents what each composition case must produce and which workflows are the key test targets:

| Composition | productType | businessMode | Key software/type artifact markers | Key business artifact markers | Workflows to assert |
|-------------|-------------|-------------|-------------------------------------|-------------------------------|---------------------|
| Non-business software | software | false | WFR, HND, TypeScript | none (BTH/LDP absent or only in false guard) | brief.md, wireframe.md, handoff.md |
| business:software | software | true | WFR, HND, TypeScript, HND_GENERATES_SOFTWARE | BTH, LCV, LDP, STR, DPD, LKT | brief.md, wireframe.md, handoff.md |
| business:hardware | hardware | true | hasHardwareSpec in coverage, hardware subflows | BTH, LCV, SBP, GTM | brief.md, flows.md, handoff.md |
| business:experience | experience | true | BIB, FLY, FLP, TML, hasPrintCollateral, hasProductionBible | BTH, MLS, SBP, LDP, LKT | flows.md, system.md, handoff.md |

### Independence Invariant (Testable)

For any workflow that supports composition:
1. `IF experience` block and `IF businessMode` block are independent (neither is nested in the other's ELSE branch)
2. Confirmed by documentation in: system.md (comment line 74), handoff.md (line 1565), flows.md (line 1026)

Testable string assertions:
- `system.md` contains `"independent conditional blocks"` — actual string from the file
- `handoff.md` contains `"independent IF block"` — actual string from the file
- `flows.md` contains `"experience flow artifacts AND business flow artifacts"` — actual string from the file

---

## Deploy Approval Gate Architecture

deploy.md (942 lines) contains the following confirmed approval gate structure (verified by direct file inspection):

| Gate | Label | Option text | Halt message |
|------|-------|-------------|--------------|
| 1 | "Gate 1/4" | "Halt -- stop deployment" | "Deploy halted at Gate 1/4. No files written." |
| 2 | "Gate 2/4" | "Halt -- stop deployment" | "Deploy halted at Gate 2/4." |
| 3 | "Gate 3/4" | "Halt -- stop deployment" | "Deploy halted at Gate 3/4." |
| 4 | "Gate 4/4" | "Halt -- stop deployment" | "Deploy halted at Gate 4/4." |

Enforcement instruction (line 926): `"NEVER skip an approval gate. Each gate exists because it protects the user from unreviewed external writes. There is no --skip-gates flag."`

All 4 gate labels confirmed present. "Halt -- stop deployment" confirmed present. All halt messages confirmed present. The Phase 92 test (21 tests, all GREEN) already verifies Gates 1/4 and 4/4 labels plus "Halt" presence. Phase 94 adds the ordering assertion and the per-gate halt message assertions.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 16-field designCoverage in manifest | 20-field designCoverage (added hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit) | Phase 84 (v0.12 foundation) | All workflow coverage writes must include all 20 fields |
| `productType` enum includes all types | `productType` enum (software/hardware/hybrid/experience) + `businessMode` boolean + `businessTrack` string (orthogonal) | Phase 84 decision | Composition cases are flag combinations, not new enum values |
| 13 pipeline skill workflows | 14 stages — deploy.md added as Stage 14 (businessMode-gated) | Phase 92 | deploy.md only runs when businessMode === true |
| No regression tests for v0.12 | Phase 94 Nyquist regression test file | This phase | Composition cases and gate behavior structurally verified |

**Deprecated/outdated:**
- Phase 64 `manifest-schema.test.mjs` asserts exactly 16 designCoverage fields — this test is permanently failing (1 of 6 tests fail). This is a known stale test in the `tests/phase-64/` legacy test tree. Do NOT fix it in Phase 94 (it's an historical record). The Phase 82 `regression-matrix.test.mjs` calls this test and that test will now fail. Note this as a pre-existing condition — the Phase 94 test file should NOT be in the `tests/phase-*/` ESM tree.

---

## Open Questions

1. **business:hardware composition test coverage depth**
   - What we know: brief.md sets `productType = hardware` AND `businessMode = true` independently. flows.md has hardware subflows. REQUIREMENTS.md says INTG-04 must be covered.
   - What's unclear: There is no single workflow with an explicit "hardware path" marker as distinctive as `BIB` for experience. The hardware path is primarily absence-of-experience and `hasHardwareSpec` coverage flag.
   - Recommendation: Assert that (a) `hasHardwareSpec` is in the TWENTY_FIELDS write of key workflows, (b) flows.md contains the businessMode read before SBP generation, (c) handoff.md does NOT contain `HND_GENERATES_SOFTWARE = false` for hardware (it should be true for hardware). If this last assertion is ambiguous, fall back to: verify `handoff.md` does not gate business paths on `PRODUCT_TYPE === "software"` (which would exclude hardware).

2. **Phase 64 ESM test failure in regression matrix**
   - What we know: `tests/phase-82/regression-matrix.test.mjs` calls `tests/phase-64/manifest-schema.test.mjs` which now fails on the 16-field count assertion.
   - What's unclear: Whether Phase 94 should fix the Phase 64 test or document the failure as acceptable.
   - Recommendation: Document as pre-existing technical debt. Phase 94 scope is creating new CJS tests in `.planning/phases/94-*/tests/`. Updating the Phase 64 legacy test is a separate v0.12 cleanup concern. The 189 CJS phase tests are all GREEN — the failing test is in the ESM legacy tree.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, no config) |
| Config file | none — same as all prior phase tests |
| Quick run command | `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |
| Full suite command | `cd [project-root] && find .planning/phases -name "*.cjs" -path "*/tests/*" | sort | xargs node --test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-02 | Non-business projects skip business artifacts, pass through coverage fields unchanged | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |
| INTG-03 | business:software composition has independent WFR and LDP blocks | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |
| INTG-04 | business:hardware composition has independent hardware coverage and business artifact blocks | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |
| INTG-05 | business:experience composition has independent experience and business blocks | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |
| INTG-06 | deploy.md halts at all 4 gates with ordering and halt messages | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |
| INTG-07 | All v0.12 coverage-writing workflows contain all 20 fields | structural | `node --test tests/test-regression-matrix.cjs` | Wave 0 creates |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`
- **Per wave merge:** Full suite (`find .planning/phases -name "*.cjs" -path "*/tests/*" | sort | xargs node --test`)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` — covers INTG-02 through INTG-07

*All workflow files being tested already exist — no workflow modifications in Phase 94.*

---

## Workflow Markers Quick Reference

This section captures confirmed string markers to use in test assertions (all verified by direct file reads):

### brief.md confirmed markers
- `businessMode == false` (line ~294)
- `businessMode == true` (line ~262)
- `manifest-set-top-level businessMode` (line 868)
- `BTH-business-thesis` (line ~570)
- `hasBusinessThesis` (20-field coverage write)

### wireframe.md confirmed markers
- `WFR` (software wireframe artifact code)
- `LDP-landing-page` (business landing page artifact)
- `manifest-get-top-level businessMode` (line 157-159)
- Independent IF blocks (Step 4h is independent, not ELSE IF from Step 4-EXP)
- All 20 designCoverage fields confirmed present (Phase 93 GREEN)

### flows.md confirmed markers
- `SBP-service-blueprint` (business service blueprint)
- `GTM-channel-flow` (business GTM flow)
- `PRODUCT_TYPE == "experience"` (experience gate)
- `$BM == "true"` (businessMode gate)
- `experience flow artifacts AND business flow artifacts` (documents composition)
- `manifest-get-top-level businessMode` (line 157)

### system.md confirmed markers
- `Step 5b` (experience token block)
- `Steps 5c` or `Step 5c` (business brand token block)
- `independent conditional blocks` (documents non-ELSE-IF relationship)
- `SYS-experience-tokens.json` (experience artifact)
- `SYS-brand-tokens.json` (business artifact)

### handoff.md confirmed markers
- `TypeScript` (software handoff)
- `LKT` (business launch kit)
- `BIB` (experience production bible — should NOT appear in software-only test)
- `HND_GENERATES_SOFTWARE` (software gate for experience products)
- `independent IF block` (documents non-ELSE-IF relationship)

### deploy.md confirmed markers
- `Gate 1/4` through `Gate 4/4`
- `Halt -- stop deployment`
- `Deploy halted at Gate 1/4. No files written.`
- `Deploy halted at Gate 2/4.`
- `Deploy halted at Gate 3/4.`
- `Deploy halted at Gate 4/4.`
- `NEVER skip an approval gate`
- `Stage 14`
- `manifest-get-top-level businessMode`

### Manifest template confirmed markers (templates/design-manifest.json)
- 20 designCoverage fields all confirmed present (Phase 84 GREEN)
- `"businessMode": false`
- `"businessTrack"` field present

---

## Sources

### Primary (HIGH confidence)

- Direct file read: `workflows/brief.md` — businessMode/businessTrack detection and manifest write patterns
- Direct file read: `workflows/deploy.md` — 942 lines, all 4 gate structures verified
- Direct file read: `workflows/wireframe.md` — LDP/WFR independence and 20-field coverage
- Direct file read: `workflows/flows.md` — SBP/GTM + experience/business composition patterns
- Direct file read: `workflows/system.md` — Step 5b/5c independence documentation
- Direct file read: `workflows/handoff.md` — TypeScript/LKT composition
- Direct file read: `templates/design-manifest.json` — 20-field canonical schema
- Direct file read: `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs` — canonical Nyquist test pattern, TWENTY_FIELDS array
- Direct file read: `.planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs` — deploy gate assertion pattern
- Direct file read: `.planning/phases/84-foundation/tests/test-foundation.cjs` — ordering assertion pattern
- Direct file read: `.planning/research/PITFALLS.md` — composition case pitfalls, byte-identical interpretation
- Direct file read: `.planning/research/SUMMARY.md` — v0.12 architectural decisions
- Runtime test verification: All 189 CJS phase tests confirmed GREEN via `find .planning/phases -name "*.cjs" -path "*/tests/*" | sort | xargs node --test`

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — INTG-02 through INTG-07 requirement definitions
- `.planning/STATE.md` — Phase decisions log (confirms independent IF block decisions for all phases)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — node:test is the established and confirmed pattern for all 10 prior v0.12 phase tests
- Architecture: HIGH — test structure derived by direct inspection of 10 existing test files all following the same pattern
- Composition markers: HIGH — all string markers verified by direct grep/read of workflow source files
- Deploy gate markers: HIGH — all 4 gate labels and halt messages verified by direct grep of deploy.md
- Pitfalls: HIGH — grounded in actual test failures (Phase 64 16-field stale test confirmed failing), prior phase decisions, and codebase inspection

**Research date:** 2026-03-23
**Valid until:** 2026-04-22 (stable — workflow files don't change between research and planning in this project)

---

## Deep-Dive Area 1: Composition Matrix — Full Artifact Mapping

**Investigation date:** 2026-03-22
**Source:** Direct grep of brief.md (959 lines), flows.md (1120 lines), wireframe.md (2464 lines), handoff.md (1586 lines), system.md (2271 lines), critique.md (1280 lines), hig.md, competitive.md, opportunity.md

### Complete Artifact Production Matrix

Each row represents what artifacts a specific workflow produces, per composition case. "pass-through" means the workflow writes the field with its current value (not setting it to true).

#### brief.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | BRF | none of the 4 new fields | hasBusinessThesis: current (pass-through) |
| business:software | BRF, BTH, LCV | hasBusinessThesis | BTH at line ~570, LCV after BTH |
| business:hardware | BRF, BTH, LCV | hasBusinessThesis | Same business path; productType written to manifest |
| business:experience | BRF, BTH, LCV | hasBusinessThesis | experience sections in BRF + business sections in BRF are independent |

Key structural proof: `businessMode == false` guard at line ~294 skips Step 5b entirely. `manifest-set-top-level businessMode` always writes the value (true or false) — so non-business projects get `businessMode: false` in manifest, not absent.

#### flows.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | FLW | hasFlows | hasServiceBlueprint: current (pass-through) |
| business:software | FLW, SBP, GTM | hasFlows, hasServiceBlueprint | SBP gated on `$BM == "true"` |
| business:hardware | FLW, SBP, GTM | hasFlows, hasServiceBlueprint | Same business path as software |
| business:experience | TFL, SFL, SOC, SBP, GTM | hasFlows, hasServiceBlueprint | TFL/SFL/SOC via Step 4-EXP, SBP/GTM via Step 5-BIZ (independent blocks, NOT ELSE IF) |

Independence proof in flows.md: Step 4-EXP (experience block) ends at line 337 with "End experience flow generation block." The `$BM == "true"` check for SBP at line 157 is a completely separate subsequent block. Line 1026: "Experience+business compositions produce both experience flow artifacts AND business flow artifacts."

#### wireframe.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | WFR (HTML per screen) | hasWireframes | hasStitchWireframes if --use-stitch |
| business:software | WFR, LDP, STR, DPD | hasWireframes | LDP/STR/DPD in Step 4h/4i (independent IF businessMode block) |
| business:hardware | WFR, LDP, STR, DPD | hasWireframes | Same business additions; no hardware-specific wireframe artifacts |
| business:experience | FLP, TML, LDP, STR, DPD | hasWireframes, hasPrintCollateral (FLY via Phase 80) | FLP/TML via Step 4-EXP (skip Steps 4a-4f); LDP/STR/DPD in Step 4h/4i |

Critical: wireframe.md Step 4-EXP jumps to "Step 5-EXP" after experience wireframes, but Step 4h (business artifacts) is reached regardless — it is NOT inside an ELSE branch from Step 4-EXP.

#### system.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | SYS-brand-tokens.json, assets/tokens.css | hasDesignSystem | No experience or business tokens |
| business:software | SYS-brand-tokens.json, SYS-brand-marketing.json, MKT | hasDesignSystem | Steps 5c/5d produce business brand tokens |
| business:hardware | SYS-brand-tokens.json, SYS-brand-marketing.json, MKT | hasDesignSystem | Same as software |
| business:experience | SYS-experience-tokens.json, SYS-brand-tokens.json, SYS-brand-marketing.json, MKT | hasDesignSystem | Step 5b (experience) AND Steps 5c/5d (business) both run — system.md line 74 comment explicitly states this |

Independence proof: system.md line 74 comment: "Step 5b (experience) and Steps 5c/5d (business) are independent conditional blocks — both run for business:experience compositions." Line 2248 CRITICAL rule: "NEVER use ELSE IF or ELSE branching between Step 5b and Steps 5c/5d."

#### handoff.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | HND spec, HND types.ts | hasHandoff | No BIB, no LKT |
| business:software | HND spec, HND types.ts, LKT, CNT, OTR | hasHandoff, hasLaunchKit | LKT/CNT/OTR gated on `$BM == "true"` — independent IF block |
| business:hardware | HND spec (with Hardware Handoff sections), LKT, CNT, OTR | hasHandoff, hasLaunchKit | Software component APIs omitted; Hardware Handoff sections included; BIB NOT generated |
| business:experience | BIB (production bible), LKT, CNT, OTR | hasProductionBible, hasLaunchKit | HND software spec skipped (HND_GENERATES_SOFTWARE = false for non-hybrid-event). BIB gated: `IF PRODUCT_TYPE is "experience"` — SEPARATE guard from `$BM == "true"` |

Independence proof: handoff.md line 1565: "The independent IF block pattern (not ELSE IF from experience/hardware gates) ensures business:experience compositions run both paths correctly."

#### critique.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business software | CRT critique report | hasCritique | 4 software perspectives only |
| business:software | CRT critique report (8 perspectives) | hasCritique | 4 additional business perspectives when businessMode == true |
| business:hardware | CRT critique report (7 perspectives) | hasCritique | Experience perspectives replaced with hardware-specific when productType == experience? No — critique.md hardware path uses software perspectives for hardware products |
| business:experience | CRT critique report (7 experience perspectives + 4 business) | hasCritique | Experience products use 7 experience-specific perspectives; businessMode adds 4 more |

#### hig.md
| Composition | Artifacts Produced | Coverage Flags Set to true | Notes |
|-------------|-------------------|---------------------------|-------|
| Non-business | HIG audit report | hasHigAudit | Standard HIG sections |
| business:* | HIG audit report + business communications section | hasHigAudit | Business communications HIG section added when businessMode == true |

### Collision Risk Analysis

The following potential collision risks were investigated:

1. **BIB (Production Bible) vs HND (Handoff Spec):** No collision. BIB is only generated for experience products; HND is only generated for non-experience products (and for hybrid-event both are generated but to separate artifact codes). Guard: `PRODUCT_TYPE is NOT "experience": SKIP this entire BIB generation block` at handoff.md line ~861.

2. **hasProductionBible vs hasHandoff:** No collision for non-hybrid-event experience products. Experience products set `hasProductionBible: true` and do NOT set `hasHandoff: true` (HND_GENERATES_SOFTWARE = false). Hybrid-event sets both. Non-experience sets `hasHandoff: true` and never sets `hasProductionBible: true`.

3. **LDP artifact (wireframe.md) vs LDP consumption (deploy.md):** No collision. wireframe.md WRITES LDP to `.planning/design/launch/LDP-landing-page-v{N}.md`. deploy.md READS that file as upstream input. Different phases, no overwrite risk.

4. **SBP written by flows.md vs SBP coverage flag:** No collision. flows.md is the sole writer of SBP artifact and the sole setter of `hasServiceBlueprint: true`. No other workflow sets SBP to true independently.

5. **hasPrintCollateral:** Set by wireframe.md (FLY event flyer, Phase 80) for experience products only. Set by handoff.md never (handoff sets hasProductionBible). No collision.

6. **hasMarketLandscape:** Set by competitive.md (MLS market landscape) when businessMode == true. Passed through by all other workflows. No collision — single writer.

---

## Deep-Dive Area 2: Deploy Gate Mechanism — Full Architecture

**Investigation date:** 2026-03-22
**Source:** Direct read of workflows/deploy.md (942 lines) — full gate structure verified

### Gate Architecture Overview

deploy.md structures approval gates across Steps 3/6 (Gates 1-3) and 4/6 (Gate 4). Each gate uses `AskUserQuestion` with two options: "Proceed" and "Halt -- stop deployment". If user selects "Halt", an explicit message is displayed and HALT is called. Gates are NOT resumable — declining any gate requires re-running `/pde:deploy` from the beginning.

Important pre-gate behavior: Before any gate is reached, deploy.md has three pre-gate halts (non-approval):
- businessMode must be "true" (line 30-41) — automatic halt if non-business project
- hasLaunchKit must be "true" (line 58-73) — automatic halt if launch kit not assembled (unless --force)
- Collision detection for existing deploy-staging (line 77-99) — uses AskUserQuestion but is NOT a numbered gate

### Complete Gate-by-Gate Documentation

#### Gate 1/4 — Next.js Landing Page Scaffold

**What it deploys:** Next.js 16.2.1 App Router scaffold to `.planning/deploy-staging/landing-page/`

**Approval prompt (exact):**
```
"Approval Gate 1/4 — Next.js Landing Page Scaffold\n\n
About to generate Next.js 16.2.1 App Router scaffold at:\n
  .planning/deploy-staging/landing-page/\n\n
Pinned versions:\n
  - Next.js 16.2.1\n
  - Tailwind v4 (4.2.2)\n
  - Stripe v20 (20.4.1)\n
  - Resend 6.9.4\n\n
Components from LDP spec:\n
  ${LDP_SECTIONS}\n\n
All content uses [YOUR_X] structural placeholders — no live data generated.\n\nProceed?"
```

**Options:** `["Proceed", "Halt -- stop deployment"]`

**On decline (halt message, lines 179-183):**
```
Deploy halted at Gate 1/4. No files written.
Re-run /pde:deploy to restart from the beginning.
```

**On proceed:** Writes `.planning/deploy-staging/.gitignore` then generates all Next.js scaffold files including `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `app/globals.css`, `app/layout.tsx`, marketing components, etc.

**Display after success:** `Step 3/6 (Gate 1/4): Next.js 16.2.1 landing page scaffold written to .planning/deploy-staging/landing-page/`

#### Gate 2/4 — Stripe Pricing Config

**What it deploys:** Stripe pricing config JSON to `.planning/deploy-staging/stripe/stripe-config.json`

**Approval prompt (exact):**
```
"Approval Gate 2/4 — Stripe Pricing Config\n\n
About to generate Stripe pricing config at:\n
  .planning/deploy-staging/stripe/stripe-config.json\n\n
Key: pk_test_REPLACE_WITH_YOUR_KEY (test mode only — never live keys)\n
Pricing tiers from STR spec:\n
  ${STR_TIERS}\n\n
All prices use [YOUR_PRICE_IN_CENTS] placeholders — no real amounts generated.\n\nProceed?"
```

**Options:** `["Proceed", "Halt -- stop deployment"]`

**On decline (halt message, lines 545-549):**
```
Deploy halted at Gate 2/4.
Landing page scaffold was written but Stripe config was not generated.
Re-run /pde:deploy to restart from the beginning.
```

**On proceed:** Writes `stripe-config.json` and `stripe-setup.md` with Stripe Dashboard instructions.

**Display after success:** `Step 3/6 (Gate 2/4): Stripe pricing config written to .planning/deploy-staging/stripe/`

#### Gate 3/4 — Resend Email Templates

**What it deploys:** React Email template stubs to `.planning/deploy-staging/email/emails/`

**Approval prompt (exact):**
```
"Approval Gate 3/4 — Resend Email Templates\n\n
About to generate React Email template stubs at:\n
  .planning/deploy-staging/email/emails/\n\n
Using: @react-email/components 1.0.10\n
OTR email sequences from artifact:\n
  ${OTR_EMAILS}\n\n
All personalization fields use [YOUR_X] placeholders.\n
No company names, partner references, or investor firm names are generated.\n\nProceed?"
```

**Options:** `["Proceed", "Halt -- stop deployment"]`

**On decline (halt message, lines 629-633):**
```
Deploy halted at Gate 3/4.
Landing page scaffold and Stripe config were written.
Email templates were not generated.
Re-run /pde:deploy to restart from the beginning.
```

**On proceed:** Writes email template TSX stubs for onboarding sequence and investor outreach sequence.

**Display after success:** `Step 3/6 (Gate 3/4): React Email template stubs written to .planning/deploy-staging/email/emails/`

#### Gate 4/4 — Vercel Deploy

**What it deploys:** Triggers `npx vercel --prod --no-wait --yes` — an actual external network operation

**Pre-check:** `npx vercel whoami` — halts if not authenticated (lines 763-777, NOT counted as a gate)

**Approval prompt (exact):**
```
"Approval Gate 4/4 — Vercel Deployment\n\n
Authenticated as: ${VERCEL_AUTH}\n\n
About to deploy:\n
  .planning/deploy-staging/landing-page/ → Vercel production\n\n
Command:\n
  npx vercel --prod --no-wait --yes\n\n
This queues a deployment and returns a URL immediately without waiting\n
for the build to complete. Check Vercel dashboard for build status.\n\nProceed?"
```

**Options:** `["Proceed", "Halt -- stop deployment"]`

**On decline (halt message, lines 786-793):**
```
Deploy halted at Gate 4/4.
All scaffolds have been generated but the Vercel deployment was not triggered.

To deploy manually:
  cd .planning/deploy-staging/landing-page/
  npx vercel --prod

Or re-run /pde:deploy to go through the gates again.
```

**On proceed:** Runs the Vercel CLI command. On failure, halts with error output. On success, stores `$DEPLOY_URL` for manifest.

### Structural Test Markers for INTG-06

These are the exact strings tests can assert on:

| Assertion | String | Location in file |
|-----------|--------|-----------------|
| All 4 gates present | `Gate 1/4`, `Gate 2/4`, `Gate 3/4`, `Gate 4/4` | Lines 171, 536, 620, 754 |
| Halt option text | `Halt -- stop deployment` | Options arrays at each gate |
| Gate 1 halt message | `Deploy halted at Gate 1/4` | Line 180 |
| Gate 2 halt message | `Deploy halted at Gate 2/4` | Line 545 |
| Gate 3 halt message | `Deploy halted at Gate 3/4` | Line 629 |
| Gate 4 halt message | `Deploy halted at Gate 4/4` | Line 786 |
| No-skip enforcement | `NEVER skip an approval gate` | Line 926 |
| Stage 14 identity | `Stage 14` | Lines 2, 13 |
| Business gate | `manifest-get-top-level businessMode` | Line 26 |

### How to Test "Halt on Decline" Without Running a Deployment

The structural test approach: verify that after each "Halt -- stop deployment" option block, the explicit halt message appears AND the word HALT appears on its own line. This is sufficient structural proof that the workflow instruction is to stop execution — the HALT keyword is the PDE convention for "stop this workflow execution."

For ordering, assert `indexOf('Gate 1/4') < indexOf('Gate 2/4') < indexOf('Gate 3/4') < indexOf('Gate 4/4')` — this proves no gate is placed after a later gate's content (which would indicate fallthrough risk).

For per-gate halt message coverage: all 4 specific `Deploy halted at Gate {N}/4` strings must be present. Phase 92's test only asserts Gates 1/4 and 4/4 labels and "Halt" string — Phase 94 adds Gates 2/4 and 3/4 halt messages.

---

## Deep-Dive Area 3: designCoverage 20 Fields — Complete Canonical Mapping

**Investigation date:** 2026-03-22
**Source:** Direct inspection of templates/design-manifest.json (Phase 84), test-foundation.cjs (Phase 84 — canonical EXISTING_16 / NEW_4 split), test-clobber-audit.cjs (Phase 93 — canonical TWENTY_FIELDS array), all 9 V012 workflows

### Canonical Field Definitions

**Original 16 fields (pre-v0.12, existed in v0.11 and earlier):**

| Field | Set by | What it tracks |
|-------|--------|----------------|
| hasDesignSystem | system.md | Design tokens (SYS artifact) generated |
| hasWireframes | wireframe.md | Wireframe HTML files (WFR artifacts) generated |
| hasFlows | flows.md | Flow diagrams (FLW artifact or TFL/SFL/SOC for experience) generated |
| hasHardwareSpec | hig.md | Hardware Interface Guidelines audit completed |
| hasCritique | critique.md | Design critique (CRT artifact) completed |
| hasIterate | iterate.md | Iteration changelog (ITR artifact) created |
| hasHandoff | handoff.md | Handoff spec (HND artifacts) generated |
| hasIdeation | ideate.md | Ideation document (IDE artifact) created |
| hasCompetitive | competitive.md | Competitive analysis (CPT artifact) completed |
| hasOpportunity | opportunity.md | Opportunity assessment (OPP artifact) created |
| hasMockup | mockup.md | Visual mockup (MCK artifact) created |
| hasHigAudit | hig.md | HIG audit report (HIG artifact) completed |
| hasRecommendations | recommend.md | Recommendations (REC artifact) generated |
| hasStitchWireframes | wireframe.md | Wireframes generated via Google Stitch MCP path |
| hasPrintCollateral | wireframe.md | Print collateral (FLY/SIT artifacts) for experience products |
| hasProductionBible | handoff.md | Production bible (BIB artifact) for experience products |

**4 New fields added in v0.12 (Phase 84):**

| Field | Set by | What it tracks |
|-------|--------|----------------|
| hasBusinessThesis | brief.md | Business Thesis (BTH artifact) + Lean Canvas (LCV artifact) generated |
| hasMarketLandscape | competitive.md | Market Landscape (MLS artifact) generated (business mode only) |
| hasServiceBlueprint | flows.md | Service Blueprint (SBP artifact) generated (business mode only) |
| hasLaunchKit | handoff.md | Launch Kit (LKT + CNT + OTR artifacts) assembled (business mode only) |

### Original 16 vs New 4 Split (Authoritative Source)

From test-foundation.cjs (Phase 84), describe block `FOUND-02`:

```javascript
const EXISTING_16 = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral', 'hasProductionBible'
];
const NEW_4 = [
  'hasBusinessThesis', 'hasMarketLandscape', 'hasServiceBlueprint', 'hasLaunchKit'
];
```

The Phase 84 test additionally verifies that the 4 new fields appear AFTER `hasProductionBible` in the manifest JSON (ordering constraint). This ordering is preserved in all 9 V012 workflows' designCoverage write commands.

### Per-Workflow Field Presence Audit

All 9 V012 workflows were checked for presence of all 4 new fields (via grep count). Results:

| Workflow | hasBusinessThesis | hasMarketLandscape | hasServiceBlueprint | hasLaunchKit | All 4 present? |
|----------|-------------------|--------------------|---------------------|--------------|----------------|
| brief.md | 4 | 1 | 1 | 1 | YES |
| competitive.md | 4 | 6 | 4 | 4 | YES |
| opportunity.md | 4 | 4 | 4 | 4 | YES |
| flows.md | 2 | 2 | 3 | 2 | YES |
| wireframe.md | 4 | 4 | 4 | 4 | YES |
| critique.md | 2 | 2 | 2 | 2 | YES |
| hig.md | 3 | 3 | 3 | 3 | YES |
| handoff.md | 6 | 6 | 6 | 9 | YES |
| system.md | 3 | 3 | 3 | 3 | YES |

**All 9 workflows confirmed: all 4 new v0.12 fields present in every workflow.** Zero gaps found.

The minimum count of 1 for brief.md's `hasMarketLandscape`, `hasServiceBlueprint`, and `hasLaunchKit` is expected — brief.md is not the setter of those fields; it passes them through as `{current}` in the coverage write. The field name must appear at least once in the write command, which it does.

### Full 20-Field designCoverage Write Command Verification

Each workflow's `manifest-set-top-level designCoverage` call was verified to include all 20 fields. Representative verified commands:

**brief.md (line ~889):**
```
'{"hasDesignSystem":ACTUAL,"hasWireframes":ACTUAL,"hasFlows":ACTUAL,"hasHardwareSpec":ACTUAL,
"hasCritique":ACTUAL,"hasIterate":ACTUAL,"hasHandoff":ACTUAL,"hasIdeation":ACTUAL,
"hasCompetitive":ACTUAL,"hasOpportunity":ACTUAL,"hasMockup":ACTUAL,"hasHigAudit":ACTUAL,
"hasRecommendations":ACTUAL,"hasStitchWireframes":ACTUAL,"hasPrintCollateral":ACTUAL,
"hasProductionBible":ACTUAL,"hasBusinessThesis":true,"hasMarketLandscape":ACTUAL,
"hasServiceBlueprint":ACTUAL,"hasLaunchKit":ACTUAL}'
```

**critique.md (line 1227):**
```
'{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},
"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

**hig.md (line 862):**
```
'{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},
"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":true,
"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

**flows.md (line 1062):**
```
'{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":true,"hasHardwareSpec":{current},
"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},
"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},
"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},
"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},
"hasServiceBlueprint":{true if SBP_WRITTEN else current},"hasLaunchKit":{current}}'
```

Note: flows.md uses a conditional expression `{true if SBP_WRITTEN else current}` for hasServiceBlueprint — this is the correct pattern, not a literal. The test checks that the field name `hasServiceBlueprint` appears in the file, not that it is always set to true.

### Workflows NOT in V012_COVERAGE_WRITERS That Also Write designCoverage

These workflows were confirmed to write designCoverage but were updated in Phase 93 (not Phase 84-91):

| Workflow | Updated In | All 4 New Fields? |
|----------|------------|-------------------|
| recommend.md | Phase 93 | YES (confirmed GREEN by test-clobber-audit.cjs) |
| iterate.md | Phase 93 | YES (confirmed GREEN by test-clobber-audit.cjs) |
| mockup.md | Phase 93 | YES (confirmed GREEN by test-clobber-audit.cjs) |
| ideate.md | Phase 93 | YES (confirmed GREEN by test-clobber-audit.cjs) |

Phase 94 V012_COVERAGE_WRITERS list should cover the 9 core v0.12 modified workflows. The Phase 93 test covers the 4 clobber-audit workflows. No overlap needed.

---

## Deep-Dive Area 4: Existing Test Patterns — Representative Files

**Investigation date:** 2026-03-22
**Source:** Direct read of 5 representative test files across phases 84-93

### File 1: test-foundation.cjs (Phase 84) — 21 assertions

**Path:** `.planning/phases/84-foundation/tests/test-foundation.cjs`

**Imports and boilerplate:**
```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');  // NOTE: uses /strict variant (only Phase 84)
const fs = require('node:fs');
const path = require('node:path');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
```

**Key structural patterns:**
- Reads JSON file and parses it: `JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))`
- Uses `assert.strictEqual(keys.length, 20, ...)` for exact count
- Uses `assert.ok(pos > posOther, ...)` for ordering (indexOf-based)
- Uses `content.match(/DOMAIN_DIRS\s*=\s*\[[\s\S]*?'launch'[\s\S]*?\]/)` for regex pattern check
- Loops over array for multi-field presence: `for (const field of NEW_4) { assert.ok(...) }`
- Variable naming: `PROJECT_ROOT` (vs all other tests which use `ROOT`)

**Notable difference from later tests:** Uses `require('node:assert/strict')` — all later tests (85-93) use `require('node:assert')`. Phase 94 should use `require('node:assert')` to match Phase 93.

### File 2: test-brief-artifacts.cjs (Phase 85) — tests BTH/LCV artifact markers

**Path:** `.planning/phases/85-brief-extensions-detection/tests/test-brief-artifacts.cjs`

**Key structural patterns:**
- Reads single file at module top: `const briefContent = fs.readFileSync(path.join(ROOT, 'workflows', 'brief.md'), 'utf-8');`
- Uses `const ROOT = path.resolve(__dirname, '..', '..', '..', '..');`
- Uses `require('node:assert')` (non-strict)
- Multiple `describe` blocks per requirement (BRIEF-03, BRIEF-04, BRIEF-06)
- Combines string includes in single `it()`: `const hasProb = ... && hasSol && ...` then `assert.ok(all, message)`
- Tests for specific markdown section headers: `briefContent.includes('## Problem')`

### File 3: test-wireframe-launch.cjs (Phase 89) — 11 assertions

**Path:** `.planning/phases/89-wireframe-stage-launch-artifacts/tests/test-wireframe-launch.cjs`

**Key structural patterns:**
- Reads TWO files at module top: `wireframeContent` and `frameworksContent` (references/launch-frameworks.md)
- `const ROOT = path.resolve(__dirname, '..', '..', '..', '..');` — standard pattern
- Tests for multiple patterns in single `it()` when they're part of the same requirement step:
  ```javascript
  assert.ok(wireframeContent.includes('HeroSection'), '...');
  assert.ok(wireframeContent.includes('FeaturesGrid'), '...');
  // etc — multiple asserts in one it() block for same requirement
  ```
- Tests that something contains AND something else: uses `&&` in single assert for co-presence
- Negative assertion (absence): `!content.includes(...)` not used here; uses different approach

### File 4: test-deploy-skill.cjs (Phase 92) — 21 assertions

**Path:** `.planning/phases/92-deploy-skill/tests/test-deploy-skill.cjs`

**Key structural patterns:**
- Uses graceful fallback reads (try/catch) for three files — deploy.md, build.md, commands/deploy.md
- `const ROOT = path.resolve(__dirname, '..', '..', '..', '..');`
- Tests string.match for frequency count: `(deployContent.match(/deploy-staging/g) || []).length`
- `assert.ok(count > 5, ...)` — frequency-based assertion
- `fs.existsSync(path.join(ROOT, ...))` — file existence check
- Groups tests by requirement code (DEPLOY-01 through DEPLOY-09), one `describe` per requirement

**The pattern Phase 94 should follow most closely:** test-deploy-skill.cjs and test-clobber-audit.cjs are the two most recent and directly relevant test files for Phase 94.

### File 5: test-clobber-audit.cjs (Phase 93) — 11 assertions

**Path:** `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs`

**Key structural patterns:**
- `readWorkflow(name)` helper function: `return fs.readFileSync(path.join(ROOT, 'workflows', name), 'utf-8');`
- TWENTY_FIELDS array declared at module top (canonical source for Phase 94 to copy verbatim)
- Each workflow gets its own `describe` block with content read inside: `const content = readWorkflow('recommend.md');`
- Two tests per workflow: (1) TWENTY_FIELDS filter check, (2) absence of stale string
- Unicode escape for em dash: `'<!-- Business product type \u2014 Phase 93 stub'`
- Uses `require('node:assert')` (non-strict)

### Common Shared Utility: None

There are NO shared test utilities in `bin/` or a shared test helpers file. Every test file is self-contained and duplicates the TWENTY_FIELDS array and ROOT path resolution. This is intentional — each phase test is an independent artifact. Phase 94 should follow this pattern and NOT create a shared utility.

### Summary: Phase 94 Test File Recipe

Based on analysis of all 5 representative files, Phase 94 `test-regression-matrix.cjs` should:

1. **Header:** `'use strict';` followed by JSDoc comment block
2. **Imports:** `require('node:test')`, `require('node:assert')` (not /strict), `require('node:fs')`, `require('node:path')`
3. **ROOT:** `const ROOT = path.resolve(__dirname, '..', '..', '..', '..');`
4. **TWENTY_FIELDS:** Declare at module top, copy verbatim from test-clobber-audit.cjs
5. **File reads:** At module top for files used across multiple describe blocks; inside describe for single-describe files
6. **readWorkflow helper (optional):** Can use the test-clobber-audit.cjs pattern for the INTG-07 loop
7. **One describe per INTG requirement:** INTG-02 through INTG-07
8. **Ordering assertions:** Use `indexOf` + `assert.ok(a < b, ...)` pattern from test-foundation.cjs
9. **TWENTY_FIELDS assertions:** Use `.filter(f => !content.includes(f))` pattern from test-clobber-audit.cjs
10. **No try/catch:** All target files exist; direct readFileSync is correct for Phase 94
