# Phase 95: Integration Wiring Fixes — Research

**Researched:** 2026-03-23
**Domain:** Workflow glob patterns, designCoverage schema, required_reading blocks
**Confidence:** HIGH — all findings verified by direct file inspection

---

## Summary

Phase 95 closes 4 classes of wiring bugs introduced across Phases 85-92 and confirmed by the v0.12 milestone audit. All bugs were verified by direct source inspection — no speculation. The fixes are surgical: 5 line changes across 3 workflow files (deploy.md, handoff.md, wireframe.md), 1 new coverage flag write (deploy.md Step 6), a 21-field schema expansion across the manifest template and 9 existing pass-through workflows, 4 lines added to handoff.md's required_reading block, and 1 Nyquist test file update.

The root cause pattern is consistent: artifact names were decided before their consumers were written. `brief.md` chose `BTH-thesis-v{N}.md` but the three downstream consumers each independently guessed `BTH-business-thesis-v*.md`. `handoff.md` chose `OTR-outreach-sequences-v{N}.md` but `deploy.md` guessed `OTR-outreach-v*.md`. The fix is always on the consumer side — producers are correct.

**Primary recommendation:** Fix all 4 issues in a single plan (95-01-PLAN.md). The issues are independent but touch overlapping files, making a single-pass fix safer than multi-pass.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRIEF-03 | BTH artifact consumed correctly by downstream workflows | Fix BTH glob in 3 consumers; producer (brief.md) is correct |
| KIT-01 | LKT manifest shows BTH as "generated" not "missing" | Same BTH glob fix in handoff.md:594 |
| KIT-03 | OTR artifact discoverable by deploy.md preflight | Fix OTR glob in deploy.md:117 |
| DEPLOY-04 | Gate 3 (Resend templates) reachable | Depends on KIT-03 OTR glob fix |
| DEPLOY-06 | Gates 3 and 4 both reachable | Depends on KIT-03 OTR glob fix |
| DEPLOY-09 | hasDeployStaging written to design-manifest.json | New flag write in deploy.md after Gate 4 |
</phase_requirements>

---

## Affected Files

Complete list of files requiring modification in Phase 95:

| File | Change Type | Scope |
|------|-------------|-------|
| `workflows/deploy.md` | Line edit (line 117) | OTR glob fix |
| `workflows/deploy.md` | Line edit (line 150) | OTR error message update |
| `workflows/deploy.md` | New block (after Step 4/6) | hasDeployStaging coverage write |
| `workflows/deploy.md` | Line edit (line 419) | BTH comment reference fix (cosmetic) |
| `workflows/handoff.md` | Line edit (line 594) | BTH glob fix |
| `workflows/handoff.md` | Block edit (lines 5-10) | required_reading — add 4 entries |
| `workflows/wireframe.md` | Line edit (line 624) | BTH glob fix |
| `workflows/critique.md` | Line edit (line 812) | BTH reference fix (doc string) |
| `templates/design-manifest.json` | Add field | hasDeployStaging: false (21st field) |
| All 9 coverage-writing workflows | Pass-through addition | hasDeployStaging in every designCoverage write |
| `tests/test-regression-matrix.cjs` | Update TWENTY_FIELDS | Add hasDeployStaging (21st field) + update V012_COVERAGE_WRITERS |

---

## Architecture Patterns

### How designCoverage fields are written across workflows

Every coverage-writing workflow follows the "read-before-set" pattern:

1. Run `pde-tools.cjs design coverage-check` to read all current field values
2. Extract all N field values from the JSON result, defaulting absent fields to `false`
3. Write the complete coverage object with `manifest-set-top-level designCoverage '{...}'` — merging the new flag with all preserved values

This means: when a new field is added, EVERY workflow that writes designCoverage must include it in its write call (as `{current}` for pass-through, or `true` for the workflow that owns it).

### Current 20-field designCoverage schema

```json
{
  "hasDesignSystem": false,
  "hasWireframes": false,
  "hasFlows": false,
  "hasHardwareSpec": false,
  "hasCritique": false,
  "hasIterate": false,
  "hasHandoff": false,
  "hasIdeation": false,
  "hasCompetitive": false,
  "hasOpportunity": false,
  "hasMockup": false,
  "hasHigAudit": false,
  "hasRecommendations": false,
  "hasStitchWireframes": false,
  "hasPrintCollateral": false,
  "hasProductionBible": false,
  "hasBusinessThesis": false,
  "hasMarketLandscape": false,
  "hasServiceBlueprint": false,
  "hasLaunchKit": false
}
```

