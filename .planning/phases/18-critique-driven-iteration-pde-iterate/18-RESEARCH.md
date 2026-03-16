# Phase 18: Critique-Driven Iteration (/pde:iterate) - Research

**Researched:** 2026-03-15 (re-researched 2026-03-15)
**Domain:** PDE skill workflow pattern — critique consumption, versioned artifact mutation, convergence signaling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ITR-01 | /pde:iterate applies critique findings to revise design artifacts | The critique workflow (workflows/critique.md) produces a structured `## Action List for /pde:iterate` checkbox list and a `## What Works` table specifically for this skill to consume. Each finding in the Action List has Location, Severity, Effort, Suggestion, and Reference fields — all the data needed to make targeted edits to wireframe HTML. The iterate skill reads these fields and applies the Suggestion as a concrete edit to the identified Location. Revised wireframes must be written as `WFR-screen-v2.html` (never overwriting `WFR-screen.html`) — verified by success criterion 1. The change log (ITR-changelog-v{N}.md) maps each applied or deferred finding to the specific change made. |
| ITR-02 | Iteration includes convergence signal — stops when issues are resolved | The critique report's "Action List for /pde:iterate" uses `- [ ]` checkboxes; after iteration the skill marks resolved items `- [x]` and appends them to the critique's "Resolved Findings (Cumulative)" table. After 3+ iteration cycles (detected by counting existing `ITR-changelog-v*.md` files), the skill surfaces an explicit convergence checklist and a "ready for handoff" recommendation keyed to remaining open Critical/Major findings. This is a pure workflow concern — no library required. |
</phase_requirements>

---

## Summary

Phase 18 implements `/pde:iterate`, the revision skill that closes the feedback loop between `/pde:critique` and the wireframe artifacts. The skill's core job is three-fold: (1) apply specific critique findings as targeted edits to wireframe HTML, producing versioned copies; (2) maintain a per-run change log that maps each finding to what was done (applied or deferred); and (3) after three or more runs, compute and surface a convergence checklist that tells the user whether the design is ready for handoff.

The implementation follows the established 7-step PDE skill workflow pattern used in all prior skills (wireframe, flows, critique). The inputs — critique report, wireframe HTML, What Works table — are all existing artifacts in `.planning/design/`. The outputs — versioned wireframe HTML files, a change log, and (after run 3+) a convergence report — all follow naming patterns already established in the codebase. No external libraries are needed; the same `pde-tools.cjs` CLI handles manifest registration and lock management.

The key implementation nuances discovered in re-research: (1) The `templates/critique-report.md` does NOT include a `## What Works` section — that section is added by the critique workflow at runtime between the Summary Scorecard and Findings by Priority sections in the live CRT file; the iterate skill must parse it from the generated file, not from the template. (2) The write lock operates on `.planning/design/DESIGN-STATE.md` (root domain state), not per-domain files — the lock owner string "iterate" identifies this skill. (3) The domain-state template (`templates/design-state-domain.md`) uses `Item, Source, Severity, Status` columns in the Open Critique Items table, not `ID` — the iterate skill must match these column names when updating statuses to "resolved". (4) `hasIterate` is genuinely absent from both the template and live manifest schemas and must be introduced by this phase.

**Primary recommendation:** Implement as a single `workflows/iterate.md` using the 7-step pipeline pattern. Wire `commands/iterate.md` as a delegation stub matching the exact pattern of `commands/critique.md`. The skill reads the latest critique report, applies findings as Edit-tool mutations to wireframe HTML (preserving What Works items), writes versioned wireframe copies, produces a structured change log, updates the critique report's checkboxes, and (on run 3+) outputs the convergence checklist.

---

## Standard Stack

### Core

