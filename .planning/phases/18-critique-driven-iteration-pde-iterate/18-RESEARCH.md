# Phase 18: Critique-Driven Iteration (/pde:iterate) - Research

**Researched:** 2026-03-15
**Domain:** PDE skill workflow pattern — critique consumption, versioned artifact mutation, convergence signaling
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ITR-01 | /pde:iterate applies critique findings to revise design artifacts | The critique workflow (workflows/critique.md) produces a structured `## Action List for /pde:iterate` checkbox list and a `## What Works` preservation table specifically for this skill to consume. Each finding has Location, Severity, Effort, Suggestion, and Reference fields — all the data needed to make targeted edits to wireframe HTML. The iterate skill reads these fields and applies the Suggestion as a concrete edit to the identified Location. Revised wireframes must be written as `WFR-screen-v2.html` (never overwriting `WFR-screen.html`) — verified by success criterion 1. |
| ITR-02 | Iteration includes convergence signal — stops when issues are resolved | The critique report "Action List for /pde:iterate" uses `- [ ]` checkboxes; after iteration the skill marks resolved items `- [x]` and appends them to the critique's "Resolved Findings (Cumulative)" table. After 3+ iteration cycles (detected by counting existing `ITR-changelog-v*.md` files), the skill surfaces an explicit convergence checklist and a "ready for handoff" recommendation keyed to remaining open Critical/Major findings. This is a pure workflow concern — no library required. |
</phase_requirements>

---

## Summary

Phase 18 implements `/pde:iterate`, the revision skill that closes the feedback loop between `/pde:critique` and the wireframe artifacts. The skill's core job is three-fold: (1) apply specific critique findings as targeted edits to wireframe HTML, producing versioned copies; (2) maintain a per-run change log that maps each finding to what was done (applied or deferred); and (3) after three or more runs, compute and surface a convergence checklist that tells the user whether the design is ready for handoff.

The implementation follows the established 7-step PDE skill workflow pattern used in all prior skills (wireframe, flows, critique). The inputs — critique report, wireframe HTML, What Works table — are all existing artifacts in `.planning/design/`. The outputs — versioned wireframe HTML files, a change log, and (after run 3+) a convergence report — all follow naming patterns already established in the codebase. No external libraries are needed; the same `pde-tools.cjs` CLI handles manifest registration and lock management.

The key complexity is the "never overwrite" versioning rule for wireframe HTML, plus the cross-skill state mutation where this skill must update the critique report's "Action List" checkboxes and "Resolved Findings" table — both of which are files owned by `/pde:critique`. The convergence signal (ITR-02) is straightforward to implement: count existing `ITR-changelog-v*.md` files to determine iteration depth, then compare remaining open Critical/Major findings to a pass/fail threshold.

**Primary recommendation:** Implement as a single `workflows/iterate.md` using the 7-step pipeline pattern. The skill reads the latest critique report, applies findings as Edit-tool mutations to wireframe HTML (preserving What Works items), writes versioned wireframe copies, produces a structured change log, updates the critique report's checkboxes, and (on run 3+) outputs the convergence checklist. Wire `commands/iterate.md` as a delegation stub.

---

## Standard Stack

### Core

| Component | Version/Path | Purpose | Why Standard |
|-----------|-------------|---------|--------------|
| `pde-tools.cjs design` subcommands | existing | ensure-dirs, lock-acquire/release, manifest-update, manifest-set-top-level, coverage-check | Same CLI used by every prior PDE skill — zero new dependencies |
| `@references/skill-style-guide.md` | existing | Universal flags, output format, error messaging | Required reading for all PDE skills |
| `@references/mcp-integration.md` | existing | Sequential Thinking MCP probe pattern | Required reading for all PDE skills with MCP enhancement |
| `@templates/critique-report.md` | existing | Structure reference for reading the Action List and Resolved Findings sections | The iterate skill mutates this file via Edit tool |
| Write tool | Claude tool | Create versioned wireframe HTML files | Same mechanism used by wireframe.md |
| Edit tool | Claude tool | Patch wireframe HTML content; update critique report checkboxes | Preferred over full rewrite for surgical mutations |

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
| ITR-specific domain DESIGN-STATE | Reuse ux/DESIGN-STATE.md Open Critique Items | Reusing the existing ux domain DESIGN-STATE is correct — iterate operates on ux artifacts and should track resolved items in the same domain state file that critique opened them in |

