# Phase 64: Coverage Schema Migration — Research

**Researched:** 2026-03-20
**Domain:** Codebase-internal — designCoverage schema extension, workflow file editing
**Confidence:** HIGH — all findings from direct codebase inspection, zero external dependencies

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MCP-04 | designCoverage schema extended with hasStitchWireframes field across all 13 existing pipeline skills (pass-through-all pattern preserved) | All 13 skill files identified with exact paths and exact manifest-set-top-level line numbers; 14-field JSON pattern documented; template update required |
</phase_requirements>

---

## Summary

Phase 64 is a pure schema migration — no new behavior, no new tests of user-facing functionality. The `designCoverage` object in `design-manifest.json` must grow from 13 fields to 14 fields by appending `hasStitchWireframes: false` as the new last field. Because `manifest-set-top-level` performs a complete object replacement (verified in `bin/lib/design.cjs` line 264: `manifest[field] = value`), every skill that writes `designCoverage` must include the new field in its JSON literal or the field disappears the next time that skill runs.

The 13 skills are confirmed by direct grep of `manifest-set-top-level designCoverage` across all workflow files. Brief (`workflows/brief.md`) does NOT write designCoverage — its preamble docstring is stale. The live `design-manifest.json` at `.planning/design/design-manifest.json` currently has only 7 fields (older schema); the template at `templates/design-manifest.json` and all pressure-test fixtures show the 13-field schema. Both the template and the live manifest need updating.

**Primary recommendation:** Edit all 13 workflow files and the design-manifest.json template to add `"hasStitchWireframes":false` in canonical position (after `hasRecommendations`). The live manifest at `.planning/design/design-manifest.json` also needs the field added directly. No code changes required — only markdown workflow files and JSON files.

---

## Standard Stack

This phase has no external library dependencies. All work is editing existing text files:

| File type | Tool used | Purpose |
|-----------|-----------|---------|
| `workflows/*.md` (13 files) | Edit tool | Add `hasStitchWireframes` to each `manifest-set-top-level designCoverage` JSON literal |
| `templates/design-manifest.json` | Edit tool | Add `hasStitchWireframes: false` to `designCoverage` block |
| `.planning/design/design-manifest.json` | Edit tool | Add `hasStitchWireframes: false` to live manifest |
| `bin/lib/design.cjs` | Read only | Self-test runner for verification |

**No npm install needed. No new files created.**

---

## Architecture Patterns

### The Pass-Through-All Pattern

**What it is:** Every skill that writes `designCoverage` must read the current state first (`coverage-check`), then write back the full N-field object including both its own flag set to `true` and ALL other flags passed through with their current values.

**Why it exists:** `cmdManifestSetTopLevel` (design.cjs line 264) does `manifest[field] = value` — it replaces the entire `designCoverage` object with whatever JSON is passed. A skill that passes only its own flag resets all other flags to absent/undefined.

**The exact two-step pattern used by all 13 skills:**

Step 1 — Read current coverage:
```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Step 2 — Write full N-field object with own flag set to `true`:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},...,"hasRecommendations":{current}}'
```

The `{current}` placeholders are replaced at runtime with the actual boolean values from the coverage-check JSON output.

### Canonical Field Order

