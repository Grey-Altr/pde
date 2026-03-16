<purpose>
Score feature opportunities using the RICE framework (Reach, Impact, Confidence, Effort) with PDE design extensions (UX Differentiation, Accessibility Impact, Design System Leverage). Reads competitive artifact gaps as candidate input when available. Produces OPP-opportunity-v{N}.md in .planning/design/strategy/. Consumed by /pde:ideate (Phase 27) for concept scoring.
</purpose>

<skill_code>OPP</skill_code>

<skill_domain>strategy</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if missing):**
- `.planning/PROJECT.md` — product description, target users, core value, and market context

**Soft dependencies (enrich analysis):**
- `.planning/design/strategy/CMP-competitive-v*.md` — candidate pre-population from competitive gap analysis
- `.planning/design/DESIGN-STATE.md` — existing artifact context and version numbers

**Routing logic:**

```
IF PROJECT.md missing:
  HALT with error (hard requirement)

IF CMP competitive artifact found:
  Load most recent version (highest version number)
  Parse ## Opportunity Highlights > ### Top Opportunities numbered list
  For each item extract: bold name (**[Gap Name]**), Source: sub-field,
    Estimated reach: sub-field, Competitive advantage: sub-field
  Pre-populate candidates table
  Log: "  -> Competitive artifact found: {N} opportunity candidates loaded"
ELSE:
  Log: "  -> No competitive artifact — user will provide candidates interactively"

IF DESIGN-STATE found:
  Read to check existing OPP artifacts and determine version N
  Log: "  -> DESIGN-STATE read: checking for existing OPP artifacts"
ELSE:
  Log: "  -> No DESIGN-STATE found — will create after scoring"
```

</context_routing>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/strategy-frameworks.md
</required_reading>

<flags>

## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, candidate count, scope outline, estimated token usage. |
| `--quick` | Boolean | Skip sensitivity analysis for faster execution. |
| `--verbose` | Boolean | Show detailed progress, MCP probe results, timing per step, computation details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Overwrite existing OPP artifact without prompting. Auto-increments to next version. |

</flags>

<process>

## /pde:opportunity — RICE Opportunity Scoring Pipeline

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
  Check that .planning/ exists and is writable, then re-run /pde:opportunity.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and discover candidates

**Read PROJECT.md (hard requirement):**

Use the Read tool to load `.planning/PROJECT.md`.

If PROJECT.md does not exist, display the following error and HALT immediately:

```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:opportunity requires a project description to score opportunities.
  Run /pde:new-project first to initialize your project, then re-run /pde:opportunity.
```

**Discover competitive artifact and pre-populate candidates:**

Use the Glob tool to find all `.planning/design/strategy/CMP-competitive-v*.md` files. Sort descending by version number and load the highest version using the Read tool.

If a competitive artifact is found:

1. Parse the `## Opportunity Highlights` section within `### Top Opportunities`.
2. For each numbered list item, extract:
   - Bold name: `**[Gap Name]**`
   - `Source:` sub-field value
   - `Estimated reach:` sub-field value
   - `Competitive advantage:` sub-field value
3. Pre-populate a candidates table from these entries.
4. Present to user:
   ```
   Found {N} opportunities from /pde:competitive gap analysis. Review and confirm before scoring (add/remove/modify as needed):

   | # | Candidate | Source | Description |
   |---|-----------|--------|-------------|
   | 1 | {name} | {source} | {estimated reach / competitive advantage} |
   ...

   Add candidates? Remove any? Confirm to proceed with scoring.
   ```

If no competitive artifact is found, start with an empty list and ask user:

```
No competitive artifact found. Please provide initial opportunity candidates.
List each candidate (press Enter between items, empty line when done):
```

**Check for existing OPP artifact and determine version N:**

Use the Glob tool to check if `.planning/design/strategy/OPP-opportunity-v*.md` already exists.

- If **no OPP artifact exists**: proceed with version N = 1.
- If **OPP artifact exists AND `--force` flag NOT present**: prompt the user:
  ```
  An opportunity evaluation already exists (OPP-opportunity-v1.md). Generate a new version?
  This will create OPP-opportunity-v2.md without modifying the existing v1.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing evaluation preserved at .planning/design/strategy/OPP-opportunity-v1.md` and halt.
  If user answers "yes": determine N = max existing version + 1.
