# Phase 74: Foundation and Regression Infrastructure — Research

**Researched:** 2026-03-21
**Domain:** Extending PDE's product type system to add `experience` as a fourth canonical type, with branch site audit, regression smoke matrix, and disclaimer block template
**Confidence:** HIGH — grounded entirely in direct codebase inspection of the existing implementation

---

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FNDX-01 | PDE detects "experience" product type from brief prompt with 5 sub-types (single-night, multi-day, recurring-series, installation, hybrid-event) | Signal keyword list identified (48 terms); classification logic pattern documented; manifest field `experienceSubType` identified as storage location |
| FNDX-02 | All 14 pipeline workflow files updated with experience branch sites alongside existing software/hardware/hybrid conditionals | All 14 files enumerated; current branch site locations confirmed by grep; branch insertion pattern confirmed from hardware precedent |
| FNDX-03 | Cross-type regression smoke matrix established covering all 4 product types x critical pipeline paths | Test structure pattern confirmed (node:test, .mjs, structural assertions); smoke matrix design documented; 3 critical shared pipeline paths identified |
| FNDX-04 | Sub-types implemented as parametric prompt attributes (not pipeline branches) — locked as Key Decision | Architecture pattern documented; sub-type influence map defined as a closed list; enforcement assertion pattern specified |

</phase_requirements>

---

## Summary

Phase 74 establishes the architectural foundation for the entire v0.11 milestone before any workflow modifications begin. It has three discrete deliverables: (1) adding `experience` as a fourth canonical product type with sub-type detection to `workflows/brief.md`, (2) auditing and adding empty experience branch stubs to all 14 pipeline workflow files, and (3) creating a cross-type regression smoke matrix test file that will guard all subsequent phases.

This phase is not exploratory — the architecture is already fully designed in `.planning/research/`. Every pattern needed here is directly derivable from the existing hardware conditional pattern in `handoff.md` Step 4i and the existing Nyquist test patterns in `tests/phase-64/`. The research role for this phase is to translate prior research into unambiguous implementation specifications for the planner.

The dominant risk is atomicity: the experience detection added to `brief.md` and the branch stubs added to all 14 downstream workflows must land in the same phase. A "add detection in Phase 74, add branch stubs in Phase 75+" window leaves the pipeline in a broken state where `productType: "experience"` propagates to consumers that have no experience branch and will silently fall to the wrong default. The smoke matrix test must be written first (Wave 0) and must catch this class of regression before any workflow file is modified.

**Primary recommendation:** Write `experience-regression.test.mjs` as the first task; add experience detection to `brief.md` second; add experience branch stubs to all 14 downstream files third; update manifest templates and `design.cjs` fourth; add disclaimer block template fifth. This ordering means the regression guard exists before any code changes are made.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:test` | Node.js built-in (v18+) | Test runner for Nyquist regression assertions | Already used in every prior phase; zero npm dependency; `import { test, describe } from 'node:test'` |
| `node:assert/strict` | Node.js built-in | Assertion library | Same pattern used in phases 64-69; strict equality semantics correct for structural file assertions |
| `node:fs` / `node:path` | Node.js built-in | Read workflow .md and .json files in tests | Established pattern in all existing test files |
| `node:child_process` `spawnSync` | Node.js built-in | Run design.cjs self-test, verify pde-tools.cjs commands | Used in phase-64/workflow-pass-through.test.mjs for design.cjs verification |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pde-tools.cjs design manifest-set-top-level` | PDE built-in | Write `productType: "experience"` and `experienceSubType` to manifest | Called in `brief.md` Step 7 after detection; pattern identical to existing `manifest-set-top-level productType` call |
| `pde-tools.cjs design manifest-update` | PDE built-in | Write artifact fields to manifest (experienceSubType, new coverage flags) | Existing command; no changes to the command itself |
| `bin/lib/design.cjs` | PDE built-in | `DOMAIN_DIRS` array for directory creation | Needs `'physical'` added to support print artifact domain in later phases; Phase 74 adds entry now to avoid later breakage |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Structural string-assertion tests | Jest, Vitest, or behavioral tests | `node:test` is zero-dependency and matches all existing tests; switching test frameworks creates inconsistency and npm dependency |
| Structural smoke matrix | End-to-end pipeline execution test | Structural assertions on workflow file content are the established Nyquist pattern; full pipeline execution would require live Claude sessions and is incompatible with the CI model |

