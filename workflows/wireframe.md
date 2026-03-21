<purpose>
Generate browser-viewable HTML/CSS wireframes for each screen in the flow inventory at an explicitly controlled fidelity level (lofi, midfi, or hifi). Produces one self-contained HTML file per screen that opens in any browser via file:// with no server required, plus an index.html navigation page linking all screens. Wireframes consume design tokens from assets/tokens.css when available, include all three state variants (default, loading, error) with annotation comments for Phase 19 handoff consumption, and are registered in the design manifest under artifact code WFR.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/web-modern-css.md
@references/composition-typography.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Runs Steps 1-3 only, shows planned file paths, screen list, fidelity level. No files written. |
| `--quick` | Boolean | Skip MCP enhancements for faster execution. |
| `--verbose` | Boolean | Show detailed progress, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP only. |
| `--no-playwright` | Boolean | Skip Playwright MCP browser validation specifically. |
| `--force` | Boolean | Skip confirmation when wireframes already exist — overwrite without prompting. |
| `--lofi` | Boolean | Set fidelity to lofi. Equivalent to positional argument "lofi". |
| `--midfi` | Boolean | Set fidelity to midfi. Equivalent to positional argument "midfi". |
| `--hifi` | Boolean | Set fidelity to hifi. Equivalent to positional argument "hifi". |
| `--use-stitch` | Boolean | Route generation through Google Stitch MCP instead of Claude HTML/CSS. Requires Stitch connection via /pde:connect stitch. |
</flags>

<process>

## /pde:wireframe — Wireframe Generation Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--no-playwright`, `--force`, `--lofi`, `--midfi`, `--hifi`.

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
  Check that .planning/ exists and is writable, then re-run /pde:wireframe.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 1.5/7: Load Figma design context (if available)

If `--no-mcp` is NOT set and `--quick` is NOT set:
  Follow @workflows/wireframe-figma-context.md to fetch Figma design context.
  Store the returned context as FIGMA_DESIGN_CONTEXT for use in wireframe generation steps.
  If Figma context is available, use it as additional reference for component structure and visual consistency decisions alongside PDE design tokens.

If `--no-mcp` IS set or `--quick` IS set:
  Skip Figma context. FIGMA_DESIGN_CONTEXT is empty.

---

### Step 2/7: Check prerequisites and parse arguments

This step has six sub-sections executed in order: screen inventory, fidelity validation, screen selection, force/version gate, design brief, design tokens.

#### 2a. Read screen inventory (hard dependency when no screen argument)

Use the Glob tool to check for `.planning/design/ux/FLW-screen-inventory.json`.

- If **absent AND no screen argument** in $ARGUMENTS: HALT with error:
  ```
  Error: No screen inventory found at .planning/design/ux/FLW-screen-inventory.json.
    Run /pde:flows first to generate the screen inventory, then retry /pde:wireframe.
  ```
- If **absent AND screen argument provided**: emit WARNING and continue with argument-only screen list (no journey/persona metadata available):
  ```
  Warning: No screen inventory found at .planning/design/ux/FLW-screen-inventory.json.
    Generating wireframes from argument-only screen list. No journey or persona metadata will be available.
    Run /pde:flows first for richer wireframe context.
  ```
- If **present**: Use the Read tool to load it. Parse JSON. Store as INVENTORY.

#### 2b. Parse fidelity argument (required)

Check $ARGUMENTS for fidelity in this order:

1. Boolean flags: if `--lofi` present → FIDELITY = "lofi"; if `--midfi` present → FIDELITY = "midfi"; if `--hifi` present → FIDELITY = "hifi"
2. Positional string argument: look for exactly `"lofi"`, `"midfi"`, or `"hifi"` as a standalone word in $ARGUMENTS (case-sensitive, lowercase only)

Valid values: exactly `"lofi"`, `"midfi"`, `"hifi"`. No other values accepted.

If no fidelity found OR value not in enum: HALT with error:
```
Error: Fidelity level required: lofi, midfi, or hifi.
  Usage: /pde:wireframe "screen1, screen2" lofi
  Or: /pde:wireframe --midfi
```

Store as FIDELITY (lowercase string).

#### 2c. Parse screen selection argument (optional)

Check $ARGUMENTS for a comma-separated string of screen slugs:
- Split on comma, trim whitespace from each slug.
- Match each slug against INVENTORY.screens[].slug (exact match, case-sensitive).
- For unrecognized slugs: emit WARNING and skip (never halt):
  ```
  Warning: Screen "loginn" not found in screen inventory. Skipping.
    Available screens: login, dashboard, settings, profile
    Check /pde:flows was run and FLW-screen-inventory.json is current.
  ```
- If no screen argument: use ALL screens from INVENTORY (full batch).
- Store matched screens (with full inventory metadata) as SCREENS array.

#### 2d. Version gate and force flag

Use the Glob tool to check for existing wireframe HTML files in `.planning/design/ux/wireframes/*.html` (excluding index.html).

- If wireframes exist AND `--force` NOT present: prompt user for confirmation:
  ```
  Wireframe files already exist in .planning/design/ux/wireframes/.
  Overwrite? (yes / no)
  ```
  If user answers "no": display `Aborted. Existing wireframes preserved.` and halt.
  If user answers "yes": proceed.
- If `--force` present: proceed silently, log: `  -> --force flag detected, overwriting existing wireframes.`

#### 2e. Read design brief (soft dependency)

Use the Glob tool to check for `.planning/design/strategy/BRF-brief-v*.md`. Sort all matches descending by version number, read the highest version using the Read tool.

- If absent: emit WARNING (never halt):
  ```
  Warning: No design brief found.
    Wireframes will use PROJECT.md for product context.
    Run /pde:brief for richer product-aware content.
  ```
  Use the Read tool to load `.planning/PROJECT.md` as fallback context.
- If found: extract product name, product type, key features, personas.

Store as PRODUCT_NAME, PRODUCT_TYPE.

<!-- PRODUCT_TYPE == "experience" activates Step 4-EXP: floor plan and timeline wireframes instead of software wireframes. -->
<!-- Experience product type — Phase 74 architecture: floor plan (FLP) and timeline (TML) wireframes added in Phase 78. See Step 4-EXP experience block below. -->

<!-- Phase 80 — Print Collateral: FLY (event flyer) and SIT (series identity template) -->
<!-- Depends on: PRODUCT_TYPE === "experience" from Step 2e brief read -->
<!-- Soft dependency: SYS-experience-tokens.json for brand colors (fallback: 3-color default palette) -->

#### 2h. Print collateral prerequisites (experience products only)

IF `PRODUCT_TYPE !== "experience"`: skip Step 2h entirely.

Use the Glob tool to check for `.planning/design/assets/SYS-experience-tokens.json`.

- If **absent**: set `PRINT_TOKENS_AVAILABLE = false`. Define fallback palette:
  ```javascript
  /* Fallback: run /pde:system first for branded tokens */
  const PRINT_PALETTE = {
    brand_primary: "#1a1a1a",
    brand_accent: "#ff5500",
    brand_bg: "#ffffff"
  };
  ```
  Log: `Warning: SYS-experience-tokens.json not found. Using fallback print palette. Run /pde:system for branded tokens.`

- If **present**: set `PRINT_TOKENS_AVAILABLE = true`. Use the Read tool to load it. Extract `brand_primary`, `brand_accent`, `brand_bg` color values for use in CMYK table generation. Store as `PRINT_PALETTE`.

Read `design-manifest.json` (if present) to extract `experienceSubType`:
- If `experienceSubType === "recurring-series"`: set `GENERATE_SIT = true`
- Otherwise: set `GENERATE_SIT = false`. Log: `SIT skipped — experienceSubType is {value}, not recurring-series.`

#### 2f. Read design tokens (soft dependency)

Use the Glob tool to check for `.planning/design/assets/tokens.css`.

- If present: set TOKENS_AVAILABLE = true. The `<link>` in HTML will resolve at file:// without error.
- If absent: set TOKENS_AVAILABLE = false. Wireframes will use inline fallback palette.
  - Set fallback palette based on PRODUCT_TYPE:
    - software/SaaS: `--color-surface: #ffffff; --color-text: #1f2937; --color-action: #2563eb; --color-border: #e5e7eb; --color-surface-alt: #f9fafb;`
    - marketing/other: `--color-surface: #ffffff; --color-text: #111827; --color-action: #dc2626; --color-border: #d1d5db; --color-surface-alt: #f3f4f6;`
  - Inline `<style>` block includes comment: `/* Fallback: run /pde:system first for branded tokens */`

#### 2g. Parse --use-stitch flag

Check $ARGUMENTS for `--use-stitch`:
- If present: SET USE_STITCH = true. Log: `  -> --use-stitch detected: Stitch generation mode enabled.`
- If absent: SET USE_STITCH = false. Proceed with standard Claude HTML/CSS generation.

**If `--dry-run` flag is active:** Display planned output at end of Step 2 and HALT (do not write files):

```
Dry run mode. No files will be written.

Planned output:
  Files: .planning/design/ux/wireframes/WFR-{slug}.html (one per screen)
  File: .planning/design/ux/wireframes/index.html
  File: .planning/design/ux/DESIGN-STATE.md (updated)

Source brief: {brief path or "none — using PROJECT.md"}
Fidelity: {FIDELITY}
Screens ({count}): {comma-separated slug list or "all from inventory"}
Token status: {tokens-available | tokens-fallback}
MCP enhancements: {Sequential Thinking: available/unavailable | Playwright: available/unavailable}
```

Display: `Step 2/7: Prerequisites checked. Fidelity: {FIDELITY}. Screens: {count} ({slug list or "all"}).`

---

### Step 3/7: Probe MCP tools

**Check flags first:**

```
IF --no-mcp in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET PLAYWRIGHT_AVAILABLE = false
  SET ALL_MCP_DISABLED = true
  SKIP all MCP probes
  continue to Step 4

IF --quick in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SET PLAYWRIGHT_AVAILABLE = false
  SKIP all MCP probes
  continue to Step 4

IF --no-sequential-thinking in $ARGUMENTS:
  SET SEQUENTIAL_THINKING_AVAILABLE = false
  SKIP Sequential Thinking probe

IF --no-playwright in $ARGUMENTS:
  SET PLAYWRIGHT_AVAILABLE = false
  SKIP Playwright probe
```

**Probe Sequential Thinking MCP** (if not skipped by flags above):

Attempt to call `mcp__sequential-thinking__think` with test prompt `"Analyze the following: test"`.

- Timeout: 30 seconds
- If tool responds with reasoning: SET `SEQUENTIAL_THINKING_AVAILABLE = true`. Log: `  -> Sequential Thinking MCP: available`
- If tool not found or errors: retry once (same 30s timeout)
  - If retry succeeds: `SEQUENTIAL_THINKING_AVAILABLE = true`
  - If retry fails: `SEQUENTIAL_THINKING_AVAILABLE = false`. Log: `  -> Sequential Thinking MCP: unavailable (continuing without)`

