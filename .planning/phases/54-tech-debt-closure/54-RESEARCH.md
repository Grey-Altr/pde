# Phase 54: Tech Debt Closure - Research

**Researched:** 2026-03-19
**Domain:** Internal PDE codebase cleanup — no external libraries
**Confidence:** HIGH

## Summary

Phase 54 resolves all 7 known v0.6 tech debt items before new validation surface area is added in Phases 55-57. Each item is fully isolated: no shared dependencies, no infrastructure changes, no new modules. The fixes are either cosmetic normalizations (lock-release trailing args, pde-tools.cjs help text), additive changes (SUMMARY.md `one_liner` field, TRACKING-PLAN.md creation), or investigative/documentation tasks (PLUG-01 install test, DEBT-03 historical commit note, DEBT-06 TOOL_MAP annotation).

All 7 items have been verified by reading the actual codebase. Every claim below is grounded in files inspected during this session, not inferred from prior knowledge.

**Primary recommendation:** Execute all 7 items as independent tasks within a single plan; they do not depend on each other and can be sequenced arbitrarily.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEBT-01 | PLUG-01 — test `claude plugin install` from GitHub and document results (working path or blocked-by-marketplace note) | GETTING-STARTED.md documents the install sequence; the two commands (`/plugin marketplace add` + `/plugin install`) are the path to test |
| DEBT-02 | TRACKING-PLAN.md — create file or remove broken reference from consent panel | `lib/ui/render.cjs` line 74 references `${CLAUDE_PLUGIN_ROOT}/TRACKING-PLAN.md`; file does not exist at project root |
| DEBT-03 | Historical commits (e067974, efe3af0) — document as known exception in MILESTONES.md (cannot retroactively fix) | Commits confirmed to exist and lack Co-Authored-By trailer; MILESTONES.md v0.6 section exists but has no note about these commits |
| DEBT-04 | lock-release trailing arguments — normalize call sites across all workflow files | 13 lock-release call sites found across workflows/; 3 have trailing args (critique, iterate, handoff), 10 do not; `cmdLockRelease` ignores trailing args functionally |
| DEBT-05 | SUMMARY.md `one_liner` field — add field to template and backfill recent phase SUMMARY.md files | `templates/summary.md` has no `one_liner` frontmatter field; `commands.cjs` reads `fm['one-liner']`; 19 v0.6 SUMMARY files lack the field |
| DEBT-06 | TOOL_MAP pre-registered entries — add `# TOOL_MAP_PREREGISTERED` annotation or add consumers | `github:update-pr` (line 90) and `github:search-issues` (line 93) in `bin/lib/mcp-bridge.cjs` TOOL_MAP have no consumers in any operational file |
| DEBT-07 | pde-tools.cjs help text — update usage help to include v0.6 commands (manifest, shard-plan, readiness, tracking) | All four commands are implemented (`case 'manifest'`, `case 'shard-plan'`, `case 'readiness'`, `case 'tracking'`) but absent from the header comment block between lines 1-142 |
</phase_requirements>

## Standard Stack

No external libraries. Phase 54 operates entirely within the existing PDE codebase:

| File/Module | Purpose | Debt Items |
|-------------|---------|------------|
| `lib/ui/render.cjs` | Consent panel display | DEBT-02 |
| `bin/lib/mcp-bridge.cjs` | TOOL_MAP entries | DEBT-06 |
| `bin/pde-tools.cjs` | Help comment block | DEBT-07 |
| `workflows/*.md` | lock-release call sites | DEBT-04 |
| `templates/summary.md` | SUMMARY.md template | DEBT-05 |
| `.planning/milestones/v0.6-phases/*/` | Phase summaries (19 files) | DEBT-05 backfill |
| `.planning/MILESTONES.md` | Milestone history | DEBT-01, DEBT-03 |
| `GETTING-STARTED.md`, `README.md` | Plugin install docs | DEBT-01 |
| `TRACKING-PLAN.md` (to create) | Telemetry details file | DEBT-02 |

**Installation:** None required.

## Architecture Patterns

### Pattern 1: Cosmetic Normalization (DEBT-04, DEBT-07)
**What:** Edit text content in existing files with no behavioral change.
**When to use:** When the fix is purely presentational and carries zero risk of regression.
**Approach:**
- DEBT-04: Normalize all `lock-release` bash code blocks to drop trailing args — target: `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release` with no trailing identifier. Three files need editing: `workflows/critique.md`, `workflows/iterate.md`, `workflows/handoff.md`.
- DEBT-07: Add four missing commands to the header comment block in `bin/pde-tools.cjs` between the `Sharding` section (line 66) and before `Validation` (line 70). Commands are `manifest`, `readiness`, and `tracking` — `shard-plan` is already present (line 67).