### After Phase 95: 21-field designCoverage schema

Add `"hasDeployStaging": false` to the end of the list in `templates/design-manifest.json`. This becomes the 21st field.

### The 9 coverage-writing workflows (INTG-07 scope)

These workflows are tested by INTG-07 in `test-regression-matrix.cjs`:

1. `brief.md`
2. `competitive.md`
3. `opportunity.md`
4. `flows.md`
5. `wireframe.md`
6. `critique.md`
7. `hig.md`
8. `handoff.md`
9. `system.md`

`deploy.md` is NOT currently in this list. After Phase 95, it must be added.

---

## Code Examples

Verified before/after for each fix with exact line numbers.

### Fix 1: OTR Glob — deploy.md line 117

**Current (broken):**
```bash
# deploy.md line 117
OTR_FILE=$(ls .planning/design/launch/OTR-outreach-v*.md 2>/dev/null | sort -V | tail -1)
```

**Fixed:**
```bash
# deploy.md line 117
OTR_FILE=$(ls .planning/design/launch/OTR-outreach-sequences-v*.md 2>/dev/null | sort -V | tail -1)
```

**Companion fix — OTR error message (deploy.md line 150):**

Current:
```
Expected: .planning/design/launch/OTR-outreach-v{N}.md
```

Fixed:
```
Expected: .planning/design/launch/OTR-outreach-sequences-v{N}.md
```

**Producer verification (handoff.md lines 1223, 1228, 1264):** handoff.md writes `OTR-outreach-sequences-v{OTR_VERSION}.md` — confirmed at multiple locations. Consumer must match.

### Fix 2: BTH Glob — handoff.md line 594

**Current (broken):**
```
- BTH: Glob `.planning/design/strategy/BTH-business-thesis-v*.md` -> BTH_PATH, BTH_AVAILABLE (true/false)
```

**Fixed:**
```
- BTH: Glob `.planning/design/strategy/BTH-thesis-v*.md` -> BTH_PATH, BTH_AVAILABLE (true/false)
```

**Producer verification (brief.md lines 597, 641, 650):** brief.md writes to `BTH-thesis-v{N}.md` — confirmed. The name `BTH-business-thesis` never appears in brief.md as a file write target.

### Fix 3: BTH Glob — wireframe.md line 624

**Current (broken):**
```bash
  BTH_FILE=$(ls .planning/design/strategy/BTH-business-thesis-v*.md 2>/dev/null | tail -1)
```

**Fixed:**
```bash
  BTH_FILE=$(ls .planning/design/strategy/BTH-thesis-v*.md 2>/dev/null | tail -1)
```

**Context:** This is inside the `ELIF $BT == "startup_team":` block that checks for funding signals to determine pitch deck format. When BTH_FILE is empty (due to glob miss), `$BT == "startup_team"` always falls back to `DECK_FORMAT="yc_10"` rather than detecting funding signals from the BTH content.

### Fix 4: BTH Reference — critique.md line 812

**Current (broken reference string):**
```
- BTH artifact (`.planning/design/strategy/BTH-business-thesis-v*.md`) — problem/solution/market/unfair-advantage
```

**Fixed:**
```
- BTH artifact (`.planning/design/strategy/BTH-thesis-v*.md`) — problem/solution/market/unfair-advantage
```

**Note:** This is a documentation string describing evaluation sources, not a Glob call. It does not directly break runtime behavior, but it provides incorrect guidance on where to find the artifact. Fix is cosmetic but important for accuracy.

### Fix 5: BTH Comment — deploy.md line 419

**Current (broken comment in scaffold code):**
```typescript
      {/* TODO: Map your features from .planning/design/strategy/BTH-business-thesis-v1.md */}
```

**Fixed:**
```typescript
      {/* TODO: Map your features from .planning/design/strategy/BTH-thesis-v1.md */}
```

**Note:** This is inside generated scaffold content — a comment in the `features-grid.tsx` stub. Not a runtime glob. Fix is cosmetic but prevents future confusion when users look for the file.