**Probe Playwright MCP** (if not skipped by flags above):

Attempt to call a tool in the `mcp__playwright__*` namespace with a minimal test probe.

- If tool responds: SET `PLAYWRIGHT_AVAILABLE = true`. Log: `  -> Playwright MCP: available`
- If tool not found or errors: SET `PLAYWRIGHT_AVAILABLE = false`. Log: `  -> Playwright MCP: unavailable (continuing without)`

**Probe Stitch MCP** (if USE_STITCH is true AND not skipped by --no-mcp):

Check for TOOL_MAP_VERIFY_REQUIRED markers:
```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { TOOL_MAP } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const verified = !JSON.stringify(TOOL_MAP).includes('VERIFY_REQUIRED');
process.stdout.write(JSON.stringify({ verified }));
EOF
```
If `verified: false`: display warning:
```
Warning: Stitch TOOL_MAP entries have not been verified against the live server.
  Run /pde:connect stitch --confirm to verify tool names before using --use-stitch.
  Proceeding with unverified tool names — generation may fail if names are incorrect.
```
Proceed (do not halt — this is a warning, not a gate).

Attempt to call `mcp__stitch__list_projects` (the Stitch probe tool) with a 10-second timeout:
- If responds: SET STITCH_MCP_AVAILABLE = true. Log: `  -> Stitch MCP: available`
- If tool not found, errors, or timeout: SET STITCH_MCP_AVAILABLE = false, SET USE_STITCH = false. Log:
  ```
  Warning: Stitch MCP unavailable (probe timeout or error). Falling back to Claude HTML/CSS generation.
  ```
  Display: `  -> Stitch MCP: unavailable — falling back to Claude generation`

Display: `Step 3/7: MCP probes complete. Sequential Thinking: {available | unavailable}. Playwright: {available | unavailable}. Stitch: {available | unavailable | not requested}.`

---

#### Step 4-EXP: Experience wireframe generation (experience products only)

**IF `PRODUCT_TYPE == "experience"`:**

Experience products generate a floor plan (FLP) and timeline (TML) instead of software wireframes. Skip Steps 4a through 4f (software path) and Step 4-STITCH entirely.

**4-EXP-1. Read spaces-inventory.json (HARD prerequisite for FLP):**

Use the Glob tool to check `.planning/design/ux/spaces-inventory.json`.

- If **present**: load the file contents as `SPACES_INVENTORY`. Parse the JSON to extract `zones`, `venueCapacity`, `bottlenecks`, and `emergencyEgress` arrays.
- If **absent**: HALT with error:
  ```
  HALT: spaces-inventory.json not found.
  Floor plan generation requires zone data from /pde:flows.
  Run /pde:flows first, then retry /pde:wireframe.
  ```

**4-EXP-2. Read TFL temporal flow (SOFT prerequisite for TML):**

Use the Glob tool to check `.planning/design/ux/TFL-temporal-flow-v*.md`. Use the highest version number if multiple exist.

- If **present**: load contents as `TFL_CONTENT`. Extract temporal arc stages and timing data for gantt chart population.
- If **absent**: emit WARNING: `Warning: TFL temporal flow not found. Using brief temporal data as fallback for timeline generation.` Use brief Venue Constraints (doors, curfew) and Vibe Contract (peak timing) as fallback.

**4-EXP-3. Generate FLP floor plan HTML (WIRE-01):**

Generate a self-contained HTML file with inline SVG. The file must open at `file://` without a server — NO external dependencies (no CDN, no images, no fonts).

Output file: `.planning/design/ux/wireframes/FLP-floor-plan-v1.html`

**HTML structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FLP — {EVENT_NAME} — Floor Plan (Schematic)</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    .schematic-disclaimer {
      background: #fff8dc; border: 1px solid #e0c060; border-radius: 4px;
      padding: 8px 12px; font-size: 12px; margin-bottom: 16px; max-width: 840px;
    }
    .floor-plan-container { background: white; padding: 16px; display: inline-block; }
    svg { display: block; }
  </style>
</head>
<body>
  <h1>{EVENT_NAME} — Floor Plan</h1>
  <aside class="schematic-disclaimer">
    <strong>SCHEMATIC ONLY.</strong> Not to scale. Zone boundaries, dimensions, and
    infrastructure placements are illustrative. Verify all measurements against venue
    technical drawings before production.
  </aside>
  <div class="floor-plan-container">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {HEIGHT}"
         width="{WIDTH}" height="{HEIGHT}" role="img"
         aria-label="Floor plan schematic">
      <title>{EVENT_NAME} Floor Plan Schematic</title>
      <!-- Content generated from SPACES_INVENTORY -->
    </svg>
  </div>
</body>
</html>
```

**SVG content requirements (HARD MINIMUMS from success criteria):**

- **Zone boundaries:** `<rect>` or `<polygon>` elements with `stroke="#334155" stroke-width="3"` (minimum stroke-width: 3 — NEVER thinner). Fill with semi-transparent color `rgba(R,G,B,0.15)`.
- **Zone labels:** `<text>` elements with `font-size="16" font-weight="bold"` for zone names. Capacity annotations use `font-size="14"` (minimum font-size: 14 — NEVER smaller). Format: `Cap: {capacity}`.
- **Flow arrows:** Use SVG `<defs><marker id="arrowhead">` pattern with `<line>` or `<path>` elements using `marker-end="url(#arrowhead)"`. Draw arrows between adjacent zones based on `adjacentTo` relationships in SPACES_INVENTORY.
- **Infrastructure placement:** Rectangles with labels for stage, bar, toilets, medical, entry. Place based on zone types and mood (e.g., stage in "peak energy" zone).
- **Accessibility routes:** Dashed lines `stroke="#16a34a" stroke-width="2" stroke-dasharray="8,4"` showing step-free paths.
- **Emergency egress:** Red exit markers at edges based on `emergencyEgress` array. Use `fill="#dc2626"` rectangles with white "EXIT" text.
- **Scale bar:** `<line>` element at bottom of SVG with text labels. Include "NOT TO SCALE" text.
- **SCHEMATIC ONLY text in SVG:** `<text>` element: `<text x="{cx}" y="{bottom}" font-size="13" text-anchor="middle" fill="#94a3b8" font-style="italic">SCHEMATIC ONLY — NOT TO SCALE</text>`

**Layout algorithm (Claude judgment):**
1. Start SVG viewBox at 840x600. If zone count > 4, increase height by 100px per additional zone.
2. Place largest-capacity zone (main floor) as central rect.
3. Place adjacent zones around main floor based on `adjacentTo` relationships.
4. Place entry/exit funnel zones near bottom edge.
5. Place emergency egress markers at logical edges.

**4-EXP-4. Generate TML timeline HTML (WIRE-02):**

Generate a self-contained HTML file with Mermaid gantt chart. Uses CDN script tag for Mermaid rendering (internet required; raw gantt text visible as fallback).

Output file: `.planning/design/ux/wireframes/TML-timeline-v1.html`

**HTML structure:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TML — {EVENT_NAME} — Event Timeline</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <!-- Note: Mermaid CDN requires internet. Without connectivity, gantt text is visible as structured fallback. -->
  <style>
    body { font-family: system-ui, sans-serif; background: #f5f5f5; padding: 24px; max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 18px; margin-bottom: 16px; }
    .energy-curve-container { background: white; padding: 16px; margin-bottom: 16px; border-radius: 4px; }
    .gantt-container { background: white; padding: 16px; border-radius: 4px; }
    .mermaid { display: block; }
    .operational-note { font-size: 11px; color: #6b7280; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>{EVENT_NAME} — Event Timeline</h1>
  <section class="energy-curve-container">
    <h2 style="font-size:13px; color:#6b7280; margin-bottom:8px;">Energy Arc</h2>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 80" width="100%" height="80"
         role="img" aria-label="Energy curve from arrival to departure">
      <!-- Bezier curve derived from Vibe Contract peak timing -->
      <!-- Stage labels: Arrival, Immersion, Peak, Comedown, Departure from TFL -->
    </svg>
  </section>
  <section class="gantt-container">
    <div class="mermaid">
gantt
    title {EVENT_NAME} — Operational Timeline
    dateFormat HH:mm
    axisFormat %H:%M
    {sections generated from brief + TFL data}
    </div>
    <p class="operational-note">
      Timeline derived from brief Venue Constraints and Vibe Contract.
      [VERIFY WITH LOCAL AUTHORITY] for curfew and licensed hours compliance.
    </p>
  </section>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'neutral', gantt: { barHeight: 20, fontSize: 12 } });
  </script>
</body>
</html>
```

**Mermaid gantt requirements:**
- Use `section` headers for parallel operational tracks: Load-in/Setup, Doors/Operations, Peak Programming, Load-out (minimum 3 sections).
- Populate timing from brief Venue Constraints (doors, curfew, load-in) and Vibe Contract (peak timing).
- Use `crit` tag for critical path items (headliner, curfew).
- Limit to 20 entries maximum for legibility. Add comment noting multi-stage festivals may need multiple TML artifacts.

**Energy curve requirements:**
- Inline SVG (no CDN dependency) with `<path>` bezier curve for energy arc.
- Map event time span (doors to curfew) to SVG viewBox width.
- Place control points at TFL arc stage fractions (arrival low, immersion rising, peak high, comedown falling, departure low).
- Add `<text>` labels at key points along the curve.

**Jump to Step 5-EXP** (experience file write) — skip Steps 4a through 4f and Step 4-STITCH (software wireframe path).

---

### Step 4/7: Generate wireframe HTML per screen

#### 4-STITCH. Stitch generation pipeline (when USE_STITCH is true)

Skip this entire section when USE_STITCH is false. Jump directly to Step 4a (Claude generation).

**4-STITCH-A: Pre-flight quota check**

```bash
node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { checkStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const result = checkStitchQuota('standard');
process.stdout.write(JSON.stringify(result));
EOF
```

Parse result JSON. Handle by `reason`:
- If `allowed: false` (reason: `quota_exhausted`): Display:
  ```
  Stitch quota exhausted (Standard: {used}/{limit} used this month).
  Falling back to Claude HTML/CSS generation.
  ```
  SET USE_STITCH = false. Proceed with Claude generation (Step 4a).
- If `reason === 'quota_warning'`: Display warning but continue:
  ```
  Warning: Stitch quota at {pct}% (Standard: {used}/{limit}). Proceeding with generation.
  ```
- If `reason === 'no_quota_configured'` or `reason === 'ok'`: Continue silently.

**4-STITCH-B: Batch outbound consent (CONSENT-01, CONSENT-03, CONSENT-04)**

Collect all screen slugs from SCREENS array. For each screen, build a one-line description: `{slug}: {screen label from inventory or slug}`.

