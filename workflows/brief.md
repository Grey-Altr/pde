<purpose>
Generate a structured product design brief from PROJECT.md context. Produces BRF-brief-v{N}.md in .planning/design/strategy/ covering problem statement, product type detection, personas, jobs-to-be-done, goals, constraints, and non-goals. Anchors all downstream design pipeline skills (flows, system, wireframe, critique, iterate, handoff) by establishing the canonical product context they all read.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-4 (init, prerequisites, MCP probe, product type detection) but writes NO files. Displays planned file paths, detected product type, section outline, estimated token usage. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking MCP probe) for faster execution. Useful for rapid iteration when MCP enhanced reasoning is not needed. |
| `--verbose` | Boolean | Show detailed progress and MCP probe results, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Skill-specific flag. Skip the confirmation prompt when a brief already exists and auto-increment to the next version. |
</flags>

<process>

## /pde:brief — Design Brief Generation Pipeline

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
  Check that .planning/ exists and is writable, then re-run /pde:brief.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites

**Read PROJECT.md:**

Use the Read tool to load `.planning/PROJECT.md`.

If PROJECT.md does not exist, display the following error and HALT immediately (hard stop, NOT a warning):

```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:brief requires a project description to generate a design brief.
  Run /pde:new-project first to initialize your project, then re-run /pde:brief.
```

**Optionally read REQUIREMENTS.md:**

Use the Read tool to load `.planning/REQUIREMENTS.md` if it exists (soft dependency — enriches persona and constraint sections but is NOT required). If it does not exist, log at verbose level: `  -> REQUIREMENTS.md not found — continuing without it (brief will still be generated from PROJECT.md alone)`.

**Check for existing brief and determine version:**

Use the Glob tool to check if `.planning/design/strategy/BRF-brief-v1.md` already exists.

- If **no brief exists**: proceed with version N = 1.
- If **brief exists AND `--force` flag NOT present**: prompt the user:
  ```
  A brief already exists (BRF-brief-v1.md). Generate a new version?
  This will create BRF-brief-v2.md without modifying the existing v1.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing brief preserved at .planning/design/strategy/BRF-brief-v1.md` and halt.
  If user answers "yes": determine N = max existing version + 1.
- If **brief exists AND `--force` flag present**: auto-increment. Scan `.planning/design/strategy/` for all `BRF-brief-v*.md` files, find the maximum version number, set N = max + 1. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

Display: `Step 2/7: Prerequisites satisfied. PROJECT.md loaded. Brief version: v{N}.`

---

**Sub-step 2c: Upstream context injection (all soft — never halt)**

Probe for upstream strategy artifacts. All probes are optional — if an artifact is missing, log a note and continue. The brief MUST produce identical output for users who have not run ideation, competitive, or opportunity analysis.

**Ideation context (IDT):**
Use the Glob tool to find `.planning/design/strategy/IDT-ideation-v*.md`.
- If found: Sort by version descending, read the highest version. Parse the `## Recommended Direction` section (direction name, rationale, key assumptions) and the `## Brief Seed` section (using templates/brief-seed.md field schema: Problem Statement, Product Type, Platform, Target Users, Scope Boundaries, Constraints, Key Decisions, Risk Register, Next Steps). Store parsed content as IDT_CONTEXT for use in Step 5.
  Log: `"  -> Ideation artifact found: v{N} — enriching brief with recommended direction ({direction_name})"`
- If not found:
  Log: `"  -> No ideation artifact — generating brief from PROJECT.md alone"`
  SET IDT_CONTEXT = null. Continue normally.

**Competitive context (CMP):**
Use the Glob tool to find `.planning/design/strategy/CMP-competitive-v*.md`.
- If found: Sort by version descending, read the highest version. Parse the `## Gap Analysis` section (unmet needs and severity) and the `## Opportunity Highlights` section (top opportunities with source, reach, competitive advantage). Store parsed content as CMP_CONTEXT for use in Step 5.
  Log: `"  -> Competitive artifact found: v{N} — enriching brief competitive context"`
