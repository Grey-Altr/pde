# Architecture Research

**Domain:** Experience product type extension — integrating event/festival/installation pipelines into PDE's existing design pipeline architecture
**Researched:** 2026-03-21
**Confidence:** HIGH — fully derivable from direct codebase inspection of all 13 pipeline skills; no external dependencies required

---

> **Scope note:** This file covers ONLY the v0.11 experience product type milestone. Existing PDE architecture
> (event bus, tmux dashboard, workflow engine, state model, Stitch integration) is documented in PROJECT.md.
> Every component described is either additive (new files) or a targeted extension within existing workflow files.
> No architectural restructuring. No new directories beyond what follows the established pattern.

---

## Standard Architecture

### How Product Type Flows Through the Pipeline

The existing dispatch pattern is already proven for `hardware` vs `software` branching. The `experience` type integrates using the same mechanism — a canonical lowercase string read from the brief, stored in DESIGN-STATE and design-manifest.json, and consulted by downstream skills via a conditional block in each skill's prerequisite step.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                     Project Context Layer                                  │
│   .planning/PROJECT.md — experience signals detected by /pde:brief        │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ Step 4/7 product type detection
                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│   DESIGN-STATE.md Quick Reference + design-manifest.json productType      │
│   "experience"  ← canonical string (joins: software | hardware | hybrid)  │
│   "sub_type": "single-night | multi-day | recurring-series |              │
│               installation | hybrid-event"  ← NEW manifest field          │
└──────────────────────────────┬────────────────────────────────────────────┘
                               │ read by each downstream skill
         ┌─────────────────────┼───────────────────────────────┐
         ▼                     ▼                               ▼
┌─────────────┐       ┌──────────────────┐          ┌────────────────────┐
│  /pde:flows │       │  /pde:system     │          │  /pde:wireframe    │
│  temporal + │       │  sonic + lighting│          │  floor plan +      │
│  spatial +  │       │  spatial + brand │          │  timeline wireframe│
│  social dims│       │  palettes        │          │  (new artifact     │
│             │       │                  │          │   types)           │
└──────┬──────┘       └────────┬─────────┘          └────────┬───────────┘
       │                       │                             │
       ▼                       ▼                             ▼
┌─────────────┐       ┌──────────────────┐          ┌────────────────────┐
│  /pde:      │       │  /pde:hig        │          │  /pde:handoff      │
│  critique   │       │  physical HIG:   │          │  production bible  │
│  safety +   │       │  wayfinding +    │          │  run sheet +       │
│  operations │       │  acoustic zones  │          │  staffing plan     │
│  + community│       │  + queue UX      │          │                    │
└─────────────┘       └──────────────────┘          └────────────────────┘
```

### The Dispatch Pattern (Existing, Extended)

Every skill follows the same dispatch pattern, already proven by the `hardware` conditional in `/pde:handoff` Step 4i and the `software`/`hardware` constraint tables in `/pde:brief`:

```
Within each skill's prerequisite step:

PRODUCT_TYPE = read from brief's "**Type:**" line (or manifest productType)

IF PRODUCT_TYPE is "experience":
  EXPERIENCE_SUB_TYPE = read from brief's "**Sub-type:**" line
  [load experience-specific behavior for this skill]
ELSE:
  [existing software/hardware/hybrid behavior unchanged]
```

No skill restructuring is needed. The conditional is additive within the existing step structure.

---

## System Overview

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `workflows/brief.md` Step 4/7 | Detect experience signals, resolve sub-type | MODIFIED |
| `workflows/brief.md` Step 5/7 | Add experience Design Constraints table, venue/vibe fields | MODIFIED |
| `workflows/flows.md` Step 4+ | Add temporal/spatial/social flow dimensions when experience | MODIFIED |
| `workflows/system.md` Step 4+ | Add sonic/lighting/spatial/thermal token categories when experience | MODIFIED |
| `workflows/wireframe.md` Step 4+ | Emit FPL (floor plan) and TML (timeline) artifact codes when experience | MODIFIED |
| `workflows/critique.md` Step 4+ | Add experience perspectives to critique pass | MODIFIED |
| `workflows/hig.md` Step 4+ | Replace WCAG/digital HIG with physical interface guidelines when experience | MODIFIED |
| `workflows/handoff.md` Step 4+ | Emit production bible sections instead of software component APIs | MODIFIED |
| `templates/design-manifest.json` | Add `experienceSubType` field, new artifact codes | MODIFIED |
| `templates/design-state-root.md` | Add `Sub-type` row to Quick Reference | MODIFIED |
| `references/experience-hig.md` | Physical HIG reference: wayfinding, acoustic zoning, queue UX | NEW |
| `references/experience-tokens.md` | Sonic/lighting/spatial token category schemas | NEW |
| `commands/build.md` | Add `flyer` and `print` stages to pipeline (optional, configurable) | MODIFIED |

**Unchanged components:** `pde-tools.cjs`, `bin/`, `mcp-bridge.cjs`, all hook infrastructure, `templates/design-state-domain.md`, all non-design workflows.

---

## Recommended Project Structure (Changes Only)

```
workflows/
├── brief.md          # MODIFIED: +experience signals, +sub-type detection, +venue constraints
├── flows.md          # MODIFIED: +temporal/spatial/social flow dimensions
├── system.md         # MODIFIED: +sonic/lighting/spatial/thermal token categories
├── wireframe.md      # MODIFIED: +floor plan (FPL) and timeline (TML) artifact types
├── critique.md       # MODIFIED: +7 experience perspectives
├── hig.md            # MODIFIED: +physical HIG mode when experience type detected
├── handoff.md        # MODIFIED: +production bible output sections
└── [all other workflows unchanged]