| Component | Version/Path | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| `pde-tools.cjs design` subcommands | existing | ensure-dirs, lock-acquire/release, manifest-update, manifest-set-top-level, coverage-check | Same CLI used by every prior PDE skill — zero new dependencies |
| `@references/skill-style-guide.md` | existing | Universal flags, output format, error messaging conventions | Required reading for all PDE skills; defines Step progress format, summary table, error messaging |
| `@references/mcp-integration.md` | existing | Sequential Thinking MCP probe pattern, --no-mcp and --no-sequential-thinking flag handling | Required reading for all PDE skills with MCP enhancement |
| Write tool | Claude tool | Create versioned wireframe HTML files (`WFR-{screen}-v{N}.html`) and changelog | Same mechanism used by wireframe.md and critique.md |
| Edit tool | Claude tool | Patch wireframe HTML content; update critique report checkboxes (`[ ]` → `[x]`); update domain DESIGN-STATE | Preferred over full rewrite for surgical mutations |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Sequential Thinking MCP (`mcp__sequential-thinking__think`) | Reason through multi-finding conflicts — when two findings suggest contradictory changes to the same element | Use when SEQUENTIAL_THINKING_AVAILABLE = true and conflict detected |
| Glob tool | Discover existing versioned files (critique reports, wireframes, change logs) | Steps 2 and version-gate logic |
| Read tool | Load wireframe HTML, critique report, What Works table | Steps 2 and 4 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edit tool for wireframe HTML patches | Write tool (full rewrite) | Write is simpler but loses surgical precision; Edit preserves unchanged sections, reducing risk of unintentional drift |
| Sequential Thinking MCP for conflict resolution | Inline reasoning only | Sequential Thinking produces documented reasoning chains useful for change log generation, but skill works without it |
| Reuse ux/DESIGN-STATE.md Open Critique Items | New ITR-specific domain state | Reusing the existing ux domain DESIGN-STATE is correct — iterate operates on ux artifacts and tracks resolved items in the same domain state file that critique opened them in |

**Installation:** No new dependencies. Everything runs on existing `pde-tools.cjs` and Claude tools.

---

## Architecture Patterns

### Recommended Project Structure

The skill produces files in two existing directories:

```
.planning/design/
├── ux/
│   ├── wireframes/
│   │   ├── WFR-{screen}.html          # original (NEVER overwritten by iterate)
│   │   └── WFR-{screen}-v{N}.html     # versioned iteration output (Write tool)
│   └── DESIGN-STATE.md                # Open Critique Items: status updated to "resolved"
└── review/
    ├── CRT-critique-v{N}.md           # critique report — checkboxes updated, Resolved Findings appended
    └── ITR-changelog-v{N}.md          # new: change log produced by iterate (Write tool)
```

**Naming convention decisions:**
- Versioned wireframes: `WFR-{screen}-v{N}.html` where N matches the iteration run number (1-based). Distinct from original `WFR-{screen}.html` which uses no version suffix.
- Change logs: `ITR-changelog-v{N}.md` where N is the iteration run number. Each run produces exactly one file.
- The original unversioned wireframe HTML (`WFR-{screen}.html`) is NEVER overwritten — success criterion 1 is absolute.

### Pattern 1: 7-Step Skill Workflow (established project pattern)

**What:** All PDE skills follow a 7-step pipeline: (1) ensure-dirs, (2) check prerequisites and parse arguments, (3) probe MCP availability, (4) core generation/mutation work, (5) write output files with lock, (6) update domain DESIGN-STATE, (7) update root DESIGN-STATE + manifest + coverage flag.

**When to use:** Always — this is the canonical structure for every PDE skill. The iterate skill MUST follow it.

**Step mapping for /pde:iterate:**

