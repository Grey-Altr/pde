# Phase 21: Fix Pipeline Integration Wiring — Research

**Researched:** 2026-03-15
**Domain:** Claude Code skill workflow authoring — allowed-tools configuration, designCoverage write pattern
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ORC-01 | `/pde:build` orchestrates the full pipeline sequence via DESIGN-STATE | MISS-01 fix (Skill in allowed-tools) + BRK-01 fix (7-field coverage writes) both enable reliable orchestration |
| ORC-03 | `/pde:build` is a thin orchestrator — all skill logic stays in individual workflows | BRK-01 fix is in the individual skill workflows (system, flows, wireframe, critique), not in the orchestrator, preserving ORC-03 invariant |

</phase_requirements>

---

## Summary

Phase 21 closes two HIGH-severity integration wiring defects found in the v1.1 milestone audit. Both defects are
surgical text edits to existing files — no new architecture, no new libraries, no new CLI commands.

**Defect 1 (MISS-01):** `commands/build.md` lists `allowed-tools: [Read, Bash, Glob, AskUserQuestion]` but
`workflows/build.md` invokes all 7 stages via `Skill(skill="pde:...")`. The `Skill` tool is absent from the
allowed-tools list. Claude Code enforces allowed-tools at the command level — a tool invoked inside a workflow
that is not listed in the originating command's `allowed-tools` cannot execute. Adding `Skill` to the list is
a one-line edit.

**Defect 2 (BRK-01):** Four upstream skill workflows (`system.md`, `flows.md`, `wireframe.md`, `critique.md`)
write a 6-field `designCoverage` object that omits `hasIterate`. The `iterate.md` workflow introduced `hasIterate`
as the seventh field and writes a 7-field object. Because `manifest-set-top-level` performs a flat key replacement
of the entire `designCoverage` object, any upstream skill re-run after `/pde:iterate` silently removes
`hasIterate: true`, causing `/pde:build` to re-queue the iterate stage unnecessarily. The fix is to update the
four deficient workflows to include `hasIterate` in their coverage write (defaulting to the current value read
from `coverage-check`), and to add `hasIterate: false` to the manifest template and live manifest schema so the
field always exists with a safe default.

**Primary recommendation:** Two independent tasks — (1) one-line edit to `commands/build.md`, (2) coordinated
edits to `system.md`, `flows.md`, `wireframe.md`, `critique.md`, `templates/design-manifest.json`, and
`.planning/design/design-manifest.json`.

---

## Standard Stack

No new libraries. All tooling is already in the project.

### Core Tools Already Present

| Tool | Location | Purpose in This Phase |
|------|----------|-----------------------|
| `pde-tools.cjs` design `coverage-check` | `bin/pde-tools.cjs` → `bin/lib/design.cjs:296` | Returns `manifest.designCoverage` object — what upstream workflows read before writing |
| `pde-tools.cjs` design `manifest-set-top-level` | `bin/pde-tools.cjs` → `bin/lib/design.cjs` | Flat-replaces a top-level manifest key — requires the FULL `designCoverage` JSON object every call |
| Claude Code `allowed-tools` frontmatter | `commands/build.md` | Controls which tools the `pde:build` command may use at runtime |

### The Deficient Write Pattern (current — 6 fields)

These four workflows write only 6 fields, omitting `hasIterate`:

```bash
# system.md (line 1302) — DEFICIENT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":true,"hasWireframes":{current},"hasFlows":{current},"hasCritique":{current},"hasHandoff":{current}}'
# (5 fields — also missing hasHardwareSpec in prose description but present in command)

# flows.md (Step 7/7) — DEFICIENT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasFlows":true,"hasDesignSystem":{current},"hasWireframes":{current},"hasCritique":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'
# (6 fields — missing hasIterate)

# wireframe.md (Step 7d, line 639) — DEFICIENT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":true,"hasCritique":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'
# (6 fields — missing hasIterate)

# critique.md (Step 7c, line 578) — DEFICIENT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":true,"hasHandoff":{current},"hasHardwareSpec":{current}}'
# (6 fields — missing hasIterate)
```

### The Gold Standard Write Pattern (iterate.md — 7 fields, correct)