### Fix 6: hasDeployStaging Flag Write — deploy.md (new block after Step 4/6)

After the `if $DEPLOY_EXIT == 0:` success path in Step 4/6, before Step 5/6, add a new designCoverage write using the read-before-set pattern. This is the ONLY place `hasDeployStaging: true` is written — all other workflows pass it through as `{current}`.

**New block to insert (after line 823, before "### Step 5/6: Write deploy-manifest.json"):**

```bash
# Read-before-set pattern — preserve all 20 (now 21) existing coverage fields
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse COV JSON, extract all 21 field values (defaulting absent fields to `false`). Then write:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current},"hasDeployStaging":true}'
```

`hasDeployStaging` is set to `true` (not `{current}`) — this is the flag this workflow owns. All other 20 fields use `{current}`.

### Fix 7: handoff.md required_reading — add 4 business references

**Current block (lines 5-10):**
```
<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/motion-design.md
@references/experience-disclaimer.md
</required_reading>
```

**Fixed block:**
```
<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/motion-design.md
@references/experience-disclaimer.md
@references/business-track.md
@references/launch-frameworks.md
@references/business-financial-disclaimer.md
@references/business-legal-disclaimer.md
</required_reading>
```

**Verification:** All 4 reference files exist — created in Phase 84 (FOUND-04 through FOUND-07). The audit notes these were "loaded inline instead" during handoff execution, which is less reliable than pre-loading via required_reading.

### Fix 8: templates/design-manifest.json — add 21st field

**Current designCoverage block (lines 110-132):**
```json
"designCoverage": {
  "_comment": "...",
  "hasDesignSystem": false,
  ...
  "hasLaunchKit": false
}
```

**Fixed (add hasDeployStaging as last field):**
```json
"designCoverage": {
  "_comment": "...",
  "hasDesignSystem": false,
  ...
  "hasLaunchKit": false,
  "hasDeployStaging": false
}
```

### Fix 9: Pass-through in all 9 existing coverage-writing workflows

Each of the 9 workflows in INTG-07 scope must be updated to include `"hasDeployStaging":{current}` in their designCoverage write calls. The exact text depends on each workflow's existing write format, but the pattern is consistent:

- Read current `hasDeployStaging` from coverage-check output (default `false` if absent)
- Add `"hasDeployStaging":{current}` to every `manifest-set-top-level designCoverage` call

**The 9 workflows and where their coverage writes occur:**

| Workflow | Coverage write location | Notes |
|----------|------------------------|-------|
| `brief.md` | Step 5b/5c area — coverage write for hasBusinessThesis | Multiple write variants (business/non-business) |
| `competitive.md` | Terminal step — hasCompetitive write | Single write |
| `opportunity.md` | Terminal step — hasOpportunity write | Single write |
| `flows.md` | Terminal step — hasFlows/hasServiceBlueprint write | Multiple variants |
| `wireframe.md` | Terminal step — hasWireframes write | Multiple variants |
| `critique.md` | Terminal step — hasCritique write | Single write |
| `hig.md` | Terminal step — hasHigAudit write | Single write |
| `handoff.md` | Step 7c — 4-variant write (experience/hybrid/non-experience/business) | Most complex — 4 variants |
| `system.md` | Terminal step — hasDesignSystem write | Single write |

### Fix 10: Nyquist test update — test-regression-matrix.cjs

**Current TWENTY_FIELDS (line 22-29):**
```javascript
const TWENTY_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit'
];
```

**Fixed (rename constant and add 21st field):**
```javascript
const TWENTY_ONE_FIELDS = [
  'hasDesignSystem', 'hasWireframes', 'hasFlows', 'hasHardwareSpec',
  'hasCritique', 'hasIterate', 'hasHandoff', 'hasIdeation',
  'hasCompetitive', 'hasOpportunity', 'hasMockup', 'hasHigAudit',
  'hasRecommendations', 'hasStitchWireframes', 'hasPrintCollateral',
  'hasProductionBible', 'hasBusinessThesis', 'hasMarketLandscape',
  'hasServiceBlueprint', 'hasLaunchKit', 'hasDeployStaging'
];
```