references/
├── experience-hig.md        # NEW: physical HIG reference library (wayfinding, acoustic, queue, ratios)
├── experience-tokens.md     # NEW: sonic/lighting/spatial/thermal token schemas + examples
└── [all other references unchanged]

templates/
├── design-manifest.json     # MODIFIED: +experienceSubType field, +FPL/TML artifact code examples
└── design-state-root.md     # MODIFIED: +Sub-type row in Quick Reference
```

### Structure Rationale

- **No new workflow files** — all experience behavior lives inside existing skill workflows as conditional branches, following the hardware pattern. New workflow files would fragment the pipeline and break the `--from` resumption logic in `build.md`.
- **Two new reference files** — `experience-hig.md` and `experience-tokens.md` keep the core workflow files lean. Reference files are loaded via `@references/` pattern already used by `interaction-patterns.md`, `wcag-baseline.md`, etc.
- **Manifest template modified, not forked** — `design-manifest.json` is the single schema for all product types. Adding `experienceSubType` at the root level (alongside `productType`) follows the existing `productType` precedent.

---

## Architectural Patterns

### Pattern 1: Product-Type Conditional Block Within Existing Step

This is the foundational pattern for the entire milestone. Every experience extension uses it.

**What:** Inside a skill's existing step (not a new step), add `IF PRODUCT_TYPE is "experience"` blocks that add experience behavior before or instead of the default behavior. The step count and step headers remain unchanged.

**When to use:** Every affected skill. This is the only permitted dispatch mechanism — do not create `experience-brief.md`, `experience-flows.md`, etc. as parallel files.

**Trade-offs:** Keeps each skill as a single file (simpler for users, maintainers, and the build orchestrator). The workflow file grows longer, but each section is clearly labelled. The alternative (parallel experience files) would break `--from` stage resumption, double the skill count in `skill-registry.md`, and create a maintenance split-brain.

**Example (from existing hardware pattern in handoff.md, Step 4i):**
```
Based on PRODUCT_TYPE:
- "software":    include software component API sections, omit hardware sections
- "hardware":    include Hardware Handoff sections, omit software component APIs
- "hybrid":      include both
- "experience":  include Production Bible sections, omit software component APIs
                 (flyer/print artifacts registered separately under FLY/PRT codes)
```

### Pattern 2: Sub-type Dispatch for Experience Variants

**What:** After detecting `product_type = "experience"`, detect the sub-type from further signal matching. Sub-type informs intensity of physical constraints, not structural branching — all five sub-types produce the same artifact types, with different content emphasis.

**When to use:** Within the brief (detection) and flows/system/critique (content calibration). Sub-type is NOT used for structural if/else branching within skills — it enriches generation prompts.

**Sub-types and their key calibration differences:**
```
single-night:    temporal flow = single linear arc; staffing = minimal; venue = one space
multi-day:       temporal flow = repeated arcs; staffing = shift model; venue = persistent infrastructure
recurring-series: temporal flow = template + variants; identity = series coherence critical
installation:    temporal flow = open-ended / visitor-paced; spatial flow = primary; no run sheet
hybrid-event:    physical + digital flows both present; handoff includes both software API + run sheet
```

**Trade-offs:** Sub-type as prompt calibration (not structural branching) prevents exponential branch count. Five sub-types × 8 stages would be 40 branches if structural — instead it's 8 conditional blocks with sub-type-aware generation guidance.

### Pattern 3: New Artifact Codes Without New Coverage Flags

**What:** New experience artifact types (FPL = floor plan, TML = timeline, FLY = flyer, PRT = print collateral) are registered in `design-manifest.json` under `artifacts` using the existing schema. No new `hasFloorPlan`, `hasTimeline` boolean flags are added to `designCoverage`.

**When to use:** Any new artifact type. The pattern is established: `artifacts.BRF` presence signals brief exists — not `designCoverage.hasBrief`. Floor plan presence is signalled by `artifacts.FPL` existence.

**Trade-offs:** `designCoverage` boolean flags exist for the build orchestrator's stage-completion checks. FPL and TML are sub-artifacts of the wireframe stage — the orchestrator should check `hasWireframes`, not `hasFloorPlan` separately. New top-level `designCoverage` flags are only warranted for stages that appear in the pipeline `STAGES` table in `build.md`. FPL/TML are not new stages — they are outputs of the existing wireframe stage for experience products.

**Exception:** `hasPrintCollateral` may be warranted as a coverage flag if `flyer` becomes its own stage in `build.md`. This is a build-order decision deferred to milestone planning.

### Pattern 4: HIG Replacement Pattern (Physical vs Digital)

**What:** When `PRODUCT_TYPE is "experience"`, the `/pde:hig` skill replaces WCAG/digital-platform checks with physical interface guideline checks. The step structure (7 steps) is preserved; Step 4 content is swapped.

**When to use:** Only for `/pde:hig`. Other skills add experience content alongside existing content — HIG replaces because digital guidelines are inapplicable to physical spaces.

**What the physical HIG covers (loaded from `references/experience-hig.md`):**
- Wayfinding legibility (signage size at distance, contrast, icon universality)
- Acoustic zoning (dB separation between zones, hearing-loop provision)
- Queue UX (wait time communication, shade, hydration proximity)
- Transaction speed (bar/merch: target <90s per transaction)
- Toilet ratio (EN 16747 or local code: typically 1 per 75 females, 1 per 100 males + 1 accessible per 150)
- Hydration provision (1 free water point per 500 attendees)
- First aid coverage (1 responder per 1000 attendees; placement within 3min walk)
- Accessibility routes (continuous accessible path, ramp gradients, rest areas)

**HIG `--light` mode for critique delegation:** When `--light` flag is present and product type is experience, the abbreviated check set covers: wayfinding contrast, accessible route continuity, first aid placement, toilet ratio compliance, hydration access. These five map structurally to the 5 mandatory digital checks in light mode.

**Trade-offs:** Physical HIG guidelines are less automatable than WCAG — PDE cannot run an accessibility checker on a floor plan. The HIG skill produces analysis and recommendations rather than automated audit results. This is appropriate: the skill is a reasoning exercise, not a tool invocation.

### Pattern 5: Floor Plan as Wireframe Variant

**What:** The wireframe skill produces HTML wireframes for digital screens. For experience products, it additionally produces floor plan visualizations (FPL artifact code) and timeline wireframes (TML artifact code). These are HTML artifacts following the same file-based output pattern — one HTML file per space, registered in the manifest.

**Implementation approach:** Floor plans are SVG-in-HTML layouts using the same tokens.css (spatial token values like `--space-*` for grid units representing meters). Not raster images — the same HTML-based approach used for screen wireframes, adapted to spatial layout rather than UI layout.

**Artifact naming:**
```
FPL-{venue-area}-v{N}.html    → floor plan for a named venue area
TML-timeline-v{N}.html        → event timeline / schedule wireframe
FLY-flyer-v{N}.html           → event flyer (for print PDF export)
```

**Manifest entries follow existing WFR pattern:**
```json
"FPL-main-stage": {
  "code": "FPL-main-stage",
  "name": "Main Stage Floor Plan",
  "type": "floor-plan",
  "domain": "ux",
  "path": "ux/wireframes/FPL-main-stage-v1.html",
  "status": "draft",
  "version": 1,
  "dependsOn": ["FLW-main", "SYS"]
}
```

### Pattern 6: Critique Perspective Extension

**What:** The existing critique runs 4 perspectives (UX/usability, visual hierarchy, accessibility, business alignment). For experience products, 7 additional perspectives are added. The skill's `--focused "perspective"` flag must support the new perspective names.

**New perspectives (experience-only):**
```
safety          — crowd density, evacuation routes, hazard identification
accessibility   — physical (replaces digital WCAG) — routes, hearing loops, rest areas
operations      — staffing coverage, logistics, run-of-show feasibility
sustainability  — waste management, energy, travel impact
licensing       — noise permits, alcohol licensing, capacity limits
financial       — budget margin, contingency, revenue projection sanity
community       — neighborhood impact, local partnerships, legacy
```

**Weighting:** The existing 4 perspectives have defined weights (UX: 1.5x, Visual: 1.0x, Accessibility: 1.5x, Business: 1.0x). Experience perspectives use a flatter weighting: Safety: 2.0x, Accessibility (physical): 1.5x, Operations: 1.5x, Licensing: 1.5x, Financial: 1.0x, Sustainability: 1.0x, Community: 1.0x. Safety is weighted 2.0x because safety issues block the event entirely.

**Stitch integration note:** Critique's Stitch comparison behavior (`## Stitch Comparison` section, `source: "stitch"` manifest check) applies to floor plan HTML artifacts the same way it applies to screen wireframe HTML. No new Stitch logic needed — existing per-artifact detection handles it.