**Installation:** No new dependencies. Everything runs on existing `pde-tools.cjs` and Claude tools.

---

## Architecture Patterns

### Recommended Project Structure

The skill produces files in two existing directories and one established naming pattern:

```
.planning/design/
├── ux/
│   ├── wireframes/
│   │   ├── WFR-{screen}.html          # original (never overwritten)
│   │   └── WFR-{screen}-v{N}.html     # versioned iteration output
│   └── DESIGN-STATE.md                # Open Critique Items updated here
└── review/
    ├── CRT-critique-v{N}.md           # critique report — checkboxes updated here
    └── ITR-changelog-v{N}.md          # new: change log produced by iterate
```

**Naming convention decisions:**
- Versioned wireframes: `WFR-{screen}-v{N}.html` where N matches the iteration number (not the critique version). This is distinct from the original `WFR-{screen}.html` which uses no version suffix.
- Change logs: `ITR-changelog-v{N}.md` where N is the iteration run number. Each run produces one file.
- The original unversioned wireframe HTML (`WFR-{screen}.html`) is NEVER overwritten — success criterion 1 is absolute.

### Pattern 1: 7-Step Skill Workflow (established project pattern)

**What:** All PDE skills follow a 7-step pipeline: (1) ensure-dirs, (2) check prerequisites and parse arguments, (3) probe MCP availability, (4) core generation/mutation work, (5) write output files with lock, (6) update domain DESIGN-STATE, (7) update root DESIGN-STATE + manifest + coverage flag.

**When to use:** Always — this is the canonical structure for every PDE skill. The iterate skill MUST follow it.

**Step mapping for /pde:iterate:**

```
Step 1/7: Initialize design directories (ensure-dirs — identical to all prior skills)
Step 2/7: Check prerequisites and discover artifacts
          - Find latest CRT-critique-v*.md (hard dependency — halt if absent)
          - Find wireframes in ux/wireframes/ matching findings' screens
          - Find existing ITR-changelog-v*.md to determine iteration depth (N)
          - Parse critique Action List checkboxes ([ ] = open, [x] = resolved)
          - Parse What Works table (elements to preserve)
Step 3/7: Probe MCP availability (Sequential Thinking only — no Axe for iterate)
Step 4/7: Apply findings to wireframes
          - For each open finding in Action List, apply Suggestion to wireframe HTML
          - Preserve What Works items (read-only guard on those elements)
          - Classify each finding as applied or deferred (with reason)
          - Produce CHANGELOG_ENTRIES (finding -> action -> file change)
Step 5/7: Write outputs with lock
          - Write WFR-{screen}-v{N}.html for each modified screen
          - Write ITR-changelog-v{N}.md
          - Update CRT-critique-v{N}.md: mark applied findings [x], append to Resolved Findings
Step 6/7: Update ux/DESIGN-STATE.md
          - Move resolved items from Open Critique Items to a Resolved section (or mark status=resolved)
Step 7/7: Update root DESIGN-STATE + manifest + coverage flag
          - hasIterate: true in designCoverage (new flag — see below)
          - Register ITR artifact in manifest
          - If iteration depth >= 3: output convergence checklist
```

### Pattern 2: Versioned Wireframe Output (never-overwrite rule)

**What:** Produce `WFR-{screen}-v{N}.html` as a full copy of the wireframe HTML with findings applied. The original `WFR-{screen}.html` is never touched.

**When to use:** Every iteration run, for every screen that has at least one applied finding.

**Example (pseudocode for the planner):**

```
For each screen in AFFECTED_SCREENS:
  1. Read WFR-{screen}.html (or WFR-{screen}-v{N-1}.html if this is iteration > 1)
  2. Apply findings for this screen using Edit tool
  3. Write result to WFR-{screen}-v{N}.html using Write tool
  4. Record in CHANGELOG_ENTRIES: screen, finding_id, applied_edit, source_file, output_file
```

