# Phase 24: Schema Migration & Infrastructure — Research

**Researched:** 2026-03-16
**Domain:** JSON manifest schema extension, bash workflow pattern migration, Node.js directory initialization
**Confidence:** HIGH — all findings derived from direct source inspection of the existing codebase

---

## Summary

Phase 24 is a pure infrastructure migration. There are no new user-facing skills. Every deliverable is a modification to existing code: the manifest template, six existing workflow files, and the `ensureDesignDirs` function in `design.cjs`.

The core risk is the "replace vs. merge" problem. `manifest-set-top-level` performs a flat key assignment — it replaces the entire `designCoverage` object with whatever JSON string is passed. All seven existing skills already guard against this with a read-before-set pattern (`design coverage-check` then write the full merged object). The migration simply extends that pattern from 7 fields to 13. Each existing skill's Step 7 workflow block must be updated to enumerate all 13 flags, not just 7.

The three INFRA requirements decompose cleanly: INFRA-01 is workflow text edits (7 files), INFRA-02 is a JSON template edit (1 file), and INFRA-03 is a Node.js code edit (1 file). There are no new APIs, no new dependencies, and no architectural decisions to make — the patterns are already established in the codebase.

**Primary recommendation:** Update the 7 workflow files first (INFRA-01), then the template (INFRA-02), then `design.cjs` (INFRA-03). Validate with `design.cjs --self-test` after INFRA-03.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Coverage flag update pattern migrated to pass-through-all across existing skills | The read-before-set pattern exists in all 7 workflows; each must be updated to enumerate all 13 flags instead of 7 |
| INFRA-02 | Design manifest schema extended with 6 new coverage flags | The `templates/design-manifest.json` designCoverage block is the single source of truth for the initial flag schema; requires 6 new fields added |
| INFRA-03 | `ensureDesignDirs` updated with `ux/mockups` output directory | `DOMAIN_DIRS` constant in `design.cjs` line 17 is the only change needed; `ux` dir already exists, `ux/mockups` subdirectory does not |
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
| INFRA-01 | `workflows/brief.md`, `workflows/system.md`, `workflows/flows.md`, `workflows/wireframe.md`, `workflows/critique.md`, `workflows/iterate.md`, `workflows/handoff.md` | Text edit: update hardcoded 7-field JSON in each workflow's Step 7 coverage-flag block to 13 fields |
| INFRA-02 | `templates/design-manifest.json` | Add 6 new fields to `designCoverage` object |
| INFRA-03 | `bin/lib/design.cjs` (line 17: `DOMAIN_DIRS`) | Add `'ux/mockups'` subdirectory to the array |

---

## Architecture Patterns

### Pattern 1: Read-Before-Set (Pass-Through-All)

This is the foundational pattern that all 7 skills already use. The problem it solves: `manifest-set-top-level` does a flat assignment (`manifest[field] = value`), so passing a partial JSON object silently resets all omitted fields to whatever is in the passed JSON. The fix is always read first, then write all fields.

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
  '{"hasDesignSystem":{c},"hasFlows":{c},"hasWireframes":{c},"hasCritique":{c},"hasIterate":{c},"hasHandoff":{c},"hasHardwareSpec":{c},"hasIdeation":{c},"hasCompetitive":{c},"hasOpportunity":{c},"hasMockup":{c},"hasHigAudit":{c},"hasRecommendations":{c}}'