```bash
# iterate.md (line 453) — GOLD STANDARD
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse: hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasHandoff, hasHardwareSpec
# Merge own flag, then write ALL 7 fields:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

The pattern to replicate in all four deficient workflows: extract `hasIterate` from `coverage-check` output
and include `"hasIterate":{current}` in the merged write.

---

## Architecture Patterns

### Pattern 1: allowed-tools Frontmatter

Claude Code command files (`commands/*.md`) use YAML frontmatter to declare which tools the command may invoke.
The `Skill` tool, which enables one command to invoke another command by name, must be explicitly listed.

```yaml
# commands/build.md — current (BROKEN)
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion

# commands/build.md — fixed
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
  - Skill
```

**Source:** Phase 20 audit (v1.1-MILESTONE-AUDIT.md, MISS-01). The Skill invocation pattern is established in
`workflows/build.md` (7 `Skill(skill="pde:...")` calls). `Skill` must appear in the originating command's
`allowed-tools` for those calls to succeed.

### Pattern 2: Read-Before-Set Coverage Write

Every skill workflow that updates `designCoverage` must:

1. Run `coverage-check` to get the current state
2. Handle the `@file:` redirect pattern
3. Extract ALL 7 flag values from the JSON output
4. Merge own flag (`true`) and include `hasIterate` as `{current}` (preserve whatever value already exists)
5. Write the full 7-field object via `manifest-set-top-level`

The 7 canonical fields in canonical order:

```
hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec
```

### Pattern 3: Template and Live Manifest Default

The `hasIterate: false` default must be added in two places:

- `templates/design-manifest.json` — the schema template used when initializing a new project
- `.planning/design/design-manifest.json` — the live manifest for this project

Both currently have 6-field `designCoverage` objects (confirmed by inspection). Adding `"hasIterate": false`
makes the field present before `/pde:iterate` ever runs, ensuring `coverage-check` always returns a defined
value for all 7 fields.

### Anti-Patterns to Avoid

- **Do not use dot-notation with manifest-set-top-level.** The CLI performs FLAT key assignment
  (`manifest[field] = value`). Pass the FULL JSON object; never try `designCoverage.hasIterate`.
- **Do not hardcode `hasIterate: false` in upstream skill writes.** Always read the current value from
  `coverage-check` — if iterate has already run, preserving `hasIterate: true` is the entire point of this fix.
- **Do not modify `workflows/build.md`.** The orchestrator is already correct (read-only, no coverage writes,
  all 7 Skill() calls present). Only the command stub `commands/build.md` needs the allowed-tools fix.
- **Do not touch `iterate.md` or `handoff.md`.** These already write 7 fields correctly. They are the
  reference implementations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading manifest coverage | Custom manifest parser | `pde-tools.cjs design coverage-check` | Already handles @file: redirect, manifest path resolution, JSON parse |
| Writing coverage flags | Direct file mutation | `pde-tools.cjs design manifest-set-top-level` | Handles atomic manifest read-modify-write |
| Adding `Skill` tool access | Runtime workaround | Edit `commands/build.md` frontmatter | `allowed-tools` is the Claude Code mechanism for tool access control |

**Key insight:** This phase is pure configuration and text edits. Every infrastructure mechanism already exists.
The only work is applying the established patterns consistently to files that were not updated when `hasIterate`
was introduced in Phase 18.

---

## Common Pitfalls

### Pitfall 1: Editing Only 3 of 4 Workflows

**What goes wrong:** Reviewer fixes wireframe, critique, flows but misses system.md (which is 1300+ lines —
the coverage write is near line 1302).
**Why it happens:** system.md is the longest workflow file; the coverage write is buried after large generation sections.
**How to avoid:** Verify by grep after edits: `grep -n "manifest-set-top-level" workflows/system.md workflows/flows.md workflows/wireframe.md workflows/critique.md`
**Warning signs:** Test script passes for 3 workflows but not system.md.

### Pitfall 2: Hardcoding `hasIterate: false` Instead of `{current}`

**What goes wrong:** Developer writes `"hasIterate":false` instead of `"hasIterate":{current}` in the
deficient workflow's coverage write command.
**Why it happens:** False feels like a safe default; it matches the manifest template default.
**How to avoid:** The workflow must read `coverage-check` output and substitute the actual current value.
If `/pde:iterate` has already run and set `hasIterate: true`, then a re-run of `/pde:system` with hardcoded
`false` would clobber it — which is exactly BRK-01 again.
**Warning signs:** The prose description says "extract ALL current flag values" but the command has a literal false.

### Pitfall 3: Forgetting the Live Manifest

**What goes wrong:** Developer updates `templates/design-manifest.json` but not `.planning/design/design-manifest.json`.
**Why it happens:** Template is the "canonical" file; the live manifest is easy to overlook.
**How to avoid:** Both files need `"hasIterate": false` added to their `designCoverage` objects. The live
manifest is the one actually read by `coverage-check` at runtime.
**Warning signs:** `pde-tools.cjs design coverage-check` returns JSON without `hasIterate` field.

### Pitfall 4: system.md Coverage Write Has Inconsistent Field Count

**What goes wrong:** system.md's current coverage write (line 1302) writes only 5 fields, omitting both
`hasHardwareSpec` and `hasIterate`. The prose says "6 fields" but the command shows 5.
**Why it happens:** system.md was written before hasHardwareSpec was fully standardized in the pattern.
**How to avoid:** When fixing system.md, write all 7 fields:
`hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasHardwareSpec`.
The audit table confirms system.md is missing both `hasHardwareSpec` and `hasIterate`.
**Warning signs:** Coverage check after system re-run shows `hasHardwareSpec` is absent.

---

## Code Examples

### Fix 1: commands/build.md allowed-tools (one-line addition)

```yaml
# Source: commands/build.md frontmatter — add Skill after AskUserQuestion
allowed-tools:
  - Read
  - Bash
  - Glob
  - AskUserQuestion
  - Skill
```

### Fix 2: Corrected coverage write template (all 4 workflows use this pattern)

Each workflow substitutes its own skill's flag for `true` while setting all others to `{current}`:

```bash
# Pattern for flows.md (sets hasFlows: true)
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse JSON: extract hasDesignSystem, hasWireframes, hasCritique, hasIterate, hasHandoff, hasHardwareSpec
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":true,"hasWireframes":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'

# Pattern for wireframe.md (sets hasWireframes: true)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":true,"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'

# Pattern for critique.md (sets hasCritique: true)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":true,"hasIterate":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'

# Pattern for system.md (sets hasDesignSystem: true — also add hasHardwareSpec)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":true,"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

### Fix 3: designCoverage in manifest template and live manifest

```json
"designCoverage": {
  "_comment": "Boolean flags indicating which design artifact types exist.",
  "hasDesignSystem": false,
  "hasWireframes": false,
  "hasFlows": false,
  "hasHardwareSpec": false,
  "hasCritique": false,
  "hasIterate": false,
  "hasHandoff": false
}
```

Note: `templates/design-manifest.json` has a `_comment` key; the live `.planning/design/design-manifest.json`
does not. Add `hasIterate: false` to both without removing other fields.

---

## Files Requiring Modification

This is a comprehensive list of all files that need editing, derived from the audit:

| File | Change | Lines Affected |
|------|--------|----------------|
| `commands/build.md` | Add `- Skill` to `allowed-tools` | Line 9 (after `AskUserQuestion`) |
| `workflows/system.md` | Update coverage write: 5→7 fields (add `hasHardwareSpec`, `hasIterate`) | ~line 1302 |
| `workflows/flows.md` | Update coverage write: 6→7 fields (add `hasIterate`) | Step 7/7 coverage section |
| `workflows/wireframe.md` | Update coverage write: 6→7 fields (add `hasIterate`) | ~line 639 |
| `workflows/critique.md` | Update coverage write: 6→7 fields (add `hasIterate`) | ~line 578 |
| `templates/design-manifest.json` | Add `"hasIterate": false` to `designCoverage` | Line 114 area |
| `.planning/design/design-manifest.json` | Add `"hasIterate": false` to `designCoverage` | Line 16 area |

**Not modified:** `workflows/build.md` (already correct), `workflows/iterate.md` (gold standard, already 7-field),
`workflows/handoff.md` (already writes 7 fields correctly), `commands/*.md` other than `build.md`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | bash test scripts (project Nyquist pattern) |
| Config file | none — scripts are standalone bash |
| Quick run command | `bash .planning/phases/21-fix-pipeline-integration-wiring/test_wiring_gaps.sh` |
| Full suite command | `bash .planning/phases/21-fix-pipeline-integration-wiring/test_wiring_gaps.sh` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORC-01 | `commands/build.md` allowed-tools includes `Skill` | structural | `grep -q "Skill" commands/build.md` | Wave 0 |
| ORC-01 | All 4 upstream workflows write 7 `designCoverage` fields including `hasIterate` | structural | `grep -c "hasIterate" workflows/{system,flows,wireframe,critique}.md` | Wave 0 |
| ORC-01 | `hasIterate: false` present in manifest template | structural | `grep -q '"hasIterate"' templates/design-manifest.json` | Wave 0 |
| ORC-01 | `hasIterate: false` present in live manifest | structural | `grep -q '"hasIterate"' .planning/design/design-manifest.json` | Wave 0 |
| ORC-03 | `workflows/build.md` still has no manifest writes (regression guard) | structural | `grep -c "manifest-set-top-level" workflows/build.md` returns 0 | Wave 0 |

### Sampling Rate

- **Per task commit:** `bash .planning/phases/21-fix-pipeline-integration-wiring/test_wiring_gaps.sh`
- **Per wave merge:** `bash .planning/phases/21-fix-pipeline-integration-wiring/test_wiring_gaps.sh`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `.planning/phases/21-fix-pipeline-integration-wiring/test_wiring_gaps.sh` — covers ORC-01, ORC-03

---

## State of the Art

| Old State | New State | Phase Changed | Impact |
|-----------|-----------|---------------|--------|
| `commands/build.md` missing `Skill` in allowed-tools | `Skill` present in allowed-tools | Phase 21 | `/pde:build` can execute sub-skill invocations at runtime |
| 4 workflows write 6-field `designCoverage` (no `hasIterate`) | 4 workflows write 7-field `designCoverage` (include `hasIterate`) | Phase 21 | Re-running upstream skills after `/pde:iterate` no longer clobbers `hasIterate: true` |
| Manifest template and live manifest lack `hasIterate` default | Both have `"hasIterate": false` | Phase 21 | `coverage-check` always returns a defined 7-field object |

**Deprecated/outdated after this phase:**
- 6-field `designCoverage` write pattern in system/flows/wireframe/critique workflows — replaced by 7-field pattern
- `commands/build.md` without `Skill` in allowed-tools — fixed

---

## Open Questions

None. All defects are precisely located with exact line numbers, exact fix text, and verified against the
live codebase. The fix scope is fully bounded.

---

## Sources

### Primary (HIGH confidence)

- `.planning/v1.1-MILESTONE-AUDIT.md` — authoritative defect definitions for MISS-01, BRK-01, FLW-BRK-01
- `commands/build.md` — confirmed: `Skill` absent from allowed-tools (line 6-9)
- `workflows/system.md` (line 1302) — confirmed: 5-field coverage write, missing `hasHardwareSpec` and `hasIterate`
- `workflows/flows.md` (Step 7/7 coverage section) — confirmed: 6-field coverage write, missing `hasIterate`
- `workflows/wireframe.md` (line 639) — confirmed: 6-field coverage write, missing `hasIterate`
- `workflows/critique.md` (line 578) — confirmed: 6-field coverage write, missing `hasIterate`
- `workflows/iterate.md` (line 453) — gold standard 7-field write pattern
- `templates/design-manifest.json` (line 107-115) — confirmed: 6-field designCoverage, no `hasIterate`
- `.planning/design/design-manifest.json` (line 11-18) — confirmed: 6-field designCoverage, no `hasIterate`
- `bin/lib/design.cjs` (line 296-302) — confirmed: `cmdCoverageCheck` returns `manifest.designCoverage` verbatim

### Secondary (MEDIUM confidence)

- `STATE.md` decisions log — confirms `hasIterate` introduced in Phase 18, read-before-set pattern mandated
- Phase 20 `20-01-PLAN.md` — confirms orchestrator is read-only, Skill() pattern correct, Task() forbidden

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new tools; all tooling inspected directly from source
- Architecture: HIGH — exact line numbers confirmed by reading live files
- Pitfalls: HIGH — derived from audit findings and direct code inspection
- Fix scope: HIGH — 7 files, all changes are additive edits of 1-2 lines each

**Research date:** 2026-03-15
**Valid until:** Stable — no external dependencies; changes are internal text edits only
