<purpose>
Run structured competitive landscape analysis producing a CMP-competitive-v{N}.md artifact with competitor profiles, feature comparison matrix, SVG positioning map, Porter's Five Forces analysis, pricing analysis, gap analysis, and differentiation recommendations. Every factual claim carries a confidence label. The Opportunity Highlights section is the key downstream contract — consumed by /pde:opportunity as candidate input.
</purpose>

<skill_code>
CMP
</skill_code>

<skill_domain>
strategy
</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if missing):**
- `.planning/PROJECT.md` — product description, target users, core value, and market context

**Soft dependencies (enrich analysis):**
- `.planning/design/strategy/BRF-brief-v*.md` — enriches competitor identification with product type, personas, JTBD
- `.planning/REQUIREMENTS.md` — provides feature list for matrix rows
- `.planning/design/DESIGN-STATE.md` — surface existing artifact context

**Routing logic:**
```
IF PROJECT.md missing:
  HALT with error (hard requirement)

IF BRF brief artifact found:
  Load it — use for product type, personas, constraint-driven feature list
  Log: "  -> Brief found: enriching competitor identification"
ELSE:
  Log: "  -> No brief found — using PROJECT.md only for competitor identification"

<!-- Experience product type — Phase 74 stub: competitive analysis applies to experience venues and events (venue operators, festival brands, live experience producers). Experience-specific competitive analysis framework added in subsequent phases. Current behavior: proceed with software competitive analysis path as temporary fallback for experience product type. -->

IF REQUIREMENTS.md found:
  Load it — use for feature comparison matrix rows
  Log: "  -> REQUIREMENTS.md loaded: {N} requirements for matrix"
ELSE:
  Log: "  -> No REQUIREMENTS.md — deriving feature list from PROJECT.md"

IF DESIGN-STATE found:
  Read to check existing CMP artifacts and version number
  Log: "  -> DESIGN-STATE read: checking for existing CMP artifacts"
ELSE:
  Log: "  -> No DESIGN-STATE found — will create after analysis"
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
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, competitor count, scope outline, estimated token usage. |
| `--quick` | Boolean | 3 competitors, no Porter's Five Forces. Faster execution. |
| `--standard` | Boolean | Default: 3-5 competitors with Porter's Five Forces. Recommended for most projects. |
| `--deep` | Boolean | 5-8+ competitors with additional positioning maps and deeper analysis. |
| `--verbose` | Boolean | Show detailed progress, MCP probe results, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-websearch` | Boolean | Skip WebSearch MCP specifically while allowing other MCPs. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Skip the confirmation prompt when a CMP artifact already exists and auto-increment to the next version. |

</flags>

<process>

## /pde:competitive — Competitive Landscape Analysis Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--standard`, `--deep`, `--verbose`, `--no-mcp`, `--no-websearch`, `--no-sequential-thinking`, `--force`.

**Scope resolution (resolve ONCE, use throughout):**
```
IF --quick in $ARGUMENTS:    SCOPE = quick;    COMPETITOR_COUNT_TARGET = 3
IF --deep in $ARGUMENTS:     SCOPE = deep;     COMPETITOR_COUNT_TARGET = "5-8+"
DEFAULT (--standard or none): SCOPE = standard; COMPETITOR_COUNT_TARGET = "3-5"
```

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
  Check that .planning/ exists and is writable, then re-run /pde:competitive.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and determine scope

**Read PROJECT.md (hard requirement):**

Use the Read tool to load `.planning/PROJECT.md`.

If PROJECT.md does not exist, display the following error and HALT immediately:

```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:competitive requires a project description to identify competitors.
  Run /pde:new-project first to initialize your project, then re-run /pde:competitive.
```

**Optionally read BRF brief:**

Use the Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. If found, load the most recent version via the Read tool (soft dependency — enriches competitor identification).

**Optionally read REQUIREMENTS.md:**

Use the Read tool to load `.planning/REQUIREMENTS.md` if it exists (soft dependency — provides feature list for comparison matrix rows).