AskUserQuestion with this exact template:
```
About to send design prompts to Google Stitch (stitch.withgoogle.com):

  Screens ({count}):
  {for each screen: "  - {slug}: {screen label}"}

  What will be sent: A text description of each screen's layout, content areas, and fidelity level.
  Service: Google Stitch MCP (stitch.withgoogle.com)

Approve sending these prompts to Stitch? (yes / no)
```

If user responds "no" or anything other than "yes":
  Display: `Stitch generation cancelled by user. Proceeding with Claude HTML/CSS generation.`
  SET USE_STITCH = false. Proceed with Claude generation (Step 4a).

**4-STITCH-C: Generate screens via Stitch (per-screen loop)**

For EACH screen in SCREENS:

1. Build a Stitch prompt from screen context:
   - Include: screen slug, label, product name, product type, fidelity level, key content areas
   - Include: screen type (from inventory), journey context (what comes before/after)
   - Do NOT include: design tokens, annotations, or PDE-internal references

2. Call `stitch:generate-screen` (mapped via TOOL_MAP to `mcp__stitch__generate_screen_from_text`):
   - Pass: prompt text, project context
   - If the call fails or times out: SET this screen to STITCH_FAILED. Log:
     ```
     Warning: Stitch generation failed for screen "{slug}": {error message}.
     This screen will use Claude HTML/CSS generation.
     ```
     Continue to next screen (do not abort entire batch).

3. Capture `screenId` from the generate response. CRITICAL: Use this screenId for ALL subsequent calls. Do NOT call `stitch:list-screens` to look up the screen (confirmed list_screens state-sync bug).

4. Fetch HTML via `stitch:fetch-screen-code` using the captured screenId.
   Store result as STH_HTML_CONTENT (held in memory, NOT written to disk yet).

5. Fetch PNG via `stitch:fetch-screen-image` using the captured screenId.
   Store result as STH_PNG_CONTENT. Handle both base64 and binary formats:
   - If string starting with data: or looks like base64: decode with Buffer.from(content, 'base64')
   - Otherwise: treat as binary buffer

6. **Annotation injection (EFF-05 — per-screen, immediately after fetch):**

   Run inline annotation on STH_HTML_CONTENT:
   ```bash
   node --input-type=module <<'EOF'
   import { createRequire } from 'module';
   const req = createRequire(import.meta.url);
   const html = process.env.STH_HTML_CONTENT;
   const componentMap = [
     ['<nav',     '<!-- @component: Navigation -->'],
     ['<header',  '<!-- @component: Header -->'],
     ['<main',    '<!-- @component: MainContent -->'],
     ['<section', '<!-- @component: Section -->'],
     ['<form',    '<!-- @component: Form -->'],
   ];
   let out = html;
   let count = 0;
   for (const [tag, comment] of componentMap) {
     const re = new RegExp(`(${tag}[\\s>])`, 'g');
     const before = out;
     out = out.replace(re, `${comment}\n$1`);
     if (out !== before) count++;
   }
   process.stdout.write(JSON.stringify({ html: out, count }));
   EOF
   ```
   Count injected annotations. If count is 0: log warning `No semantic elements found for annotation in screen "{slug}". Annotations will be empty.`
   Partial annotations accepted — inject what is found, log what is missing.
   Set ANNOTATION_COUNT for this screen. Update STH_HTML_CONTENT with annotated result.

7. **Inbound consent (CONSENT-02, CONSENT-03):**

   Calculate HTML size in KB (STH_HTML_CONTENT.length / 1024, rounded to 1 decimal).
   Calculate PNG size if available.

   AskUserQuestion:
   ```
   Received from Google Stitch:
     Screen: {slug}
     HTML: STH-{slug}.html (~{size}KB)
     PNG:  STH-{slug}.png (~{png_size}KB)
     Annotations injected: {ANNOTATION_COUNT} component markers
     Target: .planning/design/ux/wireframes/

   Persist these files locally? (yes / no)
   ```

   If "no": Skip this screen's STH artifacts. Log: `Skipping STH artifacts for screen "{slug}" per user decision.` Continue to next screen.

8. **Persist artifacts (only after inbound consent):**
   - Write annotated HTML to `.planning/design/ux/wireframes/STH-{slug}.html`
   - Write PNG to `.planning/design/ux/wireframes/STH-{slug}.png`
   - Log: `  -> Persisted STH-{slug}.html + STH-{slug}.png to ux/wireframes/`

9. **Increment quota after successful generation:**
   ```bash
   node --input-type=module <<'EOF'
   import { createRequire } from 'module';
   const req = createRequire(import.meta.url);
   const { incrementStitchQuota } = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
   const result = incrementStitchQuota('standard');
   process.stdout.write(JSON.stringify(result));
   EOF
   ```
   Call once per successfully persisted screen.

10. **Per-screen manifest registration (STH artifact — one entry per screen):**
    ```bash
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-add-artifact STH-{slug}
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} code "STH-{slug}"
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} name "{Screen Label} (Stitch Wireframe)"
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} type wireframe
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} domain ux
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} path ".planning/design/ux/wireframes/STH-{slug}.html"
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} status draft
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} version 1
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} source stitch
    node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update STH-{slug} stitch_annotated true
    ```

End of per-screen loop.

**4-STITCH-D: Fallback for failed screens**

After the per-screen loop, check if any screens have STITCH_FAILED status.
For each failed screen: add to FALLBACK_SCREENS list.
If FALLBACK_SCREENS is non-empty:
  Display: `{count} screen(s) failed Stitch generation. Generating with Claude HTML/CSS: {slug-list}`
  These screens proceed through the standard Claude generation path (Step 4a-4c) below.

If ALL screens succeeded via Stitch: skip Step 4a-4c entirely.

<!-- End of Stitch branch. If USE_STITCH is false or FALLBACK_SCREENS is non-empty, continue with Claude generation below for applicable screens. -->

---

This is the core generation step. For EACH screen in SCREENS:

#### 4a. Determine screen context

Gather context for this specific screen:
- Screen slug, label, journey, persona, type (from INVENTORY or argument)
- PRODUCT_NAME, PRODUCT_TYPE (from brief or PROJECT.md)
- Use the Glob tool to check for `.planning/design/ux/FLW-flows-v*.md`. If present, read the highest-version file to understand the screen's role: what flows come before, what flows come after, what triggers navigation to this screen, and what the screen's exit paths are.

If SEQUENTIAL_THINKING_AVAILABLE and multiple complex screens in batch: use `mcp__sequential-thinking__think` with prompt: `"For the screen '{screen_label}' in the '{journeyName}' journey (persona: {persona}), reason through: (1) what primary action the user takes on this screen, (2) what data the screen must display, (3) what error conditions affect this screen, (4) what happens after the user completes the primary action."` Use the output to inform content generation for that screen.

#### 4b. Apply fidelity-specific content rules

These rules are PRESCRIPTIVE, not guidelines. Each fidelity level has an EXCLUSIVE, non-overlapping rule set. Never mix rules from different levels.

**Lo-fi rules (body class: `pde-layout pde-layout--lofi`):**

Content rules:
- Gray boxes with dimension labels for ALL images and media: `[Image: 400x200]`
- Text labels ONLY for all UI elements: "Username", "Submit", "Navigation" — NO realistic content, NO domain-specific text, NO lorem ipsum
- Dashed borders on ALL placeholder regions
- NO color from design tokens — neutral gray ONLY: backgrounds `#e5e7eb`, text `#6b7280`, borders `#d1d5db`
- Click-through `<a href>` inter-page links ACTIVE (not disabled)
- NO shadows, NO border-radius styling beyond structural needs

Complex screen type rules at lo-fi (required — prevents incomprehensibly sparse output):
- Data tables: header row + exactly 3 placeholder rows with gray cells; column count matches actual design; each cell: `[Cell]`
- Dashboards: ALL card regions as gray boxes with dimension and type annotation: `[Card: Metric -- 200x100]`, `[Card: Chart -- 400x200]`, `[Card: List -- 200x300]`
- Charts: bounding box ONLY with chart type label: `[Chart: Line -- 400x200]`, `[Chart: Bar -- 300x200]`
- Forms: each field as labeled rectangle with field name inside: `[Field: Email]`, `[Field: Password]`
- Navigation: horizontal/vertical bar with labels: `[Nav Item 1]`, `[Nav Item 2]`

**Mid-fi rules (body class: `pde-layout pde-layout--midfi`):**

Content rules:
- Real layout with proper spacing and alignment using CSS custom property references with fallback values
- Realistic placeholder content: fake but domain-relevant names (e.g., "Alex Johnson" not "John Doe"), plausible email addresses, realistic dates, domain-relevant sample data — NOT lorem ipsum
- SVG silhouette placeholders for images indicating content type (rectangle with diagonal lines for photo, circle for avatar) — NOT icon fonts, NOT actual images
- Basic chart outlines: correct shape (bar columns, line path, pie slices) with no data labels or values
- Required states: primary (default) state + empty state (when there is no data)
- Microcopy: realistic button labels ("Sign in", "Save changes", "Delete account" — not "Submit", "OK", "Click here"), validation messages ("Email is required", "Password must be 8+ characters"), helper text
- Token CSS custom properties referenced WITH fallback values: `var(--space-4, 1rem)`, `var(--color-border, #e5e7eb)`, `var(--color-action, #2563eb)`
- NO absolute colors hardcoded without a var() reference

**Hi-fi rules (body class: `pde-layout pde-layout--hifi`):**

Content rules:
- Design tokens fully applied via linked `assets/tokens.css` — colors, typography, shadows, spacing, border-radius
- Near-real content from brief: use the actual PRODUCT_NAME, actual feature names, real product messaging
- Inline SVG charts with sample data values shown
- ALL state variants required: default + empty + loading + error (no exceptions)
- Full microcopy: tooltips on icon-only controls, helper text on all form fields, validation messages with recovery actions
- Theme toggle button visible: `<button onclick="toggleTheme()">Toggle theme</button>`
- `prefers-reduced-motion` media query for any animations

#### 4c. Generate HTML using exact scaffold