- If not found:
  Log: `"  -> No competitive artifact — competitive context from PROJECT.md"`
  SET CMP_CONTEXT = null. Continue normally.

**Opportunity context (OPP):**
Use the Glob tool to find `.planning/design/strategy/OPP-opportunity-v*.md`.
- If found: Sort by version descending, read the highest version. Parse the `## Now / Next / Later Buckets` section — extract the Now candidates (highest priority items). Store parsed content as OPP_CONTEXT for use in Step 5.
  Log: `"  -> Opportunity artifact found: v{N} — enriching brief scope with high-priority items"`
- If not found:
  Log: `"  -> No opportunity artifact — scope boundaries derived from PROJECT.md only"`
  SET OPP_CONTEXT = null. Continue normally.

---

### Step 3/7: Probe MCP (Sequential Thinking)

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
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe (quick mode — no MCP overhead)
  continue to Step 4
```

**Probe Sequential Thinking MCP:**

Attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (degraded mode)`

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {available | unavailable}.`

---

### Step 4/7: Detect product type (BRF-02)

Scan the content of PROJECT.md for the following signals:

**Software signals:** Node.js, React, Vue, Angular, TypeScript, JavaScript, Python, Ruby, Swift, Kotlin, Java, Go, Rust, SQL, PostgreSQL, MySQL, MongoDB, Redis, API, REST, GraphQL, SaaS, web app, mobile app, CLI, deploy, server, cloud, containerize, Docker, Kubernetes, npm, pip, yarn, pnpm, app store, web browser, mobile OS, desktop OS, frontend, backend, database, microservices, serverless, CI/CD, DevOps, user interface, screen, button, form, authentication, authorization.

**Hardware signals:** PCB, circuit board, 3D print, 3D printing, CAD, BOM, bill of materials, enclosure, firmware, microcontroller, Arduino, Raspberry Pi, sensor, actuator, embedded, assembly, injection mold, injection molding, CNC, FDM, tolerance, product box, physical unit, supply chain, manufacturing, prototype, schematic, soldering, voltage, current, power supply, battery, motor, servo, actuator, JTAG, GPIO, I2C, SPI, UART.

**Classification logic:**

```
IF both software AND hardware signals are present:
  product_type = "hybrid"
ELSE IF only hardware signals present (no software signals):
  product_type = "hardware"
ELSE (only software signals, OR ambiguous/no signals):
  product_type = "software"  (default)
```

Resolve to ONE canonical lowercase string: `software`, `hardware`, or `hybrid`.

**If Sequential Thinking MCP available AND classification is ambiguous** (both signal types present but unclear dominance):
Use `mcp__sequential-thinking__think` with prompt: `"Review this PROJECT.md content and determine whether this product is primarily 'software', 'hardware', or 'hybrid'. Base the classification on which set of concerns dominates the design work. Content: [PROJECT.md content summary]"`. Use the reasoning to inform the final classification decision.

**Detect platform:**

Based on deployment/distribution signals in PROJECT.md:
- `web` — web browser, website, webapp, browser, HTTP, URL, domain, hosted, SaaS
- `mobile` — iOS, Android, iPhone, mobile app, App Store, Google Play, React Native, Flutter, Swift, Kotlin (mobile context)
- `desktop` — desktop app, Electron, Tauri, macOS, Windows, Linux app
- `embedded` — firmware, microcontroller, embedded, IoT, device, hardware (software context)
- `multi-platform` — cross-platform, multiple targets, or combinations of web + mobile + desktop

Default platform: `web` if ambiguous or no clear signal.

**Record rationale:** Note which specific signals were found and why the classification was made. This goes into the brief's Product Type section.

Display:
```
Step 4/7: Product type detected.
  -> Type: {product_type}
  -> Platform: {platform}
  -> Signals found: {comma-separated list of key signals}
```

---

### Step 5/7: Synthesize brief content

Using PROJECT.md content (and REQUIREMENTS.md if available), synthesize and write the complete brief.

**If `--dry-run` flag is active:** Display what WOULD be written:
```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/strategy/BRF-brief-v{N}.md
  File: .planning/design/strategy/DESIGN-STATE.md (if it does not exist)