---

## Data Flow

### Experience Product Type Through Pipeline

```
User runs /pde:brief
    ↓
Step 4/7: Signal detection (NEW experience signal set)
    experience signals: event, festival, installation, venue, capacity, attendees,
    run-of-show, backstage, front-of-house, production, PA, stage, set, programme,
    ticket, gateline, lineup, artist, performer, sponsor, volunteer, site map,
    floor plan, acoustic zone, wayfinding, hydration, first aid, crowd, egress,
    physical space, dB, watts, lux, queue, merchandise, bar, catering
    ↓
product_type = "experience"
sub_type = one of: single-night | multi-day | recurring-series | installation | hybrid-event
    ↓
Written to:
    - BRF-brief-v{N}.md: "**Type:** experience", "**Sub-type:** {sub_type}"
    - DESIGN-STATE.md Quick Reference: "| Product Type | experience |", "| Sub-type | {sub_type} |"
    - design-manifest.json: productType: "experience", experienceSubType: "{sub_type}"
    ↓
/pde:flows reads product_type from brief
    IF experience:
      Generate temporal flow (arrival → peak → exit arc)
      Generate spatial flow (site-wide movement patterns, zone-to-zone transitions)
      Generate social flow (group formation, interaction touchpoints)
      FLW-screen-inventory.json entries use "space" not "screen" for key name
      (e.g., "entry-gateline", "main-stage-area", "food-court", "backstage")
    ↓
/pde:system reads product_type from brief
    IF experience:
      Add token categories: sonic, lighting, spatial, thermal/atmospheric, brand-palettes
      Sonic: --sonic-stage-db-max, --sonic-separation-db-min, --sonic-hearing-loop-db
      Lighting: --lighting-stage-lux, --lighting-wayfinding-lux, --lighting-emergency-lux
      Spatial: --spatial-unit (1 grid unit = 1m), --spatial-density-comfortable, --spatial-density-max
      Thermal: --thermal-indoor-target, --thermal-outdoor-shade-target
      Brand palettes: series identity palette alongside standard color tokens
    ↓
/pde:wireframe reads product_type from brief + FLW-screen-inventory.json
    IF experience:
      For each entry in screen-inventory.json with type "space":
        Generate FPL-{space-slug}-v{N}.html (SVG floor plan in HTML)
      Generate TML-timeline-v{N}.html (event timeline visualization)
      Standard screen wireframes also generated IF sub_type is "hybrid-event"
    ↓
/pde:critique reads product_type from brief
    IF experience:
      Run 7 experience perspectives (safety, accessibility-physical, operations,
      sustainability, licensing, financial, community)
      Action List format identical — findings feed /pde:iterate unchanged
    ↓
/pde:hig reads product_type from brief
    IF experience:
      Replace WCAG/digital HIG with physical HIG from references/experience-hig.md
      Audit floor plan artifacts (FPL-*.html) rather than screen wireframes
      Light mode: 5 physical checks (wayfinding, accessible route, first aid, toilet ratio, hydration)
    ↓
/pde:handoff reads product_type from brief
    IF experience:
      Omit: software component APIs, TypeScript interfaces, route architecture
      Emit: production bible sections
        - Advance Document (permits, insurance, vendor contracts checklist)
        - Run Sheet (hour-by-hour timeline with owner per action)
        - Staffing Plan (role × headcount × shift × area)
        - Budget Template (cost categories with contingency model)
        - Post-Event Template (debrief structure, metrics capture, legacy report)
      IF sub_type is "hybrid-event":
        ALSO emit software component APIs for the digital layer
```