Generate the complete HTML file for this screen:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{PRODUCT_NAME} - {Screen Label}</title>
  <link rel="stylesheet" href="../../assets/tokens.css">
  {IF TOKENS_AVAILABLE is false: inline <style> with :root { fallback palette vars } and comment}
  <style>
    @layer tokens, wireframe-layout, components, utilities;

    @layer wireframe-layout {
      /* -------------------------------------------------- */
      /* Fidelity: {FIDELITY} — screen: {screen slug}       */
      /* -------------------------------------------------- */

      /* Lo-fi placeholder pattern */
      .pde-layout--lofi .pde-placeholder {
        background: var(--color-neutral-200, #e5e7eb);
        border: 2px dashed var(--color-neutral-400, #9ca3af);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-neutral-500, #6b7280);
        font-size: var(--font-size-sm, 0.875rem);
        font-family: system-ui, sans-serif;
      }

      /* Mid-fi card pattern */
      .pde-layout--midfi .pde-card {
        padding: var(--space-4, 1rem);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-md, 0.375rem);
        background: var(--color-surface, #ffffff);
      }

      /* State variants: loading and error hidden by default */
      .pde-state--loading,
      .pde-state--error {
        display: none;
      }
      .pde-state--loading[hidden],
      .pde-state--error[hidden] {
        display: none;
      }

      /* Named grid systems (WIRE-01) — composition-typography.md */
      .pde-grid--12-column {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        column-gap: clamp(16px, 2vw, 24px);
        max-width: 1440px;
        margin: 0 auto;
        padding: 0 clamp(16px, 5vw, 80px);
      }
      .pde-grid--asymmetric {
        display: grid;
        grid-template-columns: 7fr 5fr;
        column-gap: clamp(24px, 3vw, 48px);
      }
      .pde-grid--golden-ratio {
        display: grid;
        grid-template-columns: 61.8fr 38.2fr;
        column-gap: clamp(24px, 3vw, 48px);
      }
      .pde-grid--modular {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: clamp(16px, 2vw, 24px);
      }

      /* Skip link */
      .skip-link {
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--color-action, #2563eb);
        color: #fff;
        padding: 0.5rem 1rem;
        z-index: 100;
        text-decoration: none;
      }
      .skip-link:focus {
        top: 0;
      }

      /* Screen-specific layout styles below */
      {screen-specific layout styles following fidelity rules}
    }

    /* Mobile base: single column (WIRE-04) */
    .pde-grid--12-column { grid-template-columns: 1fr; }
    .pde-grid--asymmetric { grid-template-columns: 1fr; }
    .pde-grid--golden-ratio { grid-template-columns: 1fr; }

    /* Tablet 768px: intermediate recomposition (WIRE-04) */
    @media (min-width: 768px) {
      .pde-grid--12-column { grid-template-columns: repeat(8, 1fr); }
      .pde-grid--asymmetric { grid-template-columns: 3fr 2fr; }
      .pde-grid--golden-ratio { grid-template-columns: 1fr; grid-template-rows: 200px 1fr; }
    }

    /* Desktop 1024px+: full grid system applied (WIRE-04) */
    @media (min-width: 1024px) {
      .pde-grid--12-column { grid-template-columns: repeat(12, 1fr); }
      .pde-grid--asymmetric { grid-template-columns: 7fr 5fr; }
      .pde-grid--golden-ratio { grid-template-columns: 61.8fr 38.2fr; min-height: 100vh; }
    }

    @media (prefers-reduced-motion: reduce) {
      * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }
  </style>
</head>
<body class="pde-layout pde-layout--{FIDELITY}">
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <header role="banner" class="pde-header">
    {Lo-fi: gray box with "Logo" + "Nav" labels}
    {Mid-fi: SVG rectangle placeholder for logo + text navigation links}
    {Hi-fi: product name as text logo + styled navigation with token colors}
  </header>

  <nav aria-label="Main navigation" class="pde-nav">
    <a href="index.html">All Screens</a>
    {Inter-page links to ALL screens in INVENTORY, not just current batch:}
    {  <a href="WFR-{slug}.html">{Screen Label}</a> for each existing screen}
    {  <!-- Not yet generated — run /pde:wireframe "{slug}" {FIDELITY} to create this file --> for screens not yet generated}
  </nav>

  <main role="main" id="main-content" class="pde-grid pde-grid--{GRID_SYSTEM}">

    <!-- State: default (visible) -->
    {Insert COMPOSITION annotation block from Step 4f here}
    <!-- ANNOTATION: {describe what triggers this default state — e.g., initial page load, successful API response}. {describe what the user sees and what primary action is available}. {describe what interaction leads to the next screen in the journey}. -->
    <div class="pde-state pde-state--default" aria-live="polite">
      {Primary screen content following fidelity rules for this specific screen type}
      {Apply lo-fi/mid-fi/hifi rules from 4b exactly}
    </div>

    <!-- State: loading (hidden) -->
    <!-- ANNOTATION: {describe what user action triggers loading — e.g., form submit, page navigation, data refresh}. {describe what the user sees — skeleton screens, spinner, progress bar}. On success: {describe transition — redirect to X screen, replace form with confirmation, reveal content}. On failure: {describe transition — show error state, re-enable form, display inline message}. -->
    <div class="pde-state pde-state--loading" hidden>
      {Lo-fi: labeled gray box "[Loading: spinner]"}
      {Mid-fi: skeleton screen with gray animated-placeholder rectangles matching the default state layout}
      {Hi-fi: full skeleton with shimmer animation, preserving exact layout structure of default state}
    </div>

    <!-- State: error (hidden) -->
    <!-- ANNOTATION: {describe what triggers this error state — e.g., API 4xx/5xx, network timeout, validation failure}. {describe what the user sees — error banner text, affected fields highlighted, retry button}. Recovery: {describe recovery action — retry button re-triggers the failed request, redirect link to safe state, field correction re-enables submit}. -->
    <div class="pde-state pde-state--error" hidden>
      <div role="alert" class="pde-error-banner">
        {Lo-fi: "[Error message]"}
        {Mid-fi: "Something went wrong. Please try again."}
        {Hi-fi: specific error message from product context, e.g., "Unable to load {resource}. Check your connection and try again."}
      </div>
      <button type="button" class="pde-retry-btn">{Lo-fi: "Retry" | Mid-fi: "Try again" | Hi-fi: "Retry {action}"}</button>
    </div>

    {Hi-fi ONLY: empty state when no data exists}
    {<!-- State: empty (hi-fi only, hidden by default) -->}
    {<!-- ANNOTATION: Empty state shown when {resource} list is empty. Renders illustration and CTA to create first {resource}. -->}
    {<div class="pde-state pde-state--empty" hidden>...CTA to create first item...</div>}

  </main>

  <footer role="contentinfo" class="pde-footer">
    {Lo-fi: "[Footer: links and copyright]"}
    {Mid-fi: copyright text + 3-4 footer link labels}
    {Hi-fi: full footer with product name, navigation links, copyright with actual year}
  </footer>

  <script>
    /* Theme toggle (hi-fi only — present in all fidelity files for structural completeness) */
    function toggleTheme() {
      const html = document.documentElement;
      html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
  </script>
</body>
</html>
```

#### 4d. Annotation requirements (MANDATORY — Phase 19 handoff depends on these)

Every state variant block MUST have an `<!-- ANNOTATION: ... -->` comment placed immediately above the `<div class="pde-state ...">` opening tag. Each annotation must describe:
1. What triggers this state (user action or system event)
2. What the user sees (visual description of the state)
3. The recovery or transition path (what happens when state resolves)

Every interactive element with non-obvious behavior MUST have an annotation comment:
- Modals: `<!-- ANNOTATION: Click opens modal dialog with {content description}. Close via X button or Escape key. Focus traps inside modal. -->`
- Async forms: `<!-- ANNOTATION: Form submit triggers POST to /api/{resource}. Submit button disabled during POST. Loading state replaces form on success. Redirects to {screen} on completion. Field-level validation errors shown inline on failure. -->`
- Drawers/sidebars: `<!-- ANNOTATION: Click toggles sidebar visibility. Overlay dims main content (opacity 0.5). Click on overlay closes drawer. Escape key closes drawer. -->`
- Dropdowns: `<!-- ANNOTATION: Click reveals dropdown menu with {N} options. Arrow keys navigate options. Enter selects. Escape closes. Selection updates {target element}. -->`
- Tabs: `<!-- ANNOTATION: Tab click reveals associated panel. Active tab indicated by {visual indicator}. URL fragment updates to #tab-{id} for deep-linking. -->`
- Pagination: `<!-- ANNOTATION: Page controls trigger GET /api/{resource}?page={N}. Loading state shown during fetch. URL updates to ?page={N}. -->`

#### 4e. Accessibility requirements (ALL fidelity levels — non-negotiable)

Every generated HTML file MUST include:
- `role="banner"` on `<header>`
- `role="main"` on `<main>`
- `role="contentinfo"` on `<footer>`
- `aria-label="Main navigation"` on `<nav>`
- `<a href="#main-content" class="skip-link">Skip to main content</a>` as FIRST child of `<body>`
- `id="main-content"` on `<main>`
- `aria-live="polite"` on `.pde-state--default` container
- `role="alert"` on error message containers
- All form inputs have `<label for="id">` associations — no placeholder-only inputs
- All images have `alt` attributes (descriptive or `alt=""` for decorative)
- Logical tab order following visual layout

#### 4f. Composition decisions (MANDATORY — required for WIRE-01 through WIRE-05)

Execute the following composition decision sequence for each screen BEFORE generating HTML. These decisions produce annotation blocks embedded in the HTML output. All five sub-steps are required for every screen at every fidelity level.

##### i. Grid system selection (WIRE-01)

Read screen type (from INVENTORY) and PRODUCT_TYPE (from brief). Apply the grid selection logic:

| Screen Type | Product Type | Selected Grid | Rationale Template |
|---|---|---|---|
| dashboard, data | any | 12-column | Flexible subdivision needed for metric cards, data tables, and sidebar panels |
| login, auth | any | Golden ratio | Single focal hierarchy — form in 38.2% column draws eye to primary action |
| landing, marketing | brand-forward | Asymmetric 7:5 | Dominant reading axis toward CTA; symmetric grids produce generic neutrality |
| product catalog, gallery | any | Modular | Regular repetition of card units requires active vertical and horizontal rhythm |
| editorial, about | any | Golden ratio or Asymmetric | Strong hierarchy needed; golden ratio for single focal; asymmetric for tension |
| settings, forms | any | 12-column | Multi-field layout requires flexible column subdivision |
| default (unrecognized) | any | 12-column | Fallback; explicitly document as fallback in rationale |

- Store as GRID_SYSTEM (one of: "12-column", "golden-ratio", "asymmetric", "modular")
- Store as GRID_RATIONALE using format from composition-typography.md: "Using [system] because [content type] requires [characteristic]. [Alternative] was rejected because [reason]."

##### ii. Visual weight mapping (WIRE-02)

- Identify the highest-weight element using composition-typography.md Visual Weight Analysis factors: size, contrast, color, density, position, shape, isolation
- Identify the reading axis: F-pattern (information-dense content) or Z-pattern (marketing/CTA-focused)
- Number the eye path: 1st = {element} -- {why: weight factor}, 2nd = {element} -- {why}, 3rd = {element} -- {why}, CTA = {element} -- {position}
- Store as Visual weight distribution block

##### iii. Asymmetry decision (WIRE-03)

- At least one axis MUST break symmetry per page with documented purpose (rule: at least one axis must intentionally break symmetry)
- Identify which axis: horizontal (unequal column split 7:5, golden ratio, offset element) or vertical (intentional whitespace gap, visual weight imbalance)
- Store as ASYMMETRY_AXIS ("horizontal" or "vertical") and ASYMMETRY_RATIONALE
- Accidental asymmetry from content length differences does NOT count -- document the INTENTIONAL choice

##### iv. Viewport composition strategy (WIRE-04)

- Mobile 375px: single-column stack; identify element reorder vs desktop
- Tablet 768px: 2-column or content-focused recomposition -- DISTINCT from desktop (not same layout narrower)
- Desktop 1440px: full grid system applied
- CRITICAL: strategies must be DISTINCT -- "same layout but narrower" is NOT distinct
- Store as VIEWPORT_STRATEGIES with three strategy descriptions

##### v. Content hierarchy numbering (WIRE-05)

- For each viewport (Desktop 1440px, Tablet 768px, Mobile 375px):
  - 1st = {element} -- {why}
  - 2nd = {element} -- {why}
  - 3rd = {element} -- {why}
  - CTA = {element} -- {position}
- Priority may shift between viewports (mobile CTA may be higher priority than desktop)
- Store as CONTENT_HIERARCHY table

##### Composition annotation block format

After completing the five decision sub-steps, embed the following COMPOSITION annotation block as an HTML comment in every generated wireframe, immediately after `<!-- State: default -->` and before `<div class="pde-state pde-state--default"`:

```html
<!-- COMPOSITION: {screen slug}
  Grid system: {GRID_SYSTEM} -- {GRID_RATIONALE}

  Visual weight distribution:
    1st = {element} -- {why: size/contrast/position/isolation}
     -> 2nd = {element} -- {why}
     -> 3rd = {element} -- {why}
     -> CTA = {element} -- {position relative to reading path}
  Reading axis: {F-pattern | Z-pattern}

  Asymmetry ({ASYMMETRY_AXIS}): {ASYMMETRY_RATIONALE}

  Viewport strategies:
    Desktop 1440px: {grid system name}, {columns}, {description}
    Tablet 768px: {DISTINCT strategy, not shrunk desktop}
    Mobile 375px: {DISTINCT strategy, full recomposition}

  Content hierarchy:
    Desktop 1440px:
      1st = {element} -- {why}
      2nd = {element} -- {why}
      3rd = {element} -- {why}
      CTA = {element} -- {position}
    Tablet 768px:
      1st = {element}
      2nd = {element}
      CTA = {element}
    Mobile 375px:
      1st = {element}
      2nd = {element}
      CTA = {element}
-->
```

This annotation block MUST be present in every generated wireframe HTML file regardless of fidelity level. It is a structural requirement, not a quality enhancement.

#### 4g. Generate print collateral (experience products only)

IF `PRODUCT_TYPE !== "experience"`: **skip Step 4g entirely.** Do not generate any print files for non-experience products.

This step generates TWO print collateral artifacts for experience products.

---

**FLY artifact (always generated for experience products):**

Generate a self-contained HTML file using the scaffold below. The file MUST contain ALL of the following elements:

```html
<!DOCTYPE html>
<!-- Source: PDE Phase 80 — FLY artifact pattern -->
<!-- PREPRESS NOTICE: This is a composition reference, NOT a production print file. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FLY — {{EVENT_NAME}} — Event Flyer (Composition Reference)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #e8e8e8;
      font-family: system-ui, sans-serif;
      padding: 40px 20px;
    }

    /* Format switching */
    .format-selector {
      display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .format-btn {
      padding: 6px 14px; border: 1px solid #999; border-radius: 4px;
      background: white; cursor: pointer; font-size: 13px;
    }
    .format-btn.active { background: #1a1a1a; color: white; border-color: #1a1a1a; }

    /* ---- A5 FORMAT (default) ---- */
    @page { size: A5 portrait; margin: 0; }

    body[data-format="a5"] .page-container,
    body:not([data-format]) .page-container {
      width: 148mm; height: 210mm;
    }

    /* ---- A4 FORMAT ---- */
    body[data-format="a4"] .page-container { width: 210mm; height: 297mm; }

    /* ---- INSTAGRAM SQUARE (1080x1080px — screen-only, no @page) ---- */
    body[data-format="ig-square"] .page-container {
      width: 1080px; height: 1080px;
      transform: scale(0.35); transform-origin: top left;
      margin-bottom: calc(1080px * (0.35 - 1) + 24px);
    }

    /* ---- INSTAGRAM STORY (1080x1920px — screen-only, no @page) ---- */
    body[data-format="ig-story"] .page-container {
      width: 1080px; height: 1920px;
      transform: scale(0.25); transform-origin: top left;
      margin-bottom: calc(1920px * (0.25 - 1) + 24px);
    }

    /* Page container */
    .page-container {
      position: relative;
      background: white;
      overflow: hidden;
      margin: 0 auto;
    }

    /* Bleed zone (3mm) — faked via pseudo-element (the @page bleed descriptor is not implemented in any browser) */
    .page-container::before {
      content: '';
      position: absolute;
      inset: -3mm;
      border: 1.5px dashed rgba(0,80,200,0.5);
      pointer-events: none;
      z-index: 100;
    }

    /* Safe zone (5mm inside trim) */
    .page-container::after {
      content: '';
      position: absolute;
      inset: 5mm;
      border: 1px dashed rgba(200,0,0,0.35);
      pointer-events: none;
      z-index: 100;
    }

    /* Zone legend */
    .zone-legend {
      display: flex; gap: 16px; margin-top: 8px;
      font-size: 11px; color: #555;
    }
    .zone-legend span::before {
      content: ''; display: inline-block;
      width: 20px; height: 2px; vertical-align: middle; margin-right: 4px;
    }
    .zone-legend .bleed-swatch::before { border-top: 1.5px dashed rgba(0,80,200,0.5); }
    .zone-legend .safe-swatch::before  { border-top: 1px dashed rgba(200,0,0,0.35); }

    /* Hide guides on actual print */
    @media print {
      body { background: white; padding: 0; }
      .format-selector, .zone-legend, .cmyk-table,
      .prepress-disclaimer, .format-btn { display: none !important; }
      .page-container::before, .page-container::after { display: none !important; }
      /* Instagram formats are screen-only — hide entirely on print */
      body[data-format="ig-square"] .page-container,
      body[data-format="ig-story"] .page-container { display: none !important; }
    }
  </style>
</head>
<body data-format="a5">

  <nav class="format-selector" aria-label="Format variants">
    <button class="format-btn active" onclick="setFormat('a5', this)">A5 Flyer (148×210mm)</button>
    <button class="format-btn" onclick="setFormat('a4', this)">A4 Poster (210×297mm)</button>
    <button class="format-btn" onclick="setFormat('ig-square', this)">Instagram Square (1080×1080px)</button>
    <button class="format-btn" onclick="setFormat('ig-story', this)">Instagram Story (1080×1920px)</button>
  </nav>

  <div class="page-container">
    <!-- COMPOSITION: event-flyer
      Awwwards-level composition rules:
      - Clear focal hierarchy: L1 event name > L2 headliner > L3 date/venue > L4 details
      - Intentional negative space: minimum 25% of page area empty
      - Maximum 3 typefaces: 1 display, 1 body, 1 accent (optional)
      - Grid: rule-of-thirds or golden-ratio — chosen per event aesthetic
      - Color: derived from SYS-experience-tokens.json brand coherence tokens
      - Legible at intended print size (14pt minimum body text at A5)
    -->

    <!-- Flyer content generated here from PRINT_PALETTE + brief data -->
    <!-- Typography: display face for event name (L1), body for date/venue (L3) -->
    <!-- Color: brand colors from PRINT_PALETTE; dark background preferred for event flyers -->

  </div>

  <div class="zone-legend">
    <span class="bleed-swatch">Bleed zone (3mm — simulated, @page bleed not browser-supported)</span>
    <span class="safe-swatch">Safe zone (5mm inside trim)</span>
  </div>

  <!-- CMYK approximation table — generated from PRINT_PALETTE brand colors -->
  <!-- Use inline rgbToCmyk function (RapidTables standard formula) to compute values: -->
  <!-- function rgbToCmyk(r, g, b) { -->
  <!--   const rr = r/255, gg = g/255, bb = b/255; -->
  <!--   const k = 1 - Math.max(rr, gg, bb); -->
  <!--   if (k === 1) return { c: 0, m: 0, y: 0, k: 100, inkTotal: 100 }; -->
  <!--   const c = Math.round(((1-rr-k)/(1-k))*100); -->
  <!--   const m = Math.round(((1-gg-k)/(1-k))*100); -->
  <!--   const y = Math.round(((1-bb-k)/(1-k))*100); -->
  <!--   const kk = Math.round(k*100); -->
  <!--   return { c, m, y, k: kk, inkTotal: c+m+y+kk }; -->
  <!-- } -->
  <!-- Flag rows where inkTotal > 300% with warning indicator -->
  <table class="cmyk-table" style="margin-top:24px; border-collapse:collapse; font-size:12px; width:100%; max-width:600px;">
    <caption style="font-weight:bold; margin-bottom:8px; text-align:left;">CMYK Approximation — Composition Reference Only</caption>
    <thead>
      <tr style="background:#f0f0f0;">
        <th style="padding:6px 8px; text-align:left; border:1px solid #ddd;">Swatch</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">Name</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">Hex</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">C</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">M</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">Y</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">K</th>
        <th style="padding:6px 8px; border:1px solid #ddd;">Total</th>
      </tr>
    </thead>
    <tbody>
      <!-- One row per PRINT_PALETTE color — Claude generates rows here -->
      <!-- Example row: -->
      <!-- <tr><td><span style="display:inline-block;width:20px;height:20px;background:{hex}"></span></td> -->
      <!--   <td>Brand Primary</td><td>{hex}</td><td>{C}%</td><td>{M}%</td><td>{Y}%</td><td>{K}%</td> -->
      <!--   <td style="{inkTotal > 300 ? 'color:red;font-weight:bold' : ''}">{inkTotal}%{inkTotal > 300 ? ' ⚠' : ''}</td></tr> -->
    </tbody>
  </table>
  <p style="font-size:11px; color:#666; margin-top:8px; max-width:600px;">
    These values are mathematical sRGB-to-CMYK approximations. No ICC profiles or GCR/UCR applied.
    Total ink &gt; 300% may cause issues on press. Provide actual brand color specifications to your supplier.
  </p>

  <!-- MANDATORY prepress disclaimer — do NOT use the phrase "print-ready" without this block -->
  <!-- IMPORTANT: The phrase "print-ready" is prohibited in generated flyer content. -->
  <!-- If describing this artifact, use "composition reference" instead. -->
  <!-- If the phrase "print-ready" must appear, it MUST be immediately adjacent to this disclaimer block. -->
  <aside class="prepress-disclaimer" style="margin-top:24px; padding:12px 16px; background:#fff8dc; border:1px solid #e0c060; border-radius:4px; font-size:12px; max-width:600px;">
    <strong>COMPOSITION REFERENCE — NOT A PRODUCTION PRINT FILE.</strong>
    This artifact is a design layout guide. Resolution, color fidelity, bleed registration,
    and ICC profile conformance have not been verified. Submit production-ready artwork
    (PDF/X-1a or PDF/X-4, minimum 300 DPI, CMYK, embedded fonts) to your print supplier.
  </aside>

  <script>
    function setFormat(f, btn) {
      document.body.dataset.format = f;
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
</body>
</html>
```

Save the generated FLY HTML content as `FLY_HTML`. Do NOT write the file yet — file writes happen in Step 5b.

---

**SIT artifact (only when `experienceSubType === "recurring-series"`):**

Gate: `IF GENERATE_SIT !== true`: **SKIP SIT generation entirely.** Log: `SIT skipped — experienceSubType is not recurring-series.`

Generate a second HTML file using the same scaffold as FLY, but with `{{variable}}` template slots wrapping all edition-specific values. Mandatory slots: `{{EVENT_NAME}}`, `{{DATE}}`, `{{VENUE}}`, `{{HEADLINER}}`, `{{EDITION_NUMBER}}`. Each slot MUST use `<span class="template-slot">` with styling:

```css
.template-slot {
  background: rgba(255, 200, 0, 0.25);
  border: 1px dashed rgba(200,150,0,0.6);
  padding: 2px 4px;
  border-radius: 2px;
  font-style: italic;
  color: #7a5c00;
}
```

Example slot usage:
```html
<h2 class="flyer-headline"><span class="template-slot">{{EVENT_NAME}}</span></h2>
<p class="flyer-date"><span class="template-slot">{{DATE}}</span> — <span class="template-slot">{{VENUE}}</span></p>
<p class="flyer-headliner">Headliner: <span class="template-slot">{{HEADLINER}}</span></p>
<p class="flyer-edition">Vol. <span class="template-slot">{{EDITION_NUMBER}}</span></p>
```

Add a template slot legend below the SIT page-container explaining each variable's purpose:

```html
<div class="sit-legend" style="margin-top:16px; font-size:12px; max-width:600px; padding:12px; background:#fffde7; border:1px solid #ffe082; border-radius:4px;">
  <strong>Template Slots — replace per edition:</strong>
  <ul style="margin-top:8px; padding-left:16px; line-height:1.8;">
    <li><code>{{EVENT_NAME}}</code> — Series name (e.g., "Saturday Night Sessions")</li>
    <li><code>{{DATE}}</code> — Full event date (e.g., "Saturday 15 March 2026")</li>
    <li><code>{{VENUE}}</code> — Venue name and address</li>
    <li><code>{{HEADLINER}}</code> — Main act or featured artist name</li>
    <li><code>{{EDITION_NUMBER}}</code> — Edition number (e.g., "12" for Vol. 12)</li>
  </ul>
</div>
```

Save the generated SIT HTML content as `SIT_HTML`. Do NOT write the file yet — file writes happen in Step 5b.

---

**PRG artifact (only when `experienceSubType === "multi-day"`):**

Gate: `IF experienceSubType !== "multi-day"`: **SKIP PRG generation entirely.** Log: `PRG skipped — experienceSubType is {value}, not multi-day.`
Set `GENERATE_PRG = false` and skip to the Display line below.

Otherwise set `GENERATE_PRG = true` and generate a multi-page self-contained HTML file for the festival program. The PRG artifact is an A4 landscape composition reference.

```html
<!DOCTYPE html>
<!-- Source: PDE Phase 80 — PRG artifact pattern -->
<!-- PREPRESS NOTICE: This is a composition reference, NOT a production print file. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PRG — {{EVENT_NAME}} — Festival Program (Composition Reference)</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    /* COMPOSITION: festival-program
       Awwwards-level composition rules:
       - Schedule grid: maximum 2 typefaces (mono for times, sans-serif for content)
       - Artist cards: consistent card dimensions, 8px border-radius, subtle shadow
       - Negative space: 15mm margins on all pages, 8-12px gap between grid items
       - Color hierarchy: brand primary for headings, neutral for body, accent for callouts
       - Legible at A4: minimum 10pt body text, minimum 8pt table cell text
    */

    /* Multi-page @page rules */
    @page { size: A4 portrait; margin: 15mm; }
    @page cover { size: A4 portrait; margin: 0; }
    @page schedule { size: A4 landscape; margin: 10mm; }

    body {
      font-family: 'Inter', system-ui, sans-serif;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }

    /* Page navigation — screen only */
    .page-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.85);
      color: #fff;
      display: flex;
      gap: 0;
      z-index: 1000;
      font-size: 13px;
    }
    .page-nav a {
      color: #fff;
      text-decoration: none;
      padding: 10px 18px;
      border-right: 1px solid rgba(255,255,255,0.15);
      transition: background 0.15s;
    }
    .page-nav a:hover { background: rgba(255,255,255,0.1); }

    .page {
      page-break-after: always;
      min-height: 297mm;
      position: relative;
      background: #fff;
      margin: 60px auto 32px;
      max-width: 210mm;
      box-shadow: 0 2px 16px rgba(0,0,0,0.12);
    }
    .page:last-child { page-break-after: auto; }

    /* Cover page */
    .cover-page {
      page: cover;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(160deg, var(--color-primary, #1a1a2e) 0%, var(--color-secondary, #16213e) 60%, var(--color-accent, #0f3460) 100%);
      color: #fff;
      text-align: center;
      padding: 40mm;
      box-sizing: border-box;
    }
    .cover-page .hero-area {
      width: 100%;
      height: 80mm;
      background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px dashed rgba(255,255,255,0.25);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12mm;
      font-size: 11px;
      opacity: 0.6;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .cover-page h1 { font-size: 36px; font-weight: 900; margin: 0 0 8px; letter-spacing: -0.02em; }
    .cover-page .dates { font-size: 18px; opacity: 0.85; margin-bottom: 6px; }
    .cover-page .venue { font-size: 14px; opacity: 0.65; }

    /* Schedule page */
    .schedule-page {
      page: schedule;
      min-height: 210mm;
      padding: 10mm;
      box-sizing: border-box;
    }
    .schedule-page h2 { font-size: 18px; font-weight: 700; margin: 0 0 8px; color: var(--color-primary, #1a1a2e); }

    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .schedule-table thead th {
      background: var(--color-primary, #1a1a2e);
      color: #fff;
      padding: 6px 8px;
      text-align: left;
      font-weight: 700;
    }
    .schedule-table thead th:first-child {
      font-family: 'JetBrains Mono', monospace;
      width: 60px;
    }
    .schedule-table tbody td {
      padding: 5px 8px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .schedule-table tbody td:first-child {
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #6b7280;
      white-space: nowrap;
    }
    .schedule-table tbody tr:nth-child(even) { background: #f9fafb; }
    .schedule-table tbody tr:nth-child(odd) { background: #fff; }
    .schedule-table .act-tag {
      display: inline-block;
      background: var(--color-accent, #0f3460);
      color: #fff;
      font-size: 9px;
      padding: 2px 5px;
      border-radius: 3px;
      margin-bottom: 2px;
    }

    /* Lineup/bios page */
    .lineup-page {
      padding: 15mm;
      box-sizing: border-box;
    }
    .lineup-page h2 { font-size: 18px; font-weight: 700; margin: 0 0 8mm; color: var(--color-primary, #1a1a2e); }
    .artist-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .artist-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .artist-photo-placeholder {
      width: 100%;
      height: 80px;
      background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .artist-card-body { padding: 8px; }
    .artist-name { font-weight: 700; font-size: 11px; margin: 0 0 3px; }
    .artist-genre {
      display: inline-block;
      background: #f3f4f6;
      color: #374151;
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 10px;
      margin-bottom: 4px;
    }
    .artist-set-time { font-size: 10px; color: #6b7280; margin-bottom: 4px; font-family: 'JetBrains Mono', monospace; }
    .artist-bio { font-size: 10px; color: #374151; line-height: 1.4; }

    /* Venue map page */
    .venue-page {
      padding: 15mm;
      box-sizing: border-box;
    }
    .venue-page h2 { font-size: 18px; font-weight: 700; margin: 0 0 6mm; color: var(--color-primary, #1a1a2e); }
    .venue-map-area {
      width: 100%;
      height: 160mm;
      background: #f3f4f6;
      border: 2px dashed #d1d5db;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 12px;
      text-align: center;
      gap: 8px;
    }
    .map-legend {
      margin-top: 8mm;
      display: flex;
      gap: 16px;
      font-size: 10px;
      flex-wrap: wrap;
    }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* Sponsors & info page */
    .sponsors-page {
      padding: 15mm;
      box-sizing: border-box;
    }
    .sponsors-page h2 { font-size: 18px; font-weight: 700; margin: 0 0 6mm; color: var(--color-primary, #1a1a2e); }
    .sponsor-tier { margin-bottom: 8mm; }
    .sponsor-tier-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #6b7280;
      margin-bottom: 4mm;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 2mm;
    }
    .sponsor-logos {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .sponsor-logo-placeholder {
      background: #f3f4f6;
      border: 1px dashed #d1d5db;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9ca3af;
      font-size: 9px;
      text-transform: uppercase;
    }
    .sponsor-logo-placeholder.headline { width: 100px; height: 50px; }
    .sponsor-logo-placeholder.supporting { width: 70px; height: 35px; }
    .sponsor-logo-placeholder.community { width: 50px; height: 28px; }

    .info-block {
      margin-top: 8mm;
      padding: 8mm;
      background: #f9fafb;
      border-radius: 4px;
      font-size: 11px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
    }
    .info-block dt { font-weight: 700; color: #374151; }
    .info-block dd { margin: 0; color: #6b7280; }

    .prepress-disclaimer {
      margin: 8px 15mm;
      padding: 8px 12px;
      background: #fff8dc;
      border: 1px solid #e0c060;
      border-radius: 4px;
      font-size: 10px;
      max-width: 180mm;
    }

    @media print {
      .prepress-disclaimer, .page-nav { display: none !important; }
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; max-width: none; }
    }
  </style>
</head>
<body>

<!-- Page navigation — screen only, hidden on print via @media print -->
<nav class="page-nav" aria-label="Program sections">
  <a href="#cover">Cover</a>
  <a href="#schedule">Schedule</a>
  <a href="#lineup">Lineup</a>
  <a href="#map">Map</a>
  <a href="#sponsors">Sponsors</a>
</nav>

<!-- COMPOSITION: festival-program
  Awwwards-level composition rules:
  - Schedule grid: maximum 2 typefaces (mono for times, sans-serif for content)
  - Artist cards: consistent card dimensions, 8px border-radius, subtle shadow
  - Negative space: 15mm margins on all pages, 8-12px gap between grid items
  - Color hierarchy: brand primary for headings, neutral for body, accent for callouts
  - Legible at A4: minimum 10pt body text, minimum 8pt table cell text
-->

<!-- Page 1: Cover -->
<section id="cover" class="page cover-page">
  <div class="hero-area">[ Hero Visual — Brand Gradient Placeholder ]</div>
  <h1>{Insert festival name from brief}</h1>
  <div class="dates">{Insert festival dates}</div>
  <div class="venue">{Insert venue name and city}</div>
  <aside class="prepress-disclaimer" style="position:absolute;bottom:15mm;left:15mm;right:15mm;margin:0;">
    <strong>COMPOSITION REFERENCE — NOT A PRODUCTION PRINT FILE.</strong>
    This artifact is a design layout guide. Resolution, color fidelity, bleed registration,
    and ICC profile conformance have not been verified. Submit production-ready artwork
    via a certified prepress vendor. The phrase "print-ready" MUST NOT be applied to this file.
  </aside>
</section>

<!-- Page 2: Schedule Grid -->
<!-- Schedule data populated from temporal flow artifact if available; placeholder grid if absent -->
<section id="schedule" class="page schedule-page">
  <h2>Festival Schedule</h2>
  <table class="schedule-table">
    <thead>
      <tr>
        <th>Time</th>
        <th>Stage / Area 1</th>
        <th>Stage / Area 2</th>
        <th>Stage / Area 3</th>
      </tr>
    </thead>
    <tbody>
      <!-- Time slots in 30-min increments — populated from temporal flow artifact if available -->
      <tr><td>12:00</td><td><span class="act-tag">Main</span><br>Placeholder Act</td><td>—</td><td>—</td></tr>
      <tr><td>12:30</td><td></td><td><span class="act-tag">Stage 2</span><br>Placeholder Act</td><td>—</td></tr>
      <tr><td>13:00</td><td><span class="act-tag">Main</span><br>Placeholder Act</td><td></td><td><span class="act-tag">Stage 3</span><br>Placeholder Act</td></tr>
      <tr><td>13:30</td><td></td><td><span class="act-tag">Stage 2</span><br>Placeholder Act</td><td></td></tr>
      <tr><td>14:00</td><td><span class="act-tag">Main</span><br>Placeholder Act</td><td></td><td></td></tr>
      <tr><td>14:30</td><td></td><td><span class="act-tag">Stage 2</span><br>Placeholder Act</td><td><span class="act-tag">Stage 3</span><br>Placeholder Act</td></tr>
    </tbody>
  </table>
</section>

<!-- Page 3: Artist / Lineup Bios -->
<!-- Artist data populated from brief lineup field if available; placeholder cards if absent -->
<section id="lineup" class="page lineup-page">
  <h2>Artist Lineup</h2>
  <div class="artist-grid">
    <div class="artist-card">
      <div class="artist-photo-placeholder">[ Photo ]</div>
      <div class="artist-card-body">
        <div class="artist-name">Artist Name 1</div>
        <span class="artist-genre">Electronic</span>
        <div class="artist-set-time">12:00 — Main Stage</div>
        <div class="artist-bio">Two-line bio placeholder. Genre, origin, and notable release mentioned concisely.</div>
      </div>
    </div>
    <div class="artist-card">
      <div class="artist-photo-placeholder">[ Photo ]</div>
      <div class="artist-card-body">
        <div class="artist-name">Artist Name 2</div>
        <span class="artist-genre">Techno</span>
        <div class="artist-set-time">13:30 — Stage 2</div>
        <div class="artist-bio">Two-line bio placeholder. Genre, origin, and notable release mentioned concisely.</div>
      </div>
    </div>
    <div class="artist-card">
      <div class="artist-photo-placeholder">[ Photo ]</div>
      <div class="artist-card-body">
        <div class="artist-name">Artist Name 3</div>
        <span class="artist-genre">Ambient</span>
        <div class="artist-set-time">14:00 — Stage 3</div>
        <div class="artist-bio">Two-line bio placeholder. Genre, origin, and notable release mentioned concisely.</div>
      </div>
    </div>
  </div>
</section>

<!-- Page 4: Venue Map -->
<!-- Venue map references FLP floor plan. If FLP absent, generates placeholder schematic with zone labels from spaces-inventory.json -->
<section id="map" class="page venue-page">
  <h2>Venue Map</h2>
  <div class="venue-map-area">
    <span>[ Venue Map Placeholder ]</span>
    <span style="font-size:10px;">References FLP floor plan artifact if available.<br>Zone labels from spaces-inventory.json.</span>
  </div>
  <div class="map-legend">
    <div class="legend-item"><div class="legend-swatch" style="background:#0f3460;"></div> Main Stage</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#16213e;"></div> Stage 2</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#1a1a2e;"></div> Stage 3</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#e5e7eb;border:1px solid #d1d5db;"></div> Facilities</div>
    <div class="legend-item"><div class="legend-swatch" style="background:#ef4444;"></div> Emergency Exit</div>
  </div>
</section>

<!-- Page 5: Sponsors & Info -->
<!-- Sponsor data is placeholder — populated from brief or manual entry -->
<section id="sponsors" class="page sponsors-page">
  <h2>Sponsors &amp; Practical Info</h2>

  <div class="sponsor-tier">
    <div class="sponsor-tier-label">Headline Sponsors</div>
    <div class="sponsor-logos">
      <div class="sponsor-logo-placeholder headline">Logo 1</div>
      <div class="sponsor-logo-placeholder headline">Logo 2</div>
    </div>
  </div>

  <div class="sponsor-tier">
    <div class="sponsor-tier-label">Supporting Sponsors</div>
    <div class="sponsor-logos">
      <div class="sponsor-logo-placeholder supporting">Logo 3</div>
      <div class="sponsor-logo-placeholder supporting">Logo 4</div>
      <div class="sponsor-logo-placeholder supporting">Logo 5</div>
    </div>
  </div>

  <div class="sponsor-tier">
    <div class="sponsor-tier-label">Community Partners</div>
    <div class="sponsor-logos">
      <div class="sponsor-logo-placeholder community">Partner 1</div>
      <div class="sponsor-logo-placeholder community">Partner 2</div>
      <div class="sponsor-logo-placeholder community">Partner 3</div>
    </div>
  </div>

  <dl class="info-block">
    <dt>Address</dt><dd>{Insert venue address}</dd>
    <dt>Transport</dt><dd>{Insert nearest transport links}</dd>
    <dt>Accessibility</dt><dd>{Insert accessibility details}</dd>
    <dt>Contact</dt><dd>{Insert contact email / phone}</dd>
    <dt>Social Media</dt><dd>{Insert social handles}</dd>
    <dt>Website</dt><dd>{Insert festival URL}</dd>
  </dl>
</section>

<aside class="prepress-disclaimer">
  <strong>COMPOSITION REFERENCE — NOT A PRODUCTION PRINT FILE.</strong>
  This artifact is a design layout guide for the festival program.
  The phrase "print-ready" MUST NOT be applied to this file without verified prepress output.
</aside>

</body>
</html>
```

Save the generated PRG HTML content as `PRG_HTML`. Do NOT write the file yet — file writes happen in Step 5b.

---

Display: `Step 4g: Print collateral generated — FLY artifact ready. {GENERATE_SIT ? "SIT series identity template ready." : "SIT skipped (experienceSubType not recurring-series)."} {GENERATE_PRG ? "PRG festival program ready." : "PRG skipped (experienceSubType not multi-day)."}`

Display per screen: `Step 4/7: Generated wireframe for {Screen Label} ({FIDELITY}).`

---

### Step 5/7: Write output files

#### Step 5-EXP: Experience wireframe file write (experience products only)

**IF `PRODUCT_TYPE == "experience"`** (arriving from Step 4-EXP):

1. Create the wireframes directory if it does not exist:
   ```bash
   mkdir -p .planning/design/ux/wireframes
   ```

2. Write FLP_HTML to `.planning/design/ux/wireframes/FLP-floor-plan-v1.html`
3. Write TML_HTML to `.planning/design/ux/wireframes/TML-timeline-v1.html`

Display: `Step 5-EXP: Wrote FLP-floor-plan-v1.html and TML-timeline-v1.html to .planning/design/ux/wireframes/`

**Jump to Step 6** — skip software file write path.

---

#### 5a. Create wireframes directory

Ensure `.planning/design/ux/wireframes/` exists:

```bash
mkdir -p .planning/design/ux/wireframes/
```

#### 5b. Write each screen HTML file

For each screen in SCREENS: use the Write tool to write the HTML generated in Step 4 to:
`.planning/design/ux/wireframes/WFR-{slug}.html`

Display per file: `  -> Created: .planning/design/ux/wireframes/WFR-{slug}.html`

#### 5b-print. Write print collateral files (experience products only)

IF `PRODUCT_TYPE !== "experience"`: skip Step 5b-print entirely.

Create directory `.planning/design/physical/print/` if it does not exist:
```bash
mkdir -p .planning/design/physical/print/
```

Write the FLY artifact:
```
.planning/design/physical/print/FLY-event-flyer-v1.html
```
Use the Write tool to write the `FLY_HTML` content generated in Step 4g.
Display: `  -> Created: .planning/design/physical/print/FLY-event-flyer-v1.html`

IF `GENERATE_SIT === true`: write the SIT artifact:
```
.planning/design/physical/print/SIT-series-identity-v1.html
```
Use the Write tool to write the `SIT_HTML` content generated in Step 4g.
Display: `  -> Created: .planning/design/physical/print/SIT-series-identity-v1.html`

IF `GENERATE_PRG === true`: write the PRG artifact:
```
.planning/design/physical/print/PRG-festival-program-v1.html
```
Use the Write tool to write the `PRG_HTML` content generated in Step 4g.
Display: `  -> Created: .planning/design/physical/print/PRG-festival-program-v1.html`

#### 5c. Write index.html (ALWAYS — even for single-screen batch)

Write `.planning/design/ux/wireframes/index.html` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{PRODUCT_NAME} — Wireframe Index</title>
  <link rel="stylesheet" href="../../assets/tokens.css">
  {IF TOKENS_AVAILABLE is false: inline <style> with :root { fallback palette vars }}
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background: var(--color-surface, #fff); color: var(--color-text, #1f2937); }
    h1 { border-bottom: 2px solid var(--color-border, #e5e7eb); padding-bottom: 0.5rem; }
    .meta { color: var(--color-neutral-500, #6b7280); margin-bottom: 2rem; font-size: 0.875rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.75rem 0; border-bottom: 1px solid var(--color-surface-alt, #f3f4f6); }
    li.not-generated { color: var(--color-neutral-400, #9ca3af); }
    a { color: var(--color-action, #2563eb); text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .badge { font-size: 0.75rem; color: var(--color-neutral-500, #6b7280); margin-left: 0.5rem; }
    .fidelity-tag { display: inline-block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; background: var(--color-surface-alt, #f3f4f6); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.25rem; padding: 0.1rem 0.4rem; margin-left: 0.4rem; color: var(--color-neutral-600, #4b5563); }
  </style>
</head>
<body>
  <h1>{PRODUCT_NAME} — Wireframes</h1>
  <p class="meta">Fidelity: <strong>{FIDELITY}</strong> | Generated: {YYYY-MM-DD} | Screens: {total count from INVENTORY}</p>
  <ul>
    {For each screen in INVENTORY.screens:}
    {  If screen was generated in this batch:}
    {  <li><a href="WFR-{slug}.html">{Screen Label}</a> <span class="fidelity-tag">{FIDELITY}</span> <span class="badge">{journeyName} — {persona}</span></li>}
    {  If screen was NOT generated in this batch:}
    {  <li class="not-generated"><span>{Screen Label}</span> <span class="badge">not yet generated — run /pde:wireframe "{slug}" {FIDELITY}</span></li>}
  </ul>
</body>
</html>
```

#### 5d. Playwright MCP validation (optional enhancement)

If PLAYWRIGHT_AVAILABLE is true AND `--no-playwright` is not set: attempt to open `index.html` using a Playwright MCP tool call for screenshot validation. If unavailable or if the attempt fails: skip silently. Add `[Not validated — install Playwright MCP for automated browser testing]` to the output summary.

Display: `Step 5/7: Wrote {count} wireframe file(s) + index.html to ux/wireframes/.`

---

### Step 6/7: Update ux domain DESIGN-STATE

Use the Glob tool to check for `.planning/design/ux/DESIGN-STATE.md`.

**If it does NOT exist:** Create it:
- Use the content pattern from `.planning/design/ux/DESIGN-STATE.md` template (domain: ux, domain code: UX, date: current ISO date)
- Basic structure:
  ```markdown
  # UX Domain Design State

  Updated: {YYYY-MM-DD}
  Domain: ux

  ## Artifact Index

  | Code | Name | Skill | Status | Version | Enhanced By | Notes | Updated |
  |------|------|-------|--------|---------|-------------|-------|---------|
  | WFR | Wireframes | /pde:wireframe | draft | v1 | {MCPs used or none} | fidelity: {FIDELITY} | {YYYY-MM-DD} |
  ```
- Use the Write tool to create `.planning/design/ux/DESIGN-STATE.md`

**If it already exists:** Use the Read tool to read it, then use the Edit tool to update it.

Add or update the WFR artifact row in the Artifact Index table:
- If no WFR row exists: append after the last row in the table
- If WFR row already exists (re-run scenario): update the existing row in place

```
| WFR | Wireframes | /pde:wireframe | draft | v1 | {MCPs used or none} | fidelity: {FIDELITY} | {YYYY-MM-DD} |
```

Also append a row to the Domain Files table (if present):
```
| WFR-wireframes/ | wireframes | {FIDELITY} | {date} |
```

If any STH-{slug} artifacts were persisted in Step 4-STITCH:
  Add or update a row in the Artifact Tracking Table for each STH artifact:
  ```
  | STH-{slug} | wireframes | stitch | {date} |
  ```

Display: `Step 6/7: Updated ux/DESIGN-STATE.md with WFR wireframe entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

#### 7a. Acquire write lock

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-wireframe)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 5 seconds, retry up to 3 times:
  ```bash
  sleep 5
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-wireframe)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false` after 3 retries: warn and continue (do not halt — manifest update must still be attempted):
  ```
  Warning: Could not acquire write lock for root DESIGN-STATE.md. Proceeding without lock.
    If concurrent writes occur, re-run /pde:wireframe to repair manifest state.
  ```

#### 7b. Update root DESIGN-STATE.md

Read `.planning/design/DESIGN-STATE.md` using the Read tool, then apply the following updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add WFR row if not already present:
   ```
   | WFR | ux | FLW, SYS | current |
   ```

2. **Quick Reference section** — add or update WFR row:
   ```
   | Wireframes | v1 |
   ```

3. **Decision Log** — append entry:
   ```
   | WFR | wireframes generated, fidelity: {FIDELITY}, {screen_count} screens | {YYYY-MM-DD} |
   ```

4. **Iteration History** — append entry:
   ```
   | WFR-wireframes/ | v1 | Created by /pde:wireframe | {YYYY-MM-DD} |
   ```

#### 7c. Manifest registration (WFR artifact — single entry for entire batch)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR code WFR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR name "Wireframes"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR type wireframes
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR path ".planning/design/ux/wireframes/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR version 1
```

#### 7c-exp. Experience wireframe manifest registration (experience products only)

IF `PRODUCT_TYPE !== "experience"`: skip Step 7c-exp entirely.

```bash
# FLP artifact (experience floor plan)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP code FLP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP name "Floor Plan"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP type experience-wireframe-floorplan
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP path ".planning/design/ux/wireframes/FLP-floor-plan-v1.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLP version 1

# TML artifact (experience timeline)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML code TML
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML name "Event Timeline"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML type experience-wireframe-timeline
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML path ".planning/design/ux/wireframes/TML-timeline-v1.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update TML version 1
```

#### 7c-print. Print collateral manifest registration (experience products only)

IF `PRODUCT_TYPE !== "experience"`: skip Step 7c-print entirely.

```bash
# Print collateral manifest registration (experience products only)
# FLY artifact (always for experience)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY code FLY
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY name "Event Flyer"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY type print-collateral
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY domain physical
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY path ".planning/design/physical/print/FLY-event-flyer-v1.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update FLY version 1

# SIT artifact (only if experienceSubType === "recurring-series")
# IF GENERATE_SIT !== true: skip SIT manifest registration
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT code SIT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT name "Series Identity Template"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT type print-collateral
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT domain physical
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT path ".planning/design/physical/print/SIT-series-identity-v1.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SIT version 1

# PRG artifact (only if experienceSubType === "multi-day")
# IF GENERATE_PRG !== true: skip PRG manifest registration
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG code PRG
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG name "Festival Program"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG type print-collateral
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG domain physical
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG path ".planning/design/physical/print/PRG-festival-program-v1.html"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update PRG version 1
```

#### 7d. Coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output. Extract ALL fifteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes, hasPrintCollateral. Default any absent field to `false`. Merge `hasWireframes: true` while preserving all other fourteen values. If any STH-{slug} artifacts were successfully persisted in Step 4-STITCH, also set `hasStitchWireframes: true`. If FLY print collateral was generated in Step 4g (PRODUCT_TYPE === "experience"), also set `hasPrintCollateral: true`. If FLP/TML experience wireframes were generated in Step 4-EXP (PRODUCT_TYPE === "experience"), hasWireframes is already set to true by the standard merge. Then write the full merged fifteen-field object:

```bash
# Standard run (no STH artifacts, non-experience product):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current}}'

# --use-stitch run (STH artifacts persisted — set hasStitchWireframes: true):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":true,"hasPrintCollateral":{current}}'

# Experience product run (print collateral generated — set hasPrintCollateral: true):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":true}'
```

#### 7e. Release lock

**ALWAYS release, even if an error occurred:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

#### 7f. Output summary table

Display the final summary as the last output of every successful run:

```
## /pde:wireframe Output Summary

| Artifact | Path | Status |
|----------|------|--------|
| Wireframes ({count} screens) | .planning/design/ux/wireframes/ | Created |
| Navigation index | .planning/design/ux/wireframes/index.html | Created |
| ux DESIGN-STATE | .planning/design/ux/DESIGN-STATE.md | Updated |
| Root DESIGN-STATE | .planning/design/DESIGN-STATE.md | Updated |
| Design manifest | .planning/design/design-manifest.json | Updated |
{If STH artifacts were created:}
{| Stitch Wireframes ({sth_count} screens) | .planning/design/ux/wireframes/STH-*.html | Created (source: stitch) |}
{| Stitch Screenshots ({sth_count} screens) | .planning/design/ux/wireframes/STH-*.png | Created |}

Fidelity: {FIDELITY}
Screens: {comma-separated list of generated slugs}
Token status: {tokens-available | tokens-fallback}
Playwright: {Validated | Not validated -- install Playwright MCP for automated browser testing}

Next steps:
  - Review wireframes: open .planning/design/ux/wireframes/index.html in your browser
  - Run /pde:critique to get multi-perspective design feedback
  - Re-run at different fidelity: /pde:wireframe --{other-fidelity}
{If STH artifacts were created:}
{  - Stitch artifacts cached locally — /pde:critique and /pde:handoff will read from local files}
```

Display: `Step 7/7: Root DESIGN-STATE and manifest updated.`

---

## Anti-Patterns

NEVER do any of the following:

- Accept fidelity values other than exactly "lofi", "midfi", "hifi" (reject "lo-fi", "low", "high", "Lo-Fi", "LOFI", etc.) — emit error and HALT
- Mix fidelity rules: a midfi wireframe must NOT have lofi gray boxes OR hifi full token colors — each level is exclusive
- Use `@import` in wireframe HTML `<style>` blocks — `@import` does not work at `file://` in all browsers; use `<link rel="stylesheet">` in `<head>` only
- Use absolute filesystem paths in `href` or `src` attributes — always use relative paths; absolute paths break when files are moved
- Set designCoverage without reading coverage-check first — `manifest-set-top-level` replaces the ENTIRE designCoverage object; skipping coverage-check resets flags set by other skills
- Register one manifest entry per screen — WFR is a single manifest entry for the entire wireframes/ directory; path is the directory, not a file
- Generate wireframes without a screen inventory AND without a screen argument — no screen list means nothing to wireframe; this is a hard error, not a warning
- Omit annotation comments on state variants — Phase 19 handoff reads these comments to generate TypeScript component APIs and prop shapes; absent annotations produce empty handoff specs
- Skip the write-lock for root DESIGN-STATE.md updates — always acquire `design lock-acquire pde-wireframe` before any Edit to root DESIGN-STATE.md
- Generate wireframes without an index.html — index.html must always be written, even for single-screen batches
- Use `generateCssVars()` from design.cjs — it only emits `:root{}` blocks and is not applicable to wireframe HTML generation
- Use unnamed `display: grid` without a corresponding `pde-grid--{type}` class and composition comment block
- Produce symmetric equal-width `1fr 1fr` columns without explicit grid system selection and rationale
- Show tablet layout as "same as desktop but narrower" — tablet must have a DISTINCT composition strategy
- List priority numbering without weight factor explanation (must include " -- " followed by why)
- Document mobile single-column collapse as the intentional asymmetry — asymmetry must be on the desktop layout's primary axis

</process>

<output>
- `.planning/design/ux/wireframes/WFR-{slug}.html` — one self-contained HTML file per screen at the requested fidelity level; opens in browser at file:// with no server required
- `.planning/design/ux/wireframes/index.html` — navigation index linking all screens (generated and not-yet-generated); always written
- `.planning/design/ux/DESIGN-STATE.md` — ux domain state file; WFR artifact entry added or updated
- `.planning/design/DESIGN-STATE.md` — root state updated (Cross-Domain Map, Quick Reference, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — manifest updated with WFR artifact entry and hasWireframes: true in designCoverage
</output>