**Current V012_COVERAGE_WRITERS (line 282-292):** Does not include `deploy.md`.

**Fixed (add deploy.md):**
```javascript
const V012_COVERAGE_WRITERS = [
  'brief.md',
  'competitive.md',
  'opportunity.md',
  'flows.md',
  'wireframe.md',
  'critique.md',
  'hig.md',
  'handoff.md',
  'system.md',
  'deploy.md'
];
```

**Also update:** The describe block title at line 294 should read "21 designCoverage fields" rather than "20", and references to `TWENTY_FIELDS` should use the renamed constant `TWENTY_ONE_FIELDS`.

**Additional test assertions to add for Phase 95 verification:**
- `deploy.md` contains `OTR-outreach-sequences` (not `OTR-outreach-v`)
- `handoff.md` contains `BTH-thesis-v*.md` (not `BTH-business-thesis`)
- `wireframe.md` contains `BTH-thesis-v*.md` (not `BTH-business-thesis`)
- `handoff.md` required_reading block contains `business-track.md`
- `deploy.md` contains `hasDeployStaging` (coverage flag write exists)

---

## Common Pitfalls

### Pitfall 1: Partial BTH glob fix (missing the wireframe.md context)

**What goes wrong:** Fixing handoff.md:594 but not wireframe.md:624. Wireframe uses the BTH glob to determine pitch deck format (`DECK_FORMAT`) — a silent miss causes all `startup_team` projects to default to `yc_10` format instead of checking for funding signals.

**Why it happens:** The wireframe.md reference is inside a bash `ls` command inside a conditional block, not a Glob tool call — easy to miss.

**How to avoid:** Run `grep -rn "BTH-business-thesis" workflows/` before declaring complete. The search should return zero results.

### Pitfall 2: Forgetting the error message update in deploy.md

**What goes wrong:** Fixing the glob on line 117 but leaving the error message on line 150 still saying `OTR-outreach-v{N}.md`. Users who hit the error see the wrong expected path.

**How to avoid:** Both lines 117 and 150 must be updated together.

### Pitfall 3: Adding hasDeployStaging to deploy.md but forgetting the 9 pass-through workflows

**What goes wrong:** deploy.md writes `hasDeployStaging: true`, but when any other workflow (e.g., handoff.md) subsequently writes designCoverage, it clobbers the value back to absent (undefined defaults to false in build.md Stage 14 check).

**Why it happens:** The pass-through pattern requires every workflow to carry ALL fields — missing one causes the next workflow run to silently drop it.

**How to avoid:** Update all 9 V012_COVERAGE_WRITERS to include `hasDeployStaging: {current}`. Verify with `grep -rn "manifest-set-top-level designCoverage" workflows/` and check that every occurrence contains `hasDeployStaging`.

### Pitfall 4: Not updating templates/design-manifest.json

**What goes wrong:** Newly initialized projects have a manifest without `hasDeployStaging`, causing the coverage-check tool to return `undefined` (not `false`) for that field. Some code may fail on undefined vs false distinction.

**How to avoid:** Add `"hasDeployStaging": false` to `templates/design-manifest.json` before testing.

### Pitfall 5: Test constant name conflict

**What goes wrong:** If TWENTY_FIELDS is renamed to TWENTY_ONE_FIELDS but the describe block title is not updated, the test passes but documentation becomes misleading.

**How to avoid:** Update both the constant name AND the describe title and test description strings.

### Pitfall 6: deploy.md coverage write location

**What goes wrong:** Placing the `hasDeployStaging: true` write BEFORE Gate 4 succeeds (e.g., at the start of Step 5 instead of after the `$DEPLOY_EXIT == 0` success path). This would mark deploy as complete even if the Vercel deploy failed.

**How to avoid:** The write must be inside the `if $DEPLOY_EXIT == 0:` block in Step 4/6, not at the top of Step 5/6. Order: deploy command runs → success check → coverage flag set → then proceed to Step 5.

---

## Detailed Findings by Fix

### Finding 1 — OTR Glob Mismatch (P0 — blocks deploy)

**Confidence:** HIGH