**Key nuance:** On subsequent iterations (run 2, 3...), the "source" to modify is the PREVIOUS iteration's versioned file (`WFR-{screen}-v1.html` → `WFR-{screen}-v2.html`), not the original. The original is permanently frozen.

### Pattern 3: Change Log Format

**What:** `ITR-changelog-v{N}.md` documents each run's applied and deferred changes. The critique skill already defines the output data; this skill just needs a consistent format.

**When to use:** Every iteration run produces exactly one changelog file.

**Recommended structure:**

```markdown
---
Generated: "{ISO date}"
Skill: /pde:iterate (ITR)
Version: v{N}
Critique Source: CRT-critique-v{M}.md
Status: complete
Screens Modified: {N}
Findings Applied: {count}
Findings Deferred: {count}
---

# Iteration Changelog v{N}

## Applied Changes

| Finding ID | Severity | Screen | Change Made | Effort | Source Finding |
|------------|----------|--------|-------------|--------|----------------|
| {id} | {critical/major/...} | {screen}.html | {specific change description} | {quick-fix/...} | CRT-critique-v{M}.md#{finding_summary} |

## Deferred Findings

| Finding ID | Severity | Screen | Reason Deferred | Source Finding |
|------------|----------|--------|-----------------|----------------|
| {id} | {severity} | {screen}.html | {reason: conflicts with What Works / requires redesign / out of scope} | CRT-critique-v{M}.md#{finding_summary} |

## What Works (Preserved)

Items from the critique's "What Works" table that were intentionally NOT changed:

| Element | Preserved | Note |
|---------|-----------|------|
| {element} | Yes | {what was preserved and why} |
```

### Pattern 4: Convergence Checklist (run 3+)

**What:** After 3 or more iteration cycles, surface a decision-support checklist rather than just a change log. This is the "ready for handoff" gate (ITR-02 success criterion 3).

**When to use:** Whenever iteration depth (count of existing `ITR-changelog-v*.md` files, counting the one just produced) >= 3.

**Recommended checklist structure:**

```markdown
## Convergence Assessment

| Category | Status | Detail |
|----------|--------|--------|
| Critical findings remaining | PASS / FAIL | {count} open critical findings |
| Major findings remaining | PASS / WARN | {count} open major findings |
| Iteration depth | {N} cycles | First run was v1 |
| What Works preserved | PASS | {count} items confirmed unchanged |
| Deferred pattern | {note} | e.g., "3 deferred findings all require major redesign" |

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

### Anti-Patterns to Avoid

- **Overwriting originals:** `WFR-{screen}.html` must never be modified by iterate. Write tool only produces new `WFR-{screen}-v{N}.html` files.
- **Applying findings that conflict with What Works:** The What Works table is a read-only constraint. If a finding's Suggestion would change a What Works element, defer the finding and document the conflict in the deferred list.
- **Updating designCoverage without coverage-check first:** Same pattern as all prior skills — read-before-set is mandatory to avoid clobbering flags from other skills.
- **Marking findings resolved without writing the wireframe:** The critique checkboxes should only be updated after the versioned wireframe file has been confirmed written.
- **Halting on deferred findings:** Deferred findings are normal and expected. The skill should complete successfully and document deferrals in the changelog.
- **Applying all findings regardless of scope:** If a finding's effort is "significant" and its suggestion requires a structural redesign, defer it. Iterate is for targeted corrections, not architectural changes.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Manifest registration | Custom JSON writer | `pde-tools.cjs design manifest-update ITR ...` | Same 7-call pattern used by every prior skill; tested in design.cjs self-test |
| Write locking | Custom lock file | `pde-tools.cjs design lock-acquire iterate` / `lock-release` | 60s TTL, auto-clear on stale lock, already in design.cjs |
| Coverage flag update | Direct JSON edit | `coverage-check` + `manifest-set-top-level designCoverage` | Read-before-set pattern prevents clobbering other skills' flags |
| Conflict resolution reasoning | Custom inference loop | Sequential Thinking MCP (`mcp__sequential-thinking__think`) | Provides structured reasoning chain; skill works without it (degrades gracefully) |
| Iteration depth counting | Custom state file | Glob for `ITR-changelog-v*.md` count | Self-evident from existing files; no additional state needed |
| Finding parsing | Regex on critique text | Read critique markdown, parse `## Action List for /pde:iterate` section | Structured checkbox format (`- [ ]` / `- [x]`) is machine-readable by design |

