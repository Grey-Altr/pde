# Architecture Research

**Domain:** Google Stitch integration into PDE's existing MCP bridge and 13-stage design pipeline
**Researched:** 2026-03-20
**Confidence:** MEDIUM — Stitch MCP tool names confirmed via community repos and mcpservers.org; official parameter schemas not publicly documented; raw MCP tool names should be treated as MEDIUM confidence until verified against live server

---

## Standard Architecture

### System Overview

The Stitch integration adds a 6th approved server to PDE's existing MCP bridge without changing the bridge's contract model. The architecture follows the same pattern established for Figma and Pencil: a new APPROVED_SERVERS entry, new TOOL_MAP canonical names, and per-skill workflow adaptations at each of the 4 touchpoints.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Skill Layer (commands/*.md)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │ wireframe.md │  │  ideate.md   │  │  critique.md │  │  handoff.md │  │
│  │ (touchpoint  │  │ (touchpoint  │  │ (touchpoint  │  │ (touchpoint │  │
│  │    1: WFR)   │  │   2: IDT)    │  │    3: CRT)   │  │    4: HND)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                │                  │                 │          │
├─────────┴────────────────┴──────────────────┴─────────────────┴──────────┤
│                    Workflow Layer (workflows/*.md)                         │
│  wireframe.md   │  wireframe-stitch.md  │  critique-stitch-compare.md     │
│  ideate.md      │  (new: primary path)  │  (new: Stitch delta section)    │
│  mockup.md      │  ideate-stitch.md     │  handoff.md (enhanced)          │
│                 │  (new: diverge patch) │                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                 mcp-bridge.cjs (central adapter)                          │
│                                                                           │
│  APPROVED_SERVERS           TOOL_MAP                                      │
│  ┌────────────┐             ┌──────────────────────────────────────────┐  │
│  │ github     │             │ stitch:probe → mcp__stitch__list_projects│  │
│  │ linear     │             │ stitch:list-projects → ...               │  │
│  │ figma      │    +        │ stitch:list-screens → ...                │  │
│  │ pencil     │  stitch     │ stitch:get-screen → ...                  │  │
│  │ atlassian  │  (new)      │ stitch:generate-screen → ...             │  │
│  └────────────┘             │ stitch:fetch-code → ...                  │  │
│                             │ stitch:fetch-image → ...                 │  │
│                             │ stitch:extract-context → ...             │  │
│                             │ stitch:create-project → ...              │  │
│                             │ stitch:get-project → ...                 │  │
│                             └──────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                    Artifact Storage Layer                                  │
│                                                                           │
│  .planning/design/                                                        │
│  ├── ux/wireframes/      WFR-{slug}.html  ← primary output (unchanged)   │
│  ├── ux/wireframes/      STH-{slug}.html  ← new: Stitch HTML variant      │
│  ├── ux/wireframes/      STH-{slug}.png   ← new: Stitch screenshot        │
│  ├── strategy/           STH-design-dna.json ← new: extracted Design DNA  │
│  └── review/             CRT-critique-v{N}.md (enhanced with Stitch delta)│
│                                                                           │
│  .planning/mcp-connections.json  ← stitch entry added on connect          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Modification Type |
|-----------|----------------|-------------------|
| `bin/lib/mcp-bridge.cjs` | Add stitch to APPROVED_SERVERS and 10 entries to TOOL_MAP | MODIFIED |
| `workflows/wireframe.md` | Add Step 1.6: Stitch rendering path alongside Figma context | MODIFIED |
| `workflows/wireframe-stitch.md` | Stitch generation sub-workflow — prompt construction, result storage, STH artifact registration | NEW |
| `workflows/ideate.md` | Add Stitch diverge variant invocation in Pass 1 | MODIFIED |
| `workflows/ideate-stitch.md` | Stitch diverge sub-workflow — generate N visual variants, save as STH images | NEW |
| `workflows/critique.md` | Add Step 3.6: Stitch comparison section alongside Pencil screenshot | MODIFIED |
| `workflows/critique-stitch-compare.md` | Compare Stitch output against design system tokens — Design DNA delta report | NEW |
| `workflows/handoff.md` | Add Step 1.6: Stitch pattern extraction alongside Figma Code Connect | MODIFIED |
| `workflows/handoff-stitch-extract.md` | Pattern extraction — Design DNA to implementation patterns, Stitch HTML to component APIs | NEW |
| `commands/wireframe.md` | Add `mcp__stitch__*` to allowed-tools | MODIFIED |
| `commands/ideate.md` | Add `mcp__stitch__*` to allowed-tools | MODIFIED |
| `commands/critique.md` | Add `mcp__stitch__*` to allowed-tools | MODIFIED |
| `commands/handoff.md` | Add `mcp__stitch__*` to allowed-tools | MODIFIED |
| `commands/connect.md` | Add `stitch` to approved services list in help text | MODIFIED |
| `workflows/connect.md` | Add Stitch auth instructions case | MODIFIED |

---

## Recommended Project Structure

```
bin/lib/
└── mcp-bridge.cjs          ← MODIFIED: +1 APPROVED_SERVERS entry, +10 TOOL_MAP entries

commands/
├── wireframe.md            ← MODIFIED: add mcp__stitch__* to allowed-tools
├── mockup.md               ← MODIFIED: add mcp__stitch__* to allowed-tools
├── ideate.md               ← MODIFIED: add mcp__stitch__* to allowed-tools
├── critique.md             ← MODIFIED: add mcp__stitch__* to allowed-tools
├── handoff.md              ← MODIFIED: add mcp__stitch__* to allowed-tools
└── connect.md              ← MODIFIED: add stitch to help text

workflows/
├── wireframe.md            ← MODIFIED: Step 1.6 Stitch path
├── wireframe-stitch.md     ← NEW
├── mockup.md               ← MODIFIED: Step 1.5 reuse wireframe-stitch.md
├── ideate.md               ← MODIFIED: Stitch diverge in Pass 1
├── ideate-stitch.md        ← NEW
├── critique.md             ← MODIFIED: Step 3.6 Stitch compare
├── critique-stitch-compare.md ← NEW
├── handoff.md              ← MODIFIED: Step 1.6 Stitch extract
├── handoff-stitch-extract.md  ← NEW
└── connect.md              ← MODIFIED: stitch auth case

.planning/design/
├── ux/wireframes/
│   ├── WFR-{slug}.html     ← existing HTML output (unchanged)
│   ├── STH-{slug}.html     ← new: Stitch HTML variant
│   ├── STH-{slug}.png      ← new: Stitch screenshot (base64-decoded to file)
│   └── index.html          ← MODIFIED: include STH entries in navigation
├── strategy/
│   ├── IDT-ideation-v{N}.md  ← enhanced: image links to STH-ideate-direction-*.png
│   └── STH-ideate-direction-{1..3}.png  ← new: ideation visual variants
│   └── STH-design-dna.json ← new: Stitch Design DNA (fonts/colors/layouts)
└── review/
    └── CRT-critique-v{N}.md ← enhanced with ## Stitch Comparison section
```

---

## Architectural Patterns

### Pattern 1: Engine Hierarchy with Probe/Degrade

**What:** Stitch is the primary rendering engine; PDE's HTML wireframe generator is the fallback. The hierarchy is enforced at the workflow level, not in mcp-bridge.cjs. The bridge's role remains limited to tool lookup and approval — routing logic lives in the workflow.

**When to use:** Every call site that currently generates HTML wireframes or mockups.

**Trade-offs:** Keeps mcp-bridge.cjs as a pure policy layer (existing contract preserved). Routing complexity moves to individual workflows — each workflow independently checks Stitch connection status and applies the hierarchy.

**Primary/Fallback routing logic in wireframe.md Step 1.6:**

```
IF stitch connection status == 'connected' AND --no-mcp NOT set AND --quick NOT set:
  Follow @workflows/wireframe-stitch.md
  SET STITCH_RENDERER_AVAILABLE = true
  SET RENDERING_ENGINE = "stitch"
  Store STH artifacts alongside existing WFR artifacts
  IF wireframe-stitch.md fails or returns error:
    Log: "  -> Stitch rendering failed — falling back to PDE HTML generator"
    SET STITCH_RENDERER_AVAILABLE = false
    SET RENDERING_ENGINE = "pde-html"
    Continue with standard wireframe generation (Step 4 onward)
ELSE:
  SET STITCH_RENDERER_AVAILABLE = false
  SET RENDERING_ENGINE = "pde-html"
  Continue with standard wireframe generation (Step 4 onward)
```

**Flag semantics:**

| Flag | Behavior |
|------|----------|
| (no flag) | Stitch primary if connected, PDE HTML fallback |
| `--use-stitch` | Assert Stitch as primary; HALT if not connected (no silent fallback) |
| `--no-stitch` | Skip Stitch entirely; PDE HTML only |
| `--quick` | Skip Stitch (same as --no-mcp for Stitch path) |
| `--no-mcp` | Skip all MCP including Stitch |

**Figma relationship:** Figma is demoted from its Step 1.5 "design context provider" role in wireframe.md. The Stitch Design DNA (colors/fonts/layout) replaces Figma design context as the wireframe enrichment source when Stitch is connected. Figma retains its `mockup-export-figma.md` and `handoff-figma-codeConnect.md` sub-workflows for export and Code Connect — it is not removed. The priority order for design context:

```
1. Stitch Design DNA (from STH-design-dna.json if present)
2. Figma design context (wireframe-figma-context.md)
3. PDE design tokens (assets/tokens.css)
4. Inline fallback palette (hardcoded by product type)
```

---

### Pattern 2: Image-to-Text Bridge for Critique and Handoff

**What:** Stitch's primary output for critique and handoff is a screenshot image (PNG via `stitch:fetch-image`). The existing critique and handoff workflows are text-based (they read HTML files and annotation comments). A bridging step converts Stitch image output to structured text by (a) reading the companion HTML code via `stitch:fetch-code`, (b) using Claude's native multimodal vision to describe the visual design from the PNG, and (c) cross-referencing the Design DNA JSON for extracted token values.

**When to use:** Any skill that receives Stitch output and needs to reason about it textually.

**Trade-offs:** Adds a vision analysis step. The PNG is Claude's lens — it can describe color usage, spatial hierarchy, typography, and component patterns from the image, then compare against design tokens from `STH-design-dna.json`. This is more accurate than parsing HTML alone because Stitch may use inline styles or framework-specific class names that do not map directly to DTCG tokens. Claude Code's multimodal capability to read images is a native feature requiring no additional tooling.

**Bridge sequence for critique:**

```
1. stitch:fetch-image → STH-{slug}.png (base64 → Buffer.from(b64,'base64') → fs.writeFileSync)
2. stitch:fetch-code  → STH-{slug}.html (raw HTML/CSS from Stitch)
3. stitch:extract-context → STH-design-dna.json (Design DNA: colors, fonts, layout)
4. Claude reads STH-{slug}.png visually → produces STITCH_VISUAL_DESCRIPTION
5. Compare STITCH_VISUAL_DESCRIPTION against:
   - .planning/design/assets/tokens.css (PDE design system tokens)
   - STH-design-dna.json (Stitch's own extracted context)
6. Output delta: token compliance percentage, deviating properties, specific values
```

**Bridge sequence for handoff:**

```
1. STH-{slug}.html exists → parse for component structure (sections, forms, nav)
2. STH-design-dna.json exists → extract typography, color, spacing decisions
3. Claude reads STH-{slug}.png visually → identify component boundaries and interaction patterns
4. Cross-reference against WFR annotation comments (<!-- ANNOTATION: ... -->) in WFR-{slug}.html
5. Produce STITCH_COMPONENT_PATTERNS: components with visual descriptions and interface shapes
6. Merge into handoff spec alongside WFR-derived patterns
```

---

### Pattern 3: Stitch Connection via API Key (not OAuth)

**What:** Stitch authentication uses an API key (`STITCH_API_KEY` environment variable or Stitch account settings), NOT the browser OAuth flow used by GitHub, Linear, Figma, and Atlassian. This is structurally different from all 5 existing approved servers.

**When to use:** The `stitch` APPROVED_SERVERS entry must reflect this difference in `installCmd` and `AUTH_INSTRUCTIONS`.

**Trade-offs:** API key auth is simpler than OAuth (no `/mcp → Authenticate → browser flow`), but the user must manually obtain the key from stitch.withgoogle.com settings and pass it during `claude mcp add`. The connect workflow needs a different instruction set for Stitch compared to OAuth servers.

**APPROVED_SERVERS entry shape:**

```javascript
stitch: {
  displayName: 'Google Stitch',
  transport: 'http',
  url: null,             // LOW confidence — official MCP URL not yet confirmed
  installCmd: null,      // Requires API key; user must set STITCH_API_KEY before add
  probeTimeoutMs: 15000, // Generative calls can be slow; probe is read-only list_projects
  probeTool: 'mcp__stitch__list_projects', // Lightest read-only probe
  probeArgs: {},
},
```

**Confidence note:** The official Stitch MCP server URL is LOW confidence. Two community implementations exist (`davideast/stitch-mcp` and `Kargatharaakash/stitch-mcp`). The official `stitch.withgoogle.com/docs/mcp/setup` page appears to exist but returned minified JavaScript on fetch. PDE's verified-sources-only security policy means the URL must be confirmed before shipping. One option: ship with the official server URL from Google's documentation once it becomes parseable; another: document both options and default to the official server.

---

### Pattern 4: Stitch Project Persistence via mcp-connections.json

**What:** Stitch organizes output into projects and screens. PDE needs a stable project-per-PDE-project mapping so Stitch screens accumulate across sessions rather than generating orphans. The mapping is stored in `.planning/mcp-connections.json` as extra fields on the stitch connection entry.

**Data stored in mcp-connections.json under `stitch`:**

```json
{
  "server_key": "stitch",
  "display_name": "Google Stitch",
  "status": "connected",
  "stitch_project_id": "<uuid from stitch:create-project or stitch:list-projects>",
  "stitch_project_name": "<project name matching .planning/PROJECT.md project name>",
  "last_updated": "<ISO timestamp>"
}
```

**Project init sequence (first Stitch run for a PDE project):**

```
IF stitch_project_id absent from mcp-connections.json:
  1. stitch:list-projects → search for project matching PROJECT.md project name
  2. IF found: use existing project_id → updateConnectionStatus('stitch', 'connected', {stitch_project_id})
  3. IF not found: stitch:create-project → capture new project_id → updateConnectionStatus(...)
```

This follows the same pattern as how Pencil stores editor state — extra fields on the connection entry, written via the existing `updateConnectionStatus` function with no changes to mcp-bridge.cjs's core API.

---

## Data Flow for Each Touchpoint

### Touchpoint 1: Wireframe/Mockup — Stitch as Primary Renderer

```
User runs: /pde:wireframe "login, dashboard" hifi

wireframe.md Step 1.6: Stitch path check
    │
    ├─ node script: loadConnections() → stitch.status == 'connected'?
    │       YES → @workflows/wireframe-stitch.md
    │
    wireframe-stitch.md:
      1. Read stitch_project_id from mcp-connections.json
         IF absent: init project (list-projects → create-project)
      2. Load STH-design-dna.json (if exists) → DESIGN_DNA
      3. Determine MAX_STITCH_SCREENS from config.json (default: 3)
      4. For each screen (up to MAX_STITCH_SCREENS):
         a. Construct prompt:
            "[screen label] screen for [PRODUCT_NAME].
             Persona: [persona from INVENTORY]. Journey: [step].
             Design style: [DESIGN_DNA summary if available].
             Include states: default, loading, error."
         b. stitch:generate-screen (stitch_project_id, prompt) → {screen_id}
         c. stitch:fetch-code(screen_id)  → raw HTML/CSS
            → Write: .planning/design/ux/wireframes/STH-{slug}.html
         d. stitch:fetch-image(screen_id) → base64 PNG
            → Decode: Buffer.from(b64, 'base64')
            → Write: .planning/design/ux/wireframes/STH-{slug}.png
         e. stitch:extract-context(screen_id) → Design DNA
            → Merge into: .planning/design/strategy/STH-design-dna.json
      5. Register STH artifacts in design-manifest.json:
         pde-tools.cjs design manifest-update STH code STH
         pde-tools.cjs design manifest-update STH name "Stitch Wireframes"
         pde-tools.cjs design manifest-update STH type stitch-wireframes
         pde-tools.cjs design manifest-update STH domain ux
         pde-tools.cjs design manifest-update STH path ".planning/design/ux/wireframes/"
      6. Set hasStitchWireframes: true in designCoverage (14th flag, pass-through-all)
      7. Return STITCH_FILES=[list of STH-*.html and STH-*.png paths]

wireframe.md Steps 4-7 continue (PDE HTML generator still runs):
    - WFR HTML files generated as normal (annotations preserved)
    - index.html updated: both WFR-{slug}.html and STH-{slug}.html per screen
    - DESIGN-STATE.md: new STH row alongside WFR row in Artifact Index
    - Manifest: WFR entry unchanged; STH entry added

Output artifacts:
  .planning/design/ux/wireframes/WFR-{slug}.html     (PDE HTML — annotation-rich)
  .planning/design/ux/wireframes/STH-{slug}.html     (Stitch HTML — visual primary)
  .planning/design/ux/wireframes/STH-{slug}.png      (Stitch screenshot)
  .planning/design/strategy/STH-design-dna.json      (Design DNA)
```

**Mockup touchpoint reuse:** `mockup.md` Step 1.5 adds a Stitch path using the same `wireframe-stitch.md` sub-workflow with a `--mockup` context flag that adjusts prompt language to "interactive, high-fidelity" and disables lofi content rules. No separate `mockup-stitch.md` needed.

---

### Touchpoint 2: Ideation — Visual Divergence During Diverge Phase

```
User runs: /pde:ideate

ideate.md Pass 1 (Diverge) currently: generates 5+ text-only directions

NEW: After generating text directions, check Stitch connection:
  node script: loadConnections() → stitch.status == 'connected'?
    YES → @workflows/ideate-stitch.md

ideate-stitch.md:
  1. Read MAX_STITCH_SCREENS from config.json (default: 3)
  2. Select first N text directions (N = min(3, total_directions))
  3. Ensure Stitch project exists (same init sequence as touchpoint 1)
  4. For each selected direction (index 1..N):
     a. Extract concept summary: visual style, interaction model, density
     b. Construct prompt:
        "Landing page for [PRODUCT_NAME] in [direction.title] direction.
         [direction.concept_desc]. Visual aesthetic: [direction.visual_style].
         Color mood: [direction.color_mood]. Interaction: [direction.interaction_model]."
     c. stitch:generate-screen(stitch_project_id, prompt) → {screen_id}
     d. stitch:fetch-image(screen_id) → base64 PNG
        → Decode and write: .planning/design/strategy/STH-ideate-direction-{N}.png
  5. Return: STITCH_IDEATE_IMAGES=[path list]

ideate.md Pass 1 continues:
  IDT artifact ## Diverge section enhanced:
    Each direction entry gets image reference if Stitch generated one:
    "[Direction N]: [title]
     Visual variant: [STH-ideate-direction-N.png]"
  File link enables Claude to read the PNG in Pass 2

ideate.md Pass 2 (Converge):
  Scoring criteria adds: "Visual distinctiveness (Stitch variant shows unique aesthetic)"
  Recommended direction can cite visual alignment: "Direction 2 chosen; Stitch variant
  confirms visual coherence with design DNA"

Output artifacts:
  .planning/design/strategy/IDT-ideation-v{N}.md   (enhanced with image links)
  .planning/design/strategy/STH-ideate-direction-1.png
  .planning/design/strategy/STH-ideate-direction-2.png
  .planning/design/strategy/STH-ideate-direction-3.png
```

**Budget constraint:** 3 Stitch generations per ideation run maximum. The free tier provides 350 generations per month; bulk ideation generation would exhaust the budget quickly. Subsequent text directions (4+) remain text-only. MAX_STITCH_SCREENS in config.json controls this.

---

### Touchpoint 3: Critique — Compare Stitch Output Against Design System Tokens

```
User runs: /pde:critique

critique.md Step 3.5: Pencil screenshot capture (existing — unchanged)

NEW Step 3.6: Stitch comparison:
  node script: loadConnections() → stitch.status == 'connected'?
    YES → check if STH artifacts exist:
      Glob: .planning/design/ux/wireframes/STH-*.{html,png}
      IF found → @workflows/critique-stitch-compare.md
      IF not found → log "No Stitch artifacts found — skipping Stitch comparison"

critique-stitch-compare.md:
  1. Load STH-design-dna.json → STITCH_DNA (colors, fonts, layout from Stitch)
  2. Load .planning/design/assets/tokens.css → PDE_TOKENS
  3. Load BRF-brief-v*.md → BRIEF_CONTEXT
  4. For each STH-{slug}.png found:
     a. Read PNG using Read tool (Claude multimodal vision) →
        Prompt: "Describe the visual design properties in this UI screenshot:
                 (1) Background and surface colors (hex values if visible)
                 (2) Text colors and typography (font families if detectable)
                 (3) Button and interactive element styling
                 (4) Spacing density (tight/comfortable/spacious)
                 (5) Border radius and shadow treatment
                 (6) Overall layout structure (sidebar, top nav, content area)"
        Store as VISUAL_DESC
     b. Read STH-{slug}.html → extract inline CSS values and class patterns
     c. Compare against PDE_TOKENS (CSS custom properties in tokens.css):
        For each token category (color, spacing, typography, radius, shadow):
          - Count: how many Stitch values match PDE token values?
          - Flag: deviating values with "Stitch: X | Token: Y" pairs
     d. Compare against STITCH_DNA:
        - Design DNA should agree with PNG visual desc (internal consistency check)
        - Flag discrepancies between DNA json and visual output
     e. Produce per-screen delta:
        {
          screen: slug,
          token_compliance_pct: N,
          deviating_properties: [{property, stitch_value, token_value}],
          novel_patterns: [description of Stitch patterns absent from WFR-{slug}.html],
          missing_patterns: [WFR patterns absent from Stitch output]
        }
  5. Aggregate across all screens:
     - Overall token compliance: weighted average
     - Top 3 deviating properties (most common across screens)
     - Recommended token updates (if Stitch choices are consistently better)
     - Recommended Stitch prompt refinements (if compliance is below 70%)

critique.md Step 5: Write report — CRT-critique-v{N}.md includes new section:

  ## Stitch Comparison
  **Overall Token Compliance:** {N}% across {M} screens
  **Design Engine:** Google Stitch (primary) vs. PDE Design System tokens

  | Screen | Compliance | Top Deviation | Novel Patterns |
  |--------|------------|---------------|----------------|
  | {slug} | {N}%       | {property}    | {count}        |

  **Top Deviating Properties:**
  | Property | Stitch Value | PDE Token | Recommendation |
  |----------|-------------|-----------|----------------|

  **Recommendations:**
  - Token updates: [if Stitch consistently uses better values]
  - Prompt refinements: [to improve compliance on next generation]

Output:
  .planning/design/review/CRT-critique-v{N}.md (Stitch section appended)
  No new artifact files — all output in existing CRT report
```

**Key constraint:** The Stitch comparison is additive — it does not replace the 4-perspective critique or change the composite score. The CRT scorecard, findings table, and action list are unchanged. The Stitch section is supplementary analysis below the existing report content.

---

### Touchpoint 4: Handoff — Extract Patterns From Stitch Visuals

```
User runs: /pde:handoff

handoff.md Step 1.5: Figma Code Connect (existing — unchanged)

NEW Step 1.6: Stitch pattern extraction:
  node script: loadConnections() → stitch.status == 'connected'?
    YES → check if STH artifacts exist:
      Glob: .planning/design/ux/wireframes/STH-*.{html,png}
      IF found → @workflows/handoff-stitch-extract.md
      IF not found → log "No Stitch artifacts — skipping Stitch pattern extraction"

handoff-stitch-extract.md:
  1. Load STH-design-dna.json → STITCH_DNA
  2. Load STACK.md → FRAMEWORK, TYPESCRIPT, COMPONENT_IMPORT_PATTERN
  3. For each STH-{slug}.html + STH-{slug}.png pair:
     a. Parse HTML for structural component indicators:
        - <nav>, <header>, <footer> → layout shell components
        - <form>, <input>, <button> → interaction components
        - <table>, <ul>, <dl> used for data → data display components
        - Modal, drawer, tooltip patterns (z-index, fixed positioning) → overlay components
     b. Read STH-{slug}.png using Read tool (Claude multimodal):
        Prompt: "Identify the distinct UI components in this screenshot.
                 For each component:
                 (1) Component name (e.g. 'NavigationBar', 'LoginForm', 'DataTable')
                 (2) Visual description (layout, states shown, interactive elements)
                 (3) Props inferred from visual (e.g. isLoading: boolean, title: string)
                 (4) Any state variations visible"
        Store as STITCH_VISUAL_COMPONENTS
     c. Read WFR-{slug}.html for <!-- ANNOTATION: --> and <!-- COMPOSITION: --> comments
        Store as WFR_ANNOTATIONS
     d. Cross-reference STITCH_VISUAL_COMPONENTS against WFR_ANNOTATIONS:
        - Match: same component found in both → "confirmed by Stitch"
        - Stitch-only: in Stitch but not WFR annotation → "Stitch-only pattern"
        - WFR-only: in WFR annotation but not Stitch → "WFR-only pattern"
  4. Produce STITCH_COMPONENT_PATTERNS:
     [{
       name: "ComponentName",
       source: "WFR+Stitch" | "Stitch-only" | "WFR-only",
       visual_desc: "...",
       props: [{name, type, required, description}],
       states: ["default", "loading", "error"],
       screen: slug
     }]
  5. For Stitch-only components (not in WFR annotations):
     IF TYPESCRIPT == true: generate interface:
     ```typescript
     // Stitch-extracted: {screen_slug} — verify before implementation
     export interface {ComponentName}Props {
       {props derived from visual analysis}
     }
     ```
  6. Return STITCH_COMPONENT_PATTERNS for handoff.md to merge

handoff.md Step 6: Assemble spec
  HND-handoff-spec-v{N}.md new section:

  ## Stitch-Extracted Patterns

  | Component | Source | WFR Confirmed | TypeScript Interface |
  |-----------|--------|---------------|----------------------|
  | {name}    | WFR+Stitch / Stitch-only | Yes/No | HND-types-v{N}.ts#L{line} |

  Human decision required for source="Stitch-only" components:
  "The following components appear in Stitch output but have no WFR annotation equivalent.
   Verify intent before implementing: {list}"

  HND-types-v{N}.ts enhanced:
  // ─── Stitch-extracted interfaces ──────────────────────────────
  // Source: Stitch visual analysis — verify against wireframe intent
  export interface {ComponentName}Props { ... }

Output:
  .planning/design/handoff/HND-handoff-spec-v{N}.md (Stitch section added)
  .planning/design/handoff/HND-types-v{N}.ts (Stitch-only interfaces appended)
```

---

## TOOL_MAP Entries for Stitch

**Canonical name format:** `stitch:{action}` matching the existing pattern (`github:list-issues`, `figma:get-screenshot`, `pencil:get-screenshot`).

**Proposed entries** (raw MCP names are MEDIUM confidence — confirmed via community repo documentation at `Kargatharaakash/stitch-mcp` and `davideast/stitch-mcp`, not from official Google source):

```javascript
// Stitch — Phase XX
// Raw tool names MEDIUM confidence — verify against live server before shipping
// Verification: claude code /mcp → select stitch → list tools
'stitch:probe':                   'mcp__stitch__list_projects',
'stitch:list-projects':           'mcp__stitch__list_projects',
'stitch:get-project':             'mcp__stitch__get_project',
'stitch:create-project':          'mcp__stitch__create_project',
'stitch:list-screens':            'mcp__stitch__list_screens',
'stitch:get-screen':              'mcp__stitch__get_screen',
'stitch:generate-screen':         'mcp__stitch__generate_screen_from_text',
'stitch:fetch-code':              'mcp__stitch__fetch_screen_code',
'stitch:fetch-image':             'mcp__stitch__fetch_screen_image',
'stitch:extract-context':         'mcp__stitch__extract_design_context',
```

**AUTH_INSTRUCTIONS entry for connect.md:**

```javascript
stitch: [
  '1. Visit https://stitch.withgoogle.com → Profile → Stitch settings → API Keys → Create key',
  '2. Copy the generated API key',
  '3. Run: claude mcp add --transport http stitch <stitch-mcp-url> --env STITCH_API_KEY=<key>',
  '   Note: Confirm the official Stitch MCP URL at https://stitch.withgoogle.com/docs/mcp/setup',
  '4. Run /pde:connect stitch --confirm',
],
```

---

## designCoverage Extension

The 13-field designCoverage object in design-manifest.json must be extended to a 14-field object. All 13 existing skills follow the pass-through-all pattern — adding a 14th field requires updating all 13 existing skill workflows to pass through `hasStitchWireframes` in their coverage write.

**New field:** `hasStitchWireframes: boolean` — set to `true` by `wireframe-stitch.md` when at least one STH artifact is written successfully.

**All 13 workflows that need pass-through update:**

```
workflows/wireframe.md    ← also sets hasStitchWireframes: true
workflows/mockup.md
workflows/system.md
workflows/flows.md
workflows/critique.md
workflows/iterate.md
workflows/handoff.md
workflows/ideate.md
workflows/competitive.md
workflows/opportunity.md
workflows/hig.md
workflows/recommend.md
workflows/brief.md
```

This is 13 file modifications for one new coverage flag — a known cost of the pass-through-all pattern. A dedicated migration phase as the FIRST phase of the milestone addresses this before any Stitch-specific logic is shipped.

---

## Anti-Patterns

### Anti-Pattern 1: Generating Stitch Output Without Connection Check

**What people do:** Directly call `mcp__stitch__generate_screen_from_text` in a workflow without checking connection status first.

**Why it's wrong:** Fails opaquely when Stitch is not configured. The probe/degrade contract must be respected — check `mcp-connections.json` first, degrade to PDE HTML on missing connection.

**Do this instead:** Always check `stitch.status == 'connected'` via `loadConnections()` before any Stitch tool call. Pattern is identical to the Pencil check in critique.md Step 3.5.

---

### Anti-Pattern 2: Replacing WFR Artifacts With STH Artifacts

**What people do:** Write `STH-{slug}.html` to the same path as `WFR-{slug}.html`, overwriting PDE wireframes.

**Why it's wrong:** Destroys the `<!-- ANNOTATION: -->` and `<!-- COMPOSITION: -->` comments that critique and handoff depend on. Stitch HTML has no PDE annotations — it is raw generated code. Overwriting WFR files would break both downstream skills.

**Do this instead:** STH artifacts always use the `STH-` prefix and live alongside WFR artifacts. WFR is the authoritative PDE artifact with annotation structure; STH is the Stitch variant for comparison and enrichment. The two namespaces are independent.

---

### Anti-Pattern 3: Adding hasStitchWireframes Without Pass-Through Migration

**What people do:** Add `hasStitchWireframes` to the wireframe coverage write without updating all 12 other skills that write designCoverage.

**Why it's wrong:** Any skill that writes designCoverage without the new field will overwrite it to `undefined` (treated as absent). The pass-through-all pattern's anti-pattern in wireframe.md states: "Set designCoverage without reading coverage-check first resets flags set by other skills." This applies to new fields too.

**Do this instead:** Add a dedicated Phase 1 migration before shipping any Stitch-specific logic. Update all 13 skills' coverage writes to include `hasStitchWireframes` in their pass-through before any Stitch workflow is live.

---

### Anti-Pattern 4: Blocking on Stitch Generation Timeout

**What people do:** Call `stitch:generate-screen` inline in a multi-screen batch with no cap, blocking the workflow for many minutes.

**Why it's wrong:** Stitch generates one screen at a time and may take 10-60 seconds per generation at hifi fidelity. A 10-screen batch could block for 10+ minutes. Claude Code sessions have context limits and user patience limits.

**Do this instead:** Cap at MAX_STITCH_SCREENS from config.json (default: 3). For larger screen sets, generate Stitch variants only for the primary screen per journey (most important screen per flow). Log skipped screens with instructions to generate them individually.

---

### Anti-Pattern 5: Treating Stitch HTML as Spec-Quality Handoff Source

**What people do:** Parse `STH-{slug}.html` as the primary handoff spec source, ignoring WFR annotation comments.

**Why it's wrong:** Stitch generates idiomatic frontend code for its own rendering pipeline — not annotation-rich handoff specs. The HTML may use Stitch-specific class names, inline styles without token references, and no `<!-- ANNOTATION: -->` comments documenting state triggers.

**Do this instead:** Stitch HTML is one signal among many in handoff extraction. WFR annotation comments remain the authoritative semantic source. Stitch HTML provides visual structure confirmation and component boundary evidence. Both are used; neither replaces the other.

---

### Anti-Pattern 6: Using a Community Stitch MCP Server Without Security Audit

**What people do:** Configure `Kargatharaakash/stitch-mcp` or `davideast/stitch-mcp` as the approved server URL without verifying against PDE's verified-sources-only security policy.

**Why it's wrong:** PDE's security policy (`assertApproved`) requires official MCP servers from approved vendors. Community implementations have not been audited. Using them would violate the verified-sources-only policy that protects against unauthorized tool access.

**Do this instead:** The APPROVED_SERVERS `url` field for stitch should point to the official Google Stitch MCP endpoint, confirmed from `stitch.withgoogle.com/docs/mcp/setup`. If the official URL is not yet resolvable at milestone start, ship the Stitch entry with `url: null` and `status: 'pending-official-url'` until confirmed. Do not use community servers as the approved endpoint.

---

## Integration Points

### External Services

| Service | Integration Pattern | Confidence | Notes |
|---------|---------------------|------------|-------|
| Google Stitch (stitch.withgoogle.com) | HTTP MCP server + API key auth | MEDIUM | Official MCP URL not yet confirmed; verify before Phase 2 |
| Google Cloud (gcloud) | Not required for API key path | HIGH | Only needed for OAuth/service account variant; API key is simpler |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| wireframe.md ↔ wireframe-stitch.md | Sub-workflow include (`@workflows/wireframe-stitch.md`) | Same pattern as wireframe-figma-context.md |
| mockup.md ↔ wireframe-stitch.md | Sub-workflow include with `--mockup` flag | Reuse, no new sub-workflow needed |
| critique.md ↔ critique-stitch-compare.md | Sub-workflow include after Step 3.5 | Same pattern as critique-pencil-screenshot.md |
| handoff.md ↔ handoff-stitch-extract.md | Sub-workflow include after Step 1.5 | Same pattern as handoff-figma-codeConnect.md |
| ideate.md ↔ ideate-stitch.md | Sub-workflow include inside Pass 1 | New pattern — ideate has no prior sub-workflow |
| any stitch workflow ↔ mcp-bridge.cjs | `loadConnections()` via Node.js inline script | Same pattern as critique-pencil-screenshot.md |
| wireframe-stitch.md ↔ design-manifest.json | Via `pde-tools.cjs design manifest-update STH ...` | STH is new artifact code |
| commands/*.md ↔ Stitch MCP tools | `allowed-tools: mcp__stitch__*` wildcard | Same wildcard pattern as mcp__figma__* |

---

## Build Order and Phase Dependencies

```
Phase 1: Coverage migration (prerequisite for all Stitch phases)
  Files: all 13 coverage-writing workflows + design-manifest.json template
  → Add hasStitchWireframes to all 13 skills' coverage pass-through
  → No behavioral change; pure schema extension

Phase 2: mcp-bridge.cjs extension + connect workflow
  Files: bin/lib/mcp-bridge.cjs, commands/connect.md, workflows/connect.md
  → Add stitch APPROVED_SERVERS entry
  → Add 10 TOOL_MAP entries (raw names MEDIUM confidence — verify live)
  → Add stitch AUTH_INSTRUCTIONS
  → Add stitch to connect.md help text
  Verification gate: /pde:connect stitch confirms probe tool works

Phase 3: Touchpoint 1 — Wireframe/Mockup (stitch as primary renderer)
  Files: workflows/wireframe-stitch.md (NEW), workflows/wireframe.md,
         workflows/mockup.md, commands/wireframe.md, commands/mockup.md
  Depends on: Phase 1, Phase 2

Phase 4: Touchpoint 2 — Ideation (visual divergence)
  Files: workflows/ideate-stitch.md (NEW), workflows/ideate.md, commands/ideate.md
  Depends on: Phase 2
  Parallel with: Phase 3

Phase 5: Touchpoint 3 — Critique (token compliance comparison)
  Files: workflows/critique-stitch-compare.md (NEW), workflows/critique.md,
         commands/critique.md
  Depends on: Phase 3 (needs STH artifacts to compare against)

Phase 6: Touchpoint 4 — Handoff (pattern extraction)
  Files: workflows/handoff-stitch-extract.md (NEW), workflows/handoff.md,
         commands/handoff.md
  Depends on: Phase 3 (needs STH artifacts)
  Parallel with: Phase 5
```

**Minimum viable delivery:** Phases 1-3 deliver the primary value (Stitch as wireframe renderer). Phases 4-6 are enhancements. If timeline is tight, Phases 4-6 can move to a point release.

---

## Zero-NPM Constraint Compliance

The zero-npm-dependency constraint at the plugin root is preserved:

- All Stitch tool calls go through Claude Code's MCP runtime — no npm client library
- `mcp-bridge.cjs` uses only `node:fs` and `node:path` (unchanged)
- Base64-to-PNG conversion: `Buffer.from(b64string, 'base64')` + `fs.writeFileSync` — both Node.js built-ins, no `sharp` or image processing library needed
- Claude's native multimodal vision (reading PNG files via the Read tool) requires no additional tooling
- The Stitch MCP server package (e.g., official Google package) is installed globally by the user via `claude mcp add` — it is NOT a PDE dependency and does not appear in any PDE package.json

The only new binary the user installs is the Stitch MCP server itself, as a precondition of `/pde:connect stitch`, exactly as GitHub/Linear/Figma MCP servers are user-installed preconditions.

---

## Sources

- [GitHub: davideast/stitch-mcp — CLI for Stitch integration](https://github.com/davideast/stitch-mcp) — MEDIUM confidence (community, not official)
- [GitHub: Kargatharaakash/stitch-mcp — Universal MCP Server](https://github.com/Kargatharaakash/stitch-mcp) — MEDIUM confidence (community)
- [MCP Servers registry: stitch-mcp tool list](https://mcpservers.org/servers/kargatharaakash/stitch-mcp) — MEDIUM confidence (community registry)
- [Google Labs: Stitch announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/) — HIGH confidence (official)
- [Google Codelabs: Design-to-Code with Antigravity and Stitch MCP](https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch) — MEDIUM confidence (documents Antigravity IDE integration, not Claude Code directly)
- [NxCode: Google Stitch Complete Guide Vibe Design 2026](https://www.nxcode.io/resources/news/google-stitch-complete-guide-vibe-design-2026) — LOW confidence (third-party)
- [Winbuzzer: Google Redesigns Stitch AI, Voice Canvas, Developer Integrations](https://winbuzzer.com/2026/03/20/google-redesigns-stitch-ai-voice-canvas-developer-integrations-xcxwbn/) — MEDIUM confidence (news, March 2026)
- [Google Stitch MCP Setup Docs](https://stitch.withgoogle.com/docs/mcp/setup) — HIGH confidence source; page returned minified JS on fetch, content not parseable

---

*Architecture research for: Google Stitch integration into PDE v0.9*
*Researched: 2026-03-20*
