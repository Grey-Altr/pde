<purpose>
Map user journeys from the product brief as Mermaid flowchart diagrams per persona, and extract a machine-readable screen inventory that downstream wireframe consumption requires. Produces versioned flow documents with happy paths, decision branches, and error states per persona journey, plus a fixed-path JSON screen inventory that /pde:wireframe reads as its canonical screen list.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/business-track.md
@references/business-financial-disclaimer.md
@references/launch-frameworks.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, detected personas, estimated journey count. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking MCP probe) for faster execution. |
| `--verbose` | Boolean | Show detailed progress and MCP probe results, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Skip the confirmation prompt when flow documents already exist and auto-increment to the next version. |
</flags>

<process>

## /pde:flows — User Flow Mapping Pipeline

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
  Check that .planning/ exists and is writable, then re-run /pde:flows.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites

**Read the brief (soft dependency):**

Use the Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. Sort all matches descending by version number (parse the `v{N}` suffix), then read the highest version using the Read tool.

If no brief found, display the following WARNING (never halt — this is never an error):

```
Warning: No design brief found.
  /pde:flows produces richer output when a brief exists.
  Run /pde:brief first for better results, or continue without it.
```

Continue without brief — Claude uses `.planning/PROJECT.md` as fallback context to identify user types and journeys. Use the Read tool to load `.planning/PROJECT.md` as fallback context.

**If brief found**, extract the following from the brief content:
- All personas (names, roles, goals, pain points) from the Target Users section
- Product name and product type from the brief frontmatter or Product Type section
- Key user goals and tasks from Jobs to Be Done section
- Constraints that affect user flow (e.g., offline-first, accessibility requirements, platform constraints)

<!-- Experience product type — Phase 74 architecture: temporal, spatial, and social flow diagrams implemented in Phase 77. See Step 4-EXP experience block for TFL/SFL/SOC generation. Software products skip this block entirely. -->

**Version gate (existing flow documents):**

Use the Glob tool to check for `.planning/design/ux/FLW-flows-v*.md`. Sort all matches descending by version number (parse the `v{N}` suffix), find the maximum version N.

- If N > 0 AND `--force` flag is NOT present: prompt the user:
  ```
  Flow documents already exist (FLW-flows-v{N}.md). Generate a new version?
  This will create FLW-flows-v{N+1}.md without modifying the existing v{N}.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing flows preserved at .planning/design/ux/FLW-flows-v{N}.md` and halt.
  If user answers "yes": set version to N + 1.
- If N > 0 AND `--force` flag IS present: auto-increment to N + 1. Log: `  -> --force flag detected, auto-incrementing to v{N+1}.`
- If N = 0 (no existing flow documents): set version to 1.

**If `--dry-run` flag is active:** Display planned output at end of Step 2:

```
Dry run mode. No files will be written.

Planned output:
  File: .planning/design/ux/FLW-flows-v{N}.md
  File: .planning/design/ux/FLW-screen-inventory.json
  File: .planning/design/ux/DESIGN-STATE.md (if it does not exist)

Source brief: {brief path or "none — using PROJECT.md"}
Detected personas: {comma-separated list of persona names or "TBD from PROJECT.md"}
Estimated journey count: {estimated N journeys}

MCP enhancements: {Sequential Thinking: available/unavailable}
```
HALT — do not write files in dry-run mode.

Display: `Step 2/7: Prerequisites satisfied. Brief: v{X} loaded (or "no brief"). Flow version: v{N}.`

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
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (continuing without)`

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {available | unavailable}.`

---

### Step 4/7: Generate flow diagrams

This is the core generation step. Claude synthesizes and generates all diagram content in memory before writing to files in Step 5.

**Business mode detection (cached for Steps 4f, 4g, 5, and 7):**

```bash
BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
if [[ "$BM" == @file:* ]]; then BM=$(cat "${BM#@file:}"); fi
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)
if [[ "$BT" == @file:* ]]; then BT=$(cat "${BT#@file:}"); fi
```

Cache `$BM` and `$BT` for use in Steps 4f, 4g, 5, and 7.

**IF `PRODUCT_TYPE == "experience"`:** skip Steps 4a through 4e (software path) and jump to Step 4-EXP below.

#### Step 4-EXP: Experience flow generation (experience products only)

Read the experience brief fields from BRIEF.md:
- `VIBE_CONTRACT` — from Vibe Contract section (emotional arc, peak timing, energy level, aesthetic register)
- `VENUE_CONSTRAINTS` — from Venue Constraints section (capacity, curfew, noise limits, load-in windows, fixed infrastructure)
- `AUDIENCE_ARCHETYPE` — from Audience Archetype section (crowd composition, mobility needs, group size, energy profile)

Read `SYS-experience-tokens.json` if present (soft dependency):
- Extract `spatial.zone-count.$value` for ZONE_COUNT
- Extract `spatial.density-target.$value` for DENSITY_TARGET
- If file absent: set ZONE_COUNT = "3-5 zones (estimated)", DENSITY_TARGET = "moderate"

Generate three experience flow diagrams (held in memory):

##### TFL: Temporal Flow Diagram (FLOW-01)

Generate a Mermaid `flowchart LR` representing the eight-stage attendee emotional arc. Each stage is a node; transitions show timing/triggers derived from the Vibe Contract energy level and peak timing.

