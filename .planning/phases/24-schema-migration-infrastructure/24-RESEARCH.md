# Phase 24: Schema Migration & Infrastructure — Research

**Researched:** 2026-03-16 (updated 2026-03-16)
**Domain:** JSON manifest schema extension, bash workflow pattern migration, Node.js directory initialization
**Confidence:** HIGH — all findings derived from direct source inspection of the existing codebase

---

## Summary

Phase 24 is a pure infrastructure migration. There are no new user-facing skills. Every deliverable is a modification to existing code: the manifest template, six existing workflow files, and the `ensureDesignDirs` function in `design.cjs`.

The core risk is the "replace vs. merge" problem. `manifest-set-top-level` performs a flat key assignment — it replaces the entire `designCoverage` object with whatever value is passed. All seven existing skills already guard against this with a read-before-set pattern (`design coverage-check` then write the full merged object). The migration extends that pattern from 7 fields to 13. Each existing skill's Step 7 workflow block must be updated to enumerate all 13 flags, not just 7.

The three INFRA requirements decompose cleanly: INFRA-01 is workflow text edits (6 files — brief.md confirmed no-op), INFRA-02 is a JSON template edit (1 file), and INFRA-03 is a Node.js code edit (1 file plus self-test label update). There are no new APIs, no new dependencies, and no architectural decisions to make — the patterns are already established in the codebase.

**Primary recommendation:** Update the 6 workflow files (INFRA-01), then the template (INFRA-02), then `design.cjs` plus its self-test label (INFRA-03). Validate with `node bin/lib/design.cjs --self-test` after INFRA-03; baseline is 20/20 passing.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Coverage flag update pattern migrated to pass-through-all across existing skills | The read-before-set pattern exists in all 6 relevant workflows (brief.md confirmed no-op); each must enumerate all 13 flags instead of 7 |
| INFRA-02 | Design manifest schema extended with 6 new coverage flags | `templates/design-manifest.json` `designCoverage` block is the single source of truth for new projects; 6 fields added after `hasHandoff` in template field order |
| INFRA-03 | `ensureDesignDirs` updated with `ux/mockups` output directory | `DOMAIN_DIRS` constant in `design.cjs` line 17 is the only code change; self-test at line 388 label also needs update |
</phase_requirements>

---

## Standard Stack

### Core
| Component | Location | Purpose | Why This Is the Standard |
|-----------|----------|---------|--------------------------|
| `bin/lib/design.cjs` | `bin/lib/design.cjs` | All manifest CRUD, directory init, write-lock | Single canonical library for design pipeline ops; all 7 existing skills depend on it |
| `templates/design-manifest.json` | `templates/design-manifest.json` | Schema template used by `ensureDesignDirs` on first init | Parsed by `ensureDesignDirs` to generate live `design-manifest.json`; `_comment` keys stripped at init time |
| `bin/pde-tools.cjs` CLI | `bin/pde-tools.cjs` | Shell interface for all design operations | Workflows invoke this via bash; no direct module imports in workflow files |

### The Three Affected Code Paths

| Requirement | File(s) to Edit | Mechanism |
|-------------|----------------|-----------|
| INFRA-01 | `workflows/system.md`, `workflows/flows.md`, `workflows/wireframe.md`, `workflows/critique.md`, `workflows/iterate.md`, `workflows/handoff.md` | Text edit: update hardcoded 7-field JSON in each workflow's Step 7 coverage-flag block to 13 fields |
| INFRA-02 | `templates/design-manifest.json` | Add 6 new fields to `designCoverage` object after `hasHandoff` |
| INFRA-03 | `bin/lib/design.cjs` line 17 (`DOMAIN_DIRS`) + line 388 self-test label | Add `'ux/mockups'` to array; update self-test label string |

### Confirmed No-Op Files