```
Step 1/7: Initialize design directories (ensure-dirs — identical to all prior skills)

Step 2/7: Check prerequisites and discover artifacts
  2a. Find latest CRT-critique-v*.md (hard dependency — halt if absent)
  2b. Parse Action List checkboxes from critique ([ ] = open, [x] = already resolved)
  2c. Parse What Works table from critique (elements to preserve — read-only guard)
  2d. Find wireframes in ux/wireframes/ matching each open finding's screen slug
      - Hard halt if a finding references a screen with no matching wireframe
  2e. Discover existing ITR-changelog-v*.md to determine iteration depth (N)
  2f. Per-screen version gate:
      - Glob for WFR-{screen}-v*.html per affected screen
      - SOURCE = highest existing version (or WFR-{screen}.html if none)
      - NEW_VERSION = max(existing v*) + 1 (or 1 if none)
      - ITR_VERSION = max(existing ITR changelog N) + 1 (or 1 if none)

Step 3/7: Probe MCP availability
  - Sequential Thinking only (no Axe for iterate)
  - Respects --no-mcp, --quick, --no-sequential-thinking flags

Step 4/7: Apply findings to wireframes
  - For each open finding in Action List, in severity order (critical first):
    * Check What Works: if finding Location is descendant of any What Works element → defer
    * If SEQUENTIAL_THINKING_AVAILABLE and conflict detected: use mcp__sequential-thinking__think
    * Apply Suggestion to wireframe HTML via Edit tool (attribute/value) or Read+Write (structural)
    * Classify as: applied or deferred (with reason)
    * Accumulate CHANGELOG_ENTRIES

Step 5/7: Write outputs with lock
  5a. Acquire lock-acquire iterate (retry 3x, warn and continue if still locked)
  5b. Write WFR-{screen}-v{N}.html for each modified screen (Write tool)
  5c. Write ITR-changelog-v{ITR_VERSION}.md (Write tool)
  5d. Update CRT-critique-v{N}.md: mark applied findings [x], append to Resolved Findings
      (Edit tool — exact string match on full checkbox line)
  5e. Release lock-release iterate (ALWAYS release, even on error)

Step 6/7: Update ux/DESIGN-STATE.md
  - Use Glob to find .planning/design/ux/DESIGN-STATE.md
  - If absent: create with standard template (design-state-domain.md), then update
  - Use Edit tool to update Open Critique Items rows:
    * For each applied finding: update Status column from "open" to "resolved"
    * Column names: Item, Source, Severity, Status (match design-state-domain.md schema exactly)

Step 7/7: Update root DESIGN-STATE + manifest + coverage flag
  7a. Update root .planning/design/DESIGN-STATE.md (Edit tool)
      - Pipeline Progress: mark Iterate as complete
      - Decision Log: append entry
      - Iteration History: append ITR-changelog-v{ITR_VERSION}.md entry
  7b. Register ITR artifact in manifest (7 calls — same pattern as critique.md)
  7c. Set coverage flag (read-before-set — CRITICAL to prevent clobber)
      Introduces hasIterate: true (new field, absent from current schema)
  7d. If ITERATION_DEPTH >= 3: output convergence checklist
  7e. Output skill summary table (per skill-style-guide.md conventions)
```

### Pattern 2: Versioned Wireframe Output (never-overwrite rule)

**What:** Produce `WFR-{screen}-v{N}.html` as a full copy of the wireframe HTML with findings applied. The original `WFR-{screen}.html` is never touched.

**When to use:** Every iteration run, for every screen that has at least one applied finding.

**Source file selection logic (Step 2f):**

```
For each screen in AFFECTED_SCREENS:
  1. Glob for .planning/design/ux/wireframes/WFR-{screen}-v*.html
  2. If any exist: SOURCE = highest version (e.g., WFR-login-v1.html)
     NEW_VERSION = max(existing v* suffix integer) + 1
  3. If none exist: SOURCE = WFR-{screen}.html (original — read-only)
     NEW_VERSION = 1
  4. OUTPUT_PATH = .planning/design/ux/wireframes/WFR-{screen}-v{NEW_VERSION}.html
```

**Key nuance:** On subsequent iterations (run 2, 3+), the source to modify is the PREVIOUS iteration's versioned file (`WFR-{screen}-v1.html` → `WFR-{screen}-v2.html`), not the original. The original is permanently frozen.

**Edit strategy by change type:**

```
Attribute/value change (e.g., "change font-size from var(--font-size-xs) to var(--font-size-sm)"):
  → Use Edit tool with exact string match on the target element line
  → Lower risk; does not affect surrounding structure

Structural addition (e.g., "add skip-to-main-content link as first child of <body>"):
  → Use Read tool to read full HTML
  → Assemble modified version
  → Write complete file to WFR-{screen}-v{N}.html via Write tool
  → Document as structural change in changelog
```

### Pattern 3: Change Log Format

**What:** `ITR-changelog-v{N}.md` documents each run's applied and deferred changes.