Detected product type: {product_type}
Platform: {platform}

Brief outline:
  ## Problem Statement — synthesized from PROJECT.md core value and description
  ## Product Type — {product_type}, {platform}
  ## Target Users — {estimated N personas from PROJECT.md}
  ## Jobs to Be Done — per persona
  ## Constraints — table with ~{N} rows estimated
  ## Success Criteria — table with ~{N} rows estimated
  ## Competitive Context — table with ~{N} competitors
  ## Key Assumptions — ~{N} assumptions
  ## Scope Boundaries — in-scope and out-of-scope lists

Estimated token usage: ~{estimate}
MCP enhancements: {Sequential Thinking: available/unavailable}
```
HALT — do not write files in dry-run mode.

**Fill all sections using `templates/design-brief.md` as the output structure:**

**Upstream context enrichment (if available from Sub-step 2c):**

When generating brief sections, incorporate upstream context as follows. If a context variable is null, use the existing PROJECT.md-only generation logic unchanged.

- **Problem Statement:** If IDT_CONTEXT is available, use the Brief Seed's Problem Statement as the primary source, refined with PROJECT.md's core value. IDT Brief Seed represents the latest ideation thinking and supersedes raw PROJECT.md problem description when both exist.
- **Target Users:** If IDT_CONTEXT is available, merge Brief Seed's Target Users with PROJECT.md personas. IDT may add or refine user segments discovered during ideation.
- **Competitive Context:** If CMP_CONTEXT is available, use Gap Analysis findings and Opportunity Highlights to populate the competitor table with grounded research data instead of training-knowledge inference. Preserve confidence labels from the CMP artifact.
- **Key Assumptions:** If OPP_CONTEXT is available, add high-confidence Now-bucket items as validated assumptions (mark provenance as "opportunity-validated"). If IDT_CONTEXT is available, add Brief Seed's Key Decisions as assumption-adjacent inputs.
- **Scope Boundaries:** If OPP_CONTEXT is available, use Now-bucket items as in-scope features and Later-bucket items as out-of-scope rationale. If IDT_CONTEXT is available, use Brief Seed's Scope Boundaries as the primary scope source.
- **Constraints:** If IDT_CONTEXT is available, merge Brief Seed's Constraints table with PROJECT.md constraints.

Write the complete brief to `.planning/design/strategy/BRF-brief-v{N}.md` using the Write tool.

The brief MUST contain these sections in this order:

**Frontmatter (YAML):**
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:brief (BRF)
Version: v{N}
Status: draft
Enhanced By: "{comma-separated MCP names used, or none}"
---
```

**`# Design Brief`** — top-level heading

**`## Problem Statement`** — 1-2 paragraphs synthesizing the core problem being solved, derived from PROJECT.md's core value, description, and pain points. Write from the perspective of user suffering, not product features.

**`## Product Type`**

```markdown
**Type:** {software | hardware | hybrid}
**Platform:** {web | mobile | desktop | embedded | multi-platform}
**Rationale:** {1-2 sentences explaining the classification and which signals led to it}

**Design Constraints:**

| Constraint | Value |
|------------|-------|
```

For `software` type, the Design Constraints table MUST cover:
- Screen resolution targets (e.g., minimum 320px, target 1440px) — define responsive layout breakpoints
- Browser/OS compatibility (e.g., modern browsers, Chrome/Firefox/Safari/Edge, iOS 16+, Android 10+)
- Accessibility requirements: WCAG 2.2 AA compliance required
- Interaction model (touch vs. mouse vs. both) — responsive touch and pointer targets
- Responsive breakpoints (mobile 320-767px, tablet 768-1023px, desktop 1024px+)

For `hardware` type, the Design Constraints table MUST cover:
- Physical dimensions and tolerances (e.g., ±0.1mm manufacturing tolerance)
- Material constraints (e.g., RoHS-compliant components required)
- Manufacturing process limits (e.g., DFM guidelines for injection molding)
- Regulatory compliance requirements (CE, UL, FCC — as applicable to the product category)
- IP rating requirements (if the product is exposed to moisture/dust)