```mermaid
flowchart LR
    TFL_1["Awareness\n(pre-event discovery)"]
    TFL_2["Anticipation\n(ticket purchase → doors)"]
    TFL_3["Arrival\n(entry funnel, first impressions)"]
    TFL_4["Immersion\n(settling in, zone exploration)"]
    TFL_5["Peak\n(headline act / peak energy)"]
    TFL_6["Comedown\n(post-peak transition)"]
    TFL_7["Departure\n(exit flow, transport)"]
    TFL_8["Afterglow\n(social media, memory)"]

    TFL_1 -->|"ticket purchase"| TFL_2
    TFL_2 -->|"doors open"| TFL_3
    TFL_3 -->|"entry complete"| TFL_4
    TFL_4 -->|"peak act begins"| TFL_5
    TFL_5 -->|"set ends"| TFL_6
    TFL_6 -->|"curfew approach"| TFL_7
    TFL_7 -->|"post-event"| TFL_8
```

Node IDs use `TFL_{N}` prefix. Customize stage descriptions and transition labels using the Vibe Contract (peak timing drives the TFL_4->TFL_5 transition label; energy level drives descriptive text in each node annotation).

Below the diagram, generate a **Temporal Analysis** table:

```markdown
| Stage | Duration Estimate | Energy Level | Key Design Consideration |
|-------|-------------------|--------------|--------------------------|
| Awareness | Weeks/days pre-event | Low | Discovery channels, ticket design |
| Anticipation | Days to hours | Building | Communication cadence, pre-event content |
| Arrival | 30-60 min | Medium-high | Queue management, first impression |
| Immersion | 1-3 hours | High | Zone exploration, wayfinding |
| Peak | 30-90 min | Maximum | Crowd density, safety, sightlines |
| Comedown | 30-60 min | Declining | Transition spaces, hydration |
| Departure | 30-60 min | Low | Exit flow, transport, coat check |
| Afterglow | Post-event | Warm | Social sharing, feedback collection |
```

Customize durations and energy levels based on Venue Constraints (curfew affects departure timing) and Vibe Contract (energy arc).

##### SFL: Spatial Flow Diagram (FLOW-02)

Generate a Mermaid `flowchart TD` representing crowd movement through physical zones. Nodes are locations/zones; edges show movement with capacity and bottleneck annotations.

```mermaid
flowchart TD
    SFL_ENTRY["Entry Funnel\n(ticket scan, bag check)"]
    SFL_FOYER["Arrival Foyer\n(capacity: {venue_capacity * 0.15})"]
    SFL_ZONE1["Main Floor\n(density: {DENSITY_TARGET})"]
    SFL_ZONE2["Secondary Zone\n(bar, chill area)"]
    SFL_ZONE3["Outdoor / Smoking"]
    SFL_EGRESS["Emergency Egress\n(all zones)"]
    SFL_EXIT["Exit Funnel\n(late-night transport)"]

    SFL_ENTRY -->|"ingress flow"| SFL_FOYER
    SFL_FOYER -->|"BOTTLENECK: entry pinch"| SFL_ZONE1
    SFL_FOYER --> SFL_ZONE2
    SFL_ZONE1 <--> SFL_ZONE2
    SFL_ZONE2 <--> SFL_ZONE3
    SFL_ZONE1 -->|"EMERGENCY"| SFL_EGRESS
    SFL_ZONE2 -->|"EMERGENCY"| SFL_EGRESS
    SFL_ZONE3 -->|"EMERGENCY"| SFL_EGRESS
    SFL_ZONE1 -->|"curfew"| SFL_EXIT
```

Node IDs use `SFL_` prefix. Zone count and names derive from `spatial.zone-count` token and Venue Constraints. Bottleneck annotations on edges use `BOTTLENECK:` prefix for downstream Phase 78 floor plan detection. Every zone must have an `EMERGENCY` edge to `SFL_EGRESS`.

Below the diagram, generate a **Zone Capacity Analysis** table:

```markdown
| Zone | Estimated Capacity | Density Target | Mood | Adjacent Zones |
|------|-------------------|----------------|------|----------------|
| Entry Funnel | {venue_capacity * 0.05} | controlled | anticipation | Foyer |
| Arrival Foyer | {venue_capacity * 0.15} | moderate | welcome | Main Floor, Secondary |
| Main Floor | {venue_capacity * 0.55} | {DENSITY_TARGET} | peak energy | Secondary, Egress |
| Secondary Zone | {venue_capacity * 0.20} | moderate | social | Main Floor, Outdoor |
| Outdoor | {venue_capacity * 0.05} | low | decompression | Secondary |
```

##### SOC: Social Flow Diagram (FLOW-03)

Generate a Mermaid `flowchart TD` representing attendee social modes and interaction points. Nodes distinguish solo arrivals, group arrivals, meeting points, stranger interaction zones, and dancefloor density dynamics.

```mermaid
flowchart TD
    SOC_SOLO["Solo Arrival"]
    SOC_GROUP["Group Arrival"]
    SOC_MEET["Meeting Point\n(designated area)"]
    SOC_BAR["Bar / Social Zone\n(stranger interaction)"]
    SOC_DANCE["Dancefloor\n(collective energy)"]
    SOC_CHILL["Chill Zone\n(conversation possible)"]
    SOC_SHARED["Shared Experience\n(peak moment)"]

    SOC_SOLO -->|"find friends"| SOC_MEET
    SOC_GROUP -->|"arrive together"| SOC_MEET
    SOC_SOLO -->|"explore alone"| SOC_BAR
    SOC_MEET -->|"move to music"| SOC_DANCE
    SOC_BAR -->|"meet strangers"| SOC_DANCE
    SOC_DANCE -->|"need break"| SOC_CHILL
    SOC_CHILL -->|"re-energize"| SOC_DANCE
    SOC_DANCE -->|"peak act"| SOC_SHARED
    SOC_BAR --> SOC_CHILL
```

Node IDs use `SOC_` prefix. Customize node descriptions using Audience Archetype (group size distribution, energy profile). Below the diagram, generate a **Social Dynamics Analysis** noting solo vs group arrival ratio, stranger interaction probability, and dancefloor density expectations derived from Audience Archetype.