**When to use:** Every iteration run produces exactly one changelog file.

**Required structure:**

```markdown
---
Generated: "{ISO date}"
Skill: /pde:iterate (ITR)
Version: v{N}
Critique Source: CRT-critique-v{M}.md
Status: complete
Screens Modified: {count}
Findings Applied: {count}
Findings Deferred: {count}
---

# Iteration Changelog v{N}

## Applied Changes

| Finding ID | Severity | Screen | Change Made | Effort | Source Finding |
|------------|----------|--------|-------------|--------|----------------|
| {id} | {critical/major/...} | {screen}.html | {specific change description} | {quick-fix/...} | CRT-critique-v{M}.md |

## Deferred Findings

| Finding ID | Severity | Screen | Reason Deferred | Source Finding |
|------------|----------|--------|-----------------|----------------|
| {id} | {severity} | {screen}.html | {reason: conflicts with What Works / requires redesign / out of scope} | CRT-critique-v{M}.md |

## What Works (Preserved)

Items from the critique's "What Works" table that were intentionally NOT changed:

| Element | Preserved | Note |
|---------|-----------|------|
| {element} | Yes | {what was preserved and why} |
```

### Pattern 4: Convergence Checklist (run 3+)

**What:** After 3 or more iteration cycles, surface a decision-support checklist. This is the "ready for handoff" gate (ITR-02 success criterion 3).

**When to use:** Whenever ITERATION_DEPTH (count of `ITR-changelog-v*.md` files INCLUDING the one just written) >= 3.

**Required checklist structure:**

```markdown
## Convergence Assessment

| Category | Status | Detail |
|----------|--------|--------|
| Critical findings remaining | PASS / FAIL | {count} open critical findings |
| Major findings remaining | PASS / WARN | {count} open major findings |
| Iteration depth | {N} cycles | First run was v1 |
| What Works preserved | PASS | {count} items confirmed unchanged |
| Repeat deferrals | {note} | e.g., "3 deferred findings deferred across 2+ consecutive runs — redesign scope" |

### Handoff Recommendation

{One of:}
- "Ready for handoff. No critical or major findings remain open. Run /pde:handoff."
- "Further iteration recommended. {N} critical or major findings remain: {list}"
- "Redesign may be needed. {N} deferred findings require structural changes beyond iteration scope."
```

**Threshold logic:**
- PASS (handoff-ready): 0 critical open, 0 major open
- WARN (further iteration): 0 critical open, 1-2 major open
- FAIL (redesign needed): 1+ critical open OR 3+ major open

**Repeat-deferral detection:** Cross-reference finding IDs between the current changelog's Deferred Findings and the previous run's changelog Deferred Findings. Findings present in both are "repeat deferrals" that signal redesign scope.

### Pattern 5: commands/iterate.md Delegation Pattern

**What:** Replace the current stub `<process>` section with a delegation to `@workflows/iterate.md`, matching exactly the pattern of `commands/critique.md`.

**Required replacement for `<process>` section:**

