# Phase 96: 21-Field Cascade Fix — Research

**Researched:** 2026-03-22
**Domain:** designCoverage schema consistency — workflow markdown + test assertion alignment
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-02 | designCoverage schema reflects all 21 fields (not 20) — test-foundation.cjs FOUND-02 subtest asserts 21 | Test fix is a 3-line change: describe title, assertion count 20→21, add `hasDeployStaging` to NEW array |
| INTG-01 | All 14+ designCoverage-writing workflows include all 21 fields in their write calls | 4 secondary workflows each need one JSON string extended with `,"hasDeployStaging":{current}` |
</phase_requirements>

---

## Summary

Phase 96 closes the last 2 open requirement gaps from the v0.12 milestone audit. Both gaps trace to a single root cause: `hasDeployStaging` was added as the 21st designCoverage field in Phase 95 but two places were not updated — the test assertion in `test-foundation.cjs` (still checks for 20 fields) and four secondary workflows (`recommend.md`, `ideate.md`, `iterate.md`, `mockup.md`) that each write a 20-field JSON blob, omitting `hasDeployStaging`.

The clobber scenario is concrete: if a user runs `/pde:build --from recommend` after a successful deploy, the recommend step writes a 20-field designCoverage that omits `hasDeployStaging`, reverting it from `true` to absent (effectively `false`). The deploy stage would then appear to be pending on the next status check. The fix is small and surgical: each of the 4 workflows needs one field appended to its JSON blob, and the test needs its count and description updated.

The full Nyquist suite currently reads 234/235 PASS with exactly 1 FAIL — the FOUND-02 assertion in `test-foundation.cjs` at line 127. The `test-regression-matrix.cjs` suite (INTG-07) already uses the constant `TWENTY_ONE_FIELDS` (line 22–29) and is already GREEN because INTG-07 only checks the 10 primary workflows (brief, competitive, opportunity, flows, wireframe, critique, hig, handoff, system, deploy) — NOT the 4 secondary ones.

**Primary recommendation:** Update 4 workflow JSON blobs + 1 test assertion. No new test files needed.

---

## Standard Stack

### Core (No External Libraries)

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Node.js built-in test runner | `node:test` | All Nyquist tests | Already in use across phases 84–95 |
| `node:assert/strict` | built-in | Test assertions | Used in test-foundation.cjs throughout |
| `pde-tools.cjs design manifest-set-top-level` | project CLI | Writes designCoverage | Only correct write path per anti-patterns |
| `pde-tools.cjs design coverage-check` | project CLI | Reads all coverage flags | Must run before every write to prevent clobber |

### No New Dependencies

This phase installs nothing. All changes are text edits to existing `.md` and `.cjs` files.

---

## Architecture Patterns

### Canonical 21-Field Coverage Object

The correct field order (established in `design-manifest.json` template):

```
hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec,
hasCritique, hasIterate, hasHandoff, hasIdeation,
hasCompetitive, hasOpportunity, hasMockup, hasHigAudit,
hasRecommendations, hasStitchWireframes, hasPrintCollateral, hasProductionBible,
hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit,
hasDeployStaging   ← field #21, appended last
```

`hasDeployStaging` is always the 21st field. `deploy.md` is the only workflow that writes it as `true`; all other workflows pass it through as `{current}`.

### Pass-Through-All Pattern

Every designCoverage write MUST:
1. Call `coverage-check` first to read all current values
2. Write the COMPLETE JSON object (all 21 fields) in canonical order
3. Set only the flag this skill owns to `true`; pass all others through as `{current}`

This pattern is documented in every workflow's anti-patterns section. The failure in this phase is a straightforward omission: the 4 secondary workflows were updated to 20 fields in Phase 93 but the 21st field was added in Phase 95 without updating them.

### Recommended Project Structure (Changes Only)

```
workflows/
├── recommend.md     ← add hasDeployStaging as field 21 in coverage write
├── ideate.md        ← add hasDeployStaging as field 21 in coverage write
├── iterate.md       ← add hasDeployStaging as field 21 in coverage write
└── mockup.md        ← add hasDeployStaging as field 21 in coverage write

.planning/phases/84-foundation/tests/
└── test-foundation.cjs   ← update FOUND-02: 20→21, add hasDeployStaging to NEW_4
```