**This order is enforced in every skill and must be maintained in the 14-field version:**

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
14. hasStitchWireframes   ← NEW, always last
```

### How Each Skill's Pattern Reads (before migration)

Each skill's `manifest-set-top-level` line currently looks like:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

After migration, every skill gets `,"hasStitchWireframes":{current}` appended before the closing `}`. Only `wireframe.md` additionally needs the pass-through prose updated to mention the 14th field (since it will later set this flag to `true` in Phase 66).

### Template and Live Manifest Pattern

**Template** (`templates/design-manifest.json` lines 107-122):
```json
"designCoverage": {
  "_comment": "Boolean flags indicating which design artifact types exist...",
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
  "hasRecommendations": false
}
```

After migration: add `"hasStitchWireframes": false` after `"hasRecommendations": false`.

**Live manifest** (`.planning/design/design-manifest.json`) currently only has 7 fields — it was created before fields 8-13 were added. It needs all fields 8-14 added directly.

---

## All 13 Skill Files That Need Modification

**Confirmed by grep of `manifest-set-top-level designCoverage` across all workflow files.**

| # | File | Line # | Own flag set | Notes |
|---|------|--------|--------------|-------|
| 1 | `workflows/wireframe.md` | 777 | `hasWireframes: true` | Also update prose on line 774 to say "fourteen" instead of "thirteen" |
| 2 | `workflows/mockup.md` | 1222-1223 | `hasMockup: true` | Multi-line format with backslash continuation |
| 3 | `workflows/system.md` | 1846 | `hasDesignSystem: true` | Single-line format |
| 4 | `workflows/flows.md` | 536 | `hasFlows: true` | Single-line format |
| 5 | `workflows/critique.md` | 701 | `hasCritique: true` | Single-line format |
| 6 | `workflows/iterate.md` | 453 | `hasIterate: true` | Single-line format |
| 7 | `workflows/handoff.md` | 720 | `hasHandoff: true` | Single-line format |
| 8 | `workflows/ideate.md` | 484-485 | `hasIdeation: true` | Multi-line format |
| 9 | `workflows/competitive.md` | 551-552 | `hasCompetitive: true` | Multi-line format |
| 10 | `workflows/opportunity.md` | 474-475 | `hasOpportunity: true` | Multi-line format |
| 11 | `workflows/hig.md` | 619-620 | `hasHigAudit: true` | Multi-line format |
| 12 | `workflows/recommend.md` | 585-586 | `hasRecommendations: true` | Multi-line format with named placeholders (`{current_hasDesignSystem}` etc.) |
| 13 | `workflows/brief.md` | N/A | DOES NOT WRITE designCoverage | Confirmed — brief only writes `projectName` and `productType`; no coverage write |

**Important:** `brief.md` line 2 says "preserving all 7 designCoverage fields" in its preamble — that docstring is stale and describes an old schema. `brief.md` has NO `manifest-set-top-level designCoverage` call. Only 13 files need editing (not 14 counting brief, not 12 excluding brief from the architecture count).

**Second stale docstring:** `handoff.md` line 2 also says "preserving all 7 designCoverage fields" — equally stale. The actual manifest-set-top-level call on line 720 already has all 13 fields. Update the line 2 docstring in handoff.md from "7" to "14" as part of the migration.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading current coverage before write | Custom JSON parsing script | `design coverage-check` command | Already exists, handles @file: prefix pattern |
| Writing designCoverage | Direct file write | `design manifest-set-top-level designCoverage` | Already exists, handles updatedAt, write lock awareness |
| Field ordering | Alphabetical sort or ad hoc order | Canonical order (documented above) | All 13 skills agree on this order — deviating breaks readability and future grep patterns |

**Key insight:** The entire migration is string editing. No new commands, no new Node.js code, no new JSON schemas. Every tool needed already exists.

---

## Common Pitfalls

### Pitfall 1: Wrong Default Value for hasStitchWireframes

**What goes wrong:** Setting `hasStitchWireframes: true` as the default in the template or as the pass-through value.
**Why it happens:** Confusing "this skill sets its own flag to true" with "pass-through fields default to their current value."
**How to avoid:** `hasStitchWireframes` defaults to `false` everywhere except `wireframe.md` (which will set it to `true` in Phase 66). For Phase 64, all 13 skills pass through `{current}` — they do not set it to `true`. The template and live manifest set it to `false`. Wireframe.md adds the pass-through now; Phase 66 will change its specific line to set `hasStitchWireframes: true`.
**Warning signs:** If hasStitchWireframes appears as `true` in any fixture or template after this phase, something went wrong.

### Pitfall 2: Missing a Skill File

**What goes wrong:** Updating 12 of the 13 skills, leaving one with the old 13-field JSON.
**Why it happens:** The architecture doc lists "all 13" but the confirmation requires a grep.
**How to avoid:** Use the confirmed list of 13 files above (verified by direct grep). After edits, run a grep to confirm all 13 files have `hasStitchWireframes` in their manifest-set-top-level line.
**Verification command:**
```bash
grep -l "hasStitchWireframes" workflows/wireframe.md workflows/mockup.md workflows/system.md workflows/flows.md workflows/critique.md workflows/iterate.md workflows/handoff.md workflows/ideate.md workflows/competitive.md workflows/opportunity.md workflows/hig.md workflows/recommend.md
```
Expect: 12 files listed (recommend.md uses named placeholders — verify manually).

### Pitfall 3: Breaking the Multi-Line Format Skills

**What goes wrong:** Skills using backslash-continuation format (mockup, competitive, opportunity, hig, ideate, recommend) get a syntax error if the new field is added on the wrong line or with wrong quoting.
**Why it happens:** These use `\` to continue the bash command across lines inside a markdown code block.
**How to avoid:** Add `,"hasStitchWireframes":{current}` immediately before the closing `}'` on the last line of the JSON string. The closing `}'` is already on its own line after the `\`.
**Example of correct multi-line edit (mockup):**
```bash
# Before
  '{"hasDesignSystem":{current},...,"hasRecommendations":{current}}'
