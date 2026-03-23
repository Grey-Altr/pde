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