**Installation:** No new packages. All test code uses Node.js built-ins.

**Version verification:** No external packages to verify. `node --version` on the target machine confirms Node.js 18+ availability (required for `node:test`).

---

## Architecture Patterns

### Recommended Project Structure

```
tests/
└── phase-74/
    └── experience-regression.test.mjs   # smoke matrix — written FIRST

workflows/
├── brief.md          # MODIFIED: +experience signals in Step 4, +experienceSubType write in Step 7
├── flows.md          # MODIFIED: +experience branch stub (empty conditional block)
├── system.md         # MODIFIED: +experience branch stub
├── wireframe.md      # MODIFIED: +experience branch stub
├── critique.md       # MODIFIED: +experience branch stub
├── iterate.md        # MODIFIED: +experience branch stub
├── handoff.md        # MODIFIED: +experience branch stub in Step 4i conditional
├── ideate.md         # MODIFIED: +experience branch stub
├── competitive.md    # MODIFIED: +experience branch stub
├── opportunity.md    # MODIFIED: +experience branch stub
├── hig.md            # MODIFIED: +experience branch stub
├── recommend.md      # MODIFIED: +experience branch stub
├── mockup.md         # MODIFIED: +experience branch stub
└── build.md          # MODIFIED: +experience noted in valid --from stage names (no new stages in Phase 74)

templates/
├── design-manifest.json   # MODIFIED: productType comment → "software | hardware | hybrid | experience"; add experienceSubType field
└── design-state-root.md   # MODIFIED: +Sub-type row in Quick Reference table

references/
└── experience-disclaimer.md   # NEW: reusable disclaimer block template for critique and handoff

.planning/design/design-manifest.json   # MODIFIED: same changes as template
```

### Pattern 1: Experience Product Type Detection (brief.md Step 4 extension)

**What:** Add experience signals to the Step 4 signal detection logic in `brief.md`, with experience check preceding the hybrid check. The classification logic extends to four types but keeps the `software` default as the final ELSE.

**When to use:** Only in `brief.md` Step 4. All other workflow files read the result, not re-detect.

**Example:**

```
Step 4/7: Detect product type

Experience signals: event, festival, installation, live performance, concert, venue,
capacity, attendees, run-of-show, front-of-house, FOH, backstage, production, PA system,
stage, set design, programme, lineup, artist, performer, act, sponsor, volunteer,
site map, floor plan, acoustic zone, wayfinding, hydration station, first aid,
crowd management, egress, ticket, gateline, wristband, merchandise, bar, catering,
dB, watts, lux, crowd flow, ingress, site plan, temporary structure, marquee, tent

Classification logic:

IF experience signals present AND NOT dominated by software signals:
  product_type = "experience"
  Detect sub_type from secondary signals:
    single-night: "one night", "one-day", "24h", "evening event", single date
    multi-day: "weekend", "multi-day", "festival" (3+ days implied), numbered days
    recurring-series: "monthly", "quarterly", "series", "season", "weekly"
    installation: "installation", "exhibition", "gallery", "open-ended", "visitor-led"
    hybrid-event: both experience AND software signals present with digital product layer
  Default sub_type: "single-night" if no sub-type signals detected
ELSE IF both software AND hardware signals present:
  product_type = "hybrid"
ELSE IF only hardware signals present:
  product_type = "hardware"
ELSE:
  product_type = "software"   ← MUST remain the final default, never an error state
```

Note: Experience detection precedes the hybrid check because experience + software signals (ticketing app, digital display) should resolve to `hybrid-event` sub-type, not `hybrid` product type.

### Pattern 2: Experience Branch Stub (downstream workflow pattern)

**What:** Every downstream workflow receives an empty experience conditional block adjacent to its existing software/hardware/hybrid conditionals. The stub documents where Phase 75+ content will be inserted.

**When to use:** All 13 workflows other than `brief.md`. Added in Phase 74, content filled in by subsequent phases.

**Example (based on handoff.md Step 4i existing pattern):**

```markdown
#### {Step N}: Apply productType conditional

Based on PRODUCT_TYPE:
- "software":    [existing software behavior]
- "hardware":    [existing hardware behavior]
- "hybrid":      [existing hybrid behavior]
- "experience":  [Phase 74: branch stub only — experience-specific content added in Phase 75+]
                 For now: proceed with software path as temporary fallback.
                 Do NOT produce floor plans, production bibles, or experience-specific output
                 until the appropriate downstream phase implements this branch.
- Default (unrecognized type): proceed with software path
```