### State Propagation: DESIGN-STATE + Manifest

The `experienceSubType` field in `design-manifest.json` enables downstream skills to calibrate without re-parsing the brief:

```
design-manifest.json (root fields):
  productType: "experience"
  experienceSubType: "multi-day"

DESIGN-STATE.md Quick Reference:
  | Product Type | experience |
  | Sub-type     | multi-day  |

BRF-brief-v{N}.md Product Type section:
  **Type:** experience
  **Sub-type:** multi-day
  **Venue:** [venue name + capacity]
  **Repeatability:** annual
```

Each skill reads `productType` from the brief (not from the manifest) to maintain the existing pattern where skills treat the brief as the authoritative source and the manifest as the registry.

---

## Integration Points for All 8 Affected Pipeline Stages

### Stage 1: Brief (`/pde:brief`) — Detection + Foundation

**Integration point:** Step 4/7 (product type detection) + Step 5/7 (brief content generation)

**New vs modified:**
- MODIFIED: Step 4 signal list — add experience keyword set
- MODIFIED: Step 4 classification logic — add `experience` branch (precedes software default)
- MODIFIED: Step 4 platform detection — add `physical` platform variant
- MODIFIED: Step 5 Design Constraints table — add experience constraint rows when type=experience
- MODIFIED: Step 5 Product Type section — add Sub-type, Venue Constraints, Repeatability Intent fields
- MODIFIED: Step 5 new brief sections (experience-only): Promise Statement, Audience Archetype, Vibe Contract
- MODIFIED: Step 7 manifest-set-top-level — add `experienceSubType` manifest field write
- MODIFIED: DESIGN-STATE Quick Reference — add `Sub-type` row

**New experience signals (added to Step 4 detection):**
```
event, festival, installation, live performance, concert, venue, capacity, attendees,
run-of-show, front-of-house, FOH, BOH, backstage, production, PA system, stage, set design,
programme, lineup, artist, performer, act, sponsor, volunteer, site map, floor plan,
acoustic zone, wayfinding, hydration station, first aid, crowd management, egress,
ticket, gateline, wristband, laminate, merchandise, bar, catering, dB, watts, lux,
crowd flow, ingress, site plan, temporary structure, marquee, tent
```

**Classification logic change:**
```
IF experience signals present AND NOT dominated by software signals:
  product_type = "experience"
  Detect sub_type from:
    single-night: "one night", "one-day", "24h", "evening event", single date
    multi-day: "weekend", "multi-day", "festival" (3+ days implied), numbered days
    recurring-series: "monthly", "quarterly", "series", "season", "weekly"
    installation: "installation", "exhibition", "gallery", "open-ended", "visitor-led"
    hybrid-event: both experience AND software signals present with digital product layer
ELSE IF both software AND hardware signals are present:
  product_type = "hybrid"
...
```

Experience detection precedes the hybrid check because experience + software signals (ticketing app, digital display) should resolve to `hybrid-event` sub-type rather than `hybrid` product type.

**New brief sections (experience-only, added after Product Type):**
```markdown
## Promise Statement
[One sentence: the emotional or transformative promise made to attendees]

## Audience Archetype
[Primary audience profile: age, values, context, prior experience with this type of event]

## Vibe Contract
[3-5 adjectives defining the intended atmosphere, with one counter-adjective to avoid]

## Venue Constraints
| Constraint | Value |
|------------|-------|
| Venue type | indoor / outdoor / hybrid / touring |
| Capacity   | [number] |
| Curfew     | [time] |
| Noise permit | [dB limit if known] |
| Accessibility compliance | [local code] |

## Repeatability Intent
[Single occurrence / recurring series / touring production — affects design system longevity]
```

---

### Stage 2: Flows (`/pde:flows`) — Spatial + Temporal + Social Dimensions

**Integration point:** Steps 4-6 (flow generation and screen inventory)

**New vs modified:**
- MODIFIED: Step 4 flow generation — add three experience flow dimensions
- MODIFIED: Step 5 screen inventory JSON — `"type": "space"` entries alongside `"type": "screen"` for digital screens (hybrid-event only)
- MODIFIED: Step 6 DESIGN-STATE update — note experience flow types in decision log

**Three experience flow dimensions:**

1. **Temporal flow** — The narrative arc across time:
   - Arrival window (gates open → peak density)
   - Programme spine (headline acts, set changes, intervals)
   - Exit arc (end → venue clear, including late-stayers)
   - For recurring-series: template arc that repeats per instance