- If **OPP artifact exists AND `--force` flag present**: auto-increment. Scan for all `OPP-opportunity-v*.md` files, find the maximum version number, set N = max + 1. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

**If `--dry-run` flag is active:** Display what WOULD be done and HALT:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/strategy/OPP-opportunity-v{N}.md
  File: .planning/design/strategy/DESIGN-STATE.md (updated or created)

Candidates: {N from competitive artifact or "interactive input required"}
Sensitivity analysis: {included|skipped (--quick mode)}

Prerequisites:
  PROJECT.md: found
  CMP artifact: {found v{N} with {M} candidates|not found}

Estimated token usage: ~{estimate}
MCP enhancements planned: Sequential Thinking (scoring calibration)
```

Display: `Step 2/7: Prerequisites satisfied. PROJECT.md loaded. Candidates: {N}. Version: v{N}.`

---

### Step 3/7: Probe MCP availability

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  continue to Step 4

IF --no-sequential-thinking in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe
```

**Probe Sequential Thinking MCP:**

If not disabled via flags, attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available (enhanced scoring calibration enabled)`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (standard scoring mode)`

Note: WebSearch and mcp-compass are NOT used for opportunity scoring. Only Sequential Thinking is probed.

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {available|unavailable}.`

---

### Step 4/7: Interactive RICE scoring with design extensions

For each confirmed candidate, collect the following 7 dimensions interactively:

1. **Reach:** "Reach: How many users affected in one quarter?" → Accept integer (e.g., 1000)
2. **Impact:** "Impact: How much does this move the needle per user? [3=Massive / 2=High / 1=Medium / 0.5=Low / 0.25=Minimal]" → Accept 3, 2, 1, 0.5, 0.25
3. **Confidence:** "Confidence: How sure are you about these estimates? [1.0=High (data) / 0.8=Medium (some data) / 0.5=Low (gut feel)]" → Accept 1.0, 0.8, 0.5
4. **Effort:** "Effort: T-shirt size estimate? [XS=0.5mo / S=1mo / M=2mo / L=4mo / XL=8mo]" → Accept label (XS/S/M/L/XL), map to numeric months
5. **UX Differentiation:** "UX Differentiation: Design advantage over competitors? [3=Breakthrough / 2=Strong / 1=Moderate / 0=None]" → Accept 0-3
6. **Accessibility Impact:** "Accessibility Impact: [3=Critical barrier removed / 2=Significant / 1=Moderate / 0=None]" → Accept 0-3
7. **Design System Leverage:** "Design System Leverage: [3=Creates 5+ reusable components / 2=Moderate / 1=Low / 0=None]" → Accept 0-3

**Effort T-shirt to numeric mapping:**

| T-Shirt | Person-Months |
|---------|---------------|
| XS | 0.5 |
| S | 1 |
| M | 2 |
| L | 4 |
| XL | 8 |

**After each candidate: compute immediately and show preview:**

```
RICE_base = (Reach * Impact * Confidence) / Effort
Design_bonus = (UX_diff * 0.5) + (A11y_impact * 0.3) + (DS_leverage * 0.2)
Final_score = RICE_base * (1 + Design_bonus / 10)

{candidate_name}:
  RICE_base = ({Reach} * {Impact} * {Confidence}) / {Effort} = {RICE_base}
  Design_bonus = ({UX} * 0.5) + ({A11y} * 0.3) + ({DS} * 0.2) = {Design_bonus}
  Final_score = {RICE_base} * (1 + {Design_bonus} / 10) = {Final_score}
```

If Sequential Thinking MCP is available, use `mcp__sequential-thinking__think` during scoring to reason about calibration consistency across candidates. Tag: `[Enhanced by Sequential Thinking MCP -- RICE scoring calibration]`

**After all candidates: show ranked table sorted by Final_score descending:**

```
## Ranked Candidates (sorted by Final Score)