##### Spaces Inventory JSON (FLOW-04)

Build a `SPACES_INVENTORY` JSON object conforming to this exact schema:

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "{ISO 8601 date}",
  "source": "Phase 77 — /pde:flows experience block",
  "venueCapacity": "{capacity from Venue Constraints}",
  "zones": [
    {
      "id": "zone-{kebab-case-name}",
      "name": "{Zone Display Name}",
      "capacity": "{number}",
      "densityTarget": "{high|moderate|low}",
      "mood": "{mood from spatial tokens or brief}",
      "adjacentTo": ["{zone-id}", "..."],
      "sightlines": "{description}"
    }
  ],
  "bottlenecks": [
    {
      "location": "{location name}",
      "type": "{ingress|egress|internal}",
      "zoneId": "{zone-id}",
      "mitigationNote": "{recommendation}"
    }
  ],
  "emergencyEgress": [
    {
      "zoneId": "{zone-id}",
      "exitPath": "{description}",
      "estimatedEvacTimeSec": "{number}"
    }
  ]
}
```

Zone data derives from the SFL spatial flow diagram zones. Capacity estimates from Venue Constraints; density targets from SYS-experience-tokens.json spatial category; mood from spatial tokens or Vibe Contract.

After generating all four experience artifacts in memory:

**IF `$BM == "true"`:** proceed to Step 4f below (business artifacts apply to experience+business compositions too) before jumping to Step 5-EXP.

**ELSE:** jump directly to Step 5-EXP.

**End experience flow generation block.** Non-experience products skip this entire Step 4-EXP and proceed to Step 4a as before.

---

#### 4a: Persona and journey identification

**If brief is available:**
- Extract each persona from the brief's Target Users section
- For each persona, identify 2-4 major journeys — each journey represents a major user goal (e.g., "New User Onboarding", "Password Reset", "Core Task Completion", "Account Management")
- A single persona may have multiple journey sections; all journeys for one persona are included in the same FLW document

**If no brief:**
- Read `.planning/PROJECT.md` to identify obvious user types (at minimum: identify the primary user)
- Infer 2-3 core journeys per user type from the project description and stated goals

**If SEQUENTIAL_THINKING_AVAILABLE:**
- Use `mcp__sequential-thinking__think` with prompt: `"Review the following product context and identify all major user journeys. For each journey, reason through: (1) the happy path steps, (2) the key decision points the user or system encounters, (3) the error states that require UI screens. Context: [brief or PROJECT.md content summary]"`
- Use the structured reasoning output to inform journey identification and branch coverage before generating diagrams
- Tag each journey section that benefited from Sequential Thinking reasoning with: `[Enhanced by Sequential Thinking MCP -- journey branch analysis]`

#### 4b: Overview diagram

Generate a top-level overview diagram showing all journeys as a hub-and-spoke from the product entry point. Follow the template's Overview section format exactly:

```mermaid
flowchart TD
    START["Product Entry"]
    J1["{Journey 1 Name}"]
    J2["{Journey 2 Name}"]
    J3["{Journey 3 Name}"]
    OUTCOME_J1["{Journey 1 Outcome}"]
    OUTCOME_J2["{Journey 2 Outcome}"]
    OUTCOME_J3["{Journey 3 Outcome}"]

    START --> J1
    START --> J2
    START --> J3
    J1 --> OUTCOME_J1
    J2 --> OUTCOME_J2
    J3 --> OUTCOME_J3
```

Add all journeys from all personas to this overview — it is a product-level summary, not per-persona.

#### 4c: Per-journey diagrams

For each journey, generate a `## Journey {N}: {Journey Name}` section with:

- **User:** {persona name}
- **Goal:** {what the user wants to accomplish}
- **Entry point:** {where the user starts in the product}

Followed by a Mermaid `flowchart TD` diagram following these node ID and shape rules:

**Node ID rules (MANDATORY):**
- Screen nodes: `J{N}_{step}["Label"]` — rectangular brackets (e.g., `J1_1["Welcome Screen"]`)
- Decision nodes: `J{N}_{step}{"Label?"}` — curly braces, diamond shape (e.g., `J1_2{"Has account?"}`)
- Error nodes: `J{N}_ERR{n}["Error description"]` — rectangular brackets with `style J{N}_ERR{n} fill:#fee,stroke:#c33` (e.g., `J1_ERR1["Invalid email error"]`)
- Terminal nodes: `J{N}_DONE["Completion label"]` — NEVER use bare `end` as a node ID (Mermaid reserved keyword; use `J{N}_DONE` or `J{N}_END`)
- All node labels in double quotes
- All node IDs prefixed with journey number (J1_, J2_, etc.) to prevent ID collisions when the overview combines all journeys

**Edge rules:**
- Edge labels using `-->|label|` syntax for decision branches: `-->|Yes|`, `-->|No|`, `-->|Success|`, `-->|Failure|`
- Error nodes must have a recovery path: link back to a retry step OR show a dead-end with a clear terminal label

**Minimum content requirements per journey:**
- At minimum: 3 screen nodes, 1 decision node, 1 error node
- Decision nodes represent real user choices or system validation points (e.g., "Is email valid?", "Has account?", "Meets criteria?", "Payment authorized?")
- Error nodes represent real UI error states that require wireframing (e.g., "Form validation error", "Payment declined", "Permission denied", "Network timeout")

**Example journey section:**