| Property | Value |
|----------|-------|
| Producer | `handoff.md` writes `OTR-outreach-sequences-v{OTR_VERSION}.md` |
| Consumer (broken) | `deploy.md` line 117: `ls .planning/design/launch/OTR-outreach-v*.md` |
| Fix location | deploy.md line 117 (glob) + line 150 (error message) |
| Impact | deploy.md Step 2/6 fails with "OTR artifact not found" — Gates 3 and 4 unreachable |
| Requirements fixed | KIT-03, DEPLOY-04, DEPLOY-06 |

Producer evidence:
- `handoff.md:1223`: `OTR_VERSION from '.planning/design/launch/OTR-outreach-sequences-v*.md'`
- `handoff.md:1228`: `'.planning/design/launch/OTR-outreach-sequences-v{OTR_VERSION}.md'`
- `handoff.md:1264`: display message references `OTR-outreach-sequences-v{OTR_VERSION}.md`

### Finding 2 — BTH Glob Mismatch (P1 — corrupts LKT manifest)

**Confidence:** HIGH

| Property | Value |
|----------|-------|
| Producer | `brief.md` writes `BTH-thesis-v{N}.md` (confirmed at lines 597, 641, 650) |
| Consumer 1 (broken) | `handoff.md:594` Glob `BTH-business-thesis-v*.md` |
| Consumer 2 (broken) | `wireframe.md:624` ls `BTH-business-thesis-v*.md` (shell command) |
| Consumer 3 (doc string) | `critique.md:812` reference text `BTH-business-thesis-v*.md` |
| Consumer 4 (comment) | `deploy.md:419` comment `BTH-business-thesis-v1.md` |
| Severity | Consumer 1 and 2 are runtime bugs; Consumer 3 and 4 are doc/comment fixes |
| Requirements fixed | BRIEF-03, KIT-01 |

Side effect of Consumer 2 miss: `wireframe.md` uses BTH content to check for funding signals when `$BT == "startup_team"`. If BTH is not found (due to glob miss), `FUNDING_SIGNALS` stays `false` and `DECK_FORMAT` always defaults to `"yc_10"`. This silently corrupts pitch deck format selection for startup_team track.

### Finding 3 — hasDeployStaging Never Written (P2 — Stage 14 permanently pending)

**Confidence:** HIGH

| Property | Value |
|----------|-------|
| Consumer | `build.md:111,143,147,148` reads `hasDeployStaging` for Stage 14 status |
| Missing write | `deploy.md` has no `manifest-set-top-level designCoverage` call anywhere |
| Impact | Stage 14 always shows "pending" on `/pde:build` re-run |
| Requirements fixed | DEPLOY-09 |
| Cascade | Must add 21st field to manifest template + 9 pass-through workflows + Nyquist test |

build.md Stage 14 logic (verified at lines 147-148):
```
- If $BM == "true" and hasDeployStaging == true: Stage 14 status = "complete"
- If $BM == "true" and hasDeployStaging != true: Stage 14 status = "pending"
```

### Finding 4 — handoff.md Missing required_reading (P3 — context loading gap)

**Confidence:** HIGH

| Property | Value |
|----------|-------|
| Current required_reading | skill-style-guide.md, mcp-integration.md, motion-design.md, experience-disclaimer.md |
| Missing entries | business-track.md, launch-frameworks.md, business-financial-disclaimer.md, business-legal-disclaimer.md |
| All 4 files exist | Created in Phase 84 (FOUND-04 through FOUND-07) |
| Impact | Agent may process business-mode steps (Steps 4k/4l/4m) without pre-loaded business context |
| Requirements fixed | KIT-01 through KIT-06 (partial — ensures context is available) |

---

## Validation Architecture

nyquist_validation is `true` in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) |
| Config file | None — run directly with `node --test` |
| Quick run command | `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |
| Full suite command | `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KIT-03 | deploy.md globs OTR-outreach-sequences | structural | `node --test .../test-regression-matrix.cjs` | needs new assertion |
| BRIEF-03 | handoff.md globs BTH-thesis not BTH-business-thesis | structural | `node --test .../test-regression-matrix.cjs` | needs new assertion |
| BRIEF-03 | wireframe.md globs BTH-thesis not BTH-business-thesis | structural | `node --test .../test-regression-matrix.cjs` | needs new assertion |
| DEPLOY-09 | deploy.md contains hasDeployStaging write | structural | `node --test .../test-regression-matrix.cjs` | needs new assertion |
| INTG-07 | All 10 coverage workflows contain hasDeployStaging | structural | `node --test .../test-regression-matrix.cjs` | update TWENTY_FIELDS + V012_COVERAGE_WRITERS |