### Pattern 2: Additive Frontmatter Field (DEBT-05)
**What:** Add a new `one_liner` field to SUMMARY.md template frontmatter, then backfill all 19 v0.6 SUMMARY files.
**When to use:** When automated extraction (`summary-extract --fields one_liner`) returns null because the field is absent.
**Approach:**
- `templates/summary.md`: Add `one_liner: ""` to the frontmatter block after the existing `tags:` line.
- Backfill 19 v0.6 SUMMARY files: for each file, extract the bold one-liner sentence from the body (the `**substantive description**` line immediately after the `# Phase N: Name Summary` heading) and write it as the `one_liner:` frontmatter value.
- Field name must be `one-liner` (hyphenated) per `commands.cjs` line 304: `fm['one-liner'] || null`.

### Pattern 3: Create Missing Reference File (DEBT-02)
**What:** Create `TRACKING-PLAN.md` at plugin root OR remove the broken link from `lib/ui/render.cjs`.
**Decision:** Creating the file is better — removing the reference degrades the user experience of the consent panel. The file should describe what telemetry is collected.
**Content:** Minimal stub documenting the 6 telemetry categories already listed in the consent panel (skill usage, error metadata, session workflow, project metadata, MCP availability, custom tooling). Confirm all data is local-only.

### Pattern 4: In-Code Annotation (DEBT-06)
**What:** Add `# TOOL_MAP_PREREGISTERED` comment annotations to the two pre-registered TOOL_MAP entries.
**Where:** `bin/lib/mcp-bridge.cjs` lines 90 and 93.
**Format:** Per REQUIREMENTS.md INTG-03: `# TOOL_MAP_PREREGISTERED`
```javascript
'github:update-pr':     'mcp__github__update_pull_request',   // TOOL_MAP_PREREGISTERED
'github:search-issues': 'mcp__github__search_issues',          // TOOL_MAP_PREREGISTERED
```

### Pattern 5: Documentation + Investigation (DEBT-01, DEBT-03)
**What:** Test a command manually and document results; add a note to an existing document.
**DEBT-01:** Test `claude plugin install` flow from GitHub. GETTING-STARTED.md documents two steps: `/plugin marketplace add Grey-Altr/pde` then `/plugin install platform-development-engine@pde`. The outcome (working or blocked) gets documented in MILESTONES.md.
**DEBT-03:** Add a "Known Exceptions" section to MILESTONES.md documenting that commits e067974 and efe3af0 lack Co-Authored-By trailers because they predate the convention.

### Recommended Task Sequence

Tasks are independent and can run in any order. Suggested grouping by type:

1. **DEBT-07** — pde-tools.cjs help text (read file, add 3 missing command entries)
2. **DEBT-04** — lock-release normalization (edit 3 workflow files)
3. **DEBT-06** — TOOL_MAP annotation (edit 2 lines in mcp-bridge.cjs)
4. **DEBT-02** — Create TRACKING-PLAN.md stub
5. **DEBT-05** — Add `one_liner` to template + backfill 19 SUMMARY files
6. **DEBT-03** — Document historical commits in MILESTONES.md
7. **DEBT-01** — Test/document plugin install path (investigate + document)

### Anti-Patterns to Avoid
- **Scope creep on lock-release:** Do not change lock-acquire call sites or the lock-release implementation — only the bash code blocks in workflow .md files that call lock-release with trailing args.
- **Rewriting SUMMARY bodies during backfill:** The `one_liner` value must be extracted from the existing bold line in each file, not rewritten. Do not alter any content below the frontmatter fence.
- **Deleting TOOL_MAP entries:** DEBT-06 requires annotation or adding consumers — not removal. The REQUIREMENTS.md says "add `# TOOL_MAP_PREREGISTERED` annotation or add consumers."
- **Installing new dependencies for TRACKING-PLAN.md:** The telemetry stack is already implemented. TRACKING-PLAN.md is a documentation file only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Frontmatter editing | Custom regex frontmatter parser | Read file, locate YAML fence, insert line, write back |
| Finding SUMMARY files | Directory walker | `find .planning/milestones/v0.6-phases -name "*-SUMMARY.md"` |
| Extracting one_liner from SUMMARY body | Parse markdown AST | Read file, find line matching `^\*\*[A-Z]`, extract text |

## Common Pitfalls

### Pitfall 1: one-liner vs one_liner naming
**What goes wrong:** Adding frontmatter field as `one_liner:` (underscore) when `commands.cjs` reads `fm['one-liner']` (hyphenated).
**Why it happens:** YAML is flexible; the display name in the template uses underscore. `commands.cjs` line 304 uses the hyphenated form.
**How to avoid:** Use `one-liner:` (hyphen) as the frontmatter key in both the template and all backfilled files.
**Warning signs:** `summary-extract --fields one_liner` returns `null` after backfill.