```
## Journey 1: New User Onboarding

**User:** First-time User
**Goal:** Create an account and complete initial setup
**Entry point:** Landing page / marketing site

```mermaid
flowchart TD
    J1_1["Landing Page"]
    J1_2["Sign Up Form"]
    J1_3{"Email already registered?"}
    J1_4["Email Verification Sent"]
    J1_5{"Email verified?"}
    J1_ERR1["Email already in use error"]
    J1_ERR2["Verification timeout error"]
    J1_6["Account Setup Complete"]
    J1_DONE["Dashboard — Journey Complete"]

    J1_1 --> J1_2
    J1_2 --> J1_3
    J1_3 -->|No| J1_4
    J1_3 -->|Yes| J1_ERR1
    J1_ERR1 --> J1_2
    J1_4 --> J1_5
    J1_5 -->|Yes| J1_6
    J1_5 -->|No| J1_ERR2
    J1_ERR2 --> J1_4
    J1_6 --> J1_DONE

    style J1_ERR1 fill:#fee,stroke:#c33
    style J1_ERR2 fill:#fee,stroke:#c33
\```
```

**Step Descriptions subsection (mandatory for each journey):**

After the Mermaid block, add a `### Step Descriptions` section with numbered descriptions for each node in the diagram:

```
### Step Descriptions

1. **J1_1 - Landing Page:** User arrives at the marketing landing page; calls-to-action drive sign-up flow.
2. **J1_2 - Sign Up Form:** User enters email, password, and display name. Submit triggers validation.
3. **J1_3 - Email already registered? (DECISION):** System checks if the submitted email exists in the database.
4. **J1_4 - Email Verification Sent:** System sends a verification email; user is shown a confirmation screen with instructions.
5. **J1_5 - Email verified? (DECISION):** System checks whether the user has clicked the verification link.
6. **J1_ERR1 - Email already in use (ERROR):** Error state shown when submitted email is already registered. Offers "Sign in instead" and "Reset password" CTAs.
7. **J1_ERR2 - Verification timeout (ERROR):** Error state shown when verification email is not confirmed within the session. Offers "Resend verification email" CTA.
8. **J1_6 - Account Setup Complete:** User completes post-registration steps (profile info, preferences).
9. **J1_DONE - Dashboard — Journey Complete:** User lands on the main dashboard; onboarding journey is complete.
```

#### Transition annotations on screen-to-screen edges (FLOW-01)

For every edge between two screen nodes, annotate the visual transition mechanism using parenthetical notation appended to the edge label:

**Format:**
```mermaid
J1_1 -->|"CTA click (slide-up)"| J1_2
J1_3 -->|"No (fade)"| J1_ERR1
J1_4 -->|"Verified (morph-expand)"| J1_DONE
```

**Transition vocabulary — use exactly these terms:**

| Category | Variants | When to Use |
|----------|----------|-------------|
| `slide-right` / `slide-left` / `slide-up` / `slide-down` | Directional slide | Navigation with a clear hierarchy (forward/back, deeper/up) |
| `fade` | Cross-dissolve | Parallel screens with no directional hierarchy; modal/overlay contexts; error states |
| `morph` / `morph-expand` / `morph-collapse` | Element expands to become next screen | Card-to-detail, button-to-form-reveal, thumbnail-to-full |
| `shared-element` | Named element visually persists between screens | Product image in cart, avatar in profile, hero expanding to detail |

**RULE — Screen-to-screen edges only:** Annotate ONLY edges between rectangular screen nodes (`["Screen Name"]`). Decision node branches (`{Decision text}` curly brace shape) get their existing semantic label (Yes/No/Success/Error) but do NOT get a transition annotation — logical branches are not visual transitions.

**Annotation placement:**
- Inline: Append `(transition-type)` to the existing edge label — `-->|"Yes (slide-right)"|`
- If the edge has no existing label: `-->|"(fade)"|`
- Decision node edge with semantic label stays semantic only: `-->|"No"|` (no transition)

**Step Descriptions extension:** After the narrative description for each screen node in the `### Step Descriptions` subsection, add a transition rationale line for each outgoing screen-to-screen edge:

```
4. **J1_4 - Email Verification Screen:** Confirmation with "Check your email" message.
   → Transition to J1_5: `morph-expand` — verification confirmation expands to fill dashboard layout, communicating "you've arrived."
```

**Include error state transitions:** Annotate ALL screen-to-screen edges including error state paths. Error transitions are typically `fade` — fast to document and gives engineers the same information. Decision branches that lead directly to error screens should annotate the edge from the error screen outward (if one exists), not the decision branch itself.

**Deprecated vocabulary:** Do NOT use "push" or "pop" (older iOS UIKit convention). Do NOT use `@scroll-timeline` at-rule in any transition recommendation — use `animation-timeline` CSS property. Transition annotations are visual mechanism descriptions, not implementation recommendations — save implementation details for handoff.md `### Implementation Notes`.

#### 4d: Flow summary table

After all journey sections, generate the flow summary table matching the template format:

```
## Flow Summary

| Journey | Steps | Decision Points | Error States | Complexity |
|---------|-------|-----------------|--------------|------------|
| {Journey 1 Name} | {count of screen nodes} | {count of decision nodes} | {count of error nodes} | {low/medium/high} |
```

Complexity guidance: low = 1-2 decision points; medium = 3-4 decision points; high = 5+ decision points or 3+ error states.

#### 4e: Screen inventory extraction

After generating all flow diagrams, extract unique screen nodes into the JSON object that will be written as `FLW-screen-inventory.json`.

**Node type inclusion rules:**
- **Include** rectangular screen nodes: lines matching `J{N}_{step}["label"]` pattern (nodes NOT in a `style` line with `fill:#fee`)
- **Include** error nodes: nodes whose IDs appear in a `style ... fill:#fee` line — include these with `"type": "error"`
- **Exclude** decision nodes: lines matching `J{N}_{step}{"label?"}` pattern (curly braces — diamond shape)
- **Exclude** terminal/completion nodes: `J{N}_DONE`, `J{N}_END`, `J{N}_COMPLETE`
- **Exclude** overview diagram nodes: `START`, `OUTCOME_*`