The stub is NOT a passthrough to software behavior for production use — it is a documented placeholder that makes the branch site visible to grep and to the regression tests. The comment is critical: it documents which future phase fills it in.

### Pattern 3: Regression Smoke Matrix Structure (Nyquist test)

**What:** A single test file that verifies all four product types are handled correctly at the three critical shared pipeline paths: product type detection in brief, branch site presence in all 14 workflows, and no experience content bleeding into non-experience workflows.

**When to use:** Created in Wave 0 of Phase 74 before any workflow edits. Extended by subsequent phases that add cross-type assertions.

**Example:**

```javascript
// experience-regression.test.mjs
// Phase 74 — Foundation and Regression Infrastructure

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

// Source: direct codebase inspection — these 14 files are the pipeline workflow set
const PIPELINE_WORKFLOW_FILES = [
  'workflows/brief.md',
  'workflows/flows.md',
  'workflows/system.md',
  'workflows/wireframe.md',
  'workflows/critique.md',
  'workflows/iterate.md',
  'workflows/handoff.md',
  'workflows/ideate.md',
  'workflows/competitive.md',
  'workflows/opportunity.md',
  'workflows/hig.md',
  'workflows/recommend.md',
  'workflows/mockup.md',
  'workflows/build.md',
];

describe('FNDX-01: experience product type detection in brief.md', () => {
  test('brief.md contains experience signal keywords', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('experience'), 'brief.md missing experience type');
    assert.ok(content.includes('festival') || content.includes('venue'), 'brief.md missing experience signals');
  });

  test('brief.md contains sub-type detection logic', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('single-night'), 'brief.md missing single-night sub-type');
    assert.ok(content.includes('multi-day'), 'brief.md missing multi-day sub-type');
    assert.ok(content.includes('recurring-series'), 'brief.md missing recurring-series sub-type');
    assert.ok(content.includes('installation'), 'brief.md missing installation sub-type');
    assert.ok(content.includes('hybrid-event'), 'brief.md missing hybrid-event sub-type');
  });

  test('brief.md writes experienceSubType to manifest', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    assert.ok(content.includes('experienceSubType'), 'brief.md missing experienceSubType manifest write');
  });

  test('software default remains as final ELSE in brief.md detection', () => {
    const content = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    // experience branch must appear BEFORE the final software fallback
    const expIdx = content.indexOf('experience');
    const softwareDefaultIdx = content.lastIndexOf('product_type = "software"') > -1
      ? content.lastIndexOf('product_type = "software"')
      : content.lastIndexOf("product_type = 'software'");
    assert.ok(expIdx !== -1, 'experience branch not found in brief.md');
    assert.ok(softwareDefaultIdx !== -1, 'software default not found in brief.md');
    assert.ok(expIdx < softwareDefaultIdx, 'experience branch must appear before the software default');
  });
});

describe('FNDX-02: experience branch sites in all 14 pipeline workflow files', () => {
  test('all 14 pipeline workflow files contain experience branch site', () => {
    for (const relPath of PIPELINE_WORKFLOW_FILES) {
      const content = readFileSync(join(ROOT, relPath), 'utf8');
      assert.ok(
        content.includes('experience'),
        `${relPath}: missing experience branch site`
      );
    }
  });
});

describe('FNDX-03: cross-type regression — existing types unaffected', () => {
  test('software type does not appear in experience-only output sections', () => {
    // Phase 74 stub: experience branches must not activate for non-experience types
    // This test grows with each subsequent phase as experience content is added
    const briefContent = readFileSync(join(ROOT, 'workflows/brief.md'), 'utf8');
    // software type string must still appear as a valid resolved value
    assert.ok(
      briefContent.includes('software'),
      'brief.md: software as resolved type must be present'
    );
  });
});

describe('FNDX-04: sub-types as metadata attributes', () => {
  test('no workflow other than brief.md contains sub-type structural branching', () => {
    const nonBriefWorkflows = PIPELINE_WORKFLOW_FILES.filter(f => !f.includes('brief.md'));
    for (const relPath of nonBriefWorkflows) {
      const content = readFileSync(join(ROOT, relPath), 'utf8');
      // Sub-type names in non-brief workflows should only appear in comments or stubs,
      // not as independent IF/ELSE structural branches
      const hasSingleNightBranch = /IF.*single-night|ELSE IF.*single-night/i.test(content);
      assert.ok(
        !hasSingleNightBranch,
        `${relPath}: contains sub-type structural branching (single-night) — must be metadata only`
      );
    }
  });
});
```

