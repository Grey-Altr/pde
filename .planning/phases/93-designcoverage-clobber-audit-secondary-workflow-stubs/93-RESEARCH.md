# Phase 93: designCoverage Clobber Audit + Secondary Workflow Stubs — Research

**Researched:** 2026-03-22 (deep re-investigation pass)
**Domain:** PDE workflow audit — designCoverage write integrity, businessMode/businessTrack branching consistency, experience-stub replication
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTG-01 | All 14+ designCoverage-writing workflows verified to include all 20 fields in their write calls (pass-through-all pattern preserved) | Deep file reads confirmed: 4 workflows are 16-field regressions (recommend.md line 590, iterate.md line 455, mockup.md line 1432, ideate.md line 694). 9 workflows confirmed 20-field compliant. Exact line numbers documented. |
| INTG-08 | `businessTrack` branching consistency verified across all modified workflows — `grep -rn "businessTrack"` hit count matches `grep -rn "businessMode"` hit count in workflows/ | Per-file counts tabulated: build.md has 7 businessMode refs but 0 businessTrack refs by design (orchestrator does not branch on BT). recommend/iterate/mockup have 0 of both and need business stubs. Current totals: 60 businessMode vs 40 businessTrack. INTG-08 literal count test is not achievable — per-file presence test is the correct implementation. |
</phase_requirements>

---

## Summary

Phase 93 is an audit-and-patch phase. It does not build new features — it corrects two categories of regression introduced when designCoverage grew from 16 to 20 fields in Phase 84 but four workflows were not updated.

**Category 1 — 16-field clobber regression:** Four workflows still write a 16-field designCoverage object: recommend.md, iterate.md, mockup.md, and ideate.md. When any of these run after a business-mode workflow has set hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, or hasLaunchKit to true, those four flags are silently clobbered back to absent. The `manifest-set-top-level` command performs flat replacement — `manifest["designCoverage"] = value` — replacing the entire designCoverage object with whatever JSON is passed. A 16-field write is destructive to a 20-field manifest.

**Category 2 — businessTrack branching gap:** Three workflows (recommend.md, iterate.md, mockup.md) have no businessMode or businessTrack branching at all and need `<!-- Business product type -->` comment stubs matching the v0.11 experience stub pattern. ideate.md also has zero businessMode/businessTrack references, but is not in the Success Criterion 3 list for stubs — only a 20-field fix is required for ideate.md.

**INTG-08 interpretation:** The literal grep count equality (60 businessMode vs 40 businessTrack) cannot be achieved through stub additions alone. Adding stubs to 3 workflows adds roughly equal counts of both strings, leaving the gap unchanged structurally. The root cause is that businessMode appears in more contexts (gate conditions, reads, IMPORTANT comments) while businessTrack only appears in depth-branching sections. The correct Nyquist test is per-file presence, not global count equality.

**Primary recommendation:** Fix the 4 sixteen-field workflows to write 20 fields (INTG-01). Add `<!-- Business product type — Phase 93 stub -->` comments to recommend.md, iterate.md, and mockup.md, placed immediately after their respective experience stubs (INTG-08 / Success Criterion 3). Nyquist tests assert per-file structural presence.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node:test | built-in | Nyquist structural assertion tests | Established pattern across all PDE phase tests (phases 84–92) |
| node:fs | built-in | File reads for test assertions | Same pattern as test-flows-sbp.cjs, test-foundation.cjs, test-handoff-launch-kit.cjs |
| node:assert | built-in | Assertion library | Same as all prior phase tests |
| node:path | built-in | Path resolution | All tests use `path.resolve(__dirname, '..', '..', '..', '..')` to reach ROOT |

### No External Dependencies

This phase makes no changes to package.json. All fixes are workflow markdown edits and a new structural test file. No npm installs required.

---

## Architecture Patterns

### Canonical 20-Field designCoverage Write Pattern

Every designCoverage write in PDE follows this pattern (HIGH confidence — verified by direct file read across 9 compliant workflows: brief.md, competitive.md, opportunity.md, flows.md, wireframe.md, system.md, critique.md, hig.md, handoff.md):