**Key insight:** The critique report is designed with `/pde:iterate` as its consumer. The Action List section uses a checkbox format, and the What Works table uses a stable column structure, both specifically so this skill can parse them without custom tooling.

---

## Common Pitfalls

### Pitfall 1: Version Number Collision

**What goes wrong:** Multiple `WFR-{screen}-v{N}.html` files exist from previous runs; the new run writes to the wrong version number.

**Why it happens:** The version N for wireframe output files is the iteration run number (counted from `ITR-changelog-v*.md`), not the critique version. If a developer ran iterate twice and then ran critique again, the counts could diverge.

**How to avoid:** In Step 2, glob for BOTH `ITR-changelog-v*.md` count (determines N for the new changelog) AND the latest existing `WFR-{screen}-v*.html` per screen (determines the source to build from). The new version is `max(existing WFR versions) + 1` per screen. The changelog version is `max(existing ITR changelog versions) + 1`.

**Warning signs:** `WFR-{screen}-v2.html` exists but `ITR-changelog-v2.md` does not (or vice versa) — the two counters have drifted.

### Pitfall 2: What Works Violation

**What goes wrong:** A finding's suggestion is applied to an element that the critique marked as "What Works — do not change in iteration."

**Why it happens:** Findings and What Works items can reference the same element at different levels of specificity. A finding might target `login.html > main > form > button.submit` while What Works says `login.html > main > form` is working correctly.

**How to avoid:** Before applying any finding, check whether the finding's Location is a descendant of any What Works element. If it is, classify the finding as "deferred (conflicts with What Works)" and document the specific conflict. Exact string match is insufficient — implement a prefix-match check on the CSS-selector-like Location path.

**Warning signs:** User re-runs critique after iteration and finds new findings that reverse previously working behavior.

### Pitfall 3: Critique Report Mutation Without Lock

**What goes wrong:** The iterate skill updates the critique report's checkboxes and Resolved Findings table but does not acquire the write lock first.

**Why it happens:** The critique report lives in `.planning/design/review/` — same location as other critique artifacts. Concurrent operations could corrupt the file.

**How to avoid:** In Step 5, acquire `lock-acquire iterate` BEFORE reading the critique report for mutation. Release in the same step after all writes complete. Follow the exact pattern from critique.md Step 5a/5c (retry 3 times, warn and continue if still locked).

**Warning signs:** Critique report has partial checkbox updates or truncated Resolved Findings table.

### Pitfall 4: Deferred Finding Accumulation Without Signal

**What goes wrong:** Multiple iterations run, each deferring the same findings. The user never gets a signal that certain issues are structurally unaddressable by iteration.

**Why it happens:** Without the convergence assessment, a user can iterate indefinitely without realizing that remaining findings require redesign rather than revision.

**How to avoid:** In Step 7's convergence checklist (run 3+), explicitly flag findings that have been deferred in 2+ consecutive iteration changelogs as "requires redesign — beyond iteration scope." This is the trigger for the "Redesign may be needed" handoff recommendation.

**Warning signs:** `ITR-changelog-v3.md` deferred section contains the same finding IDs as `ITR-changelog-v2.md` deferred section.

### Pitfall 5: Missing `hasIterate` Coverage Flag

**What goes wrong:** The designCoverage object in `design-manifest.json` does not have a `hasIterate` field, so downstream skills (handoff, build) cannot detect whether iteration has occurred.