| File | Why No Change Needed |
|------|---------------------|
| `workflows/brief.md` | Does NOT set a coverage flag. Explicitly documented at line 485. No seven/six/field-count text found. Zero changes needed for INFRA-01. |
| `bin/pde-tools.cjs` | Routes to `cmdCoverageCheck` which returns `manifest.designCoverage` verbatim. Will automatically return 13 fields once live manifest is updated. No code change needed. |
| `workflows/build.md` | Read-only manifest consumer. Already handles absent flags defensively (`hasIterate` absent default documented at line 175). No changes needed — but the defensive-default pattern it documents must be preserved in all updated workflow files. |

---

## Architecture Patterns

### Pattern 1: Read-Before-Set (Pass-Through-All)

This is the foundational pattern all 6 relevant skills already use. The problem it solves: `manifest-set-top-level` does a flat assignment (`manifest[field] = value`), so passing a partial JSON object silently resets all omitted fields. The fix is always read first, then write all fields.

**Current (7-field) pattern in every skill's Step 7:**

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse JSON, extract all 7 current values, merge own flag as true, write all 7 back
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{c},"hasFlows":{c},"hasWireframes":{c},"hasCritique":{c},"hasIterate":{c},"hasHandoff":{c},"hasHardwareSpec":{c}}'
```

**Target (13-field) pattern after INFRA-01:**

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Extract ALL 13 current values. Default any absent field to false.
# Merge own flag as true, preserve all other 12 values, write full 13-field object.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{c},"hasWireframes":{c},"hasFlows":{c},"hasHardwareSpec":{c},"hasCritique":{c},"hasIterate":{c},"hasHandoff":{c},"hasIdeation":{c},"hasCompetitive":{c},"hasOpportunity":{c},"hasMockup":{c},"hasHigAudit":{c},"hasRecommendations":{c}}'
```