# After
  '{"hasDesignSystem":{current},...,"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

### Pitfall 4: Not Updating the Live Manifest

**What goes wrong:** All 13 workflow files updated, but `.planning/design/design-manifest.json` not updated.
**Why it happens:** The live manifest is easy to overlook since it is a data file not a code file.
**Why it matters:** The live manifest currently only has 7 fields. When `coverage-check` is called on this project, it returns only 7 fields. If a skill runs after Phase 64 but before any Stitch work, the coverage-check JSON will be missing `hasStitchWireframes`. The skill will default it to `false` (per each skill's "Default any absent field to false" instruction) — this is safe, but the manifest will be inconsistent until the first coverage write.
**How to avoid:** Update `.planning/design/design-manifest.json` directly in this phase to add all missing fields (8-14) to bring the live manifest to 14-field schema.

### Pitfall 5: Updating Brief.md by Mistake

**What goes wrong:** Adding a `hasStitchWireframes` pass-through to `brief.md` because it is listed in the architecture doc's 13-workflow list.
**Why it happens:** The architecture doc lists `workflows/brief.md` in the 13 skills. But brief does NOT have a `manifest-set-top-level designCoverage` call.
**How to avoid:** Brief is in the architecture list because it was originally counted (early schema had brief writing coverage). The actual grep confirms no designCoverage write in brief.md. Do not add one.

### Pitfall 6: Stale Docstrings Creating Confusion

**What goes wrong:** `handoff.md` line 2 says "7 designCoverage fields." After migration it will be 14 but the line will still say 7.
**How to avoid:** Update stale docstrings in `handoff.md` (line 2) from "7" to "14" as part of this migration.

### Pitfall 7: recommend.md Uses Named Placeholders

**What goes wrong:** recommend.md uses `{current_hasDesignSystem}` style placeholders (not `{current}`) and requires a different edit than the other 12 skills.
**How to avoid:** The new field for recommend.md should use `,"hasStitchWireframes":{current_hasStitchWireframes}` — matching its existing named-placeholder convention.

---

## Code Examples

### The 14-Field JSON String (after migration, canonical form)

For skills using `{current}` placeholder style (10 of 13 skills):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

For wireframe.md specifically (sets `hasWireframes: true`, passes through all others including new field):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

For recommend.md specifically (named placeholder convention):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current_hasDesignSystem},"hasWireframes":{current_hasWireframes},"hasFlows":{current_hasFlows},"hasHardwareSpec":{current_hasHardwareSpec},"hasCritique":{current_hasCritique},"hasIterate":{current_hasIterate},"hasHandoff":{current_hasHandoff},"hasIdeation":{current_hasIdeation},"hasCompetitive":{current_hasCompetitive},"hasOpportunity":{current_hasOpportunity},"hasMockup":{current_hasMockup},"hasHigAudit":{current_hasHigAudit},"hasRecommendations":{current_hasRecommendations},"hasStitchWireframes":{current_hasStitchWireframes}}'
```

### Template designCoverage Block (after migration)

In `templates/design-manifest.json`:

```json
"designCoverage": {
  "_comment": "Boolean flags indicating which design artifact types exist. PDE uses this to determine what design context is available for engineering planning.",
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
  "hasStitchWireframes": false
}
```

### Live Manifest designCoverage Block (after migration)

In `.planning/design/design-manifest.json` (currently only 7 fields, bring to 14):

```json
"designCoverage": {
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
  "hasStitchWireframes": false
}
```

### Prose Updates (where skill instructions enumerate the fields)

Every skill that says "Extract ALL thirteen current flag values" or lists the 13 fields needs updating to say "fourteen" and include `hasStitchWireframes`. Key prose locations:

- `wireframe.md` line 774: "thirteen" → "fourteen", add `hasStitchWireframes` to the field list
- `mockup.md` line 1217: add `hasStitchWireframes` to field list
- `competitive.md` line 545-546: add to field list
- `critique.md` line 698: "thirteen" → "fourteen", add to field list
- `flows.md` line 518: "thirteen" → "fourteen", add to field list
- `handoff.md` line 717: "thirteen" → "fourteen", add to field list; also line 2: "7" → "14"
- `hig.md` line 614: add to field list
- `ideate.md` line 479: add to field list
- `iterate.md` line 450: "thirteen" → "fourteen", add to field list
- `mockup.md` line 1226: "13 fields" → "14 fields", add to canonical field order list
- `opportunity.md` line 469: add to field list
- `recommend.md` line 564-580: add row for `hasStitchWireframes` to table, update "13-field" → "14-field"
- `system.md` line 1849: "thirteen-field" → "fourteen-field", add to field list

---

## Verification Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | design.cjs self-test (built-in Node.js assert) |
| Config file | none — invoked via `node bin/lib/design.cjs --self-test` |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MCP-04 | All 13 workflow files contain `hasStitchWireframes` in manifest-set-top-level line | grep audit | `grep -l "hasStitchWireframes" workflows/wireframe.md workflows/mockup.md workflows/system.md workflows/flows.md workflows/critique.md workflows/iterate.md workflows/handoff.md workflows/ideate.md workflows/competitive.md workflows/opportunity.md workflows/hig.md workflows/recommend.md` | ✅ all 12 (verify recommend manually) |
| MCP-04 | Template has 14-field designCoverage | grep | `grep "hasStitchWireframes" templates/design-manifest.json` | ✅ after edit |
| MCP-04 | Live manifest has 14-field designCoverage | grep | `grep "hasStitchWireframes" .planning/design/design-manifest.json` | ✅ after edit |
| MCP-04 | design.cjs core mechanics unchanged | unit | `node bin/lib/design.cjs --self-test` | ✅ exists |

### Sampling Rate

- **Per task commit:** `grep "hasStitchWireframes" workflows/*.md templates/design-manifest.json .planning/design/design-manifest.json`
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** All 14 files have `hasStitchWireframes` confirmed by grep before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test infrastructure (design.cjs self-test) covers the mechanics. No new test files needed. Verification is primarily a grep audit confirming all 13 workflow files and 2 JSON files contain the new field.

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| 7-field designCoverage (original schema) | 13-field designCoverage (current schema in workflows) | Live manifest at `.planning/design/design-manifest.json` still has 7 fields — needs migration |
| — | 14-field designCoverage (after this phase) | Adds `hasStitchWireframes` at position 14 |

**Schema drift note:** The live manifest was initialized before fields 8-13 were added. The skills' `coverage-check` → parse → default-absent-to-false → write-back pattern handles this gracefully at runtime, but the live manifest should be brought current as part of this migration for clarity.

---

## Open Questions

1. **Should brief.md get a hasBrief flag now?**
   - What we know: brief.md explicitly documents "NEVER add a hasBrief flag" (line 537)
   - What's unclear: Nothing — this is a hard anti-pattern in the codebase
   - Recommendation: Do not add hasBrief. Brief completion is tracked via presence of `artifacts.BRF` in the manifest.

2. **Should fixture manifests also be updated?**
   - What we know: Three pressure-test fixtures exist (`fixture-greenfield`, `fixture-partial`, `fixture-rerun`), all showing 13-field designCoverage
   - What's unclear: Whether the pressure-test system validates coverage field count
   - Recommendation: Update all three fixture manifests to 14-field for consistency. Low risk — fixtures are static test data.

---

## Sources

### Primary (HIGH confidence)

All findings from direct codebase inspection:

- `bin/lib/design.cjs` line 264 — `manifest[field] = value` confirms complete object replacement
- `bin/lib/design.cjs` line 296-302 — `cmdCoverageCheck` returns `manifest.designCoverage` verbatim
- `bin/lib/design.cjs` line 601 — `--self-test` entry point confirmed
- `templates/design-manifest.json` lines 107-122 — 13-field designCoverage schema, no `hasStitchWireframes`
- `workflows/wireframe.md` lines 767-778 — canonical pass-through-all pattern documented in code
- grep of all 13 `manifest-set-top-level designCoverage` call sites across workflows/
- `.planning/design/design-manifest.json` — live manifest confirmed 7-field (stale)
- `.planning/pressure-test/fixture-*/design/design-manifest.json` — all show 13-field schema

### Secondary (MEDIUM confidence)

- `.planning/research/ARCHITECTURE.md` — architecture document listing the 13 skills; cross-verified against actual grep results (brief.md correctly absent from actual call sites)

---

## Metadata

**Confidence breakdown:**
- File list (13 skills): HIGH — confirmed by grep across all workflow files
- Field list (13 current flags): HIGH — confirmed from template, fixtures, and multiple skills
- Pass-through pattern: HIGH — confirmed from design.cjs source and workflow code
- Default value for new field: HIGH — `false` is the only correct default (wireframe-stitch.md sets it to `true` in Phase 66)
- Live manifest state: HIGH — directly read `.planning/design/design-manifest.json`

**Research date:** 2026-03-20
**Valid until:** Until any workflow file changes designCoverage field order (no external dependency — fully stable)