**Why it happens:** The `design-manifest.json` template and coverage-check output only include: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasHandoff`, `hasHardwareSpec`. There is no `hasIterate` field defined yet.

**How to avoid:** In Step 7, the iterate skill must introduce `hasIterate` into the coverage object using `manifest-set-top-level`. The read-before-set pattern merges the new field into the existing coverage object. Because `coverage-check` returns what's currently in the manifest, and the manifest starts without `hasIterate`, the first iterate run will add it. All subsequent runs will find it already present (value: true from the previous run). This is the same pattern used when `hasCritique` was introduced by Phase 17.

**Warning signs:** `coverage-check` returns an object with no `hasIterate` key after iterate has run.

---

## Code Examples

Verified patterns from existing project workflows:

### Ensure-dirs (Step 1 — identical across all skills)

```bash
# Source: workflows/critique.md Step 1 / workflows/wireframe.md Step 1
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

### Version Gate for Change Logs (Step 2)

```bash
# Count existing ITR changelogs to determine iteration depth and new version number
# Pattern: same glob-and-count used by critique.md 2f for CRT-critique-v*.md

# Glob for: .planning/design/review/ITR-changelog-v*.md
# Sort descending by version, extract max N
# ITR_VERSION = max(N) + 1  (or 1 if none exist)
# ITERATION_DEPTH = ITR_VERSION  (depth of the run being produced)
```

### Discover Latest Critique Report (Step 2 — hard dependency)

```bash
# Pattern: same as how critique.md Step 2 discovers FLW-flows-v*.md
# Glob for: .planning/design/review/CRT-critique-v*.md
# Sort descending by version number
# If absent: HALT with structured error
# If present: read highest version → CRITIQUE_REPORT
```

### Source File Selection for Versioned Wireframes (Step 2)

```bash
# For each screen slug in AFFECTED_SCREENS:
#   Glob for: .planning/design/ux/wireframes/WFR-{screen}-v*.html
#   If any exist: SOURCE = highest version (e.g., WFR-login-v1.html)
#   If none exist: SOURCE = WFR-{screen}.html (original, read-only)
#   NEW_VERSION = max(existing v* version) + 1 (or 1 if none exist)
#   OUTPUT = WFR-{screen}-v{NEW_VERSION}.html
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

### Manifest Registration (Step 7 — 7-call pattern)

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

### Coverage Flag (Step 7 — read-before-set pattern)

```bash
# Source: workflows/critique.md Step 7c — mandatory read-before-set
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON. Extract ALL existing fields. Merge hasIterate: true.
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| iterate as planned stub (commands/iterate.md says "Planned -- available in PDE v2") | Full workflow implementation following 7-step pattern | Phase 18 | Replace the stub content; do not reference "v2" in any new file |
| No `hasIterate` in coverage flags | Add `hasIterate` via read-before-set in Step 7 | Phase 18 | Phase 19 (handoff) and Phase 20 (build) can now detect whether iteration occurred |
| Critique checkboxes as static output | Checkboxes mutated by iterate (`[ ]` → `[x]`) | Phase 18 | Critique report becomes a living document across the pipeline |

**Deprecated/outdated:**
- `commands/iterate.md` stub paragraph: "Status: Planned -- available in PDE v2 (design pipeline)." — The plan must replace this entire `<process>` section with `@workflows/iterate.md` delegation, matching the exact pattern of `commands/critique.md`.

---

## Open Questions

1. **`hasIterate` field not in current manifest schema**
   - What we know: `design-manifest.json` template and `coverage-check` only track: hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasHandoff, hasHardwareSpec. There is no `hasIterate`.
   - What's unclear: Whether Phase 19 (handoff) or Phase 20 (build) will need to read `hasIterate` to condition their behavior.
   - Recommendation: Introduce `hasIterate` via the read-before-set pattern in Step 7 regardless — adding a new field to designCoverage is additive and safe. Phase 19/20 can check for it if needed. The field will simply be absent (falsy) until the first iterate run.

2. **Critique report mutation ownership**
   - What we know: The critique report (`CRT-critique-v{N}.md`) is written by `/pde:critique`. The iterate skill needs to mark findings resolved and append to "Resolved Findings (Cumulative)."
   - What's unclear: Whether Edit tool can reliably patch the checkbox syntax (`- [ ]` → `- [x]`) across varying markdown renderers.
   - Recommendation: Use the Edit tool with exact string matching on the full checkbox line (e.g., `- [ ] Add aria-label to submit button — critical/quick-fix`) rather than regex substitution. This is deterministic and safe.