### Pattern 4: Manifest Template Extension (design-manifest.json)

**What:** The `productType` field comment in `templates/design-manifest.json` is updated to include `experience`. A new `experienceSubType` field is added at the root level alongside `productType`.

**When to use:** Applied to all 5 manifest JSON files (template + 4 pressure-test fixtures).

**Example:**

```json
{
  "productType": "software | hardware | hybrid | experience",
  "experienceSubType": "single-night | multi-day | recurring-series | installation | hybrid-event | null",
  ...
}
```

The `experienceSubType` field is `null` for non-experience product types. This is a sentinel — if the template still reads 3 values in `productType`, the experience extension is incomplete.

### Pattern 5: Disclaimer Block Template

**What:** `references/experience-disclaimer.md` is a reusable disclaimer block that critique and handoff workflows load via the `@references/` pattern.

**When to use:** Loaded by critique.md and handoff.md in every section that outputs regulatory values. Not used by brief.md, system.md, flows.md, or wireframe.md.

**Example content:**

```markdown
> [VERIFY WITH LOCAL AUTHORITY] — Regulatory requirements (occupancy limits, egress widths,
> noise ordinances, toilet ratios, staffing ratios) vary significantly by jurisdiction and are
> updated frequently. All numerical values in this section represent industry guidance ranges,
> not applicable regulations. Verify every compliance threshold with your local authority having
> jurisdiction (AHJ), fire marshal, and relevant licensing authority before finalizing.
```

### Anti-Patterns to Avoid

- **Splitting detection from branch stubs across phases:** The `experience` product type added to `brief.md` Step 4 MUST land in the same commit as branch stubs in all 14 downstream workflows. A pipeline where `productType: "experience"` propagates downstream but downstream workflows have no experience branch falls to wrong defaults silently.
- **Sub-type as structural branch:** Never write `IF sub_type === "installation"` in any workflow other than `brief.md`. Sub-type drives parametric content generation (prompts get sub_type context), not conditional code paths.
- **Omitting the final software ELSE:** The detection chain in `brief.md` must end with `ELSE: product_type = "software"` — never `ELSE IF experience`. Removing the catch-all default breaks projects with no product type signals.
- **Using `experience` as the new ELSE catch-all:** Adding `experience` as the last ELSE (instead of keeping software as default) would make any ambiguous project an experience project.
- **New workflow files for experience:** All experience behavior lives as conditional blocks in existing workflow files. New files (`experience-brief.md`) break `--from` stage resumption in `build.md` and double the skill count.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Product type storage and propagation | Custom state mechanism | `pde-tools.cjs design manifest-set-top-level productType experience` + existing manifest read pattern | Already proven by software/hardware/hybrid types; same command, same consumers |
| Cross-type regression testing | Custom test harness | `node:test` with structural string assertions on workflow .md files | Established Nyquist pattern; zero npm dependencies; matches all existing tests in phases 64-69 |
| Disclaimer block management | Inline disclaimers in each workflow | `references/experience-disclaimer.md` loaded via `@references/` pattern | Single source of truth; the same pattern used by `wcag-baseline.md`, `mcp-integration.md`, etc. |
| Sub-type branching infrastructure | Separate workflow files per sub-type | `experienceSubType` field in manifest + parametric prompt calibration | Sub-types as structural branches create 40 branch points (5 × 8 stages); metadata approach creates 8 |

**Key insight:** Every mechanism needed for Phase 74 already exists in the codebase — product type detection, manifest storage, test patterns, reference file loading. This phase extends existing patterns, not builds new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Default-ELSE Regression — Existing Types Silently Fall into Experience Branch

**What goes wrong:** Adding `ELSE IF experience` to a branch chain that previously ended with `ELSE: software` removes the software catch-all. Projects with ambiguous signals or no product type signals fall to error states.

**Why it happens:** The natural edit is to add the new branch as the final `ELSE IF` and let the old `ELSE` become unreachable. The old `ELSE` is "cleaned up."

