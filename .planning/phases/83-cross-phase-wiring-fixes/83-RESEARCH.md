# Phase 83: Cross-Phase Wiring Fixes — Research

**Researched:** 2026-03-21
**Domain:** PDE workflow skill file surgery — designCoverage schema consistency, file path alignment, documentation typo
**Confidence:** HIGH

---

## Summary

Phase 83 closes three integration gaps found by the v0.11 milestone audit. The gaps do not require new features — they are mechanical corrections to existing workflow instruction text. The dominant work (Gap 1) is updating 10 workflow files to write the full 16-field designCoverage schema instead of 14 or 15 fields. This is a purely additive change: two missing field names (`hasPrintCollateral` and `hasProductionBible`) are inserted into each file's manifest-set-top-level command and the surrounding coverage-check parse instructions. Gap 2 is a one-line path string change in wireframe.md. Gap 3 is a one-word typo fix in REQUIREMENTS.md.

All three gaps were verified by direct file inspection. Exact line numbers, current JSON payloads, and required replacements are documented below. No library versions, package installs, or architectural decisions are involved. The phase-64 manifest-schema.test.mjs already enforces the 16-field canonical schema on fixture JSON files; Phase 83 must add a new test file that enforces the same schema on workflow instruction text.

**Primary recommendation:** Edit each affected file at the exact lines documented here. Write one test file (`tests/phase-83/wiring-fixes.test.mjs`) that red-fails before edits and green-passes after. Commit atomically per gap so each commit is independently revertable.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| HDOF-06 | Print spec output for all collateral artifacts (bleed, safe area, DPI, color mode, trim size) | Gap 1 fix: adding hasPrintCollateral to all 10 affected workflows ensures handoff.md reads true and generates print spec section |
| DSYS-06 | Brand coherence tokens generated (flyer → wristband → signage → merch identity, tone of voice, sensory signature) | Gap 2 fix: correcting wireframe.md path to visual/ means SYS-experience-tokens.json is found and brand tokens flow to print artifacts |
| PRNT-04 | All print artifacts follow Awwwards-level composition (focal point, negative space, type hierarchy, max 2-3 typefaces) | Gap 2 fix is prerequisite — without brand tokens reaching wireframe.md, PRINT_PALETTE falls back to 3-color default instead of project tokens |
| WIRE-03 | Floor plan and timeline registered in design-manifest.json with FLP/TML artifact codes | Gap 3 fix: correcting FPL → FLP typo in REQUIREMENTS.md line 46 closes documentation misalignment |
</phase_requirements>

---

## Standard Stack

### Core (no new packages — this is file editing only)

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js `--test` runner | built-in (project standard) | Test framework used across all phases |
| `tests/phase-83/wiring-fixes.test.mjs` | new file | Phase-specific regression tests |

**No npm installs required.** All edits are to `.md` workflow instruction files and `REQUIREMENTS.md`.

---

## Architecture Patterns

### The 16-Field Canonical designCoverage Schema

The authoritative 16-field list (established by Phase 77 decision and enforced by tests/phase-64/manifest-schema.test.mjs lines 27-36):

```
1.  hasDesignSystem
2.  hasWireframes
3.  hasFlows
4.  hasHardwareSpec
5.  hasCritique
6.  hasIterate
7.  hasHandoff
8.  hasIdeation
9.  hasCompetitive
10. hasOpportunity
11. hasMockup
12. hasHigAudit
13. hasRecommendations
14. hasStitchWireframes
15. hasPrintCollateral    ← missing from 9 workflows (14-field files)
16. hasProductionBible    ← missing from 10 workflows (14-field files and wireframe.md 15-field)
```

The two correct baseline files are `flows.md` (line 802) and `handoff.md` (lines 1207/1210/1213) — both write all 16 fields.

### Read-Before-Set Pattern (mandatory in every affected file)

All workflow designCoverage writes follow this pattern already. The fix preserves it:

```bash
# Step 1: Read
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Step 2: Parse — extract ALL 16 fields (not 14), default absent to false

# Step 3: Write — full 16-field JSON
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

The ONLY change to each file is:
- In the parse instruction text: change "14" → "16", append `, hasPrintCollateral, hasProductionBible` to field list
- In the JSON command: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` to the JSON string