```
<process>
Follow @workflows/iterate.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

**The frontmatter must be updated:** The current stub has `allowed-tools` missing `mcp__sequential-thinking__*`. Add it to match the critique command's tool list.

### Anti-Patterns to Avoid

- **Overwriting originals:** `WFR-{screen}.html` must never be modified by iterate. Write tool only produces new `WFR-{screen}-v{N}.html` files.
- **Applying findings that conflict with What Works:** The What Works table is a read-only constraint. If a finding's Suggestion would change a What Works element, defer the finding and document the conflict.
- **Updating designCoverage without coverage-check first:** Same pattern as all prior skills — read-before-set is mandatory to avoid clobbering flags from other skills. The live manifest has six existing flags; `hasIterate` is the seventh.
- **Marking findings resolved without writing the wireframe:** Update critique checkboxes AFTER the versioned wireframe file has been confirmed written.
- **Halting on deferred findings:** Deferred findings are normal. The skill completes successfully and documents deferrals in the changelog.
- **Mismatching DESIGN-STATE column names:** The ux/DESIGN-STATE.md Open Critique Items table uses `Item, Source, Severity, Status` columns (from `design-state-domain.md` template). Do not use `ID` — match the live schema exactly.
- **Looking for What Works in templates/critique-report.md:** The template file does NOT include the `## What Works` section. Read it from the live generated `CRT-critique-v{N}.md` file where critique inserted it at runtime between the Summary Scorecard and Findings by Priority sections.
- **Applying all findings regardless of effort:** If a finding's effort is "significant" and its suggestion requires a structural redesign, defer it. Iterate is for targeted corrections, not architectural changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest registration | Custom JSON writer | `pde-tools.cjs design manifest-update ITR ...` | Same 7-call pattern used by every prior PDE skill; tested in design.cjs self-test |
| Write locking | Custom lock file | `pde-tools.cjs design lock-acquire iterate` / `lock-release iterate` | 60s TTL, auto-clear on stale lock, operates on root DESIGN-STATE.md |
| Coverage flag update | Direct JSON edit | `coverage-check` + `manifest-set-top-level designCoverage` | Read-before-set pattern prevents clobbering other skills' flags |
| Conflict resolution reasoning | Custom inference loop | Sequential Thinking MCP (`mcp__sequential-thinking__think`) | Provides structured reasoning chain; skill works without it (degrades gracefully) |
| Iteration depth counting | Custom state file | Glob for `ITR-changelog-v*.md` count | Self-evident from existing files; no additional state needed |
| Finding parsing | Regex on critique text | Read CRT file, parse `## Action List for /pde:iterate` section | Structured checkbox format (`- [ ]` / `- [x]`) is machine-readable by design |
| Repeat-deferral detection | Separate tracking DB | Cross-reference finding IDs between current and previous changelog Deferred sections | Changelogs are self-documenting; no extra state required |

**Key insight:** The critique report is designed with `/pde:iterate` as its consumer. The Action List section uses checkbox format, and the What Works table uses a stable column structure — both specifically so this skill can parse them without custom tooling. The What Works section is in the live CRT file, NOT in the template.

---

## Common Pitfalls

### Pitfall 1: Version Number Collision

**What goes wrong:** Multiple `WFR-{screen}-v{N}.html` files exist from previous runs; the new run writes to the wrong version number, or the wireframe version counter drifts from the changelog version counter.

**Why it happens:** The version N for wireframe output files is determined per-screen from `max(existing WFR-{screen}-v* versions) + 1`. The changelog version is determined from `max(existing ITR-changelog-v* versions) + 1`. These are independent counters that can drift if runs were partial.

**How to avoid:** In Step 2f, glob for BOTH `ITR-changelog-v*.md` count AND `WFR-{screen}-v*.html` per screen independently. Never assume they are synchronized.

**Warning signs:** `WFR-{screen}-v2.html` exists but `ITR-changelog-v2.md` does not (or vice versa).

### Pitfall 2: What Works Violation

**What goes wrong:** A finding's suggestion is applied to an element that the critique marked as "What Works — do not change in iteration."

**Why it happens:** Findings and What Works items can reference the same element at different levels of specificity. A finding might target `login.html > main > form > button.submit` while What Works says `login.html > main > form` is working correctly — a prefix-match overlap.

**How to avoid:** Before applying any finding, check whether the finding's Location path is a prefix-match of any What Works element Location. If it is, classify as "deferred (conflicts with What Works)" and document the specific conflict.

**Warning signs:** User re-runs critique after iteration and finds new findings that reverse previously working behavior.

### Pitfall 3: Critique Report Mutation Without Lock

**What goes wrong:** The iterate skill updates the critique report's checkboxes and Resolved Findings table without acquiring the write lock first.

**Why it happens:** The lock protects `.planning/design/DESIGN-STATE.md`. Writing to the critique report in `.planning/design/review/` is a separate write. Both should be inside the same lock window.

**How to avoid:** In Step 5a, acquire `lock-acquire iterate` BEFORE any file write in Step 5 (wireframes, changelog, and critique report). Release in Step 5e after all writes complete. Follow the exact retry pattern from critique.md Step 5a: retry 3 times, warn and continue if still locked.