**How to avoid:** The required pattern at every branch site is `IF software ... ELSE IF hardware ... ELSE IF hybrid ... ELSE IF experience ... ELSE [software default, never error]`. The regression smoke matrix test `FNDX-01` assertion #4 verifies the software default appears after the experience branch.

**Warning signs:** A project with no signals in PROJECT.md throws an error or produces experience output. The DESIGN-STATE.md `| Product Type |` row shows `experience` for a previously-classified software project.

### Pitfall 2: Branch Site Atomicity Failure

**What goes wrong:** Experience detection is added to `brief.md` in Task 1, but branch stubs in downstream workflows are added in Tasks 2-14. Between these tasks, the pipeline is broken — `productType: "experience"` propagates to consumers with no experience branch.

**Why it happens:** Task ordering that treats detection and stub insertion as separate concerns.

**How to avoid:** The smoke matrix test (`FNDX-02`) checks for experience branch sites in all 14 files. If the test is run after each wave, it will fail until all stubs are in place. Structure wave tasks so all 14 workflow stubs land in a single wave.

**Warning signs:** Running the smoke matrix test after Task 1 (brief.md detection) shows failures in all 13 other files — this is expected and normal if stubs aren't yet written. The test should not be considered passing until all 14 files have stubs.

### Pitfall 3: Sub-Type Scope Creep in Phase 74

**What goes wrong:** While adding branch stubs, a developer adds sub-type-specific content to flows.md or wireframe.md: "while I'm here, I'll add the installation floor plan orientation." This creates sub-type structural branches in Phase 74 before the sub-type architecture decision is formally locked.

**Why it happens:** The sub-type influence map is meaningful and the temptation to fill in details while touching files is strong.

**How to avoid:** Phase 74 branch stubs are EMPTY — they are comment-only placeholders. Any content in the experience branch of a non-brief workflow is out of scope for Phase 74. The `FNDX-04` test catches this.

**Warning signs:** Any workflow file other than `brief.md` contains `IF sub_type === "installation"` or similar constructs after Phase 74.

### Pitfall 4: Manifest Template Desync