3. **Wireframe HTML edit scope**
   - What we know: Findings' Suggestion field contains concrete changes (e.g., "Change font-size from var(--font-size-xs) to var(--font-size-sm)"). These are HTML/CSS attribute edits.
   - What's unclear: When a finding requires adding a new HTML element (e.g., "Add skip-to-main-content link as first child of body"), whether Edit tool or Write tool is more appropriate.
   - Recommendation: Use Edit tool for attribute/value changes; use Read + Write for structural additions (read full HTML, add element, write complete versioned file). Document both paths in the workflow.

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
| ITR-01 | Original WFR-{screen}.html is never modified | manual-only | manual — verify file mtime unchanged after iterate run | N/A |
| ITR-01 | Change log produced mapping findings to applied changes | manual-only | manual — verify ITR-changelog-v{N}.md contains Applied Changes and Deferred Findings sections | N/A |
| ITR-02 | Convergence checklist appears on run 3+ | manual-only | manual — requires 3 iteration cycles to trigger | N/A |
| ITR-02 | Handoff recommendation reflects remaining open findings | manual-only | manual — requires reading both critique and changelog outputs | N/A |

**Rationale for manual-only classification:** All ITR requirements involve Claude inference (reading critique findings, applying HTML edits, assessing convergence). These cannot be unit-tested in the same way as pure data transformation functions in design.cjs. The validation pattern follows the precedent set in Phase 15.1 for `/pde:system` integration: "requires Claude inference, not automatable as unit test."

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test` (infrastructure regression check)
- **Per wave merge:** `node bin/lib/design.cjs --self-test`
- **Phase gate:** `node bin/lib/design.cjs --self-test` green + manual acceptance criteria verification

### Wave 0 Gaps

None — existing test infrastructure (`design.cjs --self-test`) covers the infrastructure layer. The iterate skill itself is a workflow file (markdown), not a code module, so no new test files are needed.

---

## Sources

### Primary (HIGH confidence)

- `workflows/critique.md` (full text) — Action List format, What Works table format, lock-acquire pattern, manifest registration 7-call pattern, coverage-check read-before-set, anti-patterns
- `workflows/wireframe.md` (first 80 lines) — canonical 7-step workflow structure, ensure-dirs pattern
- `bin/lib/design.cjs` (lines 220-320) — pde-tools.cjs available subcommands: ensure-dirs, manifest-read, manifest-update, manifest-set-top-level, artifact-path, tokens-to-css, coverage-check, lock-acquire, lock-release, lock-status
- `.planning/design/design-manifest.json` — live manifest schema: designCoverage fields (hasDesignSystem, hasFlows, hasWireframes, hasCritique, hasHandoff, hasHardwareSpec — no hasIterate yet)
- `commands/iterate.md` — current stub state to be replaced
- `references/skill-style-guide.md` — universal flags, output format conventions, error structure
- `.planning/REQUIREMENTS.md` — ITR-01 and ITR-02 requirement text
- `.planning/STATE.md` — project decisions relevant to Phase 18 (Phase 17 decision: What Works section is mandatory; Phase 16 decision: ANNOTATION comments for handoff)

### Secondary (MEDIUM confidence)

- `templates/critique-report.md` — output scaffold confirming checkbox format and Resolved Findings table structure
- `.planning/phases/17-design-critique-pde-critique/17-01-PLAN.md` — upstream interface confirmation: Action List format, What Works table, critique report sections produced for iterate consumption

### Tertiary (LOW confidence)

None — all claims in this research are grounded in directly read project files.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified by direct inspection of existing skill workflows and design.cjs source
- Architecture patterns: HIGH — 7-step pattern observed across wireframe.md, flows.md, critique.md; versioning logic derived from success criteria and existing patterns
- Pitfalls: HIGH — version collision, What Works violation, and lock patterns derived from existing anti-patterns sections in critique.md; hasIterate gap derived from direct manifest inspection
- Convergence logic: HIGH — ITR-02 success criteria are explicit; threshold values (3+ cycles, 0 critical = handoff-ready) are directly specified in phase description

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable project — no external dependencies that could drift)
