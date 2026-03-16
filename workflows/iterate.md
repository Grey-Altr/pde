<purpose>
Critique-driven iteration of wireframes. Reads the latest CRT-critique-v{N}.md, applies open Action List findings as targeted edits to wireframe HTML (producing versioned WFR-{screen}-v{N}.html copies — originals NEVER overwritten), produces ITR-changelog-v{N}.md mapping each finding to applied or deferred status, updates critique report checkboxes and Resolved Findings table, updates ux/DESIGN-STATE.md Open Critique Items statuses, and (on run 3+) surfaces a convergence checklist with handoff recommendation. What Works items from the critique report are a read-only constraint — findings conflicting with What Works elements are deferred with documented reason.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Runs Steps 1-3 only, shows planned iteration scope (open findings, affected screens, version numbers). No files written. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking). Apply findings without conflict reasoning. |
| `--verbose` | Boolean | Show detailed progress, timing per step, finding-level application details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP only. |
| `--force` | Boolean | Skip confirmation when changelog already exists for this iteration version — proceed silently. |
</flags>

<process>

## /pde:iterate — Critique-Driven Iteration Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--force`.

---

### Step 1/7: Initialize design directories

```bash
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse the JSON result. If the result contains an error field or the command exits non-zero:

```
Error: Failed to initialize design directories.
  The design directory structure could not be created.
  Check that .planning/ exists and is writable, then re-run /pde:iterate.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and discover artifacts

This step has six sub-sections executed in order.

#### 2a. Find latest CRT-critique-v*.md (hard dependency)

Use the Glob tool to find all files matching `.planning/design/review/CRT-critique-v*.md`. Sort all matches descending by version number (parse the `v{N}` suffix — extract the integer after "v" in the filename). Read the highest version using the Read tool.

If no critique report is found: HALT with this exact error message:

```
Error: No critique report found.
  Run /pde:critique first to generate findings, then retry /pde:iterate.
```

If found: store full file content as CRITIQUE_REPORT. Store the version integer as CRITIQUE_VERSION (e.g., if `CRT-critique-v2.md` is found, CRITIQUE_VERSION = 2).

#### 2b. Parse Action List checkboxes

Find the `## Action List for /pde:iterate` section in CRITIQUE_REPORT.

Parse each line in the section:
- Lines matching `- [ ] {summary} -- {severity}/{effort}`: classify as OPEN findings
- Lines matching `- [x] {summary} -- {severity}/{effort}`: classify as already resolved — SKIP
- Blank lines and non-matching lines: SKIP

Store all open findings as OPEN_FINDINGS array. Each entry retains the full summary string, severity, and effort.

If OPEN_FINDINGS is empty (all findings already resolved or no findings in list):

```
All findings already resolved. Nothing to iterate.
```

Halt gracefully — this is not an error. Exit with success.

For each open finding, also parse its Location field by looking up the corresponding entry in the `## Detailed Findings by Perspective Group` section of the critique report. Match by finding summary text to find the full finding entry with Location, Severity, Effort, Issue, Suggestion, Reference, Perspective, Weight.

#### 2c. Parse What Works table

Find the `## What Works` section in CRITIQUE_REPORT. This section appears in the live generated CRT file between `## Summary Scorecard` and `## Findings by Priority`. Do NOT look for it in `templates/critique-report.md` — the template does not include this section.

Parse each table row in the section (skip the header row):
```
| {Element} | {What's Working} | {Perspective} | {Keep It} |
```

Store as WHAT_WORKS array with `element` and `working` fields per entry.

If the `## What Works` section is absent:

```
Warning: No What Works section found in critique report. Proceeding without preservation constraints.
```

Continue with an empty WHAT_WORKS array.

#### 2d. Match findings to wireframes

For each open finding in OPEN_FINDINGS:
- Extract the screen slug from the finding's Location field. The screen slug is the first segment before ` > ` (e.g., `login.html > main > form` → screen slug is `login` — strip the `.html` extension if present).
- Use the Glob tool to check for `.planning/design/ux/wireframes/WFR-{screen-slug}*.html` files (both versioned and original). Also check for `.planning/design/ux/wireframes/WFR-{screen-slug}.html` directly.