---

## Gap 1: designCoverage Field Clobber — Exact Surgery Points

### Verification of Baseline Files (confirmed correct, no changes needed)

**flows.md** — 16 fields (CORRECT BASELINE)
- Line 799: "Extract ALL sixteen current flag values" mentions `hasPrintCollateral`, `hasProductionBible`
- Line 802: JSON command contains both `"hasPrintCollateral":{current},"hasProductionBible":{current}`

**handoff.md** — 16 fields (CORRECT BASELINE)
- Line 1201: "Extract ALL sixteen current flag values" — lists both missing fields
- Lines 1207/1210/1213: All three variant JSON commands contain both fields

### Files Requiring 14 → 16 Field Fix

#### system.md — 14 fields

**Location of designCoverage write:** Lines 1931-1945 (Step 7)

**Line 1938 current text (parse instruction):**
```
Extract ALL fourteen current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`. Default any absent field to `false`. Merge `hasDesignSystem: true` while preserving all other thirteen values. Then write the full merged fourteen-field object:
```

**Line 1942 current JSON command:**
```
'{"hasDesignSystem":true,"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 1945 current anti-pattern text:**
```
All 14 fields: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Required changes to system.md:**
- Line 1938: "fourteen" → "sixteen", "thirteen" → "fifteen", add `, \`hasPrintCollateral\`, \`hasProductionBible\`` to field list
- Line 1942: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 1945: "14 fields:" → "16 fields:", append `, hasPrintCollateral, hasProductionBible` to list

---

#### critique.md — 14 fields

**Location of designCoverage write:** Lines 1015-1023 (Step 7c)

**Line 1020 current text (parse instruction):**
```
Extract ALL fourteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes. Default any absent field to `false`. Merge `hasCritique: true` while preserving all other thirteen values. Then write the full merged fourteen-field object:
```

**Line 1023 current JSON command:**
```
'{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Required changes to critique.md:**
- Line 1020: "fourteen" → "sixteen", "thirteen" → "fifteen", append `, hasPrintCollateral, hasStitchWireframes` field list correction (add `hasPrintCollateral`, `hasProductionBible` after `hasStitchWireframes`)
- Line 1023: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`

**Also update line 1060 anti-pattern note** (currently says nothing about field count — leave as-is unless it explicitly says "14").

---

#### iterate.md — 14 fields

**Location of designCoverage write:** Lines 448-455 (Step 7c)

**Line 452 current text (parse instruction):**
```
Extract ALL fourteen current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`. Default any absent field to `false`. Merge `hasIterate: true` while preserving all other thirteen values. Then write the full merged fourteen-field object:
```

**Line 455 current JSON command:**
```
'{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Also line 559 (outputs section):**
```
manifest updated with ITR artifact entry and `hasIterate: true` in designCoverage (all 13 fields preserved via read-before-set)
```

**Required changes to iterate.md:**
- Line 452: "fourteen" → "sixteen", "thirteen" → "fifteen", append `, \`hasPrintCollateral\`, \`hasProductionBible\``
- Line 455: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 559: "13 fields" → "15 fields"

---

#### hig.md — 14 fields

**Location of designCoverage write:** Lines 793-799 (Step 7 coverage update)

**Line 793 current text (parse instruction field list):**
```
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`
```

**Line 795 heading:**
```
Then write the FULL 14-field JSON, setting `hasHigAudit` to `true` and passing all other flags through unchanged:
```

**Line 799 current JSON command:**
```
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":true,"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 802 current IMPORTANT note:**
```
IMPORTANT: ... ALWAYS write all 14 fields. Canonical field order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Also line 840:**
```
- NEVER write only hasHigAudit to designCoverage — always pass all 13 fields
```

**Required changes to hig.md:**
- Line 793: append `, \`hasPrintCollateral\`, \`hasProductionBible\`` to field list
- Line 795: "14-field" → "16-field"
- Line 799: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 802: "14 fields" → "16 fields", append `, hasPrintCollateral, hasProductionBible` to canonical order
- Line 840: "13 fields" → "15 fields"

---

#### ideate.md — 14 fields

**Location of designCoverage write:** Lines 686-694 (Step 7 coverage update)