For `hybrid` type, include BOTH software AND hardware constraint categories, PLUS:
- Integration protocol (BLE, USB, Wi-Fi, API bridge — based on how software and hardware communicate)

**`## Target Users`**

Synthesize primary and secondary personas from PROJECT.md context. For each persona:

```markdown
### Primary Persona: {descriptive name}
- **Role:** {who they are in context}
- **Goal:** {what they want to accomplish with this product}
- **Pain points:** {current frustrations the product addresses}
- **Context:** {when and where they use the product}
```

Include at least one primary persona. Include secondary persona if PROJECT.md implies distinct user types.

If Sequential Thinking MCP is available: use it to reason about persona nuances, motivations, and context from the PROJECT.md content. Tag section: `[Enhanced by Sequential Thinking MCP -- persona synthesis]`

**`## Jobs to Be Done`**

Place this section between Target Users and Constraints. For each persona, list 2-4 JTBD statements in the standard format:

```markdown
**{Persona Name}:**
- When {situation}, I want to {motivation}, so I can {expected outcome}.
- When {situation}, I want to {motivation}, so I can {expected outcome}.
```

Derive the situations, motivations, and outcomes from PROJECT.md's description of the problem, core value, and user workflows.

**`## Constraints`**

```markdown
| Constraint | Type | Impact |
|------------|------|--------|
| {constraint} | {technical/business/regulatory/time} | {how it limits design decisions} |
```

Include project-specific constraints from PROJECT.md (budget, timeline, technology choices, team size, existing systems). Type options: `technical`, `business`, `regulatory`, `time`.

**`## Success Criteria`**

```markdown
| Criterion | Metric | Target |
|-----------|--------|--------|
| {what success looks like} | {measurable indicator} | {specific target value} |
```

Derive from PROJECT.md's goals, core value, and any stated success metrics. Include at least 3 criteria covering user adoption/engagement, core functionality, and business outcomes.

**`## Competitive Context`**

```markdown
| Competitor | Strength | Weakness | Differentiation Opportunity |
|------------|----------|----------|----------------------------|
| {name} | {what they do well} | {their gap or limitation} | {how this product can be different/better} |
```

Synthesize competitors from PROJECT.md context. If PROJECT.md does not mention competitors, infer from the problem domain (e.g., if PROJECT.md describes a task management tool, standard competitors are Asana, Todoist, Notion).

If Sequential Thinking MCP is available: use it for deeper competitive landscape analysis. Tag section: `[Enhanced by Sequential Thinking MCP -- competitive analysis]`

**`## Key Assumptions`**

```markdown
1. {assumption statement} -- {risk if this assumption is wrong}
2. {assumption statement} -- {risk if this assumption is wrong}
```

Include 3-6 assumptions about market, users, technology, or business model. These are things believed to be true but not yet validated. Each assumption must have a stated risk-if-wrong.

**`## Scope Boundaries`**

```markdown
**In scope (v{N}):**
- {feature or capability explicitly in scope}
- {feature or capability explicitly in scope}

**Out of scope (v1) — non-goals:**
- {feature or capability} -- {why deferred: complexity, later phase, not core to problem}
- {feature or capability} -- {why deferred}
```

Derive in-scope items from PROJECT.md's stated goals. Derive out-of-scope items from PROJECT.md's explicit exclusions, plus infer common scope-creep items for this product category that would be deferred to v2+.

**Footer:**
```markdown
---

*Generated by PDE-OS /pde:brief | {ISO 8601 date}*
```

Display:
```
Step 5/7: Brief written.
  -> Created: .planning/design/strategy/BRF-brief-v{N}.md
```

---

### Step 6/7: Update strategy domain DESIGN-STATE

Check if `.planning/design/strategy/DESIGN-STATE.md` exists using the Glob tool.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `strategy`
- Replace `{Domain}` with `Strategy`
- Replace `{date}` with current ISO 8601 date
- Use the Write tool to create `.planning/design/strategy/DESIGN-STATE.md`