**Warning signs:** Critique report has partial checkbox updates or truncated Resolved Findings table.

### Pitfall 4: Deferred Finding Accumulation Without Signal

**What goes wrong:** Multiple iterations run, each deferring the same findings. The user never gets a signal that certain issues require redesign rather than revision.

**Why it happens:** Without the convergence assessment, a user can iterate indefinitely without realizing that remaining findings are structurally unaddressable.

**How to avoid:** In Step 7d's convergence checklist (run 3+), flag findings present in both the current and previous changelog Deferred sections as "repeat deferrals — redesign scope." This triggers the "Redesign may be needed" handoff recommendation.

**Warning signs:** `ITR-changelog-v3.md` deferred section contains the same finding IDs as `ITR-changelog-v2.md` deferred section.

### Pitfall 5: Missing `hasIterate` Coverage Flag

**What goes wrong:** The designCoverage object in `design-manifest.json` does not have a `hasIterate` field after the skill runs.

**Why it happens:** `design-manifest.json` template and `coverage-check` output only include six fields: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasHandoff`, `hasHardwareSpec`. There is no `hasIterate` defined anywhere in the current schema.

**How to avoid:** In Step 7c, the iterate skill MUST introduce `hasIterate` into the coverage object via the read-before-set pattern. The full seven-field object after merge:
```json
{
  "hasDesignSystem": {current},
  "hasFlows": {current},
  "hasWireframes": {current},
  "hasCritique": {current},
  "hasIterate": true,
  "hasHandoff": {current},
  "hasHardwareSpec": {current}
}
```
This is the same pattern used when `hasCritique` was introduced by Phase 17.

**Warning signs:** `coverage-check` returns an object with no `hasIterate` key after iterate has run.

### Pitfall 6: What Works Section Not in Template File

**What goes wrong:** The iterate workflow loads `@templates/critique-report.md` expecting a `## What Works` section, but the template doesn't have one — causing the skill to silently proceed without What Works constraints.

**Why it happens:** The critique-report.md template jumps from `## Summary Scorecard` directly to `## Findings by Priority` — no What Works section in the template. The What Works section is inserted by `workflows/critique.md` at runtime in the live CRT file.

**How to avoid:** Do NOT read the template for What Works. Parse it from the live generated `CRT-critique-v{N}.md` file. The What Works section appears between `## Summary Scorecard` and `## Findings by Priority` in every live critique report.

**Warning signs:** Workflow loads `@templates/critique-report.md` and claims no What Works items were found when the live CRT file has a populated What Works table.

---

## Code Examples

Verified patterns from existing project workflows:

### Ensure-dirs (Step 1 — identical across all skills)

```bash
# Source: workflows/critique.md Step 1 / workflows/wireframe.md Step 1
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

### Discover Latest Critique Report (Step 2a — hard dependency)

```bash
# Pattern: same as how critique.md Step 2 discovers FLW-flows-v*.md
# Glob for: .planning/design/review/CRT-critique-v*.md
# Sort descending by version number (parse v{N} suffix)
# If absent: HALT with structured error message
# If present: read highest version → CRITIQUE_REPORT content

# Error format (matches skill-style-guide.md standards):
# Error: No critique report found.
#   Run /pde:critique first to generate findings, then retry /pde:iterate.
```

### Version Gate for Changelogs (Step 2e)

```bash
# Glob for: .planning/design/review/ITR-changelog-v*.md
# Parse v{N} suffix from each match, extract max N
# ITR_VERSION = max(N) + 1  (or 1 if none exist)
# ITERATION_DEPTH = ITR_VERSION  (depth of the run being produced, 1-based)
```

### Source File Selection for Versioned Wireframes (Step 2f)

```bash
# For each screen slug in AFFECTED_SCREENS:
#   Glob for: .planning/design/ux/wireframes/WFR-{screen}-v*.html
#   If any exist: SOURCE = path of highest version; NEW_VERSION = max(v*) + 1
#   If none exist: SOURCE = .planning/design/ux/wireframes/WFR-{screen}.html; NEW_VERSION = 1
#   OUTPUT = .planning/design/ux/wireframes/WFR-{screen}-v{NEW_VERSION}.html
```

### Lock-Acquire/Release for File Writes (Step 5)

```bash
# Source: workflows/critique.md Step 5a / 5c
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire iterate)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
# Parse {"acquired": true/false} — retry 3 times on false, warn and continue if still locked