2. **Spatial flow** — Movement through physical space:
   - Entry/exit nodes (gatelines, emergency exits)
   - Zone topology (stage areas, food/bar, toilets, first aid, merch)
   - Pinch points (narrow corridors, bottleneck predictions at capacity)
   - Accessible routes (separate from general circulation)

3. **Social flow** — Group formation and touchpoints:
   - Solo, pair, small group, large group journey variants
   - Meeting points and wayfinding for groups who split
   - Social interaction zones (areas designed for congregation vs. through-traffic)

**FLW-screen-inventory.json for experience (space entries):**
```json
{
  "spaces": [
    {
      "slug": "entry-gateline",
      "name": "Entry Gateline",
      "type": "space",
      "zone": "entry",
      "capacity": 500,
      "accessible": true,
      "flows": ["arrival-flow", "egress-flow"]
    },
    {
      "slug": "main-stage-area",
      "name": "Main Stage Area",
      "type": "space",
      "zone": "performance",
      "capacity": 3000,
      "accessible": true,
      "flows": ["general-flow"]
    }
  ],
  "screens": []
}
```

The `screens` array is empty for pure experience products; populated for hybrid-event sub-type.

---

### Stage 3: Design System (`/pde:system`) — New Token Categories

**Integration point:** Step 4/7 (token generation), Step 5/7 (CSS derivation)

**New vs modified:**
- MODIFIED: Step 4 — add 5 new token categories when product_type=experience
- MODIFIED: Step 5 — emit CSS for new categories under `/* experience tokens */` comment block
- NEW reference file: `references/experience-tokens.md`

**New token categories (experience-only, added after standard 7 categories):**

```json
"sonic": {
  "stage": { "db-max": { "$value": 103, "$type": "number", "$description": "Max SPL at main stage (dB)" } },
  "separation": { "db-min": { "$value": 15, "$type": "number", "$description": "Min dB separation between zones" } },
  "hearing-loop": { "db": { "$value": 65, "$type": "number", "$description": "Hearing loop target level" } }
},
"lighting": {
  "stage": { "lux": { "$value": 800, "$type": "number" } },
  "wayfinding": { "lux": { "$value": 50, "$type": "number" } },
  "emergency": { "lux": { "$value": 1, "$type": "number", "$description": "Emergency route minimum" } },
  "ambient": { "lux": { "$value": 20, "$type": "number" } }
},
"spatial": {
  "unit": { "$value": "1m", "$type": "dimension", "$description": "Floor plan grid unit" },
  "density": {
    "comfortable": { "$value": 0.5, "$type": "number", "$description": "m² per person (comfortable)" },
    "max": { "$value": 0.25, "$type": "number", "$description": "m² per person (maximum)" }
  }
},
"thermal": {
  "indoor-target": { "$value": 18, "$type": "number", "$description": "°C indoor comfort target" },
  "outdoor-shade-target": { "$value": 24, "$type": "number", "$description": "°C outdoor shade target" }
},
"brand-palette": {
  "_description": "Series identity palette — colour system for recurring brand across multiple events",
  "series-primary": { "$value": "oklch(55% 0.18 270)", "$type": "color" },
  "series-secondary": { "$value": "oklch(80% 0.12 45)", "$type": "color" },
  "series-accent": { "$value": "oklch(65% 0.22 150)", "$type": "color" }
}
```

These values are defaults — the brief's explicit color preferences and venue constraints override them via INPUT_PATH logic.

---

### Stage 4: Wireframe (`/pde:wireframe`) — Floor Plan + Timeline Artifacts

**Integration point:** Steps 2-5 (screen list, fidelity, generation)

**New vs modified:**
- MODIFIED: Step 2a — accept "spaces" entries in FLW-screen-inventory.json as wireframe targets
- MODIFIED: Step 3/4/5 — generate FPL-*.html (floor plan) and TML-timeline.html when product_type=experience
- MODIFIED: Step 6/7 — register FPL and TML artifact codes in manifest

**Floor plan generation approach:**
- Output: self-contained HTML with inline SVG floor plan
- Grid: spatial token `--spatial-unit` defines the coordinate system (1 unit = 1m)
- Zones drawn as labeled rectangles with capacity annotations
- Accessible routes shown as dashed lines
- Pinch points highlighted (red border)
- Three states (as existing wireframe convention): default (normal operation), peak (at capacity), egress (exit scenario)
- File naming: `FPL-{space-slug}-v{N}.html`
- `--use-stitch` flag: routes to Stitch MCP for floor plan generation (same consent + fallback pattern as existing wireframe Stitch path)

**Timeline wireframe:**
- Output: self-contained HTML with horizontal timeline visualization
- Shows: programme spine, set changes, logistics windows, staffing shift boundaries
- Three fidelity levels parallel existing lofi/midfi/hifi:
  - lofi: boxes on a line, text labels only
  - midfi: colored zones, capacity annotations
  - hifi: brand tokens applied, print-ready layout
- File naming: `TML-timeline-v{N}.html`

**Manifest registration (new artifact codes):**
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FPL-{slug} code FPL-{slug}
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FPL-{slug} type floor-plan
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML type timeline
```

---

### Stage 5: Critique (`/pde:critique`) — Experience Perspectives

**Integration point:** Step 4/7 (perspective evaluation)

**New vs modified:**
- MODIFIED: Step 4 — add 7 experience perspectives when product_type=experience
- MODIFIED: `--focused` flag valid values — add new perspective names
- MODIFIED: scoring — experience perspectives use experience-specific weighting

**Experience perspective structure (follows existing CRT-critique output format):**

```markdown
## Perspective 5 — Safety [Weight: 2.0x]