```bash
# Step 1: Read current state
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Step 2: Parse all 20 fields from COV output, default absent to false

# Step 3: Write full 20-field object, setting owned flag to true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

**Canonical field order (20 fields) — verified from templates/design-manifest.json which has exactly 20 non-comment fields:**

1. hasDesignSystem
2. hasWireframes
3. hasFlows
4. hasHardwareSpec
5. hasCritique
6. hasIterate
7. hasHandoff
8. hasIdeation
9. hasCompetitive
10. hasOpportunity
11. hasMockup
12. hasHigAudit
13. hasRecommendations
14. hasStitchWireframes
15. hasPrintCollateral
16. hasProductionBible
17. hasBusinessThesis ← Phase 84 addition
18. hasMarketLandscape ← Phase 84 addition
19. hasServiceBlueprint ← Phase 84 addition
20. hasLaunchKit ← Phase 84 addition

**IMPORTANT note update required:** All 4 regression workflows have IMPORTANT notes saying "ALWAYS write all 16 fields" and list only 16 fields in their canonical order text. These prose sections must also be updated to "20 fields" and include the 4 new field names.

**Placeholder variable naming inconsistency between regression workflows:**
- recommend.md uses `{current_hasDesignSystem}`, `{current_hasWireframes}`, etc. (per-field names)
- iterate.md, mockup.md, ideate.md use `{current}` for all pass-through fields

The corrected writes should match the convention of the file being edited. The test only checks for field name presence, not placeholder variable names.

### Clobber Mechanism — Traced to Implementation

The `manifest-set-top-level` command implementation (verified in `bin/lib/design.cjs` line 264):

```javascript
function cmdManifestSetTopLevel(cwd, field, value, raw) {
  const manifest = readManifest(cwd);
  manifest[field] = value;  // ← FLAT REPLACEMENT, no merge
  writeManifest(cwd, manifest);
  output(manifest, raw);
}
```

`manifest["designCoverage"] = value` where `value` is `args[3]` (the JSON string passed as CLI arg). This performs a complete replacement of the designCoverage key. There is no merge, no field preservation. A 16-field write sent to this function destroys all 4 business fields that may have been set by a prior workflow.

This is the exact clobber mechanism. It is intentional by design (the read-before-set pattern is the defensive layer, not the tool itself).

### Experience Stub Pattern (v0.11 — to be replicated for business stubs)

Three experience stubs confirmed by direct file read (exact line numbers):

**recommend.md line 199** (inside Step 4, after `product_type` bullet):
```html
<!-- Experience product type — Phase 74 stub: recommendations apply to experience tooling (venue management software, event production tools, crowd management systems, ticketing platforms). Experience-specific tool recommendations added in subsequent phases. Current behavior: proceed with software tool recommendation path as temporary fallback for experience product type. -->
```

**iterate.md line 10** (immediately after `</purpose>`, before `<flags>`):
```html
<!-- Experience product type — Phase 74 stub: experience iteration targets floor plan revisions (FLP), run-of-show updates (TML), and signage adjustments rather than wireframe HTML. Added in Phase 79 after critique experience perspectives are established. Current behavior: proceed with wireframe iteration path as temporary fallback for experience product type. NEVER apply wireframe iteration to experience floor plans from this stub. -->
```

**mockup.md line 154** (inside section 2d, after soft dependency list):
```html
<!-- Experience product type — Phase 74 stub: experience mockup extensions (signage mockups, wayfinding panels, wristband designs, site map renders) added in later phases. Current behavior: proceed with software mockup path as temporary fallback for experience product type. NEVER produce physical experience design mockups from this stub. -->
```

**ideate.md line 536** (inside Product Type section of ideation template — exists but not in scope for business stub):
```html
<!-- Experience product type — Phase 74 stub: experience ideation follows the same divergent concept generation pattern. Experience-specific ideation extensions (venue layouts, run-of-show concepts, spatial experience concepts) added in subsequent phases. Current behavior: proceed with software ideation path as temporary fallback for experience product type. -->
```

**Business stub placement rule:** Place immediately after the existing experience stub in each file (same structural context, next line or paragraph after the experience comment).

### Nyquist Test Pattern (established across phases 84–92)

All PDE Nyquist tests follow this structure — verified from test-flows-sbp.cjs (Phase 87 most recent coverage-field test):

```javascript
'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Read workflow file once at module level (graceful try/catch not required — file will exist)
const content = fs.readFileSync(path.join(ROOT, 'workflows', 'target.md'), 'utf-8');