If no matching wireframe file is found for a finding's screen slug:

```
Error: Finding references screen '{screen-slug}' but no wireframe found at .planning/design/ux/wireframes/WFR-{screen-slug}.html.
  Ensure wireframes exist before iterating.
  Run /pde:wireframe to generate wireframes, then retry /pde:iterate.
```

Halt.

Collect the unique set of screen slugs from all open findings. Store as AFFECTED_SCREENS.

#### 2e. Discover iteration depth

Use the Glob tool to find all files matching `.planning/design/review/ITR-changelog-v*.md`. Parse the `v{N}` suffix from each filename (extract the integer after "v"). Find the maximum N among all matches.

- If no changelog files exist: set ITR_VERSION = 1
- If changelogs exist: set ITR_VERSION = max(N) + 1

Set ITERATION_DEPTH = ITR_VERSION (the run being produced, 1-based counter).

#### 2f. Per-screen version gate

For each screen slug in AFFECTED_SCREENS:

1. Use the Glob tool to find all files matching `.planning/design/ux/wireframes/WFR-{screen}-v*.html` (where `{screen}` is the slug)
2. If any versioned files exist:
   - SOURCE_PATH = path of the highest version file (e.g., `WFR-login-v1.html` if that's the max)
   - NEW_VERSION = max(existing v* suffix integer) + 1
3. If no versioned files exist:
   - SOURCE_PATH = `.planning/design/ux/wireframes/WFR-{screen}.html` (the original — read-only, never overwritten)
   - NEW_VERSION = 1
4. OUTPUT_PATH = `.planning/design/ux/wireframes/WFR-{screen}-v{NEW_VERSION}.html`

Store per-screen data: `{slug, source_path, output_path, new_version}` for all screens in AFFECTED_SCREENS.

Display: `Step 2/7: {count} open findings across {screen_count} screen(s). Iteration v{ITR_VERSION} will be produced.`

If `--dry-run` flag is active:

```
Dry run mode. No files will be written.

Planned output:
  Changelog: .planning/design/review/ITR-changelog-v{ITR_VERSION}.md
  Critique source: CRT-critique-v{CRITIQUE_VERSION}.md
  Iteration depth: {ITERATION_DEPTH}

Open findings ({count}): {comma-separated summary list}

Affected screens ({screen_count}):
  {screen-slug}: WFR-{screen}-v{NEW_VERSION}.html (source: {source_path})
```

HALT. Do not proceed to Step 3.

---

### Step 3/7: Probe MCP availability

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --no-sequential-thinking in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe
  continue to Step 4
```

#### 3a. Sequential Thinking MCP probe (if not skipped by flags above)

Attempt to call `mcp__sequential-thinking__think` with a simple test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (continuing without)`

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {yes|no}.`

---

### Step 4/7: Apply findings to wireframes

For each screen slug in AFFECTED_SCREENS:

1. Use the Read tool to read the SOURCE_PATH file (from Step 2f) into WIREFRAME_HTML.

2. Sort open findings for this screen by severity order: critical first, then major, minor, nit.

3. For each open finding targeting this screen:

   **a. What Works check:**

   Compare the finding's Location path against each element in WHAT_WORKS. Check for prefix match: if the finding's Location starts with (or exactly matches) any WHAT_WORKS element path, classify the finding as DEFERRED with reason `"conflicts with What Works item: {element}"`. Do NOT apply the change.

   Example: if finding Location is `login.html > main > form > button.submit` and a What Works entry has Element `login.html > main > form`, this is a prefix match — defer.

   **b. Conflict check (if SEQUENTIAL_THINKING_AVAILABLE):**

   If two or more open findings for this screen suggest contradictory changes to the same element (same Location prefix match):
   - Use `mcp__sequential-thinking__think` with prompt: `"Two critique findings conflict on the same element. Finding A: {summary_a}. Finding B: {summary_b}. Which should take priority given the screen's role in the user journey? Recommend which to apply and which to defer, with reasoning."`
   - Apply the recommended finding; defer the other with reason `"deferred due to conflict with finding {applied_finding_id} — Sequential Thinking recommendation"`

   If SEQUENTIAL_THINKING_AVAILABLE is false and a conflict is detected: apply the higher-severity finding; defer the lower-severity one with reason `"deferred due to conflict with higher-severity finding"`

   **c. Effort gate:**

   If the finding's effort is `significant` AND the Suggestion describes structural redesign (e.g., "restructure layout", "replace navigation pattern", "redesign component architecture"): classify as DEFERRED with reason `"requires structural redesign beyond iteration scope"`. Do not apply.

   **d. Apply change:**

   Based on the finding's Suggestion field, choose the edit strategy:

   - **Attribute/value change** (e.g., "change `font-size` from `var(--font-size-xs)` to `var(--font-size-sm)`", "add `aria-label` attribute", "change `color` value"): Use the Edit tool with exact string match on the target element line in WIREFRAME_HTML. Modify WIREFRAME_HTML in-place.

   - **Structural addition** (e.g., "add skip-to-main-content link as first child of `<body>`", "insert error message `<div>` after input field", "add `<nav>` landmark wrapper"): Use the Read tool to read the full wireframe HTML, then assemble a modified version with the structural change applied. Mark this screen for full Write (not Edit) in Step 5b.

   After applying: classify as APPLIED with a description of the specific change made.

   **e. Accumulate changelog entries:**

   For each finding processed (applied or deferred): add an entry to CHANGELOG_ENTRIES:
   ```
   {
     finding_id: "F{line_number_in_action_list}",
     severity: {severity},
     effort: {effort},
     screen: "{screen-slug}.html",
     status: "applied" | "deferred",
     change_made: "{description of change if applied}",
     reason_deferred: "{reason if deferred}",
     source: "CRT-critique-v{CRITIQUE_VERSION}.md"
   }
   ```

Display per-screen progress: `Step 4/7: Applying findings to {screen_slug} ({N} of {total_screens})... {applied_count} applied, {deferred_count} deferred.`

---

### Step 5/7: Write outputs with lock

This step has five sub-sections executed in order.

#### 5a. Acquire write-lock

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire iterate)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 5 seconds, retry up to 3 times. If still false after 3 retries: warn and continue (do not halt):

```
Warning: Could not acquire write lock. Proceeding without lock.
  If concurrent writes occur, re-run /pde:iterate to repair state.
```

#### 5b. Write versioned wireframes

For each screen slug in AFFECTED_SCREENS where at least one finding was APPLIED:

- Use the Write tool to write the modified HTML to OUTPUT_PATH (`.planning/design/ux/wireframes/WFR-{screen}-v{NEW_VERSION}.html`)
- Write the full content of WIREFRAME_HTML (with all applied changes)
- Do NOT write files for screens with zero applied findings

**CRITICAL: Never write to the original `WFR-{screen}.html` path. Only write to versioned output paths.**

#### 5c. Write change log

Use the Write tool to write `.planning/design/review/ITR-changelog-v{ITR_VERSION}.md` with this exact structure:

```markdown
---
Generated: "{YYYY-MM-DD}"
Skill: /pde:iterate (ITR)
Version: v{ITR_VERSION}
Critique Source: CRT-critique-v{CRITIQUE_VERSION}.md
Status: complete
Screens Modified: {count of screens with applied findings}
Findings Applied: {total applied count across all screens}
Findings Deferred: {total deferred count across all screens}
---

# Iteration Changelog v{ITR_VERSION}

## Applied Changes

| Finding ID | Severity | Screen | Change Made | Effort | Source Finding |
|------------|----------|--------|-------------|--------|----------------|
| {id, e.g., F01} | {severity} | {screen}.html | {specific change description} | {effort} | CRT-critique-v{CRITIQUE_VERSION}.md |

## Deferred Findings

| Finding ID | Severity | Screen | Reason Deferred | Source Finding |
|------------|----------|--------|-----------------|----------------|
| {id} | {severity} | {screen}.html | {reason: conflicts with What Works / requires structural redesign / deferred due to conflict with ...} | CRT-critique-v{CRITIQUE_VERSION}.md |

## What Works (Preserved)

Items from the critique's "What Works" table that were intentionally NOT changed:

| Element | Preserved | Note |
|---------|-----------|------|
| {element from What Works} | Yes | {what was preserved and why} |
```

If WHAT_WORKS is empty: write the table header only with a row `| (none) | N/A | No What Works constraints applied |`

#### 5d. Update critique report checkboxes

Use the Edit tool on `.planning/design/review/CRT-critique-v{CRITIQUE_VERSION}.md`:

For each APPLIED finding:
- Find the exact line: `- [ ] {finding_summary} -- {severity}/{effort}`
- Replace with: `- [x] {finding_summary} -- {severity}/{effort}`
- Use exact string match. Do NOT use regex substitution.

For the `## Resolved Findings (Cumulative)` section:
- If the section currently shows `*No resolved findings yet.*` or `*Findings from previous critique runs that have been addressed in subsequent iterations.*` with an empty table: replace the placeholder text and populate the table header plus rows for each APPLIED finding.
- If the section already has a populated table: append rows for each APPLIED finding.
- Row format: `| {n} | {finding_summary} | v{ITR_VERSION} | yes |`

#### 5e. Release write-lock

**ALWAYS release, even if an error occurred:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release iterate
```

Display: `Step 5/7: {screen_count} wireframe(s) written, changelog v{ITR_VERSION} written, critique report updated.`

---

### Step 6/7: Update ux/DESIGN-STATE.md

Use the Glob tool to check for `.planning/design/ux/DESIGN-STATE.md`.

**If it does NOT exist:** Create it with the standard ux domain structure:

```markdown
# UX Domain Design State

Updated: {YYYY-MM-DD}
Domain: ux

## Artifact Index

| Code | Name | Skill | Status | Version | Enhanced By | Notes | Updated |
|------|------|-------|--------|---------|-------------|-------|---------|
| ITR | Design Iteration | /pde:iterate | complete | v{ITR_VERSION} | {MCPs used or none} | | {YYYY-MM-DD} |

## Open Critique Items

| Item | Source | Severity | Status |
|------|--------|----------|--------|
```

**If it already exists:** Use the Read tool to read it, then use the Edit tool to apply these updates:

1. **Artifact Index:** Add or update the ITR row:
   ```
   | ITR | Design Iteration | /pde:iterate | complete | v{ITR_VERSION} | {MCPs used: "Sequential Thinking MCP" or "none"} | | {YYYY-MM-DD} |
   ```
   If a row for ITR already exists, replace it. If no ITR row exists, append it to the table.

2. **Open Critique Items table:** For each APPLIED finding, find the matching row in the table. The table uses `Item, Source, Severity, Status` column names (from design-state-domain.md schema — NOT "ID"). Match by looking for the finding summary text in the Item column or the critique source in the Source column. Update the Status value from `open` to `resolved`.

   If no matching row exists for an applied finding (i.e., the critique did not add the item to this table — only Critical and Major findings are in this table): skip the update for that finding.

Display: `Step 6/7: {applied_count} critique items resolved in ux/DESIGN-STATE.md.`

---

### Step 7/7: Update root DESIGN-STATE + manifest + coverage flag

This step has five sub-sections.

#### 7a. Update root DESIGN-STATE.md

Use the Read tool to read `.planning/design/DESIGN-STATE.md`. Then use the Edit tool to apply:

1. **Pipeline Progress table:** Mark Iterate as complete with the current date. Find the row for Iterate (or "Iteration") in the Pipeline Progress table and update the status to `complete` and date to today.

2. **Decision Log table:** Append this row:
   ```
   | ITR | iteration v{ITR_VERSION} applied, {applied_count} applied, {deferred_count} deferred | {YYYY-MM-DD} |
   ```

3. **Iteration History table:** Append this row:
   ```
   | ITR-changelog-v{ITR_VERSION}.md | v{ITR_VERSION} | Created by /pde:iterate | {YYYY-MM-DD} |
   ```

   If the root DESIGN-STATE.md does not have an Iteration History table, add one after the Decision Log section:
   ```markdown
   ## Iteration History

   | File | Version | Created By | Date |
   |------|---------|-----------|------|
   | ITR-changelog-v{ITR_VERSION}.md | v{ITR_VERSION} | Created by /pde:iterate | {YYYY-MM-DD} |
   ```

#### 7b. Register ITR artifact in manifest (7 calls)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR code ITR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR name "Design Iteration"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR type iteration
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR domain review
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR path ".planning/design/review/ITR-changelog-v${ITR_VERSION}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR status complete
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update ITR version ${ITR_VERSION}
```

#### 7c. Set coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output from coverage-check. Extract ALL six current flag values: `hasDesignSystem`, `hasFlows`, `hasWireframes`, `hasCritique`, `hasHandoff`, `hasHardwareSpec`. Merge `hasIterate: true` as the seventh field while preserving all other values. Then write the full merged seven-field object:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasFlows":{current},"hasWireframes":{current},"hasCritique":{current},"hasIterate":true,"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

Replace each `{current}` with the actual value read from coverage-check output (true or false).

#### 7d. Convergence assessment (run 3+ only)

If ITERATION_DEPTH >= 3:

Count remaining open findings: start with total OPEN_FINDINGS count, subtract the count of findings classified as APPLIED in this run. The result is REMAINING_OPEN.

Count remaining open critical findings: filter REMAINING_OPEN by severity = critical.
Count remaining open major findings: filter REMAINING_OPEN by severity = major.

**Repeat-deferral detection:** Use the Glob tool to find `.planning/design/review/ITR-changelog-v{ITR_VERSION - 1}.md`. If it exists, use the Read tool to read it. Extract the Finding IDs from the `## Deferred Findings` table in the previous changelog. Compare with Finding IDs in the current changelog's Deferred Findings. Count findings present in both — these are REPEAT_DEFERRALS.

Output the convergence checklist:

```markdown
## Convergence Assessment

| Category | Status | Detail |
|----------|--------|--------|
| Critical findings remaining | {PASS if 0 / FAIL if 1+} | {count} open critical findings |
| Major findings remaining | {PASS if 0 / WARN if 1-2 / FAIL if 3+} | {count} open major findings |
| Iteration depth | {ITERATION_DEPTH} cycles | First run was v1 |
| What Works preserved | PASS | {WHAT_WORKS count} items confirmed unchanged |
| Repeat deferrals | {note} | {e.g., "3 deferred findings deferred across 2+ consecutive runs — redesign scope" or "none detected"} |

### Handoff Recommendation

{Select and display one of the following:}
```

Threshold logic:
- **PASS (handoff-ready):** 0 critical open, 0 major open → display: `"Ready for handoff. No critical or major findings remain open. Run /pde:handoff."`
- **WARN (further iteration):** 0 critical open, 1-2 major open → display: `"Further iteration recommended. {N} major finding(s) remain: {brief list}"`
- **FAIL (redesign needed — critical open):** 1+ critical open → display: `"Redesign may be needed. {N} critical finding(s) remain: {brief list}"`
- **FAIL (redesign needed — major backlog):** 3+ major open → display: `"Redesign may be needed. {N} deferred findings require structural changes beyond iteration scope."`

#### 7e. Output summary table

```
## /pde:iterate Summary

| Property | Value |
|----------|-------|
| Changelog | .planning/design/review/ITR-changelog-v{ITR_VERSION}.md |
| Critique Source | CRT-critique-v{CRITIQUE_VERSION}.md |
| Screens Modified | {count of screens with applied findings} |
| Findings Applied | {total applied count} |
| Findings Deferred | {total deferred count} |
| Iteration Depth | {ITR_VERSION} |
| Convergence | {shown only if ITERATION_DEPTH >= 3: PASS / WARN / FAIL} |
| Enhanced By | {MCP list or "none"} |

Next steps:
  - Review changelog: open .planning/design/review/ITR-changelog-v{ITR_VERSION}.md
  - Re-run /pde:critique to verify improvements
  {If convergence PASS: "  - Run /pde:handoff to proceed to implementation handoff"}
  {If convergence WARN or FAIL: "  - Run /pde:iterate again to address remaining findings"}
  {If ITERATION_DEPTH < 3: "  - Run /pde:iterate again to continue refining"}
```

Display: `Step 7/7: Manifest updated. Coverage: hasIterate = true. Done.`

---

## Anti-Patterns

NEVER do any of the following:

- **Overwrite original wireframes:** `WFR-{screen}.html` must NEVER be modified by iterate. The Write tool only produces new `WFR-{screen}-v{N}.html` files. The original is permanently frozen as the baseline.

- **Apply findings that conflict with What Works:** The `## What Works` table in the live CRT file is a read-only constraint. If a finding's Suggestion would change a What Works element (prefix-match on Location), defer the finding and document the specific conflict.

- **Update designCoverage without reading coverage-check first:** `manifest-set-top-level` replaces the ENTIRE designCoverage object. Skipping coverage-check before calling it resets all flags set by other skills (hasWireframes, hasCritique, etc.) to their default values.

- **Look for What Works in templates/critique-report.md:** The template does NOT include the `## What Works` section. The section is inserted by `workflows/critique.md` at runtime into the live CRT file between `## Summary Scorecard` and `## Findings by Priority`. Always parse from the live file.

- **Mark findings resolved without writing the wireframe first:** Step 5d (checkbox updates) must happen AFTER Step 5b (wireframe writes) confirms the file was written. Do not mark a finding resolved if its screen had no applied changes.

- **Halt on deferred findings:** Deferred findings are expected and normal. The skill completes successfully and documents all deferrals in the changelog. Only halt on hard errors (no critique report, missing wireframe for a referenced screen).

- **Mismatch DESIGN-STATE column names:** The ux/DESIGN-STATE.md Open Critique Items table uses `Item, Source, Severity, Status` as column names (from design-state-domain.md template). Do NOT use `ID` as a column name — match the live schema exactly.

- **Apply all findings regardless of effort:** If a finding's effort is `significant` AND its suggestion requires structural redesign beyond targeted edits, defer it. /pde:iterate is for surgical corrections and targeted fixes, not architectural changes.

- **Skip lock-release in Step 5e:** Always release the write lock via `lock-release iterate` even if an error occurred during Steps 5b-5d. Failure to release leaves the design system locked for other skills.

- **Assume wireframe version and changelog version are synchronized:** Wireframe version counters (per-screen `WFR-{screen}-v{N}`) and changelog version counters (`ITR-changelog-v{N}`) are independent. Glob for both separately in Step 2e and 2f. Never assume they have the same N value.

- **Write wireframe files for screens with zero applied findings:** Only write a versioned wireframe copy for screens where at least one finding was APPLIED. Writing an unchanged copy creates a spurious version increment with no real changes.

</process>

<output>
Files produced by /pde:iterate:

- `.planning/design/ux/wireframes/WFR-{screen}-v{N}.html` — versioned wireframe copies with findings applied (one per modified screen; N is the next available version integer per screen)
- `.planning/design/review/ITR-changelog-v{N}.md` — structured change log with Applied Changes, Deferred Findings, and What Works Preserved sections (N is the next available changelog version integer)
- `.planning/design/review/CRT-critique-v{N}.md` — updated: applied findings marked `[x]` in Action List, Resolved Findings table populated with applied finding rows
- `.planning/design/ux/DESIGN-STATE.md` — ux domain state updated: ITR artifact row added to Artifact Index, resolved items updated to "resolved" in Open Critique Items table
- `.planning/design/DESIGN-STATE.md` — root state updated: Pipeline Progress marks Iterate complete, Decision Log and Iteration History rows appended
- `.planning/design/design-manifest.json` — manifest updated with ITR artifact entry and `hasIterate: true` in designCoverage (seventh field, introduced by this skill)
</output>