**For each included node, construct:**
- `slug`: `label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')`
- `label`: the original node label text (the string inside the `["..."]` brackets)
- `journey`: parent journey ID (e.g., `"J1"`, `"J2"`)
- `journeyName`: the journey's `## Journey {N}: {Journey Name}` title text
- `persona`: the journey's `**User:**` field value
- `type`: `"error"` if the node ID appears in a `style ... fill:#fee` line, else `"screen"`

**Deduplication rule:** If the same screen label appears in multiple journeys, emit one entry per journey occurrence. The wireframe skill may need distinct states per journey context (e.g., "Dashboard" after onboarding vs. "Dashboard" for a returning user).

**Screen inventory JSON structure:**

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "{ISO 8601 date}",
  "source": ".planning/design/ux/FLW-flows-v{N}.md",
  "screens": [
    {
      "slug": "{kebab-case-slug}",
      "label": "{original node label}",
      "journey": "J{N}",
      "journeyName": "{journey title}",
      "persona": "{persona name}",
      "type": "screen"
    }
  ]
}
```

Display: `Step 4/7: Flow diagrams generated. {total journey count} journeys across {persona count} personas. {total screen count} screens in inventory (excluding decisions and terminals).`

---

#### Step 4f: Service Blueprint generation (business mode only)

**IF `$BM == "true"` AND `$BT` is not null:**

Read `@references/launch-frameworks.md` for the canonical 5-lane service blueprint Mermaid template.
Read `@references/business-track.md` for track depth thresholds (Service blueprint row).

Generate a 5-lane service blueprint as a Mermaid `sequenceDiagram` held in memory. Use the EXACT participant declarations:

```mermaid
sequenceDiagram
    participant C as Customer Actions
    participant F as Frontstage
    participant B as Backstage
    participant S as Support Processes
    participant E as Physical Evidence
```

Use `Note over C,E: [Stage Name]` to mark each journey stage (spanning ALL 5 participants — this represents the line of visibility divider). Between frontstage and backstage stages, insert `Note over C,E: LINE OF VISIBILITY`.

**Track depth differentiation:**

**IF `$BT == "solo_founder"`:**
Generate single-product SBP:
- 3-4 journey stages: Awareness, Onboarding, First Value, Retention
- Each stage: `Note over C,E: [Stage]` + `C->>F:` + `F->>B:` + `B->>S:` + `Note over E:`
- Core touchpoints only — no channel variants, no alt blocks
- All financial references use `[YOUR_X]` placeholder format per `business-financial-disclaimer.md`

**IF `$BT == "startup_team"`:**
Generate multi-channel SBP:
- 4-5 journey stages with channel branching
- `alt` blocks within stages for web vs mobile vs email channels
- Support Processes lane populated with tools (CRM, email platform, analytics)
- Frontstage shows distinct touchpoints per channel
- All financial references use `[YOUR_X]` placeholder format

**IF `$BT == "product_leader"`:**
Generate cross-functional SBP:
- 5+ stages including stakeholder handoffs
- Frontstage includes both user-facing and internal stakeholder interactions
- Backstage includes organizational handoffs (team handoffs, department boundaries)
- After the Mermaid diagram, add a supplementary Stakeholder Map table:
  `| Role | Stage | Responsibility | Handoff To |`
- All financial references use `[YOUR_X]` placeholder format

SET flag: `SBP_CONTENT_GENERATED=true`

Also generate a Stage Breakdown table (all tracks):
```
| Stage | Customer Action | Frontstage | Backstage | Support | Evidence |
```

**ELSE (`$BM != "true"`):** Skip silently. Set `SBP_CONTENT_GENERATED=false`. Continue to Step 4g.

Display (if generated): `  -> Service blueprint generated ({stage_count} stages, {track} track depth)`

---

#### Step 4g: GTM Channel Flow generation (business mode only)

**IF `$BM == "true"` AND `SBP_CONTENT_GENERATED == true`:**

Generate a GTM channel flow as a Mermaid `flowchart LR` with three subgraph stages held in memory. Use self-contained subgraphs — connect ONLY at the subgraph level (`ACQ --> CONV --> RET`), NEVER link individual nodes across subgraph boundaries (this would override subgraph internal `direction TB`).

Structure:

```mermaid
flowchart LR
    subgraph ACQ["Acquisition"]
        direction TB
        A1["[Channel] [Priority: HIGH/MEDIUM/LOW]"]
    end

    subgraph CONV["Conversion"]
        direction TB
        C1["[Touchpoint]"]
    end

    subgraph RET["Retention"]
        direction TB
        R1["[Touchpoint]"]
    end

    ACQ -->|"funnel entry"| CONV
    CONV -->|"activated"| RET
```

**Track depth differentiation:**

**IF `$BT == "solo_founder"`:**
- Acquisition: 3 channels (Content marketing [HIGH], Word-of-mouth [HIGH], Direct outreach [MEDIUM])
- Conversion: 2 touchpoints (Landing page, Free trial/demo)
- Retention: 2 touchpoints (Email sequence, Core feature adoption)

**IF `$BT == "startup_team"`:**
- Acquisition: 5+ channels with priority labels (Paid ads [HIGH], Content [HIGH], Referrals [MEDIUM], Product Hunt [MEDIUM], Partnerships [LOW])
- Conversion: 4 touchpoints (Landing page, Free trial signup, Onboarding flow, First value milestone)
- Retention: 3 touchpoints (Onboarding emails, Feature adoption nudges, Referral invite)

**IF `$BT == "product_leader"`:**
- Acquisition: 5+ channels with org ownership labels (Enterprise sales [HIGH], Inbound [HIGH], Partner channel [MEDIUM], ABM [MEDIUM], Events [LOW])
- Conversion: 4 touchpoints (Procurement/legal review, Pilot, POC, Contract)
- Retention: 3 touchpoints (CSM onboarding, QBR, Expansion opportunities)

Also generate a Channel Priority Annotations table:
```
| Channel | Stage | Priority | Notes |
```

SET flag: `GTM_CONTENT_GENERATED=true`

**ELSE:** Skip silently. Set `GTM_CONTENT_GENERATED=false`.

Display (if generated): `  -> GTM channel flow generated ({channel_count} channels, {track} track depth)`

---

### Step 5/7: Write output artifacts

Write all files using the Write tool. Display confirmation after each file.

**File 1: Versioned flow document**

Write to `.planning/design/ux/FLW-flows-v{N}.md`. Use the structure from `@templates/user-flow.md` as the output scaffold. Populate the frontmatter:

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:flows (FLW)
Version: v{N}
Status: draft
Source Brief: "{.planning/design/strategy/BRF-brief-v{X}.md or "none"}"
Enhanced By: "{comma-separated MCP names actually used, or "none"}"
---
```