# ALWAYS release — even on error:
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release iterate
```

### Critique Checkbox Update (Step 5d — Edit tool pattern)

```
# Use Edit tool with EXACT string match on full checkbox line:
# Find:    - [ ] {full finding summary} -- {severity}/{effort}
# Replace: - [x] {full finding summary} -- {severity}/{effort}
#
# Do NOT use regex substitution. Exact string match only.
# Reason: predictable, deterministic, safe across markdown renderers.
```

### Manifest Registration (Step 7b — 7-call pattern)

```bash
# Source: workflows/critique.md Step 7b — same 7-call pattern
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR code ITR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR name "Design Iteration"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR type iteration
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR domain review
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR path ".planning/design/review/ITR-changelog-v${ITR_VERSION}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR version ${ITR_VERSION}
```

### Coverage Flag (Step 7c — read-before-set introducing hasIterate)

```bash
# Source: workflows/critique.md Step 7c — mandatory read-before-set
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON. Extract ALL six current flag values.
# Merge hasIterate: true as the seventh field.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

### commands/iterate.md Replacement (complete process section)

```markdown
<process>
Follow @workflows/iterate.md exactly.

Pass all of $ARGUMENTS to the workflow.
</process>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| iterate as planned stub (`commands/iterate.md` says "Planned -- available in PDE v2") | Full workflow implementation following 7-step pattern | Phase 18 | Replace stub content entirely; do not reference "v2" in any new file |
| No `hasIterate` in coverage flags | Add `hasIterate: true` via read-before-set in Step 7c | Phase 18 | Phase 19 (handoff) and Phase 20 (build) can detect whether iteration occurred |
| Critique checkboxes as static output | Checkboxes mutated by iterate (`[ ]` → `[x]`) | Phase 18 | Critique report becomes a living document across the pipeline |
| What Works in critique template | What Works only in live CRT file (template has no such section) | Confirmed in re-research | Iterate must read live file, not template |
| Open Critique Items with "ID" column | Column name is "Item" per design-state-domain.md schema | Confirmed in re-research | Status updates must target correct column name |

**Deprecated/outdated:**
- `commands/iterate.md` stub: the entire `<process>` block must be replaced with the delegation pattern. The stub references "PDE v2" which is incorrect — this is a v1.1 feature.

---

## Open Questions

1. **`hasIterate` field not in current manifest schema**
   - What we know: `design-manifest.json` template and live manifest only track six coverage flags. `hasIterate` is absent from both.
   - What's unclear: Whether Phase 19 (handoff) or Phase 20 (build) will gate behavior on `hasIterate`.
   - Recommendation: Introduce `hasIterate` via the read-before-set pattern in Step 7c regardless — adding a new field to designCoverage is additive and safe. Phase 19/20 can check for it if needed.

2. **Critique report section order for What Works parsing**
   - What we know: The live CRT file inserts `## What Works` between `## Summary Scorecard` and `## Findings by Priority`. The template does not have this section.
   - What's unclear: Whether any critique run could omit the What Works section (critique.md says it's mandatory with minimum one row).
   - Recommendation: Parse by section header `## What Works` in the live CRT file. If the section is absent (malformed critique output), warn and continue with no What Works constraints — do not halt.

3. **Wireframe HTML edit scope for structural additions**
   - What we know: Findings' Suggestion field contains changes ranging from attribute edits ("change font-size from X to Y") to structural additions ("add skip-to-main-content link as first child of body").
   - What's unclear: Edit tool vs Write tool is a judgment call per finding type.
   - Recommendation: Use Edit tool for attribute/value changes; use Read + Write for structural additions. Document both paths explicitly in the workflow with decision criteria.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in (`--self-test` flag in design.cjs) |