**Check for existing CMP artifact and determine version N:**

Use the Glob tool to check if `.planning/design/strategy/CMP-competitive-v*.md` already exists.

- If **no CMP artifact exists**: proceed with version N = 1.
- If **CMP artifact exists AND `--force` flag NOT present**: prompt the user:
  ```
  A competitive analysis already exists (CMP-competitive-v1.md). Generate a new version?
  This will create CMP-competitive-v2.md without modifying the existing v1.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing analysis preserved at .planning/design/strategy/CMP-competitive-v1.md` and halt.
  If user answers "yes": determine N = max existing version + 1.
- If **CMP artifact exists AND `--force` flag present**: auto-increment. Scan `.planning/design/strategy/` for all `CMP-competitive-v*.md` files, find the maximum version number, set N = max + 1. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

**If `--dry-run` flag is active:** Display what WOULD be done and HALT:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/strategy/CMP-competitive-v{N}.md
  File: .planning/design/strategy/DESIGN-STATE.md (updated or created)

Scope: {quick|standard|deep}
Competitors: {count target}
Porter's Five Forces: {included|skipped (--quick mode)}
Positioning maps: {1 map|2 maps|3 maps}

Prerequisites:
  PROJECT.md: found
  BRF brief: {found v{N}|not found}
  REQUIREMENTS.md: {found|not found}

Estimated token usage: ~{estimate}
MCP enhancements planned: WebSearch (live competitor data), Sequential Thinking (analysis depth)
```

Display: `Step 2/7: Prerequisites satisfied. PROJECT.md loaded. Scope: {scope}. Version: v{N}.`

---

### Step 3/7: Probe MCP capabilities

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET WEBSEARCH_AVAILABLE = false
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  continue to Step 4

IF --no-websearch in $ARGUMENTS:
  SET WEBSEARCH_AVAILABLE = false
  SKIP WebSearch probe

IF --no-sequential-thinking in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe (quick mode -- no MCP overhead)
```

**Probe WebSearch MCP:**

If not disabled via flags, attempt to call the WebSearch MCP tool with a minimal test query.

- Timeout: 15 seconds
- If tool responds: SET `WEBSEARCH_AVAILABLE = true`. Log: `  -> WebSearch MCP: available (live competitor data enabled)`
- If tool not found or errors: SET `WEBSEARCH_AVAILABLE = false`. Log: `  -> WebSearch MCP: unavailable (training knowledge mode -- install WebSearch MCP for current market data)`

**Probe Sequential Thinking MCP:**