### Sampling Rate

- **Per task commit:** `node --test .planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`
- **Per wave merge:** Same (only one test file for this phase)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — test infrastructure already exists at `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`. Phase 95 adds assertions to the existing file rather than creating a new test file.

---

## State of the Art

| Old Pattern | Current Pattern | Changed In | Impact |
|-------------|-----------------|------------|--------|
| 20-field designCoverage | 21-field (adds hasDeployStaging) | Phase 95 | All 9 pass-through workflows + manifest template need updating |
| 9 coverage-writing workflows in INTG-07 | 10 (adds deploy.md) | Phase 95 | TWENTY_FIELDS → TWENTY_ONE_FIELDS in test |
| `OTR-outreach-v*.md` glob in deploy.md | `OTR-outreach-sequences-v*.md` | Phase 95 | Deploy preflight works end-to-end |
| `BTH-business-thesis-v*.md` in 3 consumers | `BTH-thesis-v*.md` | Phase 95 | LKT manifest accurate, pitch deck format correct |

---

## Open Questions

1. **Should deploy.md be added to V012_COVERAGE_WRITERS in the test?**
   - What we know: INTG-07 checks that coverage writers contain all fields. deploy.md will now write designCoverage.
   - What's unclear: Whether INTG-07 scope should include deploy.md (it was out of scope in Phase 94 because it didn't write coverage).
   - Recommendation: YES — add deploy.md to V012_COVERAGE_WRITERS. It now writes all 21 fields, same as the other 9.

2. **Is there a separate Phase 95 test file or do we update the Phase 94 test file?**
   - What we know: The existing test file is at `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs`.
   - What's unclear: GSD convention for modifying vs creating test files.
   - Recommendation: Update the existing Phase 94 test file in place — it is a shared regression suite for the entire v0.12 milestone, not Phase 94-specific assertions. Add Phase 95 assertions as a new `describe` block: `INTG-08: Phase 95 wiring fixes verified`.

3. **Does deploy.md's designCoverage write need all 21 variants (experience/hybrid/non-experience/business) like handoff.md?**
   - What we know: deploy.md only executes when `businessMode === true`. Non-business products never reach it.
   - What's unclear: Whether the write should branch by productType.
   - Recommendation: NO — deploy.md is business-only, so a single write variant is sufficient. No branching needed. Write all 21 fields with hasDeployStaging: true regardless of productType within business mode.

---

## Sources

### Primary (HIGH confidence)

All findings sourced directly from file inspection:

- `workflows/deploy.md` — OTR glob (line 117), BTH comment (line 419), OTR error message (line 150), gate structure (entire file)
- `workflows/handoff.md` — BTH glob (line 594), required_reading block (lines 5-10), designCoverage write pattern (lines 1452-1468)
- `workflows/wireframe.md` — BTH ls command (line 624)
- `workflows/critique.md` — BTH reference string (line 812)
- `workflows/brief.md` — BTH artifact write (lines 595-650) — producer confirmation
- `workflows/build.md` — hasDeployStaging Stage 14 check (lines 111, 143-148)
- `templates/design-manifest.json` — Current 20-field schema (lines 110-132)
- `.planning/phases/94-nyquist-regression-tests/tests/test-regression-matrix.cjs` — TWENTY_FIELDS (lines 22-29), V012_COVERAGE_WRITERS (lines 282-292), full test structure
- `.planning/v0.12-MILESTONE-AUDIT.md` — P0-P3 gap classification with exact evidence
- `.planning/config.json` — `nyquist_validation: true`

---

## Metadata

**Confidence breakdown:**
- Fix locations (exact lines): HIGH — verified by direct grep and file read
- Fix content (before/after): HIGH — both producer and consumer verified
- Cascade impact (21-field expansion): HIGH — confirmed by reading all 9 workflows' write patterns
- Test update scope: HIGH — test file read directly, all assertions verified

**Research date:** 2026-03-23
**Valid until:** Phase 95 completion (these are specific file state facts, not ecosystem knowledge)