**Line 688 current text (parse instruction field list):**
```
- Canonical 14-field order: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`
```

**Line 690 heading:**
```
Then write the FULL 14-field JSON, setting `hasIdeation` to `true` and passing all other flags through unchanged:
```

**Line 694 current JSON command:**
```
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":true,"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 697 IMPORTANT note:**
```
IMPORTANT: ... ALWAYS write all 14 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Line 730 anti-pattern:**
```
- NEVER use dot-notation for designCoverage. Always write full 13-field JSON via pass-through-all. Writing `{"hasIdeation":true}` alone erases the other 12 flags.
```

**Required changes to ideate.md:**
- Line 688: "14-field" → "16-field", append `, \`hasPrintCollateral\`, \`hasProductionBible\``
- Line 690: "14-field" → "16-field"
- Line 694: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 697: "14 fields" → "16 fields", append `, hasPrintCollateral, hasProductionBible`
- Line 730: "13-field" → "15-field", "12 flags" → "15 flags"

---

#### competitive.md — 14 fields

**Location of designCoverage write:** Lines 546-554 (Step 7 coverage update)

**Line 548 current text (parse instruction field list):**
```
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`
```

**Line 550 heading:**
```
Then write the FULL 14-field JSON, setting `hasCompetitive` to `true` and passing all other flags through unchanged:
```

**Line 554 current JSON command:**
```
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":true,"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 557 IMPORTANT note:**
```
IMPORTANT: ... ALWAYS write all 14 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Line 587 anti-pattern:**
```
- NEVER skip coverage-check before writing designCoverage. Always read existing flags and pass them all through. Writing only `{"hasCompetitive":true}` will erase the other 12 flags.
```

**Required changes to competitive.md:**
- Line 548: append `, \`hasPrintCollateral\`, \`hasProductionBible\``
- Line 550: "14-field" → "16-field"
- Line 554: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 557: "14 fields" → "16 fields", append `, hasPrintCollateral, hasProductionBible`
- Line 587: "12 flags" → "15 flags"

---

#### opportunity.md — 14 fields

**Location of designCoverage write:** Lines 469-477 (Step 7 coverage update)

**Line 471 current text (parse instruction field list):**
```
- Canonical 14-field order: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`
```

**Line 473 heading:**
```
Then write the FULL 14-field JSON, setting `hasOpportunity` to `true` and passing all other flags through unchanged:
```

**Line 477 current JSON command:**
```
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":true,"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 480 IMPORTANT note:**
```
IMPORTANT: ... ALWAYS write all 14 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Line 507 anti-pattern:**
```
- NEVER skip coverage-check before writing designCoverage. Always read existing flags and pass them all through. Writing only `{"hasOpportunity":true}` will erase the other 12 flags.
```

**Required changes to opportunity.md:**
- Line 471: "14-field" → "16-field", append `, \`hasPrintCollateral\`, \`hasProductionBible\``
- Line 473: "14-field" → "16-field"
- Line 477: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 480: "14 fields" → "16 fields", append `, hasPrintCollateral, hasProductionBible`
- Line 507: "12 flags" → "15 flags"

---

#### recommend.md — 14 fields

**Location of designCoverage write:** Lines 556-588 (Step 7)

**Lines 567-582 current field table:**
Lists 14 fields: hasDesignSystem through hasStitchWireframes — `hasPrintCollateral` and `hasProductionBible` are absent.

**Line 584 heading:**
```
Then write the full 14-field JSON in canonical order...
```

**Line 588 current JSON command:**
```
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":true,"hasStitchWireframes":{current_hasStitchWireframes}}'
```

Note: recommend.md uses `{current_fieldName}` placeholder style (not `{current}`) — the planner MUST preserve this style.

**Line 593 IMPORTANT note:**
```
IMPORTANT: Never use dot-notation (e.g., `designCoverage.hasRecommendations`) with `manifest-set-top-level`. Always pass the complete 14-field JSON object.
```

**Lines 622-623 anti-patterns:**
```
- NEVER skip `coverage-check` before writing `designCoverage` — always read all 13 existing flags first...
- NEVER use dot-notation... — always pass the complete JSON object.
```