```

The `{c}` placeholders are resolved by the skill before calling the CLI — the skill parses `coverage-check` output and substitutes actual `true`/`false` values. The new fields default to `false` when absent from `coverage-check` output (because they won't exist until the v1.2 skills have run).

### Pattern 2: The 13 Canonical Coverage Flags

These are the exact field names and their owner skills, in the order they should appear in the `designCoverage` object:

| Position | Flag Name | Owner Skill | Introduced |
|----------|-----------|-------------|------------|
| 1 | `hasDesignSystem` | `/pde:system` | v1.1 |
| 2 | `hasFlows` | `/pde:flows` | v1.1 |
| 3 | `hasWireframes` | `/pde:wireframe` | v1.1 |
| 4 | `hasCritique` | `/pde:critique` | v1.1 |
| 5 | `hasIterate` | `/pde:iterate` | v1.1 |
| 6 | `hasHandoff` | `/pde:handoff` | v1.1 |
| 7 | `hasHardwareSpec` | `/pde:hardware` (future) | v1.1 |
| 8 | `hasIdeation` | `/pde:ideate` | v1.2 (Phase 27) |
| 9 | `hasCompetitive` | `/pde:competitive` | v1.2 (Phase 25) |
| 10 | `hasOpportunity` | `/pde:opportunity` | v1.2 (Phase 26) |
| 11 | `hasMockup` | `/pde:mockup` | v1.2 (Phase 26) |
| 12 | `hasHigAudit` | `/pde:hig` | v1.2 (Phase 26) |
| 13 | `hasRecommendations` | `/pde:recommend` | v1.2 (Phase 25) |

**Important:** `hasBrief` does NOT exist. Brief completion is tracked via `artifacts.BRF` presence. This is explicitly documented in `workflows/brief.md` line 485 and `workflows/system.md` line 1340. Do not add it.

**Flag name authority:** The phase description and `ARCHITECTURE.md` both use `hasHigAudit`. `STACK.md` uses `hasHig` in one place — this is a naming inconsistency in pre-phase research. The authoritative name is `hasHigAudit` (used in ARCHITECTURE.md's schema section and confirmed by the phase description).

### Pattern 3: `ensureDesignDirs` Directory Creation

Current `DOMAIN_DIRS` constant (`bin/lib/design.cjs` line 17):

```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'visual', 'review', 'handoff', 'hardware'];
```

After INFRA-03:

```javascript
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware'];
```

`fs.mkdirSync(path.join(designRoot, domain), { recursive: true })` already handles nested paths. Adding `'ux/mockups'` after `'ux'` creates `.planning/design/ux/mockups/` when `ensure-dirs` is called. The `ux` directory is created first (array order), then `ux/mockups` is created inside it. The `recursive: true` flag makes this safe even if `ux` already exists from a prior run.

The `ensureDesignDirs` function is idempotent — it will not overwrite the existing `DESIGN-STATE.md` or `design-manifest.json` if already initialized. Adding `ux/mockups` to `DOMAIN_DIRS` only causes directory creation; it has no effect on already-initialized manifests.

### Pattern 4: Workflow Step 7 Structure (Per-Skill Reference)

Each skill's coverage-flag block follows this precise naming convention for the instruction text. These descriptions must be updated alongside the code to state "13" instead of "7" (or "six" wherever the count appears):

| Skill | Workflow File | Current Instruction Count | Flag Being Set |
|-------|--------------|--------------------------|---------------|
| `/pde:system` | `workflows/system.md` ~line 1298 | "ALL seven" | `hasDesignSystem: true` |
| `/pde:flows` | `workflows/flows.md` ~line 480 | "ALL seven fields" | `hasFlows: true` |
| `/pde:wireframe` | `workflows/wireframe.md` ~line 636 | "ALL seven" | `hasWireframes: true` |
| `/pde:critique` | `workflows/critique.md` ~line 575 | "ALL seven" | `hasCritique: true` |
| `/pde:iterate` | `workflows/iterate.md` ~line 450 | "ALL six" (inconsistent) | `hasIterate: true` |
| `/pde:handoff` | `workflows/handoff.md` ~line 622 | "ALL seven" | `hasHandoff: true` |
| `/pde:brief` | `workflows/brief.md` ~line 485 | (no coverage flag — note to preserve) | N/A |

Note on `iterate.md`: It says "Extract ALL six current flag values" even though it writes seven — this is a pre-existing inconsistency in the workflow text. The fix should make it consistent: "Extract ALL thirteen current flag values."

Note on `brief.md`: Brief does NOT set a coverage flag. It explicitly documents this. Do not add a coverage-flag block to brief.md. The only change needed is if brief.md references the 7-field object anywhere — verify but likely no change needed.

### Anti-Patterns to Avoid

- **Partial JSON write:** Never call `manifest-set-top-level designCoverage` with fewer than all 13 fields after this migration. A partial write silently resets omitted fields to `false` for new v1.2 skills or deletes them entirely.
- **Hardcoding new flags as false:** When an existing v1.1 skill (e.g., `/pde:wireframe`) writes its coverage, it must read the current value of `hasIdeation` from `coverage-check` and preserve it. If `hasIdeation` is not in the `coverage-check` output (because it hasn't been set yet), default to `false` — not omit.
- **Adding `ux/mockups` before `ux`:** In `DOMAIN_DIRS`, `ux` must precede `ux/mockups`. `fs.mkdirSync` with `{ recursive: true }` handles this, but the array ordering makes intent clear.
- **Modifying `cmdCoverageCheck`:** The `coverage-check` command reads `manifest.designCoverage` and returns it as-is. It will automatically return the new 13 fields once the live manifest has them, without any code change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest field-level update | Custom merge logic | `manifest-set-top-level` with read-before-set | Already exists; consistent with how all 7 skills operate |
| Coverage flag atomic update | New CLI command | Extend existing read-before-set bash pattern | Pattern is proven across 7 skills; no new tooling needed |
| Directory creation | Custom mkdir logic | Add to `DOMAIN_DIRS` in `design.cjs` | `ensureDesignDirs` already loops through all dirs idempotently |
| JSON schema validation | Custom validator | Template update only | No runtime schema validation exists in PDE; not needed for this phase |

**Key insight:** This phase is entirely about propagating constants — updating the hardcoded 7-field count to 13 in template and workflow text. There is nothing to architect. The pattern is already correct; it just needs to enumerate more fields.

---

## Common Pitfalls

### Pitfall 1: Missing the `ux/mockups` Subdirectory in Directory Listing Tests

**What goes wrong:** After adding `ux/mockups` to `DOMAIN_DIRS`, the self-test in `design.cjs` at line 388 checks "creates all 7 domain subdirectories." The test count must be updated to match the new array length or the test fails.
**Why it happens:** The self-test hardcodes "7" to match the original `DOMAIN_DIRS` length.
**How to avoid:** After editing `DOMAIN_DIRS`, also update the self-test assertion that validates all domain dirs were created.
**Warning signs:** `design.cjs --self-test` fails with "Missing domain dir: ux/mockups" or the test description still says "7 domain subdirectories."

### Pitfall 2: `coverage-check` Returns Only 7 Fields for Existing Projects

**What goes wrong:** For projects initialized before this migration runs, `design-manifest.json` will only have 7 `designCoverage` fields. When an updated skill reads `coverage-check`, the new 6 fields will be absent from the JSON. If the skill doesn't default absent fields to `false`, it writes `undefined` into the JSON.
**Why it happens:** `coverage-check` returns `manifest.designCoverage` verbatim; it doesn't fill missing fields.
**How to avoid:** Each updated skill's Step 7 instruction must explicitly say "Default any absent field to `false`." This is already the documented behavior for the 7-field case — the same instruction applies for the 6 new fields.
**Warning signs:** `design-manifest.json` contains `"hasIdeation": null` or similar after a v1.1 skill runs on an old project.

### Pitfall 3: `iterate.md` Inconsistent Flag Count Documentation

**What goes wrong:** `iterate.md` currently says "Extract ALL six current flag values" (it was added after the initial 6 and wrote the 7th itself). This instruction is internally inconsistent but functionally correct. If not fixed, the text will continue to be misleading after the 13-field migration.
**Why it happens:** The text was written when `hasIterate` was being introduced as the 7th field — "six existing plus one new." This narrative is now obsolete.
**How to avoid:** Update `iterate.md` to say "Extract ALL thirteen current flag values: [list all 13]" like the other skills.

### Pitfall 4: Template-vs-Live Divergence

**What goes wrong:** `templates/design-manifest.json` is only read when a new project initializes for the first time (`ensureDesignDirs` skips manifest creation if file already exists). Updating the template does NOT update already-initialized project manifests.
**Why it happens:** `ensureDesignDirs` is idempotent.
**How to avoid:** This is expected and correct. Existing projects get the new coverage flags the first time a v1.2 skill runs and writes them via `manifest-set-top-level`. The template update is only for new projects. No migration script is needed for existing projects.
**Warning signs:** None — this is correct behavior. Document it in the task to avoid confusion.

### Pitfall 5: `hasBrief` Accidentally Added

**What goes wrong:** A developer updating the 13-field schema adds `hasBrief` as a 14th flag because it seems logical.
**Why it happens:** The brief is the first skill in the pipeline; it seems like it should have a coverage flag.
**How to avoid:** Brief completion is tracked by artifact presence (`artifacts.BRF`), not a coverage flag. This is explicitly documented in `workflows/brief.md` and `workflows/system.md`. The 13-field schema is the complete list.

---

## Code Examples

### Updated `designCoverage` Template Block (INFRA-02)

```json
"designCoverage": {
  "hasDesignSystem":    false,
  "hasFlows":           false,
  "hasWireframes":      false,
  "hasCritique":        false,
  "hasIterate":         false,
  "hasHandoff":         false,
  "hasHardwareSpec":    false,
  "hasIdeation":        false,
  "hasCompetitive":     false,
  "hasOpportunity":     false,
  "hasMockup":          false,
  "hasHigAudit":        false,
  "hasRecommendations": false
}
```

Source: `ARCHITECTURE.md` line 193-209 plus phase description. Note: the `_comment` key currently in the template is stripped at init time by `stripCommentKeys`.

### Updated `DOMAIN_DIRS` (INFRA-03)

```javascript
// bin/lib/design.cjs — line 17
const DOMAIN_DIRS = ['assets', 'strategy', 'ux', 'ux/mockups', 'visual', 'review', 'handoff', 'hardware'];
```

`fs.mkdirSync(path.join(designRoot, domain), { recursive: true })` handles nested paths safely. This is how all existing dirs are created — no change to the loop logic needed.

### Updated Step 7 Workflow Pattern (INFRA-01 per skill)

The full 13-field write call that replaces the 7-field call in each skill's Step 7. Each skill substitutes only its own flag with `true`; all others are read from `coverage-check` output:

```bash
# Example for /pde:wireframe — sets hasWireframes: true, preserves all 12 others
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":true,"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasHardwareSpec":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