| Rank | Candidate | Reach | Impact | Conf | Effort | UX Diff | A11y | DS Lev | RICE Base | Design Bonus | Final Score |
|------|-----------|-------|--------|------|--------|---------|------|--------|-----------|-------------|-------------|
| 1 | {name} | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
...
```

**Sensitivity analysis (skip if `--quick`):**

For each candidate, compute 3 scenarios by adjusting one variable, then recomputing ALL candidates' scores to produce rank changes:

**Scenario 1: Optimistic (Confidence +0.2, capped at 1.0)**
- For each candidate: adjusted_confidence = min(original_confidence + 0.2, 1.0)
- Recompute RICE_base and Final_score for ALL candidates with their adjusted confidences
- Sort ALL candidates by adjusted Final_score
- Compare adjusted rank to original rank → output as +N/-N/-- (not just score change)

**Scenario 2: Pessimistic (Confidence -0.2, floor 0.3)**
- For each candidate: adjusted_confidence = max(original_confidence - 0.2, 0.3)
- Recompute and re-rank ALL candidates, show rank changes

**Scenario 3: Effort Doubled**
- For each candidate: adjusted_effort = original_effort * 2
- Recompute and re-rank ALL candidates, show rank changes

After each scenario table:

```
| Candidate | Original Score | Adjusted Score | Rank Change |
|-----------|---------------|----------------|-------------|
| {name} | {score} | {adj_score} | {+N/-N/--} |
...
Finding: {narrative}
```

**Narrative analysis:**
- Identify "fragile" items: rank drops >= 2 under any single scenario
- Identify "robust" items: rank stable (-- or within 1) across all three scenarios
- Flag fragile items for closer scrutiny before committing resources

**Now/Next/Later bucket assignment:**

After sensitivity analysis (or after ranked table if --quick), assign each candidate to a bucket:

- **Now**: Final_score in top 30% by rank AND Effort <= 2 months AND no unresolved blockers
- **Next**: Final_score in top 60% by rank OR Effort > 2 months (but still top 60%)
- **Later**: Remaining candidates AND candidates flagged as "fragile" in sensitivity analysis

Display bucket assignments as a summary:

```
## Priority Buckets

Now: {candidate names}
Next: {candidate names}
Later: {candidate names}
```

Display: `Step 4/7: RICE scoring complete. {N} candidates scored. Sensitivity analysis: {included|skipped}.`

---

### Step 5/7: Write opportunity artifact

Use the template structure from `templates/opportunity-evaluation.md`. Write to `.planning/design/strategy/OPP-opportunity-v{N}.md` using the Write tool.

**YAML frontmatter:**

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:opportunity (OPP)
Version: v{N}
Status: draft
Scope: "{number of candidates} candidates"
Data Currency: "Opportunity scoring based on user-provided estimates as of {date}. Re-score as data improves."
Enhanced By: "{Sequential Thinking MCP if used, or 'none'}"
---
```

**Sections in order:**

1. `# Opportunity Evaluation: {product_name}`
2. `## Evaluation Candidates` — pre-population source, confirmed list with Source and Description columns
3. `## Scoring Table` — ranked by Final Score descending, all 7 dimensions + computed scores
4. `## Per-Item Breakdowns` — one subsection per candidate with RICE breakdown, design extension breakdown, key considerations
5. `## Narrative Analysis` — Top Recommendations, Surprising Findings, Risk Flags
6. `## Score Distribution` — SVG bar chart (bar_height = (score / max_score) * 220)
7. `## Now / Next / Later Buckets` — tables for each bucket with Candidate, Score, Effort, Rationale columns. Include bucket criteria note:
   ```
   **Bucket criteria:**
   - Now: Score in top 30% AND Effort <= M AND no unresolved blockers
   - Next: Score in top 60% OR depends on Now items
   - Later: Remaining items AND fragile items from sensitivity analysis; re-evaluate quarterly
   ```
8. `## Scenario Models` — one subsection per sensitivity scenario with rank-change table and finding narrative (omit if --quick)
9. `## Assumptions and Caveats` — key assumptions underlying the scores, data quality notes
10. `## Version History` — version table with date, changes, candidate count; Score Changes table (for v2+)