### Pattern: FOUND-02 Test Fix

Current code (lines 68–131 of `test-foundation.cjs`):

```javascript
// Source: .planning/phases/84-foundation/tests/test-foundation.cjs, lines 68–131
describe('FOUND-02: 20 designCoverage fields in design-manifest.json', () => {
  const EXISTING_16 = [ /* 16 fields */ ];
  const NEW_4 = [
    'hasBusinessThesis', 'hasMarketLandscape', 'hasServiceBlueprint', 'hasLaunchKit'
  ];
  // ...
  it('designCoverage has exactly 20 non-comment fields', () => {
    assert.strictEqual(coverageKeys.length, 20, ...);
  });
});
```

Required changes:
1. `describe` title: `'20 designCoverage fields'` → `'21 designCoverage fields'`
2. `NEW_4` array: rename to `NEW_5`, add `'hasDeployStaging'`
3. `assert.strictEqual(coverageKeys.length, 20, ...)` → `21`
4. Comment block at top of file: update `FOUND-02: 20 designCoverage fields` description

### Pattern: Workflow JSON Extension

Each of the 4 secondary workflows contains a line like:

```bash
# CURRENT (20 fields, missing hasDeployStaging):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasLaunchKit":{current}}'
```

Required change — append `,"hasDeployStaging":{current}` before the closing `}`:

```bash
# CORRECT (21 fields):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasLaunchKit":{current},"hasDeployStaging":{current}}'
```

Additionally, the prose text in each workflow that says "Extract all 20 flags" must be updated to "Extract all 21 flags", and the canonical field list must include `hasDeployStaging`.

### Anti-Patterns to Avoid

- **Do not add `hasDeployStaging: true` in secondary workflows.** Only `deploy.md` sets it to `true`. Secondary workflows pass through `{current}`.
- **Do not use dot-notation.** `manifest-set-top-level designCoverage.hasDeployStaging true` is wrong. Always pass the complete JSON object.
- **Do not skip the describe-block title update.** The test file header comment and describe title both say "20 fields" and must be updated to "21 fields" for coherence.
- **Do not update INTG-07 test.** The `V012_COVERAGE_WRITERS` list in `test-regression-matrix.cjs` covers only the 10 primary workflows, and the `TWENTY_ONE_FIELDS` constant already has all 21 fields. INTG-07 will NOT catch the secondary workflow gap because recommend/ideate/iterate/mockup are not in `V012_COVERAGE_WRITERS`. New assertions for secondary workflows could be added, but are not required by INTG-01 — the requirement says "verified to include all 20 fields" (now 21), and the milestone audit confirmed these 4 are the only gaps.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Writing designCoverage | Custom write logic | `pde-tools.cjs design manifest-set-top-level designCoverage` | Atomic write with lock, established pattern |
| Reading current flags | Manual file parse | `pde-tools.cjs design coverage-check` | Returns parsed JSON, handles file absence |
| Running Nyquist suite | Custom script | `node --test .planning/phases/*/tests/*.cjs` | Node.js built-in test runner, already wired |

**Key insight:** The fix requires zero new tooling. It is purely a text change in 5 files.

---

## Common Pitfalls

### Pitfall 1: Forgetting the prose update alongside the JSON

**What goes wrong:** The JSON string is updated to 21 fields but the surrounding prose still says "Extract all 20 flags" or "full 20-field JSON". This causes confusion for future maintainers and leaves stale documentation.

**Why it happens:** The JSON blob is the obvious fix target; the surrounding prose is easy to overlook.

**How to avoid:** In each workflow, update all occurrences of "20" that refer to field count (not including step numbers, section numbers, etc.).

**Warning signs:** Grep for `20.*flag` or `20-field` in the 4 workflows after editing.

### Pitfall 2: Setting hasDeployStaging to true in secondary workflows

**What goes wrong:** A secondary workflow incorrectly sets `"hasDeployStaging":true` instead of `"hasDeployStaging":{current}`. This causes `hasDeployStaging` to appear set even before deploy has run.

**Why it happens:** Pattern confusion with the owned-flag pattern (e.g., recommend sets `hasRecommendations:true`).