**Required changes to recommend.md:**
- Lines 567-582 field table: add two new rows for `hasPrintCollateral` (false) and `hasProductionBible` (false)
- Line 584: "14-field" → "16-field"
- Line 588: append `,"hasPrintCollateral":{current_hasPrintCollateral},"hasProductionBible":{current_hasProductionBible}` before closing `'`
- Line 593: "14-field" → "16-field"
- Lines 622: "13 existing flags" → "15 existing flags"
- Line 565: "14 fields" → "16 fields"

---

#### mockup.md — 14 fields

**Location of designCoverage write:** Lines 1424-1432 (Step 7e)

**Line 1425-1426 current text (parse instruction field list):**
```
Parse the JSON result. Extract all 14 flags. Default any absent flag to `false`:
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`
```

**Line 1428 heading:**
```
Then write the FULL 14-field JSON, setting `hasMockup` to `true` and passing all other flags through unchanged:
```

**Line 1432 current JSON command:**
```
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":true,"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**Line 1435 IMPORTANT note:**
```
IMPORTANT: ... ALWAYS write all 14 fields. Canonical field order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.
```

**Line 1480 anti-pattern:**
```
- **Never skip coverage-check before writing designCoverage.** Always read existing flags and pass all 13 through. Writing only `{"hasMockup":true}` will erase the other 12 flags.
```

**Also line 1509 outputs section:**
```
manifest updated with MCK artifact entry and hasMockup: true in designCoverage
```

**Required changes to mockup.md:**
- Line 1425: "14 flags" → "16 flags"
- Line 1426: append `, \`hasPrintCollateral\`, \`hasProductionBible\``
- Line 1428: "14-field" → "16-field"
- Line 1432: append `,"hasPrintCollateral":{current},"hasProductionBible":{current}` before closing `'`
- Line 1435: "14 fields" → "16 fields", append `, hasPrintCollateral, hasProductionBible`
- Line 1480: "13 through" → "15 through", "12 flags" → "15 flags"

---

### wireframe.md — 15 fields (hasPrintCollateral present, hasProductionBible absent)

**Location of designCoverage write:** Lines 2008-2025 (Step 7d)

**Line 2015 current text (parse instruction):**
```
Extract ALL fifteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes, hasPrintCollateral.
```

`hasProductionBible` is absent from the parse instruction.

**Lines 2019/2022/2025 current JSON commands (3 variants — all missing hasProductionBible):**
```
# Standard run:
'{"hasDesignSystem":{current},...,"hasStitchWireframes":{current},"hasPrintCollateral":{current}}'
# --use-stitch run:
'{"hasDesignSystem":{current},...,"hasStitchWireframes":true,"hasPrintCollateral":{current}}'
# Experience product run:
'{"hasDesignSystem":{current},...,"hasStitchWireframes":{current},"hasPrintCollateral":true}'
```

**Line 2079 anti-pattern (says "replaces the ENTIRE designCoverage object" but no field count):**
No numeric field count to update in anti-patterns section.

**Required changes to wireframe.md:**
- Line 2015: "fifteen" → "sixteen", append `, hasProductionBible` to field list
- Line 2019: append `,"hasProductionBible":{current}` before closing `'`
- Line 2022: append `,"hasProductionBible":{current}` before closing `'`
- Line 2025: append `,"hasProductionBible":{current}` before closing `'`

---

## Gap 2: Token File Path Mismatch — Exact Surgery Point

**wireframe.md line 161 (the ONLY line to change for Gap 2):**

Current:
```
Use the Glob tool to check for `.planning/design/assets/SYS-experience-tokens.json`.
```

Required:
```
Use the Glob tool to check for `.planning/design/visual/SYS-experience-tokens.json`.
```

**Verification:** system.md writes to `.planning/design/visual/SYS-experience-tokens.json` (confirmed at lines 1807, 1809, 1818, 1825, 1831). The Gap 2 fix is one string replacement on one line.

**Secondary mention** — wireframe.md line 1133 contains:
```
- Color: derived from SYS-experience-tokens.json brand coherence tokens
```
This line has no path, so no change needed there.

**wireframe.md line 172** (warning log message) references the filename without a path — no change needed.

---

## Gap 3: REQUIREMENTS.md Typo — Exact Surgery Point