**Footer:**

```markdown
---

*Generated by PDE-OS /pde:opportunity | {ISO 8601 date} | {N} candidates scored*
```

Display:

```
Step 5/7: Opportunity artifact written.
  -> Created: .planning/design/strategy/OPP-opportunity-v{N}.md
```

---

### Step 6/7: Update domain DESIGN-STATE

Check if `.planning/design/strategy/DESIGN-STATE.md` exists using the Glob tool.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `strategy`
- Replace `{Domain}` with `Strategy`
- Replace `{date}` with current ISO 8601 date
- Use the Write tool to create `.planning/design/strategy/DESIGN-STATE.md`

**Add the OPP artifact row to the Artifact Index table:**

If the file was just created: add OPP row after the header row.

If the file already exists (re-run scenario, v2+): use the Edit tool to update the existing OPP row's Version and Updated columns in place, or add a new row if no OPP row exists.

The OPP row format:

```
| OPP | Opportunity Evaluation | /pde:opportunity | draft | v{N} | {Sequential Thinking MCP or "none"} | CMP (if available) | {YYYY-MM-DD} |
```

Display: `Step 6/7: Strategy DESIGN-STATE.md updated with OPP artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-opportunity)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-opportunity)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:opportunity.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add OPP row if not already present:
   ```
   | OPP | strategy | CMP (optional) | current |
   ```

2. **Decision Log** — append entry:
   ```
   | OPP | opportunity scoring complete, {N} candidates, Now/Next/Later buckets assigned | {date} |
   ```

3. **Iteration History** — append entry:
   ```
   | OPP-opportunity-v{N} | v{N} | Created by /pde:opportunity | {date} |
   ```

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest — 7-call artifact registration pattern:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP code OPP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP name "Opportunity Evaluation"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP type opportunity
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP path ".planning/design/strategy/OPP-opportunity-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update OPP version {N}
```

**Set coverage flag — 13-field pass-through-all pattern:**

First, read all 13 current coverage flags to avoid overwriting them:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract all 13 flags (default absent flags to `false`):

- Canonical 13-field order: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`

Then write the FULL 13-field JSON, setting `hasOpportunity` to `true` and passing all other flags through unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":true,"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current}}'
```

**IMPORTANT:** Replace each `{current}` placeholder with the actual boolean value read from coverage-check. NEVER use dot-notation for this field. ALWAYS write all 13 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. hasOpportunity: true.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/OPP-opportunity-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size, if created}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:ideate |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {Sequential Thinking MCP if used, or "none"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER skip coverage-check before writing designCoverage. Always read existing flags and pass them all through. Writing only `{"hasOpportunity":true}` will erase the other 12 flags.
- NEVER use dot-notation with `manifest-set-top-level` (e.g., `manifest-set-top-level designCoverage.hasOpportunity true` is WRONG). Always pass the full JSON object.
- NEVER show only score changes in sensitivity analysis — must show rank changes for ALL candidates per scenario (not just the one being varied).
- NEVER hard-fail when Sequential Thinking MCP is unavailable. The skill MUST complete with standard scoring. Sequential Thinking is an enhancement, not a requirement.
- NEVER omit the Now/Next/Later bucketing step — it is a required output regardless of --quick mode.
- NEVER write to root DESIGN-STATE.md without first acquiring the write lock via `pde-tools.cjs design lock-acquire`. ALWAYS release the lock even if an error occurs.
- NEVER overwrite an existing versioned OPP artifact. Always increment version (v1 → v2 → v3).
- Sensitivity scenarios MUST recompute ALL candidates (not just the one being varied) to produce correct rank deltas. Rank change is relative to the full re-ranked list, not a simple score comparison.

</process>

<output>
- `.planning/design/strategy/OPP-opportunity-v{N}.md` — the primary opportunity evaluation artifact
- `.planning/design/strategy/DESIGN-STATE.md` — strategy domain state (created if absent, updated with OPP entry)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Dependency Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with OPP artifact entry and hasOpportunity coverage flag
</output>