**How to avoid:** Secondary workflows never own `hasDeployStaging`. It is a pass-through in all 4 workflows. Only `deploy.md` writes it as `true`.

**Warning signs:** Check that each workflow's JSON sets exactly ONE flag to `true` — its own coverage flag.

### Pitfall 3: Updating only the JSON string but not the FOUND-02 test describe array

**What goes wrong:** The `assert.strictEqual(coverageKeys.length, 20)` is updated to `21`, but `NEW_4` array (or its rename to `NEW_5`) is not updated to include `'hasDeployStaging'`. The "4 new fields appear AFTER hasProductionBible" test passes because `hasDeployStaging` was already in the template, but the test documentation claims only 4 new fields.

**Why it happens:** Two separate parts of the test cover FOUND-02 (the count assertion and the field-presence assertions).

**How to avoid:** Update all 4 parts of the FOUND-02 describe block: describe title, NEW_4→NEW_5 array, count assertion value, and file comment at top.

### Pitfall 4: Confusing the --from flag scope

**What goes wrong:** Assuming `--from` is a secondary workflow flag rather than a `build.md` orchestrator flag.

**Why it happens:** The audit mentions "--from re-run" as the clobber trigger.

**Clarification:** `--from` is a `build.md` orchestrator flag only. It is NOT forwarded to sub-skills (anti-pattern #10 in build.md). The clobber scenario is: `build --from recommend` causes the build orchestrator to invoke `/pde:recommend` directly, which runs its full Step 7 and writes 20-field designCoverage, clobbering `hasDeployStaging`. The fix (adding field 21 to recommend's write) directly prevents this.

---

## Code Examples

### Verified: Current failing test assertion
```javascript
// Source: .planning/phases/84-foundation/tests/test-foundation.cjs, lines 120–130
it('designCoverage has exactly 20 non-comment fields', () => {
  const manifestPath = path.join(PROJECT_ROOT, 'templates', 'design-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const coverageKeys = Object.keys(manifest.designCoverage).filter(k => k !== '_comment');
  assert.strictEqual(
    coverageKeys.length,
    20,  // ← MUST CHANGE TO 21
    `designCoverage must have exactly 20 fields, found: ${coverageKeys.length}`
  );
});
```

### Verified: Current recommend.md coverage write (20 fields — missing hasDeployStaging)
```bash
# Source: workflows/recommend.md, line 595
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":true,"hasStitchWireframes":{current_hasStitchWireframes},"hasPrintCollateral":{current_hasPrintCollateral},"hasProductionBible":{current_hasProductionBible},"hasBusinessThesis":{current_hasBusinessThesis},"hasMarketLandscape":{current_hasMarketLandscape},"hasServiceBlueprint":{current_hasServiceBlueprint},"hasLaunchKit":{current_hasLaunchKit}}'
# ← needs ,"hasDeployStaging":{current_hasDeployStaging} appended before closing '
```

Note: recommend.md uses `{current_hasFieldName}` placeholders (per-field names), not the generic `{current}` style used by ideate/iterate/mockup.

### Verified: Current ideate.md coverage write (20 fields — generic {current} style)
```bash
# Source: workflows/ideate.md, line 694
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasIdeation":true,...,"hasLaunchKit":{current}}'
# ← needs ,"hasDeployStaging":{current} appended before closing '
```

### Verified: Current iterate.md coverage write (20 fields — generic {current} style)
```bash
# Source: workflows/iterate.md, line 456
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},...,"hasIterate":true,...,"hasLaunchKit":{current}}'
# ← needs ,"hasDeployStaging":{current} appended before closing '
```

### Verified: Current mockup.md coverage write (20 fields — generic {current} style)
```bash
# Source: workflows/mockup.md, line 1434
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasMockup":true,...,"hasLaunchKit":{current}}'
# ← needs ,"hasDeployStaging":{current} appended before closing '
```

### Verified: Correct 21-field pattern (from deploy.md, already correct)
```bash
# Source: workflows/deploy.md, line 837
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":ACTUAL,...,"hasLaunchKit":ACTUAL,"hasDeployStaging":true}'
```

### Verified: templates/design-manifest.json already has 21 fields
```json
"designCoverage": {
  "_comment": "...",
  "hasDesignSystem": false,
  ...16 existing fields...,
  "hasBusinessThesis": false,
  "hasMarketLandscape": false,
  "hasServiceBlueprint": false,
  "hasLaunchKit": false,
  "hasDeployStaging": false   ← field #21, already present
}
```

---

## Exact Edit Targets

All edit targets are surgical — single-line string replacements or small array additions.

### File 1: `.planning/phases/84-foundation/tests/test-foundation.cjs`

| Location | Current | Replace With |
|----------|---------|-------------|
| Line 8 (comment) | `FOUND-02: 20 designCoverage fields (16 existing + 4 new)` | `FOUND-02: 21 designCoverage fields (16 existing + 5 new)` |
| Line 68 (describe) | `'FOUND-02: 20 designCoverage fields in design-manifest.json'` | `'FOUND-02: 21 designCoverage fields in design-manifest.json'` |
| Lines 75–77 (NEW_4) | `const NEW_4 = ['hasBusinessThesis', 'hasMarketLandscape', 'hasServiceBlueprint', 'hasLaunchKit']` | `const NEW_5 = ['hasBusinessThesis', 'hasMarketLandscape', 'hasServiceBlueprint', 'hasLaunchKit', 'hasDeployStaging']` |
| All `NEW_4` references | `for (const field of NEW_4)` (lines 95, 111) | `for (const field of NEW_5)` |
| Line 91 (describe text) | `'all 4 new designCoverage field names appear in the manifest'` | `'all 5 new designCoverage field names appear in the manifest'` |
| Line 103 (describe text) | `'4 new fields appear AFTER hasProductionBible in the file'` | `'5 new fields appear AFTER hasProductionBible in the file'` |
| Line 127 (count) | `coverageKeys.length, 20,` | `coverageKeys.length, 21,` |
| Line 128 (error message) | `'exactly 20 fields, found: ...'` | `'exactly 21 fields, found: ...'` |

### File 2: `workflows/recommend.md`

| Location | Change |
|----------|--------|
| Line 566 (table row) | Add `\| hasDeployStaging \| false \|` row after `hasLaunchKit` |
| Line 591 (prose) | `20-field JSON` → `21-field JSON` |
| Line 595 (JSON string) | Append `,"hasDeployStaging":{current_hasDeployStaging}` before final `}'` |
| Line 598 (IMPORTANT note) | `20-field JSON object` → `21-field JSON object` |
| Line 600 (IMPORTANT note) | `complete 20-field JSON object` → `complete 21-field JSON object` |
| Line 602 (display message) | (already OK, no count mentioned) |
| Line 629 (anti-pattern note) | `all 15 existing flags` → `all 21 existing flags` (if present) |

### File 3: `workflows/ideate.md`

| Location | Change |
|----------|--------|
| Line 687 (prose) | `Extract all 20 flags` → `Extract all 21 flags` |
| Line 688 (canonical order list) | Append `, hasDeployStaging` at end |
| Line 690 (prose) | `20-field JSON` → `21-field JSON` |
| Line 694 (JSON string) | Append `,"hasDeployStaging":{current}` before final `}'` |
| Line 697 (IMPORTANT) | Update all field count references from 20 to 21; append `hasDeployStaging` to canonical order list |

### File 4: `workflows/iterate.md`

| Location | Change |
|----------|--------|
| Line 453 (prose) | `ALL twenty current flag values` → `ALL twenty-one current flag values`; append `hasDeployStaging` to field list |
| Line 453 (prose) | `Merge hasIterate: true while preserving all other nineteen values` → `twenty values` |
| Line 453 (prose) | `full merged twenty-field object` → `twenty-one-field object` |
| Line 456 (JSON string) | Append `,"hasDeployStaging":{current}` before closing `}'` |

### File 5: `workflows/mockup.md`

| Location | Change |
|----------|--------|
| Line 1427 (prose) | `Extract all 20 flags` → `Extract all 21 flags` |
| Line 1428 (field list) | Append `, hasDeployStaging` at end |
| Line 1430 (prose) | `20-field JSON` → `21-field JSON` |
| Line 1434 (JSON string) | Append `,"hasDeployStaging":{current}` before final `}'` |
| Line 1437 (IMPORTANT) | Append `hasDeployStaging` to canonical field order list |
| Line 1482 (anti-pattern) | `all 15 through` → `all 20 through` (if present, verify line) |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` |
| Config file | none — run directly via `node --test` |
| Quick run command | `node --test .planning/phases/84-foundation/tests/test-foundation.cjs` |
| Full suite command | `node --test .planning/phases/84-foundation/tests/test-foundation.cjs && node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-02 | designCoverage has exactly 21 non-comment fields | unit | `node --test .planning/phases/84-foundation/tests/test-foundation.cjs` | Yes (failing) |
| INTG-01 | Secondary workflows contain all 21 field names | structural text check | manual grep or new test | No — Wave 0 gap |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/84-foundation/tests/test-foundation.cjs`
- **Per wave merge:** `node --test .planning/phases/84-foundation/tests/test-foundation.cjs && node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`
- **Phase gate:** Full suite (both test files) green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No new test file is strictly required — INTG-01 can be verified by manual grep for `hasDeployStaging` in the 4 secondary workflows. If a structural test is desired, it should be added to `test-regression-matrix.cjs` as an extension of INTG-07 by expanding `V012_COVERAGE_WRITERS` to include the 4 secondary workflows. This is optional for this phase.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 16-field designCoverage | 20-field designCoverage | Phase 84 (v0.12 start) | 4 business fields added |
| 20-field designCoverage | 21-field designCoverage | Phase 95 | hasDeployStaging added — currently only in template and deploy.md |
| INTG-07 checks 20 fields | INTG-07 already uses TWENTY_ONE_FIELDS constant | Phase 94/95 | Test infrastructure already correct; only workflow blobs and test-foundation.cjs lag |

**Deprecated/outdated:**
- "20-field designCoverage" language in all 4 secondary workflows — superseded by 21-field schema
- `FOUND-02: 20 designCoverage fields` describe title in test-foundation.cjs — must become 21

---

## Open Questions

1. **Should INTG-07 expand to cover the 4 secondary workflows?**
   - What we know: INTG-01 requires all 14+ workflows be verified; INTG-07 only covers 10 primary ones
   - What's unclear: Whether adding the 4 secondary workflows to `V012_COVERAGE_WRITERS` in test-regression-matrix.cjs is in scope for this phase
   - Recommendation: Include it as an optional task — it closes the structural test gap that allowed this bug to slip through

2. **Are there any other workflows that write designCoverage and may be missing hasDeployStaging?**
   - What we know: The 10 primary workflows (brief, competitive, opportunity, flows, wireframe, critique, hig, handoff, system, deploy) were checked by INTG-07 and are confirmed GREEN with all 21 fields
   - What's unclear: Whether any workflows added after Phase 94 could have missed field 21
   - Recommendation: INTG-07 passing GREEN on primary workflows + manual grep on secondary workflows is sufficient

---

## Sources

### Primary (HIGH confidence)

- Direct file reads — `templates/design-manifest.json` (21 fields confirmed), `test-foundation.cjs` (20-field assertion confirmed failing at line 127), `test-regression-matrix.cjs` (TWENTY_ONE_FIELDS constant + INTG-07 coverage scope confirmed)
- Direct test run — `node --test test-foundation.cjs` → 18 PASS, 1 FAIL (FOUND-02 count assertion)
- Direct test run — `node --test test-regression-matrix.cjs` → 46/46 PASS
- `v0.12-MILESTONE-AUDIT.md` — exact line numbers, fix descriptions, and impact scope documented

### Secondary (MEDIUM confidence)

- `STATE.md` decisions log — Phase 95-01 decision: "hasDeployStaging is 21st designCoverage field — deploy.md owns true write, 9 other workflows pass-through current"

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no external libraries, only file edits in known files
- Architecture: HIGH — pass-through-all pattern fully verified across all 5 affected files
- Pitfalls: HIGH — directly observed from test output, audit document, and workflow content
- Validation: HIGH — test commands verified to run and produce expected output

**Research date:** 2026-03-22
**Valid until:** Stable — no external dependencies; only stale if schema changes again