**REQUIREMENTS.md line 46:**

Current:
```
- [x] **WIRE-03**: Floor plan and timeline registered in design-manifest.json with FLP/TML artifact codes
```

Wait — line 46 in the actual file reads:
```
- [x] **WIRE-03**: Floor plan and timeline registered in design-manifest.json with FLP/TML artifact codes
```

This is ALREADY correct (FLP, not FPL). The audit YAML at the top of v0.11-MILESTONE-AUDIT.md says "REQUIREMENTS.md line 46 says 'FPL'" but the actual file content at line 46 says "FLP/TML". **The typo may already be fixed**, or the audit was reporting the line number from a prior state.

**Action required:** The planner must re-verify line 46 of REQUIREMENTS.md at edit time. If it already reads "FLP", no change is needed for Gap 3. If it reads "FPL", change it.

**Confirmed current state from grep:** `grep -n "FPL\|FLP" REQUIREMENTS.md` returned only one match:
```
46: - [x] **WIRE-03**: Floor plan and timeline registered in design-manifest.json with FLP/TML artifact codes
```
The line already uses FLP. Gap 3 is already resolved in the current file state. The planner should verify and mark as no-op if confirmed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Verifying field counts in workflow files | Custom parser | `assert.ok(content.includes('hasPrintCollateral'))` pattern — same as phase-64 and phase-82 tests |
| Updating multiple files with same pattern | Shell script | Edit tool calls on each file individually — each is different enough to require human-readable attention |
| Schema enforcement | Runtime validation | Test-time string assertions on workflow text content (established project pattern) |

---

## Common Pitfalls

### Pitfall 1: Missing the recommend.md placeholder style difference
**What goes wrong:** recommend.md uses `{current_hasFieldName}` style (distinct named placeholders), not `{current}`. If the planner copies the JSON extension from another file, it will write `,"hasPrintCollateral":{current}` instead of `,"hasPrintCollateral":{current_hasPrintCollateral}`.
**Prevention:** Use `{current_hasPrintCollateral}` and `{current_hasProductionBible}` for recommend.md only.

### Pitfall 2: Updating JSON but not the surrounding prose
**What goes wrong:** The parse instruction text and IMPORTANT/anti-pattern notes also say "14" or "13" — leaving them stale confuses future maintainers.
**Prevention:** Each file has 2-4 prose locations to update in addition to the JSON line. All are documented above.

### Pitfall 3: Assuming wireframe.md needs hasProductionBible set to true
**What goes wrong:** wireframe.md's job is to pass through `hasProductionBible:{current}` — it does NOT generate a production bible, so it must never hardcode `hasProductionBible: true`. Only handoff.md sets this to true.
**Prevention:** All three wireframe.md JSON variant lines should append `,"hasProductionBible":{current}` (not `:true`).