**Add the BRF artifact row to the Artifact Index table:**

If the file was just created: the Artifact Index table is empty (comment-only). Add the BRF row after the header row.

If the file already exists (re-run scenario, v2+): use the Edit tool to update the existing BRF row's Version and Updated columns in place.

The BRF row format:
```
| BRF | Design Brief | /pde:brief | draft | v{N} | {comma-separated MCP names used, or "none"} | -- | {YYYY-MM-DD} |
```

Display: `Step 6/7: Strategy DESIGN-STATE.md updated with BRF artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-brief)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds (stale locks auto-clear after 60s TTL), then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-brief)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:brief.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these three updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add BRF row if not already present:
   ```
   | BRF | strategy | -- | current |
   ```

2. **Quick Reference section** — add or update these rows:
   ```
   | Product Type | {canonical lowercase type: software/hardware/hybrid} |
   | Platform | {platform} |
   ```

3. **Decision Log** — append entry:
   ```
   | BRF | brief complete, product type detected as {type} | {date} |
   ```

4. **Iteration History** — append entry:
   ```
   | BRF-brief-v{N} | v{N} | Created by /pde:brief | {date} |
   ```

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF code BRF
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF name "Design Brief"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF type brief
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF path ".planning/design/strategy/BRF-brief-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update BRF version {N}
```

**Set manifest root-level fields:**

- `{project_name}` — Extract from PROJECT.md: use the `name:` frontmatter field if present, otherwise use the text of the first `# Heading`. If neither is available, use `"unknown"`.
- `{product_type}` — Use the product type string already resolved in Step 4 (one of: `software`, `hardware`, `hybrid`).

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level projectName "{project_name}"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level productType {product_type}
```

Display: `Step 7/7: Root DESIGN-STATE and manifest updated.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/BRF-brief-v{N}.md (Markdown, {size}), .planning/design/strategy/DESIGN-STATE.md (Markdown, {size}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:flows |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {comma-separated list of MCPs actually used, or "none"} |
| Upstream context | {If any of IDT_CONTEXT, CMP_CONTEXT, OPP_CONTEXT were found: list them as "IDT v{N} (ideation), CMP v{N} (competitive), OPP v{N} (opportunity)" for each found artifact, comma-separated. If none found: "none — using PROJECT.md only"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER overwrite an existing versioned brief file. Always increment version (v1 → v2 → v3). If v1 exists, write v2. Never overwrite v1.
- NEVER write to root DESIGN-STATE.md without first acquiring the write lock via `pde-tools.cjs design lock-acquire`. Writing without the lock risks concurrent write corruption.
- NEVER skip domain DESIGN-STATE.md creation. `strategy/DESIGN-STATE.md` MUST be created if it does not exist. Downstream skills (/pde:flows, /pde:system) read this file to discover prior brief artifacts.
- NEVER continue if PROJECT.md is missing. Hard error, not warning. PROJECT.md is the only hard prerequisite.
- ALWAYS use the same canonical lowercase product type string (`software`, `hardware`, or `hybrid`) in all three locations: brief frontmatter `Product Type` field, brief `## Product Type` section `**Type:**` line, and root DESIGN-STATE.md Quick Reference `| Product Type |` row. Inconsistent casing or abbreviations break downstream consumers.
- ALWAYS release the write lock (Step 7 lock-release) even if an error occurs during root DESIGN-STATE.md updates. The lock has a 60s TTL but releasing immediately prevents blocking other skills.
- NEVER add a `hasBrief` flag to design-manifest.json. Brief completion is tracked via the presence of `artifacts.BRF` in the manifest, not via a coverage flag. The manifest schema does not have a `hasBrief` field.

</process>

<output>
- `.planning/design/strategy/BRF-brief-v{N}.md` — the primary brief artifact
- `.planning/design/strategy/DESIGN-STATE.md` — strategy domain state (created if absent)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Map, Quick Reference, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with BRF artifact entry
</output>