### Findings

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| No designated emergency assembly point visible on floor plan | critical | Add clearly marked assembly points outside main crowd zones |
| Egress route width insufficient at 2m for 3000-capacity area | major | Minimum 1m egress per 250 capacity — widen to 12m or add egress points |

### What Works

[Safety-positive design decisions from floor plan that should be preserved]

### Action List

- [ ] SAF-01: Mark emergency assembly points on FPL-main-stage
- [ ] SAF-02: Widen north egress route or add secondary egress
```

**Perspective list for `--focused` flag:**
```
safety, accessibility, operations, sustainability, licensing, financial, community
```

The existing `ux`, `hierarchy`, `accessibility` (digital), `business` perspectives are suppressed for pure experience products; `accessibility` is replaced by the physical accessibility perspective. For hybrid-event sub-type, both digital and physical accessibility perspectives run.

**Stitch comparison (`## Stitch Comparison`) applies to FPL artifacts** — if a Stitch-generated floor plan exists (`source: "stitch"` in manifest), critique appends a comparison section noting spatial differences between Stitch rendering and design intent. DTCG token suppression applies to FPL Stitch artifacts (same mechanism as WFR Stitch, no new logic).

---

### Stage 6: HIG (`/pde:hig`) — Physical Interface Guidelines

**Integration point:** Step 4/7 (criterion evaluation) and Step 2/7 (artifact detection)

**New vs modified:**
- MODIFIED: Step 2 artifact detection — accept FPL-*.html and TML-*.html as auditable artifacts
- MODIFIED: Step 4 criterion set — replace WCAG/digital HIG with physical HIG when experience
- NEW reference file: `references/experience-hig.md`

**Physical HIG criterion set (loaded from `references/experience-hig.md`):**

| Criterion | Standard | Method |
|-----------|----------|--------|
| Wayfinding legibility | Signage readable at 10m: min 10cm letter height | Analyse floor plan text label sizes vs spatial scale |
| Accessible route continuity | Unbroken accessible path from entry to all zones | Trace path on FPL, flag any breaks |
| Acoustic zone separation | Min 15dB separation between adjacent zones | Check --sonic-separation-db-min token vs zone arrangement |
| Queue wait-time communication | Queue length → wait time displays at 5min+ queues | Check gateline and bar queue designs for signage |
| Toilet provision ratio | EN 16747: 1:75 female, 1:100 male, 1:150 accessible | Calculate from brief capacity + venue constraints |
| Hydration provision | 1 free water point per 500 attendees | Count FPL hydration markers vs capacity |
| First aid coverage | 1 responder per 1000; within 3min walk any point | Analyse FPL first aid placement geometry |
| Emergency egress | 1m egress width per 250 capacity; signed to 10m | Analyse FPL egress route widths vs capacity token |

**Light mode (5 checks for critique delegation, matching digital HIG light mode structure):**
1. Wayfinding contrast (legibility at distance)
2. Accessible route continuity (unbroken path)
3. First aid placement (within 3min walk)
4. Toilet ratio (within 10% of code)
5. Hydration access (1 per 500 — present/absent)

**`--platform` flag behaviour for experience:** Physical HIG has no platform variants (no `--platform ios` equivalent). The flag is ignored when product_type=experience. Log: `-> Physical HIG mode: --platform flag ignored for experience product type`.

---

### Stage 7: Handoff (`/pde:handoff`) — Production Bible

**Integration point:** Step 4/7 (content generation, Step 4i productType conditional)

**New vs modified:**
- MODIFIED: Step 2c (brief reading) — extract experience fields: sub_type, venue constraints, capacity, repeatability
- MODIFIED: Step 4i productType conditional — add `"experience"` branch
- MODIFIED: Step 5 output structure — production bible sections replace software component APIs
- MODIFIED: Step 7 manifest — register HND artifact with `type: "production-bible"` instead of `type: "handoff-spec"`

**Experience handoff output structure:**

```markdown
---
Skill: /pde:handoff (HND)
Product Type: "experience"
Experience Sub-type: "{sub_type}"
---

# Production Bible: {Event Name}

## 1. Advance Document
<!-- Checklist of pre-event tasks with deadlines and owners -->
### Permits & Licensing
| Permit | Lead Time | Owner | Status |
...
### Insurance
### Vendor Contracts
### Risk Assessment

## 2. Run Sheet
<!-- Hour-by-hour event day timeline -->
| Time | Action | Owner | Notes |
...

## 3. Staffing Plan
<!-- Role × headcount × shift × zone assignment -->
| Role | Headcount | Shift | Zone | Notes |
...

## 4. Budget Template
| Category | Estimated | Actual | Variance | Notes |
...
### Contingency Model
10% on total production costs (standard for first-time events)
15% on technical production (equipment hire risk)

## 5. Post-Event Template
### Metrics to Capture
### Debrief Structure
### Legacy Report Outline
```

**For hybrid-event sub-type:** Sections 1-5 above PLUS the full software handoff (`HND-handoff-spec-v{N}.md` and `HND-types-v{N}.ts`) for the digital layer. Two output files are produced.

**STACK.md dependency for hybrid-event:** `/pde:handoff` hard-requires STACK.md for software component API generation. For pure experience products (non-hybrid), STACK.md is not required. The Step 2a STACK.md check becomes conditional:
```
IF PRODUCT_TYPE is "experience" AND experienceSubType is NOT "hybrid-event":
  SKIP STACK.md check — production bible does not require framework detection
  Set FRAMEWORK = "none", TYPESCRIPT = false
ELSE:
  [existing STACK.md hard-requirement logic unchanged]
```

---

### Stage 8: Print Collateral (`/pde:flyer` — new skill)