### Pitfall 4: Breaking tests/phase-82/regression-matrix.test.mjs
**What goes wrong:** Phase 82 tests check that all 13 pipeline skills contain the `experience` keyword. After edits, the keyword must still be present (it will be, since we're only adding fields — not removing blocks).
**Prevention:** Run `node --test tests/phase-82/regression-matrix.test.mjs` after all edits.

### Pitfall 5: Clobbering the iteration.md outputs section field count
**What goes wrong:** iterate.md line 559 says "all 13 fields preserved" — this is inconsistent with the fix (should become "all 15 fields preserved") but easy to miss since it's in the outputs section, not the command block.
**Prevention:** grep for "13 fields" in each file before marking as done.

### Pitfall 6: Gap 3 may already be resolved
**What goes wrong:** Spending time editing REQUIREMENTS.md when the FPL → FLP fix was already applied.
**Prevention:** Verify current state of REQUIREMENTS.md line 46 before editing. Current grep confirms it reads "FLP" already.

---

## Code Examples

### Canonical 16-Field JSON Template
```bash
# Use this as the authoritative template for all 10 files
# (replace hasXxx:true with the flag this skill sets)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current}}'
```

### Test Pattern (from phase-64/manifest-schema.test.mjs — use same approach)
```javascript
// Source: tests/phase-64/manifest-schema.test.mjs lines 77-90
test('workflow writes 16-field designCoverage', () => {
  const content = readFileSync(join(ROOT, 'workflows/critique.md'), 'utf-8');
  assert.ok(
    content.includes('hasPrintCollateral'),
    'critique.md: designCoverage missing hasPrintCollateral'
  );
  assert.ok(
    content.includes('hasProductionBible'),
    'critique.md: designCoverage missing hasProductionBible'
  );
});
```

### Gap 2 Path Fix
```
# wireframe.md line 161
# Before:
Use the Glob tool to check for `.planning/design/assets/SYS-experience-tokens.json`.
# After:
Use the Glob tool to check for `.planning/design/visual/SYS-experience-tokens.json`.
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| 14-field designCoverage (no print/bible flags) | 16-field schema with hasPrintCollateral + hasProductionBible | Prevents clobber of print pipeline flags |
| wireframe.md reads tokens from assets/ | wireframe.md reads tokens from visual/ (matching write path) | Brand tokens flow to print artifacts |

**Not deprecated:** The read-before-set pattern itself is correct and must be preserved in all files.

---

## Open Questions

1. **Gap 3 actual state**
   - What we know: grep confirms REQUIREMENTS.md line 46 currently reads "FLP" (correct)
   - What's unclear: Was the audit's "FPL" report based on a prior file state that was since fixed, or was the grep result in research wrong?
   - Recommendation: Planner verifies by reading line 46 at task execution time. If "FLP" → mark as no-op and close with no edit. If "FPL" → fix it.

2. **build.md designCoverage mentions**
   - What we know: build.md references designCoverage as "single source of truth" (line 2) but does not write it — it reads it to decide which stages to skip
   - What's unclear: Nothing — build.md is confirmed as a non-writer and does not need changes
   - Recommendation: No changes to build.md

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test` + `node:assert/strict` |
| Config file | none — test files run directly |
| Quick run command | `node --test tests/phase-83/wiring-fixes.test.mjs` |
| Full suite command | `node --test tests/phase-82/milestone-completion.test.mjs tests/phase-82/regression-matrix.test.mjs tests/phase-83/wiring-fixes.test.mjs` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HDOF-06 | All 10 affected workflows contain hasPrintCollateral in designCoverage write | unit | `node --test tests/phase-83/wiring-fixes.test.mjs` | ❌ Wave 0 |
| HDOF-06 | All 10 affected workflows contain hasProductionBible in designCoverage write | unit | `node --test tests/phase-83/wiring-fixes.test.mjs` | ❌ Wave 0 |
| DSYS-06 | wireframe.md reads SYS-experience-tokens.json from .planning/design/visual/ | unit | `node --test tests/phase-83/wiring-fixes.test.mjs` | ❌ Wave 0 |
| PRNT-04 | (covered by DSYS-06 token path fix — same test) | — | — | — |
| WIRE-03 | REQUIREMENTS.md uses FLP (not FPL) for WIRE-03 | unit | `node --test tests/phase-83/wiring-fixes.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node --test tests/phase-83/wiring-fixes.test.mjs`
- **Per wave merge:** `node --test tests/phase-82/milestone-completion.test.mjs tests/phase-82/regression-matrix.test.mjs tests/phase-83/wiring-fixes.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-83/wiring-fixes.test.mjs` — covers all three gaps (HDOF-06, DSYS-06, WIRE-03)

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection of all 12 workflow files (grep + Read tool) — all findings are exact line numbers from current file state
- `tests/phase-64/manifest-schema.test.mjs` — canonical 16-field list at lines 27-36
- `.planning/v0.11-MILESTONE-AUDIT.md` — gap definitions and severities

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` decisions block — confirms architectural constraints (SYS-experience-tokens.json path, hasPrintCollateral as 15th flag added Phase 80)

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Gap 1 surgery points: HIGH — verified by direct grep + Read of all 10 files, exact JSON extracted
- Gap 2 surgery point: HIGH — line 161 confirmed by grep, write path confirmed in system.md
- Gap 3 state: HIGH — confirmed "FLP" already present at line 46; may be a no-op
- Test approach: HIGH — same `node:test` pattern used across all prior phases

**Research date:** 2026-03-21
**Valid until:** Indefinite — these are static markdown files with no version dependencies
