<purpose>
Run multi-phase diverge-converge ideation to explore product directions. Pass 1 (Diverge) generates minimum 5 distinct directions with zero evaluative language. Pass 2 (Converge) scores each direction for feasibility, goal alignment, and distinctiveness, producing an explicit recommended direction. At the diverge-converge checkpoint, /pde:recommend is invoked automatically via Skill() to surface tooling feasibility signals. The IDT artifact includes a ## Brief Seed section using the templates/brief-seed.md schema, enabling direct consumption by /pde:brief. Writes the hasIdeation coverage flag to design-manifest.json via the 13-field pass-through-all pattern.
</purpose>

<skill_code>IDT</skill_code>

<skill_domain>strategy</skill_domain>

<context_routing>

## Context Detection

Before beginning, load available context:

**Hard requirement (HALT if missing):**
- `.planning/PROJECT.md` — product description, target users, core value, and market context

**Soft dependencies (enrich ideation):**
- `.planning/design/strategy/CMP-competitive-v*.md` — enriches diverge with competitive gaps (Glob, read most recent, parse ## Gap Analysis)
- `.planning/design/strategy/OPP-opportunity-v*.md` — enriches diverge with scored opportunities (Glob, read most recent, parse ## Now / Next / Later Buckets)
- `.planning/design/strategy/BRF-brief-v*.md` — enriches with product type, personas, JTBD if brief already exists
- `.planning/REQUIREMENTS.md` — enriches direction scoping

**Routing logic:**

```
IF PROJECT.md missing:
  HALT with error (hard requirement)

IF CMP competitive artifact found:
  Load most recent version
  Parse ## Gap Analysis section
  Log: "  -> CMP artifact found: enriching ideation with competitive gaps"
ELSE:
  Log: "  -> No CMP artifact — continuing without competitive gaps"

IF OPP opportunity artifact found:
  Load most recent version
  Parse ## Now / Next / Later Buckets section
  Log: "  -> OPP artifact found: enriching ideation with scored opportunities"
ELSE:
  Log: "  -> No OPP artifact — continuing without opportunity scoring"

IF BRF brief artifact found:
  Load most recent version
  Log: "  -> BRF artifact found: enriching ideation with product context"
ELSE:
  Log: "  -> No BRF artifact — continuing without brief context"

IF REQUIREMENTS.md found:
  Load it
  Log: "  -> REQUIREMENTS.md found: enriching direction scoping"
ELSE:
  Log: "  -> No REQUIREMENTS.md — continuing without requirements"
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
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 but writes NO files. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking probe) for faster execution. Recommend still runs but with --quick flag. |
| `--verbose` | Boolean | Show detailed progress, MCP probe results, timing per step. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Skip confirmation when IDT artifact already exists; auto-increment version. |
| `--diverge` | Boolean | Generate Stitch visual variants per direction using Experimental quota (Gemini Pro). Requires Stitch MCP connection. Falls back to text-only if quota insufficient or Stitch unavailable. |

</flags>

<process>

## /pde:ideate — Two-Pass Diverge-Converge Ideation Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--force`, `--diverge`.

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
  Check that .planning/ exists and is writable, then re-run /pde:ideate.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites and determine version

**Read PROJECT.md (hard requirement):**

Use the Read tool to load `.planning/PROJECT.md`.

If PROJECT.md does not exist, display the following error and HALT immediately:

```
Error: PROJECT.md not found at .planning/PROJECT.md
  /pde:ideate requires a project description to generate product directions.
  Run /pde:new-project first to initialize your project, then re-run /pde:ideate.
```

**Load soft dependencies via context_routing Glob patterns:**

Use the Glob tool for each soft dependency pattern. Load the most recent version of each found artifact using the Read tool.

**Check for existing IDT artifact and determine version N:**

Use the Glob tool to check if `.planning/design/strategy/IDT-ideation-v*.md` already exists.

- If **no IDT artifact exists**: proceed with version N = 1.
- If **IDT artifact exists AND `--force` flag NOT present**: prompt the user:
  ```
  An ideation artifact already exists (IDT-ideation-v1.md). Generate a new version?
  This will create IDT-ideation-v2.md without modifying the existing v1.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing ideation preserved at .planning/design/strategy/IDT-ideation-v1.md` and halt.
  If user answers "yes": determine N = max existing version + 1.
- If **IDT artifact exists AND `--force` flag present**: auto-increment. Scan for all `IDT-ideation-v*.md` files, find the maximum version number, set N = max + 1. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

**If `--dry-run` flag is active:** Display what WOULD be done and HALT:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/strategy/IDT-ideation-v{N}.md
  File: .planning/design/strategy/DESIGN-STATE.md (updated or created)

Passes: Diverge (5+ directions) then Converge (scored, recommended)
Recommend checkpoint: /pde:recommend --quick runs at diverge-converge transition

Prerequisites:
  PROJECT.md: found
  CMP artifact: {found v{N}|not found}
  OPP artifact: {found v{N}|not found}
  BRF artifact: {found v{N}|not found}
  REQUIREMENTS.md: {found|not found}

Estimated token usage: ~{estimate}
MCP enhancements planned: Sequential Thinking (direction generation depth)
```

Display: `Step 2/7: Prerequisites satisfied. PROJECT.md loaded. Version: v{N}.`

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

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe (quick mode -- no MCP overhead)
```

**Probe Sequential Thinking MCP:**

If not disabled via flags, attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available (analogous domain direction generation enabled)`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (degraded mode)`

**Probe Stitch MCP (when --diverge present):**

```
IF --diverge in $ARGUMENTS AND --no-mcp NOT in $ARGUMENTS:
  SET DIVERGE_STITCH = true
  Attempt to call stitch:generate-screen with a no-op probe (empty prompt or minimal test)
  Timeout: 10 seconds
  If tool responds: Log: "  -> Stitch MCP: available (visual divergence enabled)"
  If tool not found or errors:
    SET DIVERGE_STITCH = false
    Log: "  -> Stitch MCP: unavailable. Visual divergence disabled — text-only ideation."

  Check TOOL_MAP_VERIFY_REQUIRED:
  If any stitch:generate-screen or stitch:fetch-screen-image entries are marked TOOL_MAP_VERIFY_REQUIRED:
    Log: "  -> Warning: TOOL_MAP entries unverified. Run /pde:connect stitch --confirm for verified tool names."
    (Non-blocking — continue with unverified names)

IF --diverge NOT in $ARGUMENTS:
  SET DIVERGE_STITCH = false
```

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {available|unavailable}. Stitch visual divergence: {enabled|disabled}.`

---

### Step 4/7: DIVERGE — Generate minimum 5 directions

This is the core diverge pass. Generate minimum 5 distinct product directions based on PROJECT.md context and any loaded soft dependencies (CMP gaps, OPP opportunities, BRF personas).

**ZERO evaluative language in diverge output.** This is a non-negotiable constraint. Explicitly banned words in diverge output: "best", "recommended", "superior", "most promising", "strongest", "optimal", "ideal", "preferred". If any of these words appear in the diverge output, the skill has failed. Present each direction with equal weight and neutral language.

Each direction MUST be meaningfully distinct: different problem scope, technology approach, target user segment, or business model — not just naming variations.

Minimum 5 directions. More is appropriate if the problem space warrants it (wider competitive landscape, richer OPP artifact, or complex PROJECT.md context).

**Output format for each direction:**

```
### Direction {N}: {Name}
- **Core Concept:** {1-2 sentences describing what this direction builds}
- **Key Assumption:** {what must be true for this direction to succeed}
- **Open Question:** {what we don't know yet}
- **Target User:** {who benefits most from this direction}
- **Tech Approach:** {broad implementation approach, no comparative judgment}
```

Use soft dependency context to shape directions:
- CMP gap analysis: each gap may suggest a direction addressing that competitive whitespace
- OPP Now/Next/Later buckets: high-scoring opportunities may suggest directions
- BRF personas/JTBD: align directions to known user jobs-to-be-done
- REQUIREMENTS.md: ensure directions respect stated constraints

If Sequential Thinking MCP is available: use `mcp__sequential-thinking__think` to generate analogous-domain directions — apply solution patterns from adjacent industries (e.g., apply patterns from gaming to productivity, from logistics to healthcare, from finance to education). Tag directions generated this way: `[Enhanced by Sequential Thinking MCP -- analogous domain exploration]`

**After generating all directions, display the full diverge output with the ## Diverge Phase heading.**

**After diverge output, BEFORE proceeding to Step 5:**

Write intermediate IDT artifact to `.planning/design/strategy/IDT-ideation-v{N}.md` with the following content:

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:ideate (IDT)
Version: v{N}
Status: diverge-complete
Scope: "{M} directions diverged"
Enhanced By: "{Sequential Thinking MCP if used, or 'none'}"
---
```

File content structure:
```markdown
# Ideation: {product_name}

## Diverge Phase

{all direction blocks from the diverge pass}
```

Display: `Step 4/7: Diverge complete. {M} directions generated. Intermediate IDT artifact saved.`

---

### Step 4-STITCH: Visual variant generation (--diverge only)

Skip this entire section if DIVERGE_STITCH is false. Jump directly to Step 5/7.

**4-STITCH-A: Pre-flight Experimental quota check**

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkStitchQuota('experimental');
process.stdout.write(JSON.stringify(result));
EOF
```

Parse result JSON `{allowed, remaining, reason, pct, used, limit}`. Compute STITCH_BATCH_SIZE:

- If `remaining === 0` (quota exhausted): Display:
  ```
  Stitch Experimental quota exhausted (Experimental: {used}/{limit} used this month).
  Visual divergence unavailable. Proceeding with text-only ideation.
  ```
  SET DIVERGE_STITCH = false. Skip 4-STITCH-B through 4-STITCH-F entirely.

- If `remaining < DIRECTION_COUNT` (partial batch): SET `STITCH_BATCH_SIZE = remaining`. Display:
  ```
  Warning: {remaining} Experimental generation(s) remaining of {limit}. Generating visuals for first {remaining} direction(s) only.
  ```

- If `remaining >= DIRECTION_COUNT` (full batch): SET `STITCH_BATCH_SIZE = DIRECTION_COUNT`.

**4-STITCH-B: Compute isolated prompts per direction**

For each direction at index {i} from 1 to DIRECTION_COUNT, build an isolated Stitch prompt from that direction's text block ONLY:

```
"UI concept for: {direction_name}
Core concept: {direction_core_concept}
Target users: {direction_target_user}
Technology approach: {direction_tech_approach}
Generate a single screen visual showing the core UI proposition.
Style: clean product UI, no decorative illustration."
```

CRITICAL isolation rules:
1. No shared project_id across directions. Each direction generates into its own isolated call. If `generate_screen_from_text` requires a project_id, create a fresh project per direction via `stitch:create-project`. Do NOT reuse a single project for all directions (Design DNA would propagate, violating visual distinctiveness).
2. Prompt includes only the direction's own attributes. Does NOT reference other directions.
3. modelId MUST be `"GEMINI_3_PRO"` (Experimental quota). Do NOT use `"GEMINI_3_FLASH"` (that is Standard quota for wireframe, not ideation).

Collect all prompts into DIRECTION_PROMPTS array before proceeding.

**4-STITCH-C: Batch outbound consent (CONSENT-04)**

AskUserQuestion:
```
About to send concept descriptions to Google Stitch (stitch.withgoogle.com):

  Directions ({STITCH_BATCH_SIZE}):
  {for each direction up to STITCH_BATCH_SIZE: "  - Direction {i}: {direction_name}"}

  What will be sent: A text description of each direction's UI concept and target user.
  Model: Gemini Pro (Experimental — counts against 50/month limit)
  Quota: {remaining - STITCH_BATCH_SIZE} Experimental generation(s) remaining after this batch.
  Service: Google Stitch MCP (stitch.withgoogle.com)

Approve sending these prompts to Stitch? (yes / no)
```

If "no": SET DIVERGE_STITCH = false. Display: `Visual divergence cancelled by user. Proceeding with text-only ideation.` Skip 4-STITCH-D through 4-STITCH-F.

**4-STITCH-D: Per-direction visual generation loop (batch MCP — EFF-03)**

For each direction at index {i} from 1 to DIRECTION_COUNT:

  IF {i} > STITCH_BATCH_SIZE:
    Log: `Direction {i} ({name}): text-only (Experimental quota insufficient).`
    Mark direction as STITCH_FALLBACK_TEXT_ONLY. Continue to next direction.

  1. Call `stitch:generate-screen` (mapped via TOOL_MAP to `mcp__stitch__generate_screen_from_text`):
     - prompt: DIRECTION_PROMPTS[{i}]
     - modelId: "GEMINI_3_PRO"
     - (NO shared project_id — isolation required for visual distinctiveness)
     If call fails or times out (10-second budget): Mark as STITCH_FAILED. Log:
     ```
     Warning: Stitch generation failed for Direction {i} ({name}): {error message}.
     This direction will be text-only.
     ```
     Continue to next direction (do NOT abort).

  2. Capture screenId from response. Use DIRECTLY for next call.
     Do NOT call stitch:list-screens (confirmed list_screens state-sync bug).

  3. Call `stitch:fetch-screen-image` using screenId.
     Store as VARIANT_PNG (held in memory).
     Handle both base64 and binary formats:
     - If string starting with `data:` or looks like base64: decode with Buffer.from(content, 'base64')
     - Otherwise: treat as binary buffer

  4. Do NOT fetch HTML (no `stitch:fetch-screen-code` call). Ideation variants are PNG-only.

  5. Do NOT run annotation injection. Annotation is for HTML artifacts consumed by handoff — PNGs have no DOM to annotate.

  6. Inbound consent (CONSENT-02, CONSENT-03):
     AskUserQuestion:
     ```
     Received from Google Stitch:
       Direction {i}: {direction_name}
       Image: STH-ideate-direction-{i}.png (~{size}KB)
       Target: .planning/design/strategy/

     Persist this image? (yes / no)
     ```
     If "no": Skip persist for this direction. Log: `Skipping visual for Direction {i} per user decision.` Continue.

  7. Persist: Write VARIANT_PNG to `.planning/design/strategy/STH-ideate-direction-{i}.png`

  8. Increment Experimental quota:
     ```bash
     node --input-type=module <<'EOF'
     import { createRequire } from 'module';
     const req = createRequire(import.meta.url);
     const { incrementStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
     process.stdout.write(JSON.stringify(incrementStitchQuota('experimental')));
     EOF
     ```

End loop.

Display summary:
```
Visual divergence complete: {generated_count} visual(s) generated, {text_only_count} text-only direction(s).
```

**4-STITCH-E: Partial-batch fallback summary**

If any directions were marked STITCH_FALLBACK_TEXT_ONLY or STITCH_FAILED:
  Display: `{count} direction(s) did not receive visual variants. These will be scored on text descriptions only in the convergence step.`

The run NEVER aborts due to partial quota or per-direction failure. Text-only fallback is always the correct behavior.

**4-STITCH-F: Update IDT artifact with ## Visual Variants section**

Read the intermediate IDT artifact (written in Step 4/7 with Status: diverge-complete).
Insert a `## Visual Variants` section AFTER `## Diverge Phase` and BEFORE `## Recommend Checkpoint` (which will be added in Step 6/7):

```markdown
## Visual Variants

> Generated by /pde:ideate --diverge using Google Stitch (Experimental — Gemini Pro)
> Generated: {ISO 8601 date}

| Direction | Visual | Path |
|-----------|--------|------|
{for each direction 1..DIRECTION_COUNT:
  if STITCH_FALLBACK_TEXT_ONLY:
    "| Direction {i}: {name} | — | Stitch fallback: Experimental quota insufficient |"
  elif STITCH_FAILED:
    "| Direction {i}: {name} | — | Stitch fallback: generation error |"
  elif user declined inbound consent:
    "| Direction {i}: {name} | — | Stitch fallback: user declined |"
  else:
    "| Direction {i}: {name} | [View](STH-ideate-direction-{i}.png) | `.planning/design/strategy/STH-ideate-direction-{i}.png` |"
}
```

Write updated IDT artifact back to disk (still Status: diverge-complete at this point — Step 6/7 will update to ideation-complete).

Display: `Step 4-STITCH: Visual variants written to IDT artifact.`

---

### Step 5/7: Recommend checkpoint

Invoke recommend at the diverge-converge transition to surface tooling feasibility signals:

```
Skill("pde:recommend", "--quick")
```

**CRITICAL: Use Skill() — NEVER Task(). Task() causes Issue #686 nested-agent freeze. The recommend skill must be invoked as Skill(), not as a subagent via Task().**

After recommend completes:
- Use the Glob tool to find `.planning/design/strategy/REC-recommendations-v*.md` (most recent version)
- Read the latest REC artifact using the Read tool
- For each diverge direction, check if any recommended tool in the REC artifact is specifically relevant to that direction's tech approach
- Prepare a feasibility annotation for each direction: `"Feasibility note: {tool relevance summary or 'No specific tooling signal from recommend checkpoint'}"

Display: `Step 5/7: Recommend checkpoint complete. REC artifact consumed. Feasibility annotations prepared.`

---

### Step 6/7: CONVERGE — Score directions and recommend

Score each direction against a readiness rubric using 0-3 scales consistent with strategy-frameworks.md scoring vocabulary:

| Dimension | 0 | 1 | 2 | 3 |
|-----------|---|---|---|---|
| Goal Alignment | No connection to stated goals | Tangential connection to goals | Supports primary goal | Directly addresses core problem |
| Feasibility | Requires unavailable tech or resources | Significant unknowns requiring research | Achievable with known tools and team | Straightforward implementation with current stack |
| Distinctiveness | Duplicate of existing product in market | Minor variation on existing approach | Novel combination of existing patterns | Unique market position with clear differentiation |

**Visual variant detection (when --diverge was used):**

After loading the intermediate IDT artifact (Status: diverge-complete):
  IF artifact contains "## Visual Variants" section:
    SET HAS_VISUAL_VARIANTS = true
    Parse variant paths from the table (direction index -> PNG path or fallback note)
  ELSE:
    SET HAS_VISUAL_VARIANTS = false

**RULES:**
- Show scores for ALL directions — do not silently drop any direction.
- Include the feasibility annotation from Step 5 in each direction's scoring rationale.
- Produce an explicit recommended direction with rationale: clearly state why this direction over others.

**Scoring output format:**

```
## Converge Phase

IF HAS_VISUAL_VARIANTS:
  | Direction | Goal Alignment (0-3) | Feasibility (0-3) | Distinctiveness (0-3) | Total (/9) | Visual | Recommended |
  Per row: Visual column = "[View](STH-ideate-direction-{i}.png)" if PNG exists, else "text-only"
ELSE:
  | Direction | Goal Alignment (0-3) | Feasibility (0-3) | Distinctiveness (0-3) | Total (/9) | Recommended |
  (unchanged — backwards-compatible with non-diverge runs)

| {name} | {score} | {score} | {score} | {total} | {* if recommended} |

### Scoring Rationale

{Per-direction rationale including feasibility annotation from recommend checkpoint}

## Recommended Direction
**{Direction Name}**
- **Rationale:** {why this direction is recommended over the alternatives}
- **Key Assumptions:** {assumptions that must hold for this direction to succeed}
- **Primary Risks:** {top 2-3 risks specific to this direction}
- **Feasibility Note:** {from recommend checkpoint tooling signal}
```

**After converge scoring and recommended direction, write the ## Brief Seed section** using the EXACT field schema from `templates/brief-seed.md`:

```markdown
## Brief Seed

> Auto-generated from recommended direction. Consumable by /pde:brief.

### Problem Statement
{Derived from recommended direction's core concept and PROJECT.md product description}

### Product Type
{From PROJECT.md product type detection or BRF artifact if present}
<!-- Experience product type — Phase 74 stub: experience ideation follows the same divergent concept generation pattern. Experience-specific ideation extensions (venue layouts, run-of-show concepts, spatial experience concepts) added in subsequent phases. Current behavior: proceed with software ideation path as temporary fallback for experience product type. -->

### Platform
{From PROJECT.md target platform}

### Target Users
- **{Role}:** {Goal} -- {Pain points derived from recommended direction's target user and open question}

### Scope Boundaries
**In scope:** {What the recommended direction covers — its core concept scope}
**Out of scope:** {What is explicitly excluded — other directions not chosen, features deferred}

### Constraints
| Constraint | Type | Impact |
|------------|------|--------|
| {constraint derived from recommended direction's key assumption or PROJECT.md} | {hard/soft} | {impact on design} |

### Key Decisions
| Decision | Rationale | Provenance |
|----------|-----------|------------|
| {direction choice: name of recommended direction} | {scoring rationale from converge} | ideation-recommended |

### Risk Register
| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| {from recommended direction's primary risks} | {H/M/L} | {H/M/L} | {mitigation approach} |

### Next Steps
- Run /pde:brief to generate full design brief from this seed
- {Additional recommended follow-up based on open questions from recommended direction}
```

**Update IDT artifact** — overwrite the intermediate file written in Step 4. The updated file changes Status from `diverge-complete` to `ideation-complete` and adds all converge sections:

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:ideate (IDT)
Version: v{N}
Status: ideation-complete
Scope: "{M} directions diverged, {recommended direction name} recommended"
Enhanced By: "{Sequential Thinking MCP if used, or 'none'}"
---
```

File content structure:
```markdown
# Ideation: {product_name}

## Diverge Phase

{all direction blocks from Step 4}

## Recommend Checkpoint

REC artifact consumed: {REC artifact path}
Feasibility annotations applied to all {M} directions.

## Converge Phase

{scoring table}

### Scoring Rationale

{per-direction rationale with feasibility annotations}

## Recommended Direction

{recommended direction block}

## Brief Seed

{brief seed section}
```

Display: `Step 6/7: Converge complete. {Direction Name} recommended. IDT artifact finalized.`

---

### Step 7/7: Update DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-ideate)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds, then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-ideate)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:ideate.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add IDT row if not already present:
   ```
   | IDT | strategy | REC (auto), CMP (optional), OPP (optional) | current |
   ```

2. **Decision Log** — append entry:
   ```
   | IDT | ideation complete, {M} directions diverged, {recommended direction name} recommended | {date} |
   ```

3. **Iteration History** — append entry:
   ```
   | IDT-ideation-v{N} | v{N} | Created by /pde:ideate | {date} |
   ```

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest — 7-call artifact registration pattern:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT code IDT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT name "Ideation"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT type ideation
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT path ".planning/design/strategy/IDT-ideation-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update IDT version {N}
```

**Set coverage flag — 13-field pass-through-all pattern:**

First, read all 13 current coverage flags to avoid overwriting them:

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON result. Extract all 14 flags (default absent flags to `false`):
- Canonical 14-field order: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`

Then write the FULL 14-field JSON, setting `hasIdeation` to `true` and passing all other flags through unchanged:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":true,"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'
```

**IMPORTANT:** Replace each `{current}` placeholder with the actual boolean value read from coverage-check. NEVER use dot-notation for this field. ALWAYS write all 14 fields. The canonical field order is: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated. hasIdeation: true.`

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/strategy/IDT-ideation-v{N}.md |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Directions diverged | {M} |
| Recommended direction | {name} |
| Next suggested skill | /pde:brief |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {list or "none"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER use Task() to invoke recommend. Use Skill("pde:recommend", "--quick"). Task() causes Issue #686 nested-agent freeze. The Skill() invocation runs recommend as a composable subroutine, not a spawned agent.
- NEVER include evaluative language in diverge output. Banned words: "best", "recommended", "superior", "most promising", "strongest", "optimal", "ideal", "preferred". These words collapse the diverge pass into premature convergence.
- NEVER skip writing the intermediate IDT artifact between diverge and converge. The file MUST transition from `Status: diverge-complete` to `Status: ideation-complete` — this two-write pattern is the audit trail of the two-pass structure.
- NEVER omit the ## Brief Seed section. /pde:brief parses this section by exact heading. If the heading is absent or misspelled, the downstream consumption contract is broken.
- NEVER use dot-notation for designCoverage. Always write full 13-field JSON via pass-through-all. Writing `{"hasIdeation":true}` alone erases the other 12 flags.
- NEVER skip coverage-check before writing designCoverage. Always read existing flags and pass them all through.
- ALWAYS release write lock even on error. The lock has a 60s TTL but releasing immediately prevents blocking other skills.
- NEVER present fewer than 5 directions in the diverge pass. The minimum 5 constraint prevents premature narrowing. If the problem space is rich, generate more.
- NEVER silently drop any direction from the converge scoring. All diverge directions MUST appear in the converge scoring table.
- NEVER run the 4-STITCH visual diverge BEFORE text directions in Step 4 complete. Stitch prompts are built from text direction content. Step 4-STITCH runs AFTER Step 4/7, not in parallel.
- NEVER share a project_id across directions in 4-STITCH-D. Each direction must be generated in isolation to ensure visually distinct variants. Design DNA propagation violates IDT-01.
- NEVER use modelId "GEMINI_3_FLASH" for ideation. Ideation uses Experimental quota (GEMINI_3_PRO). Using Flash would debit Standard quota.
- NEVER fetch HTML (stitch:fetch-screen-code) for ideation variants. PNG-only. HTML fetch is unnecessary MCP overhead for visual thumbnails.
- NEVER apply annotation injection to ideation PNGs. Annotation is for HTML artifacts consumed by handoff. PNGs have no DOM.
- NEVER abort the entire ideation run due to partial Experimental quota or per-direction Stitch failure. Text-only fallback is always the correct behavior.
- NEVER use inline CommonJS module loading in ESM workflow bash blocks. Always use the createRequire pattern (node --input-type=module with `import { createRequire } from 'module'`) to load mcp-bridge.cjs.

</process>

<output>
- `.planning/design/strategy/IDT-ideation-v{N}.md` — the primary IDT artifact (diverge + recommend checkpoint + converge + brief seed)
- `.planning/design/strategy/DESIGN-STATE.md` — strategy domain state (updated with IDT entry)
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Dependency Map, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with IDT artifact entry and hasIdeation coverage flag
</output>