After the frontmatter, include the document sections in this order:
1. `# User Flows` heading
2. Mermaid conventions comment block (copied from template)
3. `---` separator
4. `## Overview: All User Journeys` section with overview diagram
5. `---` separator
6. All `## Journey {N}: {Journey Name}` sections in order, each followed by `---`
7. `## Flow Summary` table
8. `---` separator
9. Footer: `*Generated by PDE-OS /pde:flows | {ISO date}*` and `*Source: {brief path}*`

Display: `  -> Created: .planning/design/ux/FLW-flows-v{N}.md ({size})`

**File 2: Screen inventory JSON**

Write to `.planning/design/ux/FLW-screen-inventory.json` (fixed path, always reflects latest run, unversioned).

Write the full JSON object constructed in Step 4e.

Display: `  -> Created: .planning/design/ux/FLW-screen-inventory.json ({size}) — {screen count} screens`

Display: `Step 5/7: Flow artifacts written.`

---

#### Step 5-BIZ: Write business flow artifacts (business mode only)

**IF `SBP_CONTENT_GENERATED == true`:**

Write SBP artifact to `.planning/design/strategy/SBP-service-blueprint-v{N}.md` (N = same version as FLW artifact for this run, or v1 if first run).

Include YAML frontmatter:
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:flows (SBP)
Version: v{N}
businessTrack: {solo_founder|startup_team|product_leader}
dependsOn: FLW
---
```

Sections in order:
1. `# Service Blueprint: {product_name}`
2. `## Blueprint Overview` — lane definitions table (5 rows: Customer Actions, Frontstage, Line of Visibility, Backstage, Support Processes, Physical Evidence) + line of visibility note
3. `## Service Blueprint Diagram` — the Mermaid `sequenceDiagram` from Step 4f (all stages)
4. `## Stage Breakdown` — the Stage Breakdown table from Step 4f
5. `## Stakeholder Map` — product_leader track only (table from Step 4f)
6. Footer: `---\n*Generated by /pde:flows (SBP) v{N} | {ISO date}*`

**Post-write verification — no dollar amounts:**
```bash
if grep -qE '\$[0-9]' ".planning/design/strategy/SBP-service-blueprint-v${N}.md" 2>/dev/null; then
  echo "ERROR: Dollar amount detected in SBP artifact. Use [YOUR_X] placeholders only."
  grep -nE '\$[0-9]' ".planning/design/strategy/SBP-service-blueprint-v${N}.md"
fi
```

Register SBP artifact in manifest (7 calls):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP code SBP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP name "Service Blueprint"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP type service-blueprint
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP path ".planning/design/strategy/SBP-service-blueprint-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SBP dependsOn '["FLW"]'
```

Display: `  -> Created: .planning/design/strategy/SBP-service-blueprint-v{N}.md`

SET flag: `SBP_WRITTEN=true`

**IF `GTM_CONTENT_GENERATED == true`:**

Write GTM artifact to `.planning/design/strategy/GTM-channel-flow-v{N}.md`.

Include YAML frontmatter:
```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:flows (GTM)
Version: v{N}
businessTrack: {solo_founder|startup_team|product_leader}
dependsOn: SBP
---
```

Sections in order:
1. `# GTM Channel Flow: {product_name}`
2. `## Channel Strategy Overview` — channel list + priority table
3. `## GTM Channel Flow Diagram` — the Mermaid `flowchart LR` from Step 4g
4. `## Channel Priority Annotations` — the annotations table from Step 4g
5. Footer: `---\n*Generated by /pde:flows (GTM) v{N} | {ISO date}*`