### Pitfall 2: lock-release trailing args are documented in prose too
**What goes wrong:** Normalizing only the bash code block but leaving inconsistent prose references like "via `lock-release iterate`" or "via `lock-release critique`".
**Why it happens:** The debt is cosmetic normalization; prose references in the `<process>` section or guidelines sections use the trailing arg form for readability.
**How to avoid:** Per REQUIREMENTS.md DEBT-04 — this is "cosmetic normalization, zero functional change." The requirement only calls for normalizing call sites (the bash code blocks). Prose descriptions can retain the contextual form. Do not alter prose beyond the bash call sites unless the requirement specifically asks.

### Pitfall 3: Counting shard-plan as missing from help text
**What goes wrong:** Treating all 4 named commands (manifest, shard-plan, readiness, tracking) as missing.
**Why it happens:** The requirement says "v0.6 commands (manifest, shard-plan, readiness, tracking)" are missing.
**How to avoid:** `shard-plan` already appears at line 67 of `pde-tools.cjs`. Missing entries are: `manifest`, `readiness`, and `tracking`.

### Pitfall 4: Over-specifying the PLUG-01 outcome
**What goes wrong:** Assuming the install will or won't work and writing the task as if the outcome is predetermined.
**Why it happens:** The requirement is to test and document — not to fix the install flow.
**How to avoid:** Task should direct the executor to attempt the install sequence, capture the result, and document it in MILESTONES.md with a note on the path forward. The plan must handle both outcomes (working / blocked by marketplace).

### Pitfall 5: Missing v0.6 SUMMARY files in backfill scope
**What goes wrong:** Only backfilling the files in the current `.planning/phases/` directory (empty for v0.6 — those phases were archived).
**Why it happens:** v0.6 phase directories have been moved to `.planning/milestones/v0.6-phases/`.
**How to avoid:** Backfill target is `.planning/milestones/v0.6-phases/*/\*-SUMMARY.md` — 19 files total. Also include the quick task summary at `.planning/quick/260319-0u1-fix-v0-5-milestone-audit-tech-debt/260319-0u1-SUMMARY.md`.

## Code Examples

### lock-release normalized form (DEBT-04)
```bash
# Source: workflows/critique.md line 614, workflows/iterate.md line 355, workflows/handoff.md line 611
# BEFORE (inconsistent):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release critique
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release iterate
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release pde-handoff

# AFTER (normalized):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

### TOOL_MAP annotation (DEBT-06)
```javascript
// Source: bin/lib/mcp-bridge.cjs lines 90-93
// BEFORE:
'github:update-pr':           'mcp__github__update_pull_request',
'github:search-issues':       'mcp__github__search_issues',

// AFTER:
'github:update-pr':           'mcp__github__update_pull_request',  // TOOL_MAP_PREREGISTERED
'github:search-issues':       'mcp__github__search_issues',         // TOOL_MAP_PREREGISTERED
```

### SUMMARY.md frontmatter one-liner field (DEBT-05)
```yaml
# Source: templates/summary.md frontmatter
# Add after tags: line:
one-liner: ""

# Backfill example (53-01-SUMMARY.md):
# Extract from body: "Four v0.6 audit tech debt items closed..."
one-liner: "Four v0.6 audit tech debt items closed: planner gets methodology context, workflow-status shows real task names, empty task dirs produce TASK_TOTAL=0, and dead cmdTrackingGenerateHandoff CLI wrapper removed"
```

### pde-tools.cjs missing help entries (DEBT-07)
```javascript
// Source: bin/pde-tools.cjs — add to header comment after line 68 (shard-plan section)
// or create new sections. Missing commands:
 *
 * File Manifest:
 *   manifest init                      Build files-manifest.csv from plugin root
 *   manifest check                     Check manifest entries against disk hashes
 *
 * Readiness:
 *   readiness check <phase> [plan]     Run readiness checks against a plan
 *   readiness result <phase>           Read last readiness result
 *
 * Task Tracking:
 *   tracking init <phase> <plan>       Initialize workflow-status.md for a plan
 *     [--names 'Task A|Task B']
 *   tracking set-status <phase> <plan> Update task status in workflow-status.md
 *   tracking read <phase> <plan>       Read current workflow status
```

### TRACKING-PLAN.md structure (DEBT-02)
```markdown
# PDE Telemetry Plan

PDE collects usage data locally during alpha. This document describes what is collected, how it is stored, and how to inspect or delete it.

## What is Collected

- Skill usage — which skills you run, how long, success/fail
- Error metadata — error class and code only (never content or paths)
- Session workflow — skill sequence per session
- Project metadata — product type, stage, platforms (never project name)
- MCP availability — which MCPs degrade gracefully
- Custom tooling — count of custom skills/tools beyond defaults

## Storage