The `{c}` placeholders are resolved by the skill before calling the CLI — the skill parses `coverage-check` output and substitutes actual `true`/`false` values. The 6 new fields default to `false` when absent from `coverage-check` output (because they won't exist until the v1.2 skills have run).

**Critical:** The field ORDER in the JSON written to the manifest must match the template order (verified in `templates/design-manifest.json`): `hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff` — then append the 6 new fields after `hasHandoff`.

### Pattern 2: The 13 Canonical Coverage Flags

Canonical order matches `templates/design-manifest.json` (template field order is authoritative — verified by direct inspection):

| Position | Flag Name | Owner Skill | Introduced | Template Line |
|----------|-----------|-------------|------------|---------------|
| 1 | `hasDesignSystem` | `/pde:system` | v1.1 | 109 |
| 2 | `hasWireframes` | `/pde:wireframe` | v1.1 | 110 |
| 3 | `hasFlows` | `/pde:flows` | v1.1 | 111 |
| 4 | `hasHardwareSpec` | `/pde:hardware` (future) | v1.1 | 112 |
| 5 | `hasCritique` | `/pde:critique` | v1.1 | 113 |
| 6 | `hasIterate` | `/pde:iterate` | v1.1 | 114 |
| 7 | `hasHandoff` | `/pde:handoff` | v1.1 | 115 |
| 8 | `hasIdeation` | `/pde:ideate` | v1.2 (Phase 27) | NEW |
| 9 | `hasCompetitive` | `/pde:competitive` | v1.2 (Phase 25) | NEW |
| 10 | `hasOpportunity` | `/pde:opportunity` | v1.2 (Phase 26) | NEW |
| 11 | `hasMockup` | `/pde:mockup` | v1.2 (Phase 26) | NEW |
| 12 | `hasHigAudit` | `/pde:hig` | v1.2 (Phase 26) | NEW |
| 13 | `hasRecommendations` | `/pde:recommend` | v1.2 (Phase 25) | NEW |

**Important:** `hasBrief` does NOT exist. Brief completion is tracked via `artifacts.BRF` presence. Explicitly documented in `workflows/brief.md` line 485 and `workflows/system.md` line 1340. Do not add it.

**Flag name authority:** `hasHigAudit` is the canonical name — confirmed in `ARCHITECTURE.md` and the phase description. `STACK.md` uses `hasHig` in one place — this is a pre-phase research inconsistency. Ignore `STACK.md` on this point.

**Note on existing workflow field order:** The 6 existing skill workflows write fields in a slightly different order from the template (e.g., `flows.md` writes `hasDesignSystem,hasFlows,hasWireframes,...`). When updating to 13 fields, normalize to the template canonical order. This is cosmetic but keeps the manifest consistent.

### Pattern 3: `ensureDesignDirs` Directory Creation

Current `DOMAIN_DIRS` constant (`bin/lib/design.cjs` line 17 — verified):

```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'visual', 'review', 'handoff', 'hardware'];
```

After INFRA-03:

```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware'];
```

`fs.mkdirSync(path.join(designRoot, domain), { recursive: true })` already handles nested paths. The `ux` directory is created first (array order), then `ux/mockups` is created inside it. The `recursive: true` flag makes this safe even if `ux` already exists from a prior run.

**Self-test impact (verified by reading source):** The self-test at line 388 iterates `for (const domain of DOMAIN_DIRS)` — it will automatically test all 8 entries when `DOMAIN_DIRS` gains `'ux/mockups'`. However, the test label `'creates all 7 domain subdirectories'` (line 388) hardcodes "7" and must be updated to "8" to prevent confusion. The test logic itself does NOT need changing — only the label string.

### Pattern 4: Workflow Step 7 Structure (Per-Skill Reference)

Each skill's coverage-flag block location and what needs changing:

| Skill | File | Approx Line | Current Text | Change Needed |
|-------|------|-------------|--------------|---------------|
| `/pde:system` | `workflows/system.md` | ~1298 | "ALL seven current flag values" + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:flows` | `workflows/flows.md` | ~480 | "ALL seven fields" + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:wireframe` | `workflows/wireframe.md` | ~636 | "ALL seven current flag values" + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:critique` | `workflows/critique.md` | ~575 | "ALL seven current flag values" + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:iterate` | `workflows/iterate.md` | ~450 | "ALL six current flag values" (inconsistent) + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:handoff` | `workflows/handoff.md` | ~622 | "ALL seven current flag values" + 7-field JSON | → "ALL thirteen" + 13-field JSON |
| `/pde:brief` | `workflows/brief.md` | N/A | No coverage flag — confirmed by grep (no matches for "seven"/"six") | **No change needed** |

Note on `iterate.md`: The "Extract ALL six current flag values" text exists because `hasIterate` was introduced as the 7th field — "six existing plus one new." This narrative is obsolete. Fix: "Extract ALL thirteen current flag values."

Note on `system.md` anti-pattern comment (line 1305): The instruction text "All 7 fields: hasDesignSystem, hasFlows, ..." explicitly enumerates the field names. This enumeration must be updated to all 13 when editing system.md.

### Anti-Patterns to Avoid

- **Partial JSON write:** Never call `manifest-set-top-level designCoverage` with fewer than all 13 fields after this migration. A partial write silently resets omitted fields.
- **Hardcoding new flags as false:** When an existing v1.1 skill writes its coverage, it must read the current value of `hasIdeation` from `coverage-check` and preserve it. If `hasIdeation` is absent (hasn't been set yet), default to `false` — not omit.
- **Adding `ux/mockups` before `ux`:** In `DOMAIN_DIRS`, `ux` must precede `ux/mockups`. The `recursive: true` flag handles this, but array ordering makes intent clear.
- **Modifying `cmdCoverageCheck`:** The `coverage-check` command returns `manifest.designCoverage` verbatim. It will automatically return the new 13 fields once the live manifest has them. No code change needed.
- **Using dot-notation with `manifest-set-top-level`:** Documented anti-pattern in `system.md` line 1337. The function does FLAT key assignment only. Always pass the full JSON object for `designCoverage`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest field-level update | Custom merge logic in Node.js | `manifest-set-top-level` with read-before-set bash pattern | Already exists; consistent with all 7 skills |
| Coverage flag atomic update | New CLI command | Extend existing read-before-set bash pattern | Pattern proven across 7 skills; no new tooling needed |
| Directory creation | Custom mkdir logic | Add `'ux/mockups'` to `DOMAIN_DIRS` in `design.cjs` | `ensureDesignDirs` already loops idempotently with `recursive: true` |
| JSON schema validation | Custom validator | Template update only | No runtime schema validation in PDE; not needed for this phase |
| Migration script for existing projects | One-time upgrade tool | None — let skills self-heal on next run | v1.1 skills write all 13 fields when they run; projects get new flags automatically |

**Key insight:** This phase is entirely about propagating constants — updating hardcoded 7-field enumerations to 13 in template and workflow text. There is nothing to architect. The pattern is already correct; it just needs to enumerate more fields.

---

## Common Pitfalls

### Pitfall 1: Self-Test Label Not Updated

**What goes wrong:** After adding `'ux/mockups'` to `DOMAIN_DIRS`, the self-test at line 388 now iterates 8 dirs but the label still says "creates all 7 domain subdirectories." The test logic passes (it iterates `DOMAIN_DIRS` directly), but the label is misleading and flags a maintenance risk.
**Why it happens:** The label hardcodes "7" rather than referencing `DOMAIN_DIRS.length`.
**How to avoid:** When editing `DOMAIN_DIRS`, also update line 388 label string from "7" to "8 (including ux/mockups subdirectory)".
**Warning signs:** `design.cjs --self-test` PASS output says "creates all 7 domain subdirectories" — test passes but label is stale.

### Pitfall 2: `coverage-check` Returns Only 7 Fields for Existing Projects

**What goes wrong:** For projects initialized before this migration runs, `design-manifest.json` will only have 7 `designCoverage` fields. When an updated skill reads `coverage-check`, the 6 new fields are absent. If the skill doesn't default absent fields to `false`, it writes `undefined` or a JSON parse error into the manifest.
**Why it happens:** `coverage-check` returns `manifest.designCoverage` verbatim — no field filling.
**How to avoid:** Each updated skill's Step 7 instruction must explicitly state "Default any absent field to `false`." This is already the documented behavior for the 7-field case (e.g., `build.md` line 175 documents this for `hasIterate`). Apply the same instruction to all 6 new fields.
**Warning signs:** `design-manifest.json` contains `"hasIdeation": null` or `"hasIdeation": undefined` after a v1.1 skill runs on an old project.

### Pitfall 3: `iterate.md` Inconsistent Flag Count Documentation

**What goes wrong:** `iterate.md` says "Extract ALL six current flag values" (introduced `hasIterate` as the 7th). This is already inconsistent at v1.1. After the 13-field migration, it will say six but write thirteen.
**Why it happens:** The text was written when `hasIterate` was the new 7th field — "six existing plus one new." This narrative is now obsolete.
**How to avoid:** Update `iterate.md` to say "Extract ALL thirteen current flag values: [list all 13]" like the other skills.

### Pitfall 4: Template-vs-Live Divergence

**What goes wrong:** `templates/design-manifest.json` is only read when a new project initializes. Updating the template does NOT update already-initialized project manifests.
**Why it happens:** `ensureDesignDirs` is idempotent — skips manifest creation if file already exists (line 64: `if (!fs.existsSync(manifestFilePath))`).
**How to avoid:** This is expected and correct. Existing projects get the new coverage flags the first time a v1.2 skill runs and writes all 13 via `manifest-set-top-level`. The template update is only for new projects. No migration script is needed.
**Warning signs:** None — this is correct behavior. Document it in the task to avoid confusion.

### Pitfall 5: `hasBrief` Accidentally Added

**What goes wrong:** A developer updates the 13-field schema and adds `hasBrief` as a 14th flag because brief is the first pipeline stage.
**Why it happens:** Brief is the first skill; it seems logical it should have a coverage flag.
**How to avoid:** Brief completion is tracked by `artifacts.BRF` presence, not a coverage flag. Explicitly documented in `workflows/brief.md` line 485 and `workflows/system.md` line 1340. The 13-field schema is the complete list.

### Pitfall 6: Wrong Field Order in Updated Workflows

**What goes wrong:** Each v1.1 skill writes fields in slightly different order (e.g., `flows.md` writes `hasDesignSystem, hasFlows, hasWireframes,...` while template has `hasDesignSystem, hasWireframes, hasFlows,...`). Inconsistent ordering makes diffs harder and confuses future maintainers.
**Why it happens:** Each skill was written independently; no field-order enforcement exists.
**How to avoid:** When updating each workflow to 13 fields, normalize to template canonical order: `hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations`.

---

## Code Examples

Verified patterns from direct source inspection:

### Updated `designCoverage` Template Block (INFRA-02)

```json
"designCoverage": {
  "_comment": "Boolean flags indicating which design artifact types exist. PDE uses this to determine what design context is available for engineering planning.",
  "hasDesignSystem":    false,
  "hasWireframes":      false,
  "hasFlows":           false,
  "hasHardwareSpec":    false,
  "hasCritique":        false,
  "hasIterate":         false,
  "hasHandoff":         false,
  "hasIdeation":        false,
  "hasCompetitive":     false,
  "hasOpportunity":     false,
  "hasMockup":          false,
  "hasHigAudit":        false,
  "hasRecommendations": false
}
```

Note: The `_comment` key is stripped at init time by `stripCommentKeys` (confirmed in `ensureDesignDirs`, line 68). Field order matches `templates/design-manifest.json` verified canonical order — new 6 fields appended after `hasHandoff`.

### Updated `DOMAIN_DIRS` (INFRA-03)

```javascript
// bin/lib/design.cjs — line 17
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware'];
```

`fs.mkdirSync(path.join(designRoot, domain), { recursive: true })` handles nested paths safely. This is how all existing dirs are created — no change to the loop logic needed.

### Updated Self-Test Label (INFRA-03 companion)

```javascript
// bin/lib/design.cjs — line 388 (currently: 'creates all 7 domain subdirectories')
check('creates all 8 domain subdirectories (including ux/mockups)', () => {
  for (const domain of DOMAIN_DIRS) {
    assert.ok(
      fs.existsSync(path.join(tmpDir, '.planning', 'design', domain)),
      `Missing domain dir: ${domain}`
    );
  }
});
```

The loop body is unchanged — only the label string changes.

### Updated Step 7 Workflow Pattern (INFRA-01 per skill)

The full 13-field write call that replaces the 7-field call in each skill's Step 7. Field order follows canonical template order. Each skill substitutes only its own flag with `true`; all others are read from `coverage-check` output:

```bash
# Example for /pde:wireframe — sets hasWireframes: true, preserves all 12 others
# Step 1: Read current state
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi

# Step 2: Parse all 13 flag values from COV JSON.
#         Default any absent field to false (new v1.2 flags won't exist in old manifests).

# Step 3: Write full 13-field object with own flag set to true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

The instruction text preceding this call must also be updated: "Parse the JSON output from coverage-check. Extract ALL thirteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations. Default any absent field to `false`."

Also update: anti-pattern reminder text that currently lists "all 7 fields" → update to "all 13 fields" with the new enumeration.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` (no test runner — self-test pattern) |
| Config file | none — self-test invoked directly |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` |
| Baseline | 20/20 tests passing (verified 2026-03-16) |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | `ensureDesignDirs` creates `ux/mockups` directory | unit | `node bin/lib/design.cjs --self-test` | Wave 0 — update existing test label at line 388 |
| INFRA-02 | Template has all 13 `designCoverage` fields in correct order | unit | `node bin/lib/design.cjs --self-test` (add assertion) | Wave 0 gap — add new assertion |
| INFRA-01 | Existing skill run preserves new flags | integration | Run `/pde:wireframe` on project with `hasIdeation: true`; verify flag unchanged | Manual-only — no automated harness for workflows |

### Sampling Rate
- **Per task commit:** `node bin/lib/design.cjs --self-test` (from project root)
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** Self-test green + manual INFRA-01 spot-check on one skill before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update self-test label at `design.cjs` line 388: `'creates all 7 domain subdirectories'` → `'creates all 8 domain subdirectories (including ux/mockups)'`
- [ ] Add self-test assertion: parse `templates/design-manifest.json`, verify `designCoverage` has exactly 13 keys matching the canonical list in template order

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 7-field `designCoverage` object | 13-field `designCoverage` object | Phase 24 (this phase) | New v1.2 skills can write their flags without being reset by v1.1 skills |
| `ux/` contains wireframes only | `ux/` contains `wireframes/` and `mockups/` | Phase 24 (this phase) | `/pde:mockup` (Phase 26) has a home directory |
| `iterate.md` narrative: "six existing + one new" | "ALL thirteen" consistent with all other skills | Phase 24 (this phase) | Eliminates pre-existing internal inconsistency |

---

## Open Questions

1. **Flag naming: `hasHigAudit` vs `hasHig`**
   - What we know: `ARCHITECTURE.md` and the phase description both use `hasHigAudit`. `STACK.md` uses `hasHig` in one passage.
   - What's unclear: Whether the HIG skill (Phase 26) will use `hasHigAudit` or `hasHig` when it writes its flag.
   - Recommendation: Use `hasHigAudit` throughout Phase 24 — it matches `ARCHITECTURE.md` (authoritative design doc) and the phase description. Phase 26 researcher/planner must confirm.

2. **Field order normalization: required or optional?**
   - What we know: Existing skill workflows write flags in different orders from the template. JSON field order has no semantic effect on JavaScript object parsing.
   - What's unclear: Whether the planner should require normalization to template order or leave per-skill order unchanged.
   - Recommendation: Normalize to template canonical order as part of INFRA-01 updates. Cost is zero (replacing the whole JSON string anyway); benefit is consistency for future maintainers.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `bin/lib/design.cjs` — `ensureDesignDirs`, `DOMAIN_DIRS` (line 17), `cmdManifestSetTopLevel` (line 264), `cmdCoverageCheck` (line 296), self-test (line 342-597)
- Direct inspection of `templates/design-manifest.json` — confirmed 7-field `designCoverage` block in order: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff (lines 109-115)
- Direct inspection of `workflows/system.md` ~line 1298 — Step 7 coverage pattern confirmed
- Direct inspection of `workflows/flows.md` ~line 476-491 — Step 7 coverage pattern confirmed
- Direct inspection of `workflows/wireframe.md` ~line 629-639 — Step 7 coverage pattern confirmed
- Direct inspection of `workflows/critique.md` ~line 568-578 — Step 7 coverage pattern confirmed
- Direct inspection of `workflows/iterate.md` ~line 443-453 — "six" inconsistency confirmed
- Direct inspection of `workflows/handoff.md` ~line 615-625 — Step 7 coverage pattern confirmed
- Direct inspection of `workflows/brief.md` — grep confirmed NO occurrence of "seven"/"six"/"field count" — zero changes needed
- Direct inspection of `workflows/build.md` line 175 — defensive default pattern for absent fields documented
- `node bin/lib/design.cjs --self-test` run — baseline: 20/20 passing, test label at line 388 confirmed "creates all 7 domain subdirectories"
- `.planning/config.json` — `workflow.nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- Phase description (provided in research prompt) — authoritative on flag names and success criteria
- `.planning/REQUIREMENTS.md` — INFRA-01/02/03 requirement text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three affected files inspected directly; no speculation
- Architecture: HIGH — read-before-set pattern fully understood from 6 live examples; `cmdManifestSetTopLevel` flat-assignment behavior confirmed from source (line 264)
- Pitfalls: HIGH — most pitfalls derived from explicit anti-pattern sections in existing workflows; self-test baseline established

**Research date:** 2026-03-16
**Valid until:** 2026-05-01 (stable tooling; no external dependencies; valid until design.cjs is refactored)