If not disabled via flags, attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (degraded mode)`

Display: `Step 3/7: MCP probes complete. WebSearch: {available|unavailable}. Sequential Thinking: {available|unavailable}.`

---

### Step 4/7: Competitive analysis

This is the core logic of the skill. Apply confidence labels to EVERY factual competitor claim throughout this step.

---

**CONFIDENCE LABELS (apply to EVERY factual competitor claim throughout Step 4):**

```
[confirmed]  — directly verified from competitor's own docs, pricing page, or WebSearch result
[inferred]   — concluded from indirect evidence (category membership, common patterns, known market position)
[unverified] — cannot confirm from available sources; flagged for user validation
```

**WebSearch unavailability default rule:** When WebSearch MCP is unavailable, ALL training-knowledge claims about competitor pricing, feature specifics, and market data default to `[inferred]` unless well-established public knowledge, in which case use `[confirmed]`. Add a single notice at the top of Step 4 output:

```
[Using training knowledge -- install WebSearch MCP for current market data. All competitor data labeled with confidence accordingly.]
```

---

#### 4a. Competitor identification

Based on PROJECT.md product type, market, features, and any brief context:

- Identify the primary market category and sub-segment
- Identify competitors. Use WebSearch MCP if available to find current market participants. If unavailable, use training knowledge.
- **Quick scope:** identify 3 competitors
- **Standard scope:** identify 3-5 competitors
- **Deep scope:** identify 5-8+ competitors

For each competitor, use `[confirmed]`, `[inferred]`, or `[unverified]` label for:
- Their URL and founding year
- Their funding / acquisition status
- Their target market segment
- Their primary differentiators

If Sequential Thinking MCP is available: use `mcp__sequential-thinking__think` to reason about market segmentation and which competitors represent the most meaningful comparison. Tag: `[Enhanced by Sequential Thinking MCP -- competitor identification reasoning]`

Display: `  -> Identified {N} competitors for {scope} analysis.`

#### 4b. Competitor profiles

For each identified competitor, produce a profile covering:
- Name, URL `[confidence]`, founding year `[confidence]`, HQ `[confidence]`, funding status `[confidence]`
- Target market `[confidence]`
- Key differentiators `[confidence]`
- Strengths (2-3 bullet points, each labeled)
- Weaknesses (2-3 bullet points, each labeled)
- Design & UX Assessment (Visual Design, UX/Usability, Accessibility, Mobile Experience, Performance rated 1-5, each labeled)
- Pricing tier breakdown (Free/Basic, Pro/Standard, Enterprise tiers with prices and key features, each price labeled)

Follow the exact structure from `templates/competitive-landscape.md`.

#### 4c. Feature comparison matrix

Build a matrix where:
- Rows = key features derived from PROJECT.md and REQUIREMENTS.md (if available)
- Columns = Our Product + each competitor
- Cells = `full` / `partial` / `none` with a confidence label on EACH cell

Example cell format: `full [confirmed]` or `partial [inferred]`

Legend: `full = complete implementation, partial = limited/basic, none = not available`

#### 4d. SVG Positioning map(s)

Use the SVG template from `@references/strategy-frameworks.md`:

1. **Choose meaningful axis pairs** based on the product domain. Consult the axis selection guidance in strategy-frameworks.md. Good pairs for software: Features/Simplicity, Price/Quality, Enterprise/Consumer. For hardware: Precision/Cost, Consumer/Industrial.

2. **Position competitors and our product** on the map. Coordinates: `cx = 50 + (x_score/10 * 400)`, `cy = 450 - (y_score/10 * 400)`. Score each competitor 0-10 on each axis.

3. **Our product** uses the highlighted style (`fill="#2563eb" stroke="#1d4ed8" stroke-width="2" r="14"`).

4. **Number of maps:**
   - Quick scope: 1 positioning map
   - Standard scope: 2 positioning maps (different axis pairs)
   - Deep scope: 3 positioning maps

5. After each SVG, include an **Insight** block noting clusters, gaps, and whitespace opportunities.

#### 4e. Porter's Five Forces (skip if --quick scope)

Apply the Porter's Five Forces framework from `@references/strategy-frameworks.md`. For each of the 5 forces:

- Rate: Low / Medium / High
- Provide 2-3 key indicators supporting the rating (with confidence labels)
- State the primary design implication

Focus analysis on forces most relevant to the product space. Use the Five Forces Summary Template from strategy-frameworks.md.

Include overall industry attractiveness rating and 1-sentence summary.

If Sequential Thinking MCP is available: use it for deeper force analysis. Tag: `[Enhanced by Sequential Thinking MCP -- Porter's Five Forces reasoning]`

#### 4f. Pricing analysis

Compare pricing tiers and models across all identified competitors:

- Pricing model type (freemium, subscription, one-time, usage-based) `[confidence]`
- Entry price point `[confidence]`
- Mid-tier price `[confidence]`
- Enterprise tier `[confidence]`
- Notable inclusions/exclusions `[confidence]`

Follow with pricing insights:
- Price clustering (where most competitors price and why)
- Price gaps (underserved price points)
- Value anchors (features justifying premium)
- Pricing trends (direction and drivers)

#### 4g. Gap analysis

Identify gaps where competitors are weak, absent, or underserving users. For each gap:
- Describe the unmet need
- Note severity (critical / high / moderate)
- Assess competitor coverage (who addresses it and how well)
- Describe the opportunity

Also identify underserved segments (segments not well-served by existing competitors).

#### 4h. Differentiation recommendations

Based on gap analysis and positioning maps, produce priority-ordered strategic recommendations. For each recommendation:
- Type: feature / UX / pricing / positioning
- Effort estimate: XS / S / M / L / XL
- Impact estimate: High / Med / Low
- Rationale (why this matters competitively)

Display: `Step 4/7: Competitive analysis complete. {N} competitors analyzed, {M} gaps identified.`

---

### Step 5/7: Write competitive artifact

Write the competitive analysis to `.planning/design/strategy/CMP-competitive-v{N}.md`.

Use the EXACT structure from `templates/competitive-landscape.md`. The file MUST contain these sections in this order:

**YAML Frontmatter:**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:competitive (CMP)
Version: v{N}
Status: draft
Scope: "{quick|standard|deep}"
Data Currency: "Analysis based on training knowledge as of model cutoff. Verify critical data points before strategic decisions."
Enhanced By: "{comma-separated MCP names used, or none}"
---
```

If WebSearch MCP was used, update Data Currency to:
`"Analysis enhanced with live WebSearch data as of {date}. Training knowledge used for items not found via WebSearch."`

**Sections in order:**
1. `# Competitive Landscape Analysis: {product_name}`
2. `## Market Overview` (Market Definition, Market Size, Key Trends)
3. `## Competitor Profiles` (one subsection per competitor)
4. `## Feature Comparison Matrix`
5. `## Positioning Maps` (SVG maps from Step 4d)
6. `## Porter's Five Forces Summary` (skip if --quick scope — note "Skipped in --quick mode. Re-run /pde:competitive --standard for Porter's analysis.")
7. `## Pricing Analysis`
8. `## TAM/SAM/SOM Estimates`
9. `## Gap Analysis`
10. `## Differentiation Recommendations`
11. `## Opportunity Highlights` (CRITICAL downstream contract — see format below)
12. Footer line

**CRITICAL: Opportunity Highlights section format:**

This section MUST use the structured numbered-list format that `/pde:opportunity` will parse. Do NOT write this section as prose. Do NOT use a single summary paragraph. MUST use this EXACT format:

```markdown
## Opportunity Highlights
<!-- Machine-readable section consumed by /pde:opportunity -->

*These findings feed directly into `/pde:opportunity` for RICE scoring and prioritization.*

### Top Opportunities

1. **[Gap Name]** -- [one-sentence description]
   - Source: [which competitor comparison revealed this gap]
   - Estimated reach: [user segment affected and size estimate]
   - Competitive advantage: [why this gap matters and why we can win here]

2. **[Gap Name]** -- [one-sentence description]
   - Source: [which competitor comparison revealed this gap]
   - Estimated reach: [user segment affected and size estimate]
   - Competitive advantage: [why this gap matters and why we can win here]

3. **[Gap Name]** -- [one-sentence description]
   - Source: [which competitor comparison revealed this gap]
   - Estimated reach: [user segment affected and size estimate]
   - Competitive advantage: [why this gap matters and why we can win here]

### Risk Flags

- {risk 1: competitive threat, market shift, or timing concern}
- {risk 2}
```

Include at least 3 Opportunity Highlights (more for deep scope). Each entry must have all three sub-fields: Source, Estimated reach, Competitive advantage.

**Footer:**
```markdown
---

*Generated by PDE-OS /pde:competitive | {ISO 8601 date} | Scope: {quick|standard|deep}*

{If WebSearch MCP was used: "[Enhanced by WebSearch MCP -- live market data as of {date}]"}
{If WebSearch MCP was unavailable: "[Using training knowledge -- install WebSearch MCP for current market data]"}
```

Use the Write tool to create the artifact.

Display:
```
Step 5/7: Competitive artifact written.
  -> Created: .planning/design/strategy/CMP-competitive-v{N}.md
```

---

### Step 6/7: Update domain DESIGN-STATE

Check if `.planning/design/strategy/DESIGN-STATE.md` exists using the Glob tool.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `strategy`
- Replace `{Domain}` with `Strategy`
- Replace `{date}` with current ISO 8601 date
- Use the Write tool to create `.planning/design/strategy/DESIGN-STATE.md`

**Add the CMP artifact row to the Artifact Index table:**

If the file was just created: the Artifact Index table is empty. Add the CMP row after the header row.

If the file already exists (re-run scenario, v2+): use the Edit tool to update the existing CMP row's Version and Updated columns in place, or add a new row if no CMP row exists.

The CMP row format:
```
| CMP | Competitive Landscape Analysis | /pde:competitive | draft | v{N} | {comma-separated MCP names used, or "none"} | -- | {YYYY-MM-DD} |
```

Display: `Step 6/7: Strategy DESIGN-STATE.md updated with CMP artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-competitive)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-competitive)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:competitive.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add CMP row if not already present:
   ```
   | CMP | strategy | BRF (optional) | current |
   ```

2. **Decision Log** — append entry:
   ```
   | CMP | competitive analysis complete, scope {scope}, {N} competitors analyzed | {date} |
   ```

3. **Iteration History** — append entry:
   ```
   | CMP-competitive-v{N} | v{N} | Created by /pde:competitive | {date} |
   ```

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP code CMP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP name "Competitive Landscape Analysis"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP type competitive
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP path ".planning/design/strategy/CMP-competitive-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update CMP version {N}
```

**Set coverage flag (pass-through-all pattern):**

First, read all 13 current coverage flags to avoid overwriting them:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract all 14 flags (default absent flags to `false`):
- `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`

Then write the FULL 14-field JSON, setting `hasCompetitive` to `true` and passing all other flags through unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":true,"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**IMPORTANT:** Replace each `{current}` placeholder with the actual boolean value read from coverage-check. NEVER use dot-notation for this field. ALWAYS write all 14 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. hasCompetitive: true.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/CMP-competitive-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:opportunity |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {comma-separated list of MCPs actually used, or "none"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER omit confidence labels from competitor claims. EVERY factual claim about a competitor MUST have a `[confirmed]`, `[inferred]`, or `[unverified]` label. Unlabeled claims leave users without signal about data quality.
- NEVER hard-fail when WebSearch MCP is unavailable. The skill MUST complete with training knowledge alone. WebSearch is an enhancement, not a requirement. Treat its absence as a graceful degradation.
- NEVER write Opportunity Highlights as prose or as a flat list. The section MUST use the structured numbered-list format with Source, Estimated reach, and Competitive advantage sub-fields on each entry. `/pde:opportunity` parses this structure — prose breaks the downstream contract.
- NEVER skip coverage-check before writing designCoverage. Always read existing flags and pass them all through. Writing only `{"hasCompetitive":true}` will erase the other 12 flags.
- NEVER use dot-notation with `manifest-set-top-level` (e.g., `manifest-set-top-level designCoverage.hasCompetitive true` is WRONG). Always pass the full JSON object.
- NEVER skip Porter's Five Forces in standard or deep mode. Only --quick mode omits Porter's. Standard and deep users need the industry dynamics analysis.
- NEVER overwrite an existing versioned CMP artifact. Always increment version (v1 → v2 → v3).
- NEVER write to root DESIGN-STATE.md without first acquiring the write lock via `pde-tools.cjs design lock-acquire`. Writing without the lock risks concurrent write corruption.
- ALWAYS release the write lock (Step 7 lock-release) even if an error occurs during root DESIGN-STATE.md updates. The lock has a 60s TTL but releasing immediately prevents blocking other skills.

</process>

<output>
- `.planning/design/strategy/CMP-competitive-v{N}.md` — the primary competitive landscape artifact
- `.planning/design/strategy/DESIGN-STATE.md` — strategy domain state (created if absent, updated with CMP entry)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Dependency Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with CMP artifact entry and hasCompetitive coverage flag
</output>