Register GTM artifact in manifest (7 calls):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM code GTM
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM name "GTM Channel Flow"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM type gtm-channel-flow
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM path ".planning/design/strategy/GTM-channel-flow-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update GTM dependsOn '["SBP"]'
```

Display: `  -> Created: .planning/design/strategy/GTM-channel-flow-v{N}.md`

**End Step 5-BIZ.** Continue to Step 5-EXP (experience products) or Step 6 (all others).

---

#### Step 5-EXP: Write experience flow artifacts (experience products only)

**IF `PRODUCT_TYPE == "experience"` (continuing from Step 4-EXP):**

Write all files using the Write tool. Display confirmation after each file.

**File 1: Temporal flow document**

Write to `.planning/design/ux/TFL-temporal-flow-v1.md`. Include frontmatter:

```yaml
---
Generated: "{ISO 8601 date}"
Skill: /pde:flows (TFL)
Version: v1
Status: draft
Source Brief: "{brief path}"
Type: experience-flow-temporal
---
```

Content: the temporal flow Mermaid diagram and Temporal Analysis table from Step 4-EXP.

Display: `  -> Created: .planning/design/ux/TFL-temporal-flow-v1.md`

**File 2: Spatial flow document**

Write to `.planning/design/ux/SFL-spatial-flow-v1.md`. Include frontmatter with `Type: experience-flow-spatial`. Content: the spatial flow Mermaid diagram and Zone Capacity Analysis table from Step 4-EXP.

Display: `  -> Created: .planning/design/ux/SFL-spatial-flow-v1.md`

**File 3: Social flow document**

Write to `.planning/design/ux/SOC-social-flow-v1.md`. Include frontmatter with `Type: experience-flow-social`. Content: the social flow Mermaid diagram and Social Dynamics Analysis from Step 4-EXP.

Display: `  -> Created: .planning/design/ux/SOC-social-flow-v1.md`

**File 4: Spaces inventory JSON**

Write to `.planning/design/ux/spaces-inventory.json` (fixed path, unversioned — same convention as `FLW-screen-inventory.json`). Write the full `SPACES_INVENTORY` JSON object from Step 4-EXP.

Display: `  -> Created: .planning/design/ux/spaces-inventory.json`

Display: `Step 5/7: Experience flow artifacts written (3 diagrams + 1 JSON).`

**Skip to Step 6.** (Non-experience products use the standard Step 5 above.)

---

### Step 6/7: Update ux domain DESIGN-STATE

**Check if domain DESIGN-STATE exists:**

Use the Glob tool to check for `.planning/design/ux/DESIGN-STATE.md`.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `ux`
- Replace `{Domain}` with `UX`
- Replace `{date}` with the current ISO 8601 date
- Use the Write tool to create `.planning/design/ux/DESIGN-STATE.md`

**If it already exists:** Use the Edit tool to update it.

**Add or update the FLW artifact row in the Artifact Index table:**

If the file was just created: the Artifact Index table is empty (comment-only). Add the FLW row after the header row.
If the file already exists (re-run scenario, v2+): update the existing FLW row's Version and Updated columns in place.

```
| FLW | User Flows | /pde:flows | draft | v{N} | {comma-separated MCP names actually used, or "none"} | -- | {YYYY-MM-DD} |
```

Display: `Step 6/7: UX DESIGN-STATE.md updated with FLW artifact entry.`

**If `PRODUCT_TYPE == "experience"`:** Add or update THREE artifact rows instead of one FLW row:

```
| TFL | Temporal Flow | /pde:flows | draft | v1 | none | -- | {YYYY-MM-DD} |
| SFL | Spatial Flow | /pde:flows | draft | v1 | none | -- | {YYYY-MM-DD} |
| SOC | Social Flow | /pde:flows | draft | v1 | none | -- | {YYYY-MM-DD} |
```

Do NOT add the FLW row for experience products (mutual exclusion — experience products produce TFL/SFL/SOC, not FLW).

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-flows)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 5 seconds, then retry up to 3 times:
  ```bash
  sleep 5
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-flows)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false` after 3 retries:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:flows.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md using the Read tool, then apply the following four updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add FLW row if not already present:
   ```
   | FLW | ux | BRF | current |
   ```

2. **Quick Reference section** — add or update FLW row:
   ```
   | User Flows | v{N} |
   ```

3. **Decision Log** — append entry:
   ```
   | FLW | user flows mapped, {journey_count} journeys, {screen_count} screens | {YYYY-MM-DD} |
   ```

4. **Iteration History** — append entry:
   ```
   | FLW-flows-v{N}.md | v{N} | Created by /pde:flows | {YYYY-MM-DD} |
   ```

**IF `SBP_WRITTEN == true`:**

5. **Cross-Domain Dependency Map** — add SBP row if not already present:
   ```
   | SBP | strategy | FLW | current |
   ```

6. **Quick Reference section** — add SBP row:
   ```
   | Service Blueprint | v{N} |
   ```

7. **Decision Log** — append entry:
   ```
   | SBP | service blueprint generated, {stage_count} stages, {track} track | {YYYY-MM-DD} |
   ```

8. **Iteration History** — append entry:
   ```
   | SBP-service-blueprint-v{N}.md | v{N} | Created by /pde:flows (SBP) | {YYYY-MM-DD} |
   ```

**IF `GTM_CONTENT_GENERATED == true`:**

Append GTM rows to each of the four sections above:

- Cross-Domain: `| GTM | strategy | SBP | current |`
- Quick Reference: `| GTM Channel Flow | v{N} |`
- Decision Log: `| GTM | GTM channel flow generated, {channel_count} channels | {YYYY-MM-DD} |`
- Iteration History: `| GTM-channel-flow-v{N}.md | v{N} | Created by /pde:flows (GTM) | {YYYY-MM-DD} |`

**ALWAYS release write lock, even if an error occurred during the state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest:**

Register the FLW artifact in the manifest using 7 manifest-update calls:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW code FLW
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW name "User Flows"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW type user-flows
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW path ".planning/design/ux/FLW-flows-v{N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLW version {N}
```

**If `PRODUCT_TYPE == "experience"`:** Register three experience flow artifacts INSTEAD of FLW:

```bash
# Temporal flow (TFL)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL code TFL
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL name "Temporal Flow Diagram"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL type experience-flow-temporal
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL path ".planning/design/ux/TFL-temporal-flow-v1.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TFL status draft

# Spatial flow (SFL) -- also references spaces-inventory.json
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL code SFL
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL name "Spatial Flow Diagram"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL type experience-flow-spatial
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL path ".planning/design/ux/SFL-spatial-flow-v1.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SFL status draft

# Social flow (SOC)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC code SOC
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC name "Social Flow Diagram"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC type experience-flow-social
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC path ".planning/design/ux/SOC-social-flow-v1.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SOC status draft
```

Do NOT register the FLW artifact for experience products.