The instruction text preceding this call must also be updated: "Extract ALL thirteen current flag values: hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations. Default any absent field to `false`."

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` (no test runner — self-test pattern) |
| Config file | none — self-test is invoked directly |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-03 | `ensureDesignDirs` creates `ux/mockups` directory | unit | `node bin/lib/design.cjs --self-test` | Wave 0 — update existing test |
| INFRA-02 | Template has all 13 `designCoverage` fields | unit | Manual JSON inspection or Wave 0 test | Wave 0 gap |
| INFRA-01 | Existing skill run preserves new flags | integration | Run `/pde:wireframe` on project with `hasIdeation: true`, verify flag unchanged | Manual-only — no automated test harness for workflows |

### Sampling Rate
- **Per task commit:** `node bin/lib/design.cjs --self-test` (from project root)
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** Self-test green + manual INFRA-01 spot-check on one skill before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] Update existing self-test assertion at `design.cjs` ~line 388: change `'creates all 7 domain subdirectories'` to cover 8 DOMAIN_DIRS entries (7 original + `ux/mockups`) and assert `ux/mockups` existence
- [ ] Add self-test assertion: parse `templates/design-manifest.json`, verify `designCoverage` has exactly 13 keys matching the canonical list

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 7-field `designCoverage` object | 13-field `designCoverage` object | Phase 24 (this phase) | New v1.2 skills can write their flags without being reset by v1.1 skills |
| `ux/` contains wireframes only | `ux/` contains `wireframes/` and `mockups/` | Phase 24 (this phase) | `/pde:mockup` has a home directory |

---

## Open Questions

1. **Flag naming: `hasHigAudit` vs `hasHig`**
   - What we know: `ARCHITECTURE.md` and the phase description both use `hasHigAudit`. `STACK.md` uses `hasHig` in one passage.
   - What's unclear: Whether the HIG skill (Phase 26) will use `hasHigAudit` or `hasHig`.
   - Recommendation: Use `hasHigAudit` — it matches the ARCHITECTURE.md canonical schema and the phase description. When Phase 26 is implemented, the researcher/planner should confirm this name. STACK.md is pre-phase research; ARCHITECTURE.md is the authoritative design doc.

2. **`brief.md` requires any change for INFRA-01**
   - What we know: `brief.md` explicitly states it does NOT set a coverage flag. There is no Step 7 coverage-flag block to update.
   - What's unclear: Whether `brief.md` references the 7-field field count in any instructional text that would become stale.
   - Recommendation: Read the full `brief.md` workflow during task execution to confirm there is no 7-field reference. If found, update the count. If not found, no change needed — brief.md is INFRA-01 scope but likely a no-op.

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `bin/lib/design.cjs` — `ensureDesignDirs`, `DOMAIN_DIRS`, manifest CRUD functions, self-test
- Direct inspection of `templates/design-manifest.json` — current `designCoverage` schema (7 fields)
- Direct inspection of `workflows/system.md`, `workflows/flows.md`, `workflows/wireframe.md`, `workflows/critique.md`, `workflows/iterate.md`, `workflows/handoff.md` — Step 7 coverage-flag pattern in all 6 skills
- Direct inspection of `workflows/brief.md` — confirmed no coverage flag is set
- Direct inspection of `.planning/research/ARCHITECTURE.md` — canonical 13-field schema and artifact code table
- Direct inspection of `.planning/research/STACK.md` — skill-to-flag mapping

### Secondary (MEDIUM confidence)
- Phase description (provided in research prompt) — authoritative on flag names and success criteria

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all three affected files inspected directly; no speculation
- Architecture: HIGH — read-before-set pattern fully understood from 7 live examples
- Pitfalls: HIGH — most pitfalls are derived from explicit anti-pattern sections in existing workflows

**Research date:** 2026-03-16
**Valid until:** 2026-05-01 (stable tooling; no external dependencies; valid until design.cjs is refactored)