describe('REQUIREMENT-ID: description', () => {
  it('assertion description', () => {
    assert.ok(content.includes('expected-string'), 'failure message');
  });
});
```

**OPS-03 test pattern from Phase 87 (most relevant precedent for INTG-01):**
```javascript
it('flows.md coverage write contains all 20 designCoverage fields', () => {
  const TWENTY_FIELDS = [
    'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
    'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
    'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
    'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
    'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
    'hasServiceBlueprint', 'hasLaunchKit'
  ];
  const missing = TWENTY_FIELDS.filter(field => !content.includes(field));
  assert.ok(
    missing.length === 0,
    `flows.md must contain all 20 canonical designCoverage field names. Missing: ${missing.join(', ')}`
  );
});
```

This array-based "missing fields" pattern is the established precedent. Use it for Phase 93 INTG-01 tests.

---

## Complete Audit Findings

### INTG-01: 20-Field Compliance Per Workflow

**All workflows using designCoverage (confirmed by `grep -rln "coverage-check|designCoverage" workflows/`):**

| Workflow | Fields Written | Missing Fields | Line(s) | Status |
|----------|---------------|----------------|---------|--------|
| brief.md | 20 | none | ~889 | COMPLIANT |
| competitive.md | 20 | none | 711 | COMPLIANT |
| opportunity.md | 20 | none | 544 | COMPLIANT |
| flows.md | 20 | none | 1062 | COMPLIANT |
| wireframe.md | 20 | none | 2383, 2386, 2389 (3 write variants) | COMPLIANT |
| system.md | 20 | none | 2173 | COMPLIANT |
| critique.md | 20 | none | 1227 | COMPLIANT |
| hig.md | 20 | none | 862 | COMPLIANT |
| handoff.md | 20 | none | 1458, 1461, 1464, 1467 (4 write variants) | COMPLIANT |
| **recommend.md** | **16** | hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit | **590** | **REGRESSION** |
| **iterate.md** | **16** | hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit | **455** | **REGRESSION** |
| **mockup.md** | **16** | hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit | **1432** | **REGRESSION** |
| **ideate.md** | **16** | hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit | **694** | **REGRESSION** |
| build.md | N/A — reads designCoverage flags but never writes | — | — | N/A (reader only) |
| pressure-test.md | N/A — reads coverage-check but never writes | — | — | N/A (reader only) |
| deploy.md | N/A — reads hasLaunchKit but never writes | — | — | N/A (reader only) |

**Result:** 4 regressions requiring patch. All 4 are missing the same 4 fields (the Phase 84 additions). Zero additional regressions found beyond the 4 identified in prior research.

**IMPORTANT note regression markers (must also be updated in each file):**
- recommend.md line 595: `"Always pass the complete 16-field JSON object."` → must say 20-field
- iterate.md line 452: `"Extract ALL sixteen current flag values"` + line 455 inline JSON ends at hasProductionBible → must say twenty
- mockup.md line 1435: `"ALWAYS write all 16 fields. Canonical field order: ... hasProductionBible."` → must say 20 and include 4 new fields
- ideate.md line 697: `"ALWAYS write all 16 fields. The canonical field order is: ... hasProductionBible."` → must say 20 and include 4 new fields

### INTG-08: businessMode/businessTrack Per-File Counts

Raw grep counts across all `workflows/*.md` (VERIFIED by direct grep):
- `businessMode`: **60** occurrences
- `businessTrack`: **40** occurrences
- Gap: **20**

**Per-file breakdown:**

| File | businessMode | businessTrack | Gap | Notes |
|------|-------------|---------------|-----|-------|
| brief.md | 22 | 9 | 13 | BM gates many sections; BT gates depth within those sections |
| competitive.md | 7 | 6 | 1 | Nearly balanced — BT used for depth variants |
| deploy.md | 7 | 3 | 4 | BM gates the deploy stage; BT used for 3 places |
| build.md | **7** | **0** | **7** | Orchestrator-only: gates Stage 14 on BM, never branches on BT |
| opportunity.md | 6 | 1 | 5 | BM gates business framing section; BT mentioned once |
| wireframe.md | 3 | 10 | -7 | BT-heavy: 3 track variants per wireframe section |
| handoff.md | 3 | 2 | 1 | Balanced |
| system.md | 2 | 4 | -2 | BT-heavy: brand token depth variants |
| hig.md | 1 | 1 | 0 | Balanced |
| flows.md | 1 | 3 | -2 | BT-heavy: SBP depth adapts per track |
| critique.md | 1 | 1 | 0 | Balanced |
| recommend.md | **0** | **0** | 0 | No branching — needs business stub |
| iterate.md | **0** | **0** | 0 | No branching — needs business stub |
| mockup.md | **0** | **0** | 0 | No branching — needs business stub |
| ideate.md | **0** | **0** | 0 | No branching — no stub required per success criteria |

**Key structural finding:** build.md's 7-vs-0 gap is the dominant contributor. build.md is intentionally businessMode-only: it reads BM to gate Stage 14 inclusion, but never needs to branch on businessTrack because the orchestrator runs workflows — it does not generate content where track-depth variation applies. Adding businessTrack to build.md would be wrong.

**After adding 3 stubs (recommend, iterate, mockup):** Each stub introduces ~1 businessMode mention and ~1 businessTrack mention. Totals become approximately 63 vs 43. The global gap does not converge to zero. The INTG-08 requirement intent is structural (per-file presence), not literal count equality.

### Downstream Consumer Impact Analysis

Workflows that READ designCoverage but do not write it:

| Workflow | What it reads | Impact if hasLaunchKit clobbered |
|----------|--------------|----------------------------------|
| build.md | All coverage flags to determine stage completion | Clobbered business flags would show Stage 14 as pending even if handoff ran successfully — pipeline would re-run handoff |
| pressure-test.md | 12 coverage flags (line 185–196) | Checks hasRecommendations, hasCompetitive, etc. Does NOT check hasBusinessThesis/hasMarketLandscape/hasServiceBlueprint/hasLaunchKit — clobber is invisible to pressure-test |
| deploy.md | hasLaunchKit specifically (line 55) | **Critical:** if hasLaunchKit is clobbered to false/absent, deploy.md halts with "Launch kit not yet assembled" error even though handoff completed successfully |

**Business-critical impact:** A user who runs `recommend` or `iterate` after `handoff` in business mode would have deploy.md refuse to run because hasLaunchKit was clobbered. This is a real user-facing failure path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| designCoverage field count test | Don't count fields with regex at test time | Array filter pattern from OPS-03: `TWENTY_FIELDS.filter(field => !content.includes(field))` | Established precedent, readable failure messages |
| businessTrack consistency check | Don't write a dynamic grep count comparator | Per-file string presence checks | Literal count equality is not achievable and semantically wrong |
| Business stub wording | Don't invent new stub format | Copy the experience stub HTML comment format exactly, replacing "Experience" with "Business" and updating phase/description | Format consistency is a test assertion; prior stubs established the pattern |
| Multiple test files | Don't create one file per workflow | Single test file covering INTG-01 (4 workflows) + INTG-08 (3 stubs) | Established precedent: each phase has one test file |

---

## Common Pitfalls

### Pitfall 1: recommend.md Uses Per-Field Placeholder Names

**What goes wrong:** recommend.md's 16-field write uses `{current_hasDesignSystem}`, `{current_hasWireframes}`, etc. (unique variable names per field). The other 3 regression workflows use the generic `{current}` placeholder.

**Why it happens:** recommend.md was authored with more explicit variable names. Naively copying the 20-field pattern from another workflow would introduce inconsistency.

**How to avoid:** When expanding recommend.md's write to 20 fields, add the 4 new fields using `{current_hasBusinessThesis}`, `{current_hasMarketLandscape}`, `{current_hasServiceBlueprint}`, `{current_hasLaunchKit}` to be consistent with the existing naming convention in that file. The parsing table (lines 567–584) also needs 4 new rows.

**Warning signs:** The recommend.md write line ends with `...,"hasProductionBible":{current_hasProductionBible}}'` — the `_hasFieldName` suffix pattern in the braces.

### Pitfall 2: The IMPORTANT Note Anti-Pattern Line is a Prose Example, Not the Real Write

**What goes wrong:** mockup.md line 1481 contains `manifest-set-top-level designCoverage.hasMockup true` in a NEVER warning block. This is a prose anti-pattern example. A grep-based scan finds 2 matches for `manifest-set-top-level designCoverage` in mockup.md — only line 1431 is the real write call.

**Why it happens:** The IMPORTANT section documents what NOT to do, using the very pattern it forbids as an example.

**How to avoid:** The real write call is inside a triple-backtick bash code block. The anti-pattern example is inside normal prose. Read the file at line 1431–1432 to find the actual write.

### Pitfall 3: Clobber Sequencing Is Real and Directional

**What goes wrong:** If a user runs `/pde:recommend` after `/pde:handoff` in business mode, hasLaunchKit is clobbered from true to false. deploy.md then refuses to run ("Launch kit not yet assembled"). The only fix is to re-run handoff.

**Why it happens:** manifest-set-top-level performs flat replacement at line 264 of bin/lib/design.cjs: `manifest[field] = value`. No merge. A 16-field write destroys the 4 business fields.

**How to avoid:** Every workflow that writes designCoverage must write ALL 20 fields, every time, reading current values first. This is the read-before-set pattern.

**Warning signs:** A workflow's IMPORTANT block says "ALWAYS write all 16 fields" — this is the pre-Phase-84 language and confirms the write is a 16-field regression.

### Pitfall 4: Stub Placement Must Match Experience Stub Structural Location

**What goes wrong:** Business stub placed at a different structural location than the experience stub in the same file, causing tests that check for proximity to context markers to fail.

**Why it happens:** Developers place stubs at file top for convenience rather than reading where the experience stub lives.

**How to avoid:** Place business stub immediately after the experience stub in each file:
- recommend.md: business stub goes on line 200 (after line 199 experience stub)
- iterate.md: business stub goes on line 11 (after line 10 experience stub)
- mockup.md: business stub goes on line 155 (after line 154 experience stub)

### Pitfall 5: INTG-08 Raw Count Test Cannot Pass Literally

**What goes wrong:** Writing Nyquist tests that assert `grep businessMode count == grep businessTrack count` will be permanently RED because the build.md 7-vs-0 gap is architectural, not a regression.

**Why it happens:** The INTG-08 success criterion says "hit count matches" which sounds like global count equality.

**How to avoid:** Write INTG-08 tests as per-file structural assertions: every file in the scope of this phase that needs business stubs (recommend.md, iterate.md, mockup.md) contains `<!-- Business product type`. Do not test global counts. Document this interpretation in the test file header comment.

### Pitfall 6: iterate.md Has No Field Table (Unlike recommend.md)

**What goes wrong:** recommend.md has a markdown table (lines 567–584) listing all fields to parse, plus the IMPORTANT prose, plus the write call. iterate.md has prose at line 452 ("Extract ALL sixteen current flag values: `hasDesignSystem`...") but no table.

**How to avoid:** Patch iterate.md's prose at line 452 to say "ALL twenty current flag values" and include the 4 new fields in the comma-separated list. The write call at line 455 gets all 20 fields added.

---

## Code Examples

### 1. Corrected 20-Field Write for recommend.md

The existing 16-field write (line 590) uses per-field placeholder names:
```bash
# BEFORE (16 fields — REGRESSION):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":true,"hasStitchWireframes":{current_hasStitchWireframes},"hasPrintCollateral":{current_hasPrintCollateral},"hasProductionBible":{current_hasProductionBible}}'
```

The corrected 20-field write (same per-field naming convention):
```bash
# AFTER (20 fields — CORRECT):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":true,"hasStitchWireframes":{current_hasStitchWireframes},"hasPrintCollateral":{current_hasPrintCollateral},"hasProductionBible":{current_hasProductionBible},"hasBusinessThesis":{current_hasBusinessThesis},"hasMarketLandscape":{current_hasMarketLandscape},"hasServiceBlueprint":{current_hasServiceBlueprint},"hasLaunchKit":{current_hasLaunchKit}}'
```

The parsing table (lines 567–584) needs 4 additional rows:
```
| hasBusinessThesis | false |
| hasMarketLandscape | false |
| hasServiceBlueprint | false |
| hasLaunchKit | false |
```

The IMPORTANT note at line 595 must change from "complete 16-field JSON object" to "complete 20-field JSON object".

### 2. Corrected 20-Field Write for iterate.md (line 455)

```bash
# BEFORE (16 fields):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

```bash
# AFTER (20 fields):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

Prose at line 452 changes: `"Extract ALL sixteen current flag values: ..."` → `"Extract ALL twenty current flag values: ..."` adding `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit` to the comma-separated list.

### 3. Corrected 20-Field Write for mockup.md (line 1432)

```bash
# BEFORE (16 fields):
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":true,"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

```bash
# AFTER (20 fields):
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":true,"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

Prose at line 1426 changes: `"Extract all 16 flags. Default any absent flag to false:"` → `"Extract all 20 flags. Default any absent flag to false:"` adding 4 new fields to the dash-separated list.

IMPORTANT note at line 1435 changes: `"ALWAYS write all 16 fields. Canonical field order: ... hasProductionBible."` → `"ALWAYS write all 20 fields. Canonical field order: ... hasProductionBible, hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit."`

### 4. Corrected 20-Field Write for ideate.md (line 694)

```bash
# BEFORE (16 fields):
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":true,"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

```bash
# AFTER (20 fields):
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":true,"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

Prose at line 687 changes: `"Extract all 16 flags (default absent flags to false):"` and the list `"Canonical 16-field order: ..."` ending at `hasProductionBible` → must say 20 and include 4 new fields.

IMPORTANT note at line 697 changes analogously.

### 5. Business Product Type Stub Format

Modeled directly after the experience stub format (exact structure preserved):

**recommend.md** (placed immediately after line 199 experience stub):
```html
<!-- Business product type — Phase 93 stub: business product recommendations include GTM tools, Stripe/Resend integrations, landing page builders, and investor deck tooling. Business-specific tool recommendations added in a future phase after launch artifact patterns are established. Current behavior: proceed with software tool recommendation path as temporary fallback for business product type. -->
```

**iterate.md** (placed immediately after line 10 experience stub):
```html
<!-- Business product type — Phase 93 stub: business product iteration targets lean canvas hypothesis updates, pitch deck slide revisions, and service blueprint lane adjustments rather than wireframe HTML. Business-specific iteration path added in a future phase. Current behavior: proceed with wireframe iteration path as temporary fallback for business product type. -->
```

**mockup.md** (placed immediately after line 154 experience stub):
```html
<!-- Business product type — Phase 93 stub: business product mockup extensions (landing page mockups, pitch deck slide renders, pricing table mockups) added in a future phase. Current behavior: proceed with software mockup path as temporary fallback for business product type. NEVER produce launch artifact mockups from this stub. -->
```

### 6. Nyquist Test Assertions for INTG-01 (array-based, matching Phase 87 precedent)

```javascript
'use strict';
/**
 * test-clobber-audit.cjs — Phase 93 structural validation tests
 *
 * INTG-01: All 4 regression workflows (recommend, iterate, mockup, ideate) write 20 designCoverage fields
 * INTG-08: recommend.md, iterate.md, mockup.md each contain a Business product type stub comment
 *
 * NOTE on INTG-08: The requirement's "grep count matches" language describes the qualitative intent
 * that businessTrack awareness appears wherever businessMode branching appears. The literal count
 * equality (60 businessMode vs 40 businessTrack across all workflows/) is not achievable because
 * build.md has 7 businessMode references with 0 businessTrack references by design — the orchestrator
 * gates Stage 14 on businessMode but never branches on track (track-depth variation is for content
 * generators, not the orchestrator). Per-file presence checks are the correct implementation of INTG-08.
 *
 * Run: node --test .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const TWENTY_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit'
];

function readWorkflow(name) {
  return fs.readFileSync(path.join(ROOT, 'workflows', name), 'utf-8');
}

// INTG-01: recommend.md
describe('INTG-01: recommend.md has 20-field designCoverage write', () => {
  const content = readWorkflow('recommend.md');
  it('recommend.md contains all 20 designCoverage field names', () => {
    const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `recommend.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('recommend.md IMPORTANT note does not say "16 fields"', () => {
    assert.ok(!content.includes('16-field JSON object'), 'recommend.md must not say "16-field JSON object" — update IMPORTANT note');
  });
});

// INTG-01: iterate.md
describe('INTG-01: iterate.md has 20-field designCoverage write', () => {
  const content = readWorkflow('iterate.md');
  it('iterate.md contains all 20 designCoverage field names', () => {
    const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `iterate.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('iterate.md does not say "ALL sixteen current flag values"', () => {
    assert.ok(!content.includes('ALL sixteen'), 'iterate.md must not say "ALL sixteen" — update to twenty');
  });
});

// INTG-01: mockup.md
describe('INTG-01: mockup.md has 20-field designCoverage write', () => {
  const content = readWorkflow('mockup.md');
  it('mockup.md contains all 20 designCoverage field names', () => {
    const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `mockup.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('mockup.md IMPORTANT does not say "ALWAYS write all 16 fields"', () => {
    assert.ok(!content.includes('ALWAYS write all 16 fields'), 'mockup.md must not say "ALWAYS write all 16 fields"');
  });
});

// INTG-01: ideate.md
describe('INTG-01: ideate.md has 20-field designCoverage write', () => {
  const content = readWorkflow('ideate.md');
  it('ideate.md contains all 20 designCoverage field names', () => {
    const missing = TWENTY_FIELDS.filter(f => !content.includes(f));
    assert.ok(missing.length === 0, `ideate.md missing designCoverage fields: ${missing.join(', ')}`);
  });
  it('ideate.md IMPORTANT does not say "ALWAYS write all 16 fields"', () => {
    assert.ok(!content.includes('ALWAYS write all 16 fields'), 'ideate.md must not say "ALWAYS write all 16 fields"');
  });
});

// INTG-08: Business product type stubs
describe('INTG-08: recommend.md has Business product type stub', () => {
  const content = readWorkflow('recommend.md');
  it('recommend.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type — Phase 93 stub'),
      'recommend.md must contain the Phase 93 business product type stub comment'
    );
  });
});

describe('INTG-08: iterate.md has Business product type stub', () => {
  const content = readWorkflow('iterate.md');
  it('iterate.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type — Phase 93 stub'),
      'iterate.md must contain the Phase 93 business product type stub comment'
    );
  });
});

describe('INTG-08: mockup.md has Business product type stub', () => {
  const content = readWorkflow('mockup.md');
  it('mockup.md contains <!-- Business product type — Phase 93 stub', () => {
    assert.ok(
      content.includes('<!-- Business product type — Phase 93 stub'),
      'mockup.md must contain the Phase 93 business product type stub comment'
    );
  });
});
```

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | node:test (built-in, no install) |
| Config file | none — invoked directly |
| Quick run command | `node --test .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs` |
| Full suite command | same (single test file for this phase) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTG-01 | recommend.md has all 20 designCoverage fields | structural | `node --test .../test-clobber-audit.cjs` | No — Wave 0 |
| INTG-01 | iterate.md has all 20 designCoverage fields | structural | same | No — Wave 0 |
| INTG-01 | mockup.md has all 20 designCoverage fields | structural | same | No — Wave 0 |
| INTG-01 | ideate.md has all 20 designCoverage fields | structural | same | No — Wave 0 |
| INTG-01 | IMPORTANT notes updated to say "20 fields" | structural | same (negative assertion) | No — Wave 0 |
| INTG-08 | recommend.md has business stub comment | structural | same | No — Wave 0 |
| INTG-08 | iterate.md has business stub comment | structural | same | No — Wave 0 |
| INTG-08 | mockup.md has business stub comment | structural | same | No — Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs`
- **Per wave merge:** same
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/93-designcoverage-clobber-audit-secondary-workflow-stubs/tests/test-clobber-audit.cjs` — covers INTG-01 (4 workflows × 2 assertions) + INTG-08 (3 stubs × 1 assertion) = 11 total tests

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 16-field designCoverage write | 20-field write with read-before-set | Phase 84 (added 4 new business fields) | Workflows not updated in Phase 84 silently clobber business flags |
| No business branching in secondary workflows | `<!-- Business product type — Phase 93 stub -->` comment | Phase 93 (this phase) | Forward placeholder for future business-specific iteration/mockup/recommendation behavior |
| Experience stubs as sole product-type guard | Experience + Business stubs | Phase 93 (this phase) | Consistent pattern: every non-software product type has a comment stub wherever it differs |

**Deprecated/outdated markers (each is a regression indicator):**
- `"ALWAYS write all 16 fields"` in IMPORTANT blocks — 4 occurrences (recommend.md line 595, iterate.md line 452, mockup.md line 1435, ideate.md line 697)
- `"Extract ALL sixteen current flag values"` — iterate.md line 452
- `"Extract all 16 flags"` — mockup.md line 1425, ideate.md line 687
- Write call ending with `"hasProductionBible":{current}'` or `"hasProductionBible":{current_hasProductionBible}}'` — all 4 regression workflows' write lines

---

## Open Questions

1. **INTG-08 literal count equality — RESOLVED**
   - The literal grep count equality (60 businessMode vs 40 businessTrack) cannot be achieved without modifying build.md which would be architecturally wrong. Per-file presence tests are the correct implementation. Documented in the test file header.

2. **ideate.md business stub — RESOLVED**
   - ideate.md is NOT in the Success Criterion 3 list for business stubs. It needs only the 20-field write fix (INTG-01). The planner should add a business stub to ideate.md only if forward consistency is desired, but it is not required for Phase 93 success criteria.

3. **Live project manifest has 16-field designCoverage — INFORMATIONAL**
   - The `.planning/design/design-manifest.json` in the project root has only 16 designCoverage fields. This is because the project's manifest was initialized before Phase 84 updated the template. The Phase 93 workflow fixes prevent future clobber; the live manifest is a development artifact not a deliverable. No action required.

---

## Sources

### Primary (HIGH confidence)

- Direct file read of `workflows/recommend.md` — 16-field write confirmed at line 590, experience stub at line 199, IMPORTANT note at line 595
- Direct file read of `workflows/iterate.md` — 16-field write confirmed at line 455, experience stub at line 10, prose at line 452
- Direct file read of `workflows/mockup.md` — 16-field write confirmed at line 1432, experience stub at line 154, IMPORTANT at line 1435, anti-pattern warning at line 1481
- Direct file read of `workflows/ideate.md` — 16-field write confirmed at line 694, experience stub at line 536, IMPORTANT at line 697
- Direct file reads of 9 compliant workflows (brief.md, competitive.md, opportunity.md, flows.md, wireframe.md, system.md, critique.md, hig.md, handoff.md) — 20-field writes confirmed
- Direct file read of `bin/lib/design.cjs` line 264 — `manifest[field] = value` flat replacement confirmed
- Direct file read of `templates/design-manifest.json` — 20-field designCoverage schema with Phase 84 additions confirmed
- Direct file read of `.planning/phases/87-flows-stage/tests/test-flows-sbp.cjs` — array-based TWENTY_FIELDS test pattern confirmed as Phase 87 precedent
- Direct file read of `.planning/phases/84-foundation/tests/test-foundation.cjs` — FOUND-02 confirms template has 20 fields
- grep counts: `businessMode` = 60, `businessTrack` = 40 across all `workflows/*.md` — verified
- Per-file businessMode/businessTrack counts tabulated from grep output — all files documented

### Secondary (MEDIUM confidence)

- `.planning/REQUIREMENTS.md` — INTG-01, INTG-08 requirements verbatim
- `.planning/STATE.md` — Phase 84 decisions on field ordering, Phase 92 completion

---

## Metadata

**Confidence breakdown:**
- Audit findings (which workflows need fixes, exact line numbers): HIGH — verified by direct file read and field counting
- Canonical 20-field pattern: HIGH — consistent across 9 compliant workflows, confirmed in template
- Clobber mechanism: HIGH — read implementation source at bin/lib/design.cjs line 264
- Experience stub format and placement: HIGH — exact line numbers verified from 4 files
- INTG-08 per-file test approach: HIGH — prior research + per-file grep counts confirm literal count test is not achievable
- Business stub content wording: MEDIUM — pattern is established; specific per-workflow descriptions are research best-effort
- Downstream consumer impact (deploy.md failure path): HIGH — traced hasLaunchKit read in deploy.md line 55

**Research date:** 2026-03-22
**Valid until:** Stable until Phase 94 modifies any of these workflows — no time pressure