**IF `PRODUCT_TYPE == "experience"` AND `$BM == "true"`:** Also register SBP and GTM artifacts (from Step 5-BIZ) using the same 7-call pattern above. Experience+business compositions produce both experience flow artifacts AND business flow artifacts.

**Set coverage flag (CRITICAL: preserve existing flags):**

Read current coverage first (never hardcode — this would clobber flags set by other skills):

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output to extract current flag values for ALL twenty fields:
- `hasDesignSystem` — current value from COV output
- `hasWireframes` — current value from COV output
- `hasFlows` — (this skill sets to true)
- `hasHardwareSpec` — current value from COV output
- `hasCritique` — current value from COV output
- `hasIterate` — current value from COV output
- `hasHandoff` — current value from COV output
- `hasIdeation` — current value from COV output (default false if absent)
- `hasCompetitive` — current value from COV output (default false if absent)
- `hasOpportunity` — current value from COV output (default false if absent)
- `hasMockup` — current value from COV output (default false if absent)
- `hasHigAudit` — current value from COV output (default false if absent)
- `hasRecommendations` — current value from COV output (default false if absent)
- `hasStitchWireframes` — current value from COV output (default false if absent)
- `hasPrintCollateral` — current value from COV output (default false if absent)
- `hasProductionBible` — current value from COV output (default false if absent)
- `hasBusinessThesis` — current value from COV output (default false if absent)
- `hasMarketLandscape` — current value from COV output (default false if absent)
- `hasServiceBlueprint` — set to true if `SBP_WRITTEN == true`, else current value from COV output (default false if absent)
- `hasLaunchKit` — current value from COV output (default false if absent)

Merge `hasFlows: true` (and `hasServiceBlueprint: true` if `SBP_WRITTEN == true`) into the existing values, then write the full twenty-field object (all flags must be present — default any absent field to `false`):

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":{current},"hasFlows":true,"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{true if SBP_WRITTEN else current},"hasLaunchKit":{current}}'
```

Display: `Step 7/7: Root DESIGN-STATE and manifest updated.`

---

## Anti-Patterns (Guard Against)

- NEVER use bare `end` as a Mermaid node ID — `end` is a Mermaid reserved keyword. Using it causes a diagram parse error. Always use `J{N}_DONE`, `J{N}_END`, or `J{N}_COMPLETE` for terminal nodes.
- NEVER use non-prefixed node IDs (e.g., `STEP1`, `ERROR`) — all node IDs must use the `J{N}_` prefix to prevent ID collisions when the overview diagram combines all journeys.
- NEVER include decision nodes (`{}` curly brace shape) in `FLW-screen-inventory.json` — they are control flow, not screens. Decision nodes represent branching logic (e.g., "Is email valid?"), not UI screens that need wireframing.
- NEVER skip `ux/DESIGN-STATE.md` creation — the wireframe skill reads this file to discover UX domain artifacts. If it is absent after `/pde:flows` runs, Phase 16 (/pde:wireframe) has no domain file to update.
- NEVER set `hasFlows` in `designCoverage` without reading current coverage first — `manifest-set-top-level` replaces the entire `designCoverage` object. Always run `coverage-check`, parse all current flags, and write the full merged object. Skipping this step resets flags set by other skills (e.g., `hasDesignSystem: true` becomes `false`).
- NEVER skip the write-lock for root DESIGN-STATE.md updates — acquire `design lock-acquire pde-flows` before any Edit to root DESIGN-STATE.md.
- ALWAYS release the write lock after Step 7 operations, even if an error occurred. The lock has a 60s TTL but releasing immediately prevents blocking other skills.
- ALWAYS include error nodes in screen inventory with `"type": "error"` — they represent real UI error states (form validation errors, payment failures, permission denied screens) that need wireframing.
- NEVER overwrite an existing versioned flow document — always increment version (v1 → v2 → v3). If v1 exists, write v2. Existing versions are never modified.

---

## Summary

Display the final summary table as the last output of every run:

```
## Summary

| Property | Value |
|----------|-------|
| Files created | .planning/design/ux/FLW-flows-v{N}.md (Markdown, {size}), .planning/design/ux/FLW-screen-inventory.json (JSON, {size}), .planning/design/ux/DESIGN-STATE.md (Markdown, {size}) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:wireframe |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {comma-separated list of MCPs actually used, or "none"} |
```

**If `PRODUCT_TYPE == "experience"`:**

| Property | Value |
|----------|-------|
| Files created | .planning/design/ux/TFL-temporal-flow-v1.md, .planning/design/ux/SFL-spatial-flow-v1.md, .planning/design/ux/SOC-social-flow-v1.md, .planning/design/ux/spaces-inventory.json, .planning/design/ux/DESIGN-STATE.md (if it does not exist) |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:wireframe |

</process>

<output>
- `.planning/design/ux/FLW-flows-v{N}.md` — versioned Mermaid flow document with overview diagram, per-journey diagrams (screen, decision, error nodes, step descriptions), and flow summary table
- `.planning/design/ux/FLW-screen-inventory.json` — machine-readable screen list (fixed path, always reflects latest run); consumed by /pde:wireframe as its canonical screen list
- `.planning/design/ux/DESIGN-STATE.md` — ux domain state file (created if absent); updated with FLW artifact entry
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Map, Quick Reference, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with FLW artifact entry and hasFlows: true in designCoverage
- `.planning/design/ux/TFL-temporal-flow-v1.md` — temporal flow diagram (experience products only)
- `.planning/design/ux/SFL-spatial-flow-v1.md` — spatial flow diagram with zone/bottleneck annotations (experience products only)
- `.planning/design/ux/SOC-social-flow-v1.md` — social flow diagram (experience products only)
- `.planning/design/ux/spaces-inventory.json` — machine-readable zone inventory for Phase 78 floor plan (experience products only)
</output>