**Integration point:** New command + workflow file (not a modification of an existing stage)

**New vs modified:**
- NEW: `commands/flyer.md` — `/pde:flyer` slash command
- NEW: `workflows/flyer.md` — flyer and print collateral generation workflow
- MODIFIED: `workflows/build.md` — add `flyer` and `print` stages to STAGES table (after handoff)
- MODIFIED: `templates/design-manifest.json` — add FLY/PRT artifact code examples
- MODIFIED: `templates/design-state-root.md` — add print collateral coverage awareness

**Why a new skill (not folded into wireframe or handoff):** Print collateral has its own fidelity arc (lofi sketch → midfi layout → hifi production-ready), its own version lifecycle, and its own downstream consumer (printers, social media). Folding it into wireframe would blur the screen/spatial/print artifact separation. Folding it into handoff would make handoff non-terminating (print needs critique and iterate loops of its own).

**Artifacts produced by /pde:flyer:**
- `FLY-event-flyer-v{N}.html` — single-event flyer (A5/A4/square variants via CSS media)
- `FLY-series-identity-v{N}.html` — series identity template (recurring-series sub-type only)
- `PRT-programme-v{N}.html` — festival programme/schedule (multi-day sub-type)

**Build pipeline stages (modified STAGES table in build.md):**
```
| 14 | flyer | pde:flyer | coverage | hasPrintCollateral |
```

The flyer stage is experience-only. Build orchestrator skips it for software/hardware/hybrid product types via coverage check + product type gate.

---

## Build Order

Dependencies flow strictly in one direction through the pipeline. The experience extensions do not introduce cycles.

```
Phase 1: Signal detection infrastructure
  WHAT: Add experience keyword set + sub-type detection to /pde:brief Step 4
        Add experienceSubType field to design-manifest.json template
        Add Sub-type row to design-state-root.md template
  WHY FIRST: All downstream skills read product_type and sub_type from the brief
             and manifest. Nothing can be built without the detection foundation.
  DELIVERABLE: /pde:brief correctly detects and classifies experience products

Phase 2: Reference files
  WHAT: Create references/experience-hig.md (physical HIG criteria)
        Create references/experience-tokens.md (sonic/lighting/spatial/thermal schemas)
  WHY SECOND: /pde:hig and /pde:system load these via @references/ at runtime.
              They must exist before the skills that reference them.
  DELIVERABLE: Two new reference files; no workflow changes yet

Phase 3: Brief content extensions (depends on Phase 1)
  WHAT: Add experience sections to /pde:brief Step 5 output
        (Promise Statement, Audience Archetype, Vibe Contract, Venue Constraints,
        Repeatability Intent)
  WHY THIRD: Brief provides the content that flows → system → wireframe → critique
             → hig → handoff all consume. Experience sections must be generated
             before downstream skills try to read them.
  DELIVERABLE: /pde:brief produces complete experience brief when type=experience

Phase 4: Flows extensions (depends on Phase 3)
  WHAT: Add temporal/spatial/social flow dimensions to /pde:flows
        Update FLW-screen-inventory.json schema with "spaces" array
  WHY FOURTH: Wireframe reads the screen inventory. Space entries must exist
              before wireframe tries to generate floor plans.
  DELIVERABLE: /pde:flows produces three-dimensional experience flows + space inventory

Phase 5: Design system extensions (depends on Phase 3, parallel with Phase 4)
  WHAT: Add 5 new token categories to /pde:system generation step
  WHY: System and flows are independent — system reads brief only, not flows.
       Can build in parallel with Phase 4.
  DELIVERABLE: /pde:system emits sonic/lighting/spatial/thermal/brand-palette tokens

Phase 6: Wireframe extensions (depends on Phases 4 + 5)
  WHAT: Add FPL (floor plan) and TML (timeline) artifact generation to /pde:wireframe
        Register FPL/TML artifact codes in manifest
  WHY SIXTH: Wireframe reads screen-inventory.json (Phase 4) and tokens.css (Phase 5).
             Both must exist before floor plan generation.
  DELIVERABLE: /pde:wireframe produces HTML floor plans and timeline wireframes

Phase 7: Critique extensions (depends on Phase 6)
  WHAT: Add 7 experience perspectives to /pde:critique
        Update --focused flag valid values
  WHY SEVENTH: Critique reads wireframe artifacts including FPL and TML.
               Floor plans must exist before they can be critiqued.
  DELIVERABLE: /pde:critique runs experience perspectives on floor plans + timelines

Phase 8: HIG extensions (depends on Phase 2 + Phase 6)
  WHAT: Update /pde:hig to accept FPL artifacts and run physical HIG criteria
        Load references/experience-hig.md
        Add --light mode physical checks
  WHY EIGHTH: HIG audits artifacts. References must exist (Phase 2).
              Floor plans must exist (Phase 6).
  DELIVERABLE: /pde:hig produces physical HIG audit for experience products

Phase 9: Handoff extensions (depends on Phase 3)
  WHAT: Add production bible output to /pde:handoff Step 4i experience branch
        Make STACK.md check conditional for non-hybrid experience types
  WHY NINTH: Handoff reads brief (Phase 3) for venue/capacity/repeatability fields.
             Can build once brief content extensions are stable.
  DELIVERABLE: /pde:handoff produces production bible for experience products

Phase 10: Print collateral skill (depends on Phases 3 + 6)
  WHAT: Create commands/flyer.md, workflows/flyer.md
        Add flyer stage to build.md STAGES table
        Add FLY/PRT artifact codes to manifest template
  WHY LAST: New skill has most moving parts (new command, workflow, stages entry).
            Build after core pipeline extensions are stable.
  DELIVERABLE: /pde:flyer produces event flyer, series identity, programme artifacts
```