All data is stored locally in `~/.pde/telemetry/`. No remote transmission occurs during alpha.

## Inspect Your Data

Run: `pde telemetry show-data`

## Delete Your Data

Remove: `~/.pde/telemetry/`
```

### MILESTONES.md DEBT-03 note location
```markdown
# Add to v0.6 section in .planning/MILESTONES.md:

## Known Exceptions

- Commits e067974 and efe3af0 lack Co-Authored-By trailers. These commits predate the convention. They cannot be retroactively amended without rewriting history. Documented here as a known exception.
```

## State of the Art

| Old State | Current State | Impact for Phase 54 |
|-----------|---------------|---------------------|
| lock-release in some workflows takes a trailing owner arg | `cmdLockRelease(cwd, raw)` ignores all trailing args — they were always cosmetic | Normalization is safe: removing trailing args has zero functional effect |
| SUMMARY.md frontmatter has no `one_liner` field | `commands.cjs` summary-extract reads `fm['one-liner']` and returns null | Adding the hyphenated field enables automated extraction immediately |
| 4 v0.6 CLI commands exist but are not in help text | Implemented: manifest (line 674), shard-plan (line 704), readiness (line 530), tracking (line 715) | Help text update is cosmetic — no implementation changes needed |

## Open Questions

1. **PLUG-01 outcome is unknown until tested**
   - What we know: GETTING-STARTED.md documents a two-step install sequence (`/plugin marketplace add` + `/plugin install`)
   - What's unclear: Whether Claude Code's plugin marketplace currently supports GitHub-sourced plugins or requires an official marketplace listing
   - Recommendation: Task should attempt the install, document the result, and if blocked, note the marketplace registration requirement in MILESTONES.md

2. **Backfill scope: recent vs all SUMMARY files**
   - What we know: There are 19 v0.6-phases SUMMARY files and 1 quick task SUMMARY — all lack `one_liner`
   - What's unclear: Whether earlier milestones (v0.5 and prior) are also in scope
   - Recommendation: Scope to v0.6 phases only per DEBT-05 description ("backfill recent phase SUMMARY.md files"). Earlier milestones are archived history.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None (no test framework for markdown/docs changes) |
| Config file | none |
| Quick run command | `node bin/pde-tools.cjs summary-extract <path> --fields one_liner` |
| Full suite command | N/A — no automated test suite for this phase |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEBT-01 | Plugin install path documented in MILESTONES.md | manual | Inspect MILESTONES.md | ❌ Wave 0 |
| DEBT-02 | TRACKING-PLAN.md exists at plugin root | smoke | `ls TRACKING-PLAN.md` | ❌ Wave 0 |
| DEBT-03 | Known exception note in MILESTONES.md | manual | Inspect MILESTONES.md | ❌ Wave 0 |
| DEBT-04 | No lock-release call sites have trailing args | smoke | `grep "lock-release [a-z]" workflows/*.md` → 0 matches | ✅ (grep command, no test file) |
| DEBT-05 | one-liner field present in SUMMARY template and backfilled files | smoke | `node bin/pde-tools.cjs summary-extract .planning/milestones/v0.6-phases/53-milestone-polish/53-01-SUMMARY.md --fields one_liner` | ❌ Wave 0 |
| DEBT-06 | TOOL_MAP_PREREGISTERED annotations present | smoke | `grep "TOOL_MAP_PREREGISTERED" bin/lib/mcp-bridge.cjs` → 2 matches | ✅ (grep command) |
| DEBT-07 | manifest, readiness, tracking in pde-tools.cjs help | smoke | `grep -c "manifest\|readiness\|tracking" bin/pde-tools.cjs` → >3 in comment block | ✅ (grep command) |

### Sampling Rate
- **Per task commit:** Verify the specific file changed shows expected content
- **Per wave merge:** N/A — single wave phase
- **Phase gate:** All 7 success criteria TRUE before `/pde:verify-work`

### Wave 0 Gaps
- No test framework needed — all verification is grep-level or manual inspection
- None — verifications are inline with task execution

## Sources

### Primary (HIGH confidence)
- Direct file reads: `lib/ui/render.cjs`, `bin/lib/mcp-bridge.cjs`, `bin/pde-tools.cjs`, `templates/summary.md`, `bin/lib/commands.cjs`, `workflows/*.md` — all inspected in this session
- `.planning/REQUIREMENTS.md` — authoritative requirement definitions
- `.planning/PROJECT.md` — authoritative tech debt list with descriptions

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md`, `.planning/research/SUMMARY.md` — prior milestone research confirming debt item scope

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all files verified by direct read
- Architecture: HIGH — implementation confirmed in source files
- Pitfalls: HIGH — grounded in actual code behavior (cmdLockRelease signature, fm key naming)

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable codebase, no external dependencies)