**What goes wrong:** The live manifest (`.planning/design/design-manifest.json`) is updated with `experienceSubType` but the template (`templates/design-manifest.json`) and the four pressure-test fixtures are not. Downstream schema validation tests (like phase-64's manifest-schema.test.mjs) fail.

**Why it happens:** There are 5 manifest JSON files that must all stay in sync — easy to miss the fixture files.

**How to avoid:** The planner must include all 5 manifest files in the manifest update task. Test the update by running the existing phase-64 schema tests after the change.

**Warning signs:** `tests/phase-64/manifest-schema.test.mjs` fails after Phase 74 changes.

### Pitfall 5: Disclaimer Block Not Referenced in Workflows

**What goes wrong:** `references/experience-disclaimer.md` is created but no `@references/experience-disclaimer.md` include appears in `critique.md` or `handoff.md`. The disclaimer exists on disk but is never loaded.

**Why it happens:** Creating the file is a separate task from wiring it into the workflows.

**How to avoid:** Phase 74 should add the `@references/experience-disclaimer.md` stub to the `<required_reading>` blocks of critique.md and handoff.md even though those workflows won't use it until Phases 79 and 81. This makes the wiring visible to grep from Phase 74 forward.

**Warning signs:** `grep -rn "experience-disclaimer" workflows/` returns no matches.

---

## Code Examples

### Example 1: Experience Branch Stub (applicable to any downstream workflow)

```markdown
<!-- Source: direct derivation from handoff.md Step 4i existing hardware pattern -->
<!-- Pattern: PRODUCT_TYPE conditional, experience branch stub -->

Based on PRODUCT_TYPE:
- "software":    [existing software behavior unchanged]
- "hardware":    [existing hardware behavior unchanged]
- "hybrid":      [existing hybrid behavior unchanged]
- "experience":  Phase 74 stub — experience-specific content added in subsequent phases.
                 Current behavior: log "Experience product type detected — {sub-phase} implementation pending"
                 and proceed with software path as temporary fallback.
                 NEVER produce floor plans, production bibles, or experience token files from this stub.
- Default:       proceed with software path (safety net — should not be reached after Phase 74)
```

### Example 2: experienceSubType Manifest Write (brief.md Step 7 extension)

```bash
# Source: direct derivation from existing manifest-set-top-level productType pattern in brief.md Step 7
# Runs after the existing productType write:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level productType experience
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level experienceSubType {sub_type}
```

Where `{sub_type}` is one of: `single-night`, `multi-day`, `recurring-series`, `installation`, `hybrid-event`.

For non-experience types, `experienceSubType` is written as `null` (not omitted — presence of the field with null value is the sentinel that Phase 74 ran).

### Example 3: DESIGN-STATE.md Quick Reference Extension (brief.md Step 7)

```markdown
<!-- Source: existing brief.md Step 7 DESIGN-STATE Quick Reference section pattern -->
<!-- Adds Sub-type row when product_type is experience -->

| Product Type | experience |
| Sub-type     | {sub_type} |
| Platform     | physical   |
```

For non-experience types, the Sub-type row is omitted (not written as empty — absence signals non-experience type).

### Example 4: Manifest JSON Schema Extension

```json
// Source: direct derivation from templates/design-manifest.json
// Adds after the existing "productType" field:
{
  "schemaVersion": "1.0.0",
  "projectName": "string -- project name from design brief",
  "productType": "software | hardware | hybrid | experience",
  "experienceSubType": "single-night | multi-day | recurring-series | installation | hybrid-event | null",
  "outputRoot": "string -- path to output directory",
  ...
}
```

### Example 5: Smoke Matrix Test Running

```bash
# Run the smoke matrix against all 14 workflow files:
node --test tests/phase-74/experience-regression.test.mjs

# Expected output for Phase 74 (after all 14 stubs are in place):
# tests 10
# pass 10
# fail 0
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 3 product types (software, hardware, hybrid) | 4 product types (software, hardware, hybrid, experience) | Phase 74 | All downstream workflow conditionals must be audited for the 4th branch |
| No sub-type concept in manifest | `experienceSubType` metadata field | Phase 74 | Sub-types are manifest attributes, not workflow branches |
| No event/experience signals in brief detection | 48 experience signal keywords added to Step 4 | Phase 74 | Projects with event terminology now correctly resolve to experience type |
| No regulatory disclaimer infrastructure | `references/experience-disclaimer.md` reusable template | Phase 74 | Available to critique and handoff from Phase 74 forward |

**Pattern confirmed unchanged:** The `manifest-set-top-level` command and the `designCoverage` pass-through-all pattern are unchanged. Phase 74 adds `experienceSubType` alongside `productType` using the exact same command pattern.

---

## Open Questions

1. **Exact count of "14 pipeline workflow files"**
   - What we know: From `tests/phase-64/workflow-pass-through.test.mjs`, the 12 design-coverage-updating files are: wireframe, mockup, system, flows, critique, iterate, handoff, ideate, competitive, opportunity, hig, recommend. Plus `brief.md` = 13. Plus `build.md` = 14.
   - What's unclear: `build.md` does not update `designCoverage` but does reference all stage names. Whether it counts as a "pipeline workflow file" for branch site purposes is ambiguous.
   - Recommendation: Include `build.md` in the audit (as the 14th) since it references valid `--from` stage names and product type context. The smoke matrix test should include all 14 files.

2. **`iterate.md` experience branch behavior**
   - What we know: `/pde:iterate` applies critique action items iteratively. For experience products, critique action items will eventually include floor plan revisions, not wireframe revisions.
   - What's unclear: Whether `iterate.md` needs an experience stub in Phase 74 or can remain unchanged until Phase 79 (when critique gets experience perspectives).
   - Recommendation: Add a Phase 74 stub to `iterate.md` for consistency — even if the stub is empty until Phase 79. This ensures the smoke matrix test counts 14/14 from Phase 74 forward.

3. **`physical` domain in design.cjs DOMAIN_DIRS**
   - What we know: The existing `DOMAIN_DIRS` in `bin/lib/design.cjs` does not include `physical`. The STACK.md research notes that `physical` is needed for print artifacts (FLY, POS) in Phase 80.
   - What's unclear: Whether adding `physical` to `DOMAIN_DIRS` in Phase 74 (ahead of Phase 80) is safe or creates empty directories prematurely.
   - Recommendation: Add `physical` to `DOMAIN_DIRS` in Phase 74 as a non-breaking additive change. Empty directories are harmless; they are created by `ensure-dirs` only on demand.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` (no version beyond Node.js 18+) |
| Config file | None — tests are standalone .mjs files |
| Quick run command | `node --test tests/phase-74/experience-regression.test.mjs` |
| Full suite command | `node --test tests/phase-74/*.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FNDX-01 | `brief.md` contains experience signal keywords and sub-type detection | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |
| FNDX-01 | `brief.md` writes `experienceSubType` to manifest | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |
| FNDX-01 | software default remains as final ELSE in brief.md | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |
| FNDX-02 | All 14 pipeline workflow files contain experience branch site | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |
| FNDX-03 | Cross-type regression: software type still resolves correctly | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |
| FNDX-04 | No sub-type structural branching outside brief.md | structural | `node --test tests/phase-74/experience-regression.test.mjs` | Wave 0 |

Additionally, the existing `tests/phase-64/manifest-schema.test.mjs` must continue to pass after manifest schema changes. The planner should include this verification step at the end of Phase 74.

### Sampling Rate

- **Per task commit:** `node --test tests/phase-74/experience-regression.test.mjs`
- **Per wave merge:** `node --test tests/phase-74/*.mjs && node --test tests/phase-64/manifest-schema.test.mjs`
- **Phase gate:** Both phase-74 and phase-64 test suites green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-74/experience-regression.test.mjs` — covers FNDX-01, FNDX-02, FNDX-03, FNDX-04
  - Must be written BEFORE any workflow edits so that failing tests verify broken pre-state

---

## Sources

### Primary (HIGH confidence)

- `workflows/brief.md` (direct codebase inspection) — Step 4 product type detection logic (lines 172-188); Step 7 manifest-set-top-level pattern (lines 510-511); existing 3-type classification logic verified as the extension point
- `workflows/handoff.md` (direct codebase inspection) — Step 4i PRODUCT_TYPE conditional pattern (lines 511-516); hardware branch is the exact precedent for the experience branch stub
- `tests/phase-64/workflow-pass-through.test.mjs` (direct codebase inspection) — canonical 12-workflow list; test structure and assertion patterns; `spawnSync` design.cjs self-test pattern
- `tests/phase-64/manifest-schema.test.mjs` (direct codebase inspection) — manifest field assertion pattern; 5-file manifest list; CANONICAL_FIELDS pattern
- `tests/phase-69/stitch-detection.test.mjs` (direct codebase inspection) — `describe()` + `test()` nested structure; workflow content assertion patterns
- `templates/design-manifest.json` (direct codebase inspection) — existing `productType` field definition; `designCoverage` schema; artifact entry structure
- `.planning/design/design-manifest.json` (direct codebase inspection) — live manifest schema verification; confirmed `experienceSubType` absent pre-Phase 74
- `.planning/research/ARCHITECTURE.md` (project research, 2026-03-21) — product type dispatch pattern; 8 affected workflow files; sub-type architecture decision; data flow diagram
- `.planning/research/PITFALLS.md` (project research, 2026-03-21) — Pitfall 1 (default-else regression); Pitfall 6 (sub-type scope creep); Pitfall 7 (missing cross-type regression tests); all mitigation strategies
- `.planning/research/STACK.md` (project research, 2026-03-21) — new artifact codes; DTCG extension approach; no new npm packages needed
- `.planning/research/SUMMARY.md` (project research, 2026-03-21) — Phase 1 deliverables; architecture confidence HIGH
- `bin/lib/design.cjs` (direct codebase inspection) — `cmdManifestSetTopLevel` implementation; `DOMAIN_DIRS` array location
- `workflows/build.md` (direct codebase inspection) — 13 STAGES table; `--from` stage name list; pipeline orchestration pattern

### Secondary (MEDIUM confidence)

- `.planning/ROADMAP.md` Phase 74 success criteria — authoritative definition of the 14 pipeline workflow files requirement; cross-type regression smoke matrix scope
- `.planning/STATE.md` — confirmed "all experience behavior lives as conditional blocks in existing workflow files" as locked architectural decision; disclaimer block required by critique and handoff

### Tertiary (LOW confidence)

- None — all findings are grounded in direct codebase inspection or project-defined locked decisions

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — `node:test` is the established pattern; confirmed across 6 phases of test history
- Architecture: HIGH — fully derivable from direct codebase inspection; hardware conditional is proven precedent
- Pitfalls: HIGH — all three critical pitfalls (atomicity, default-else regression, sub-type scope creep) derived from codebase structure and prior research; not speculative

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable domain — no external dependencies; codebase is the reference)