| Config file | None — tests are inline in `bin/lib/design.cjs` |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ITR-01 | /pde:iterate produces versioned WFR-{screen}-v{N}.html files | manual-only | manual — requires Claude inference to apply critique findings | N/A |
| ITR-01 | Original WFR-{screen}.html is never modified after iterate run | manual-only | manual — verify file mtime unchanged after iterate run | N/A |
| ITR-01 | Change log (ITR-changelog-v{N}.md) produced with Applied Changes and Deferred Findings sections | manual-only | manual — verify file structure and content | N/A |
| ITR-02 | Convergence checklist appears on run 3+ | manual-only | manual — requires 3 iteration cycles to trigger | N/A |
| ITR-02 | Handoff recommendation reflects remaining open findings | manual-only | manual — requires reading both critique and changelog outputs | N/A |

**Rationale for manual-only classification:** All ITR requirements involve Claude inference (reading critique findings, applying HTML edits, assessing convergence). These cannot be unit-tested in the same way as pure data transformation functions in design.cjs. This follows the precedent set in Phase 15.1 for `/pde:system` integration: "requires Claude inference, not automatable as unit test."

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test` (infrastructure regression check)
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** `node bin/lib/design.cjs --self-test` green + manual acceptance criteria verification

### Wave 0 Gaps

None — existing test infrastructure (`design.cjs --self-test`) covers the infrastructure layer. The iterate skill itself is a workflow file (markdown), not a code module, so no new test files are needed.

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (full file, 632 lines) — Action List format, What Works table format, lock-acquire/release pattern with "critique" owner string, manifest registration 7-call pattern, coverage-check read-before-set, anti-patterns, Step 5a retry behavior
- `templates/critique-report.md` — confirmed output scaffold: What Works section is NOT in template (gap confirmed); Action List checkbox format `- [ ] {summary} -- {severity}/{effort}`; Resolved Findings table structure
- `templates/design-state-domain.md` — confirmed Open Critique Items table columns: `Item, Source, Severity, Status` (not `ID`)
- `bin/lib/design.cjs` (lines 1-200) — acquireWriteLock operates on `.planning/design/DESIGN-STATE.md` (root domain); owner string identifies skill; 60s TTL; stale lock auto-clear
- `templates/design-manifest.json` — confirmed: `hasIterate` absent from designCoverage schema; six existing fields confirmed
- `.planning/design/design-manifest.json` (live) — confirmed: same six-field designCoverage in live manifest; no `hasIterate`
- `commands/critique.md` — confirmed delegation pattern: `Follow @workflows/critique.md exactly. Pass all of $ARGUMENTS to the workflow.`
- `commands/iterate.md` (current stub) — confirmed "Planned -- available in PDE v2" stub to be replaced
- `references/skill-style-guide.md` (lines 1-160) — universal flags, output format conventions, error structure, summary table format
- `references/mcp-integration.md` (lines 1-60) — flag detection pattern, per-MCP skip flags
- `.planning/REQUIREMENTS.md` — ITR-01 and ITR-02 requirement text
- `.planning/STATE.md` — Phase 17 decision: What Works section is mandatory; Phase 16 decision: ANNOTATION comments for handoff

### Secondary (MEDIUM confidence)

- `workflows/wireframe.md` (lines 1-80) — canonical 7-step structure, ensure-dirs pattern, Step 2 prerequisite checking shape
- `.planning/phases/17-design-critique-pde-critique/17-01-PLAN.md` — upstream interface confirmation: Action List format, What Works table, critique report sections produced for iterate consumption

### Tertiary (LOW confidence)

None — all claims in this research are grounded in directly read project files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified by direct inspection of existing skill workflows and design.cjs source
- Architecture patterns: HIGH — 7-step pattern observed across wireframe.md, flows.md, critique.md; versioning logic derived from success criteria and existing file naming; Step 6 column names confirmed from design-state-domain.md template
- Pitfalls: HIGH — version collision, What Works violation, lock patterns derived from existing anti-patterns sections in critique.md; hasIterate gap and What Works template gap confirmed by direct file inspection
- Convergence logic: HIGH — ITR-02 success criteria are explicit; threshold values (3+ cycles, 0 critical = handoff-ready) are directly specified in phase description

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable project — no external dependencies that could drift)