**Parallelisable pairs:**
- Phase 4 and Phase 5 can build in parallel (both depend on Phase 3, not on each other)
- Phase 7, Phase 8, Phase 9 can build in parallel once Phase 6 is complete

---

## Anti-Patterns

### Anti-Pattern 1: Parallel Experience Skill Files

**What people do:** Create `workflows/experience-brief.md`, `workflows/experience-flows.md`, etc. as separate files that handle experience logic.

**Why it's wrong:** The build orchestrator (`build.md`) maps stage names to skill commands — one stage, one skill. Parallel files would require either a new stage name (breaking `--from` resumption) or conditional file loading (not supported by the `@workflows/` reference pattern). The `skill-registry.md` would double in size. Maintenance becomes a split-brain — two files per stage, one of which is always wrong.

**Do this instead:** Use product-type conditional blocks inside the existing skill workflow, following the hardware pattern established in `handoff.md` Step 4i and `brief.md` Step 5.

### Anti-Pattern 2: New designCoverage Flags for Sub-Artifacts

**What people do:** Add `hasFloorPlan: false`, `hasTimeline: false`, `hasSeries Identity: false` boolean flags to the `designCoverage` object in `design-manifest.json`.

**Why it's wrong:** `designCoverage` flags exist for stage-level checks by the build orchestrator. Floor plans are sub-artifacts of the wireframe stage, not new stages. Adding flags for sub-artifacts bloats the coverage object, confuses the orchestrator's stage-completion logic, and creates flags that never get set (because no skill sets `hasFloorPlan` — the wireframe skill sets `hasWireframes`).

**Do this instead:** Register FPL and TML as entries in `artifacts` (the manifest's per-artifact registry). Use `artifacts.FPL` existence as the signal, not a boolean flag. Only add a new `designCoverage` flag if the artifact type becomes a dedicated build pipeline stage.

### Anti-Pattern 3: Replacing Brief Detection with a Manual Flag

**What people do:** Add `--type experience` as a required flag to `/pde:brief`, bypassing signal detection.

**Why it's wrong:** Manual type flags eliminate the auto-detection that makes PDE usable without configuration. Users would need to know to pass `--type experience` before running brief, breaking the self-service model. Signal detection is how PDE learns what kind of project it's dealing with — it must work automatically.

**Do this instead:** Extend the existing signal detection with experience keywords. If the detection is ambiguous (mixed signals), use Sequential Thinking MCP to resolve — the same pattern used for ambiguous software/hardware classification. The detection must be automatic.

### Anti-Pattern 4: Storing Venue Constraints in DESIGN-STATE Only

**What people do:** Write venue capacity, curfew, and noise permit limits only to DESIGN-STATE.md Quick Reference, not to the brief artifact.

**Why it's wrong:** DESIGN-STATE.md is the live pipeline state file — it's updated by every skill run and is a volatile source of truth. The brief (`BRF-brief-v{N}.md`) is the stable artifact that downstream skills (flows, system, wireframe, hig, handoff) read as authoritative context. If venue constraints live only in DESIGN-STATE, they disappear when DESIGN-STATE is regenerated or if a skill reads the brief without checking DESIGN-STATE.

**Do this instead:** Write venue constraints to the brief (`## Venue Constraints` section) as the primary record. Write a summary to DESIGN-STATE Quick Reference as a navigation shortcut (derived from the brief, not the authoritative source).

### Anti-Pattern 5: Physical HIG as WCAG Extension

**What people do:** Add venue/physical criteria as additional WCAG checks within the existing digital HIG criterion table.

**Why it's wrong:** WCAG criteria are numbered (1.1.1, 1.4.3, etc.) and digital-only. Adding physical criteria as additional numbered items creates a confusing hybrid that fails both physical and digital users. More practically: the light mode "5 mandatory checks" count becomes wrong, the criterion routing logic (`WCAG_CRITERIA_LIST`) would need physical items interleaved with digital ones, and WCAG audit tools (Axe) would be invoked against floor plan HTML and produce meaningless results.

**Do this instead:** Replace the criterion set entirely when product_type=experience. The 7-step HIG structure is preserved, but Step 4 criterion list is swapped from `references/wcag-baseline.md` + `references/interaction-patterns.md` to `references/experience-hig.md`. Light mode picks the top 5 physical criteria by safety severity, matching the existing 5-check count.

---

## Sources

- `workflows/brief.md` — product type detection pattern (signal sets, classification logic, manifest writes), v0.11 integration design target
- `workflows/handoff.md` Step 4i — hardware/hybrid conditional block (the template for all experience conditional blocks)
- `workflows/hig.md` — `--light` mode structure (5 mandatory checks pattern), platform flag resolution
- `workflows/critique.md` — perspective weighting, `--focused` flag, Action List format, Stitch comparison integration
- `workflows/wireframe.md` — artifact code registration pattern, Stitch path (`--use-stitch`), FPL/TML file naming derivation
- `workflows/flows.md` — screen inventory JSON schema (basis for "spaces" extension)
- `workflows/system.md` — DTCG token category structure (basis for sonic/lighting/spatial extension)
- `workflows/build.md` — STAGES table, stage-completion check method (coverage vs glob), `--from` resumption logic
- `templates/design-manifest.json` — artifact schema, designCoverage flags, artifact code pattern
- `templates/design-state-root.md` — Quick Reference table structure
- `.planning/PROJECT.md` — v0.11 milestone goals, experience sub-types, per-stage target features, existing architecture constraints

---

*Architecture research for: PDE v0.11 — Experience Product Type Integration*
*Researched: 2026-03-21*
