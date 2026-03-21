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

Display per screen: `Step 4/7: Generated wireframe for {Screen Label} ({FIDELITY}).`

---

### Step 5/7: Write output files

#### 5a. Create wireframes directory

Ensure `.planning/design/ux/wireframes/` exists:

```bash
mkdir -p .planning/design/ux/wireframes/
```

#### 5b. Write each screen HTML file

For each screen in SCREENS: use the Write tool to write the HTML generated in Step 4 to:
`.planning/design/ux/wireframes/WFR-{slug}.html`

Display per file: `  -> Created: .planning/design/ux/wireframes/WFR-{slug}.html`

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

#### 7d. Coverage flag (CRITICAL — read-before-set to prevent clobber)

```bash
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
```

Parse the JSON output. Extract ALL fourteen current flag values: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes. Default any absent field to `false`. Merge `hasWireframes: true` while preserving all other thirteen values. If any STH-{slug} artifacts were successfully persisted in Step 4-STITCH, also set `hasStitchWireframes: true`. Then write the full merged fourteen-field object:

```bash
# Standard run (no STH artifacts):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current}}'

# --use-stitch run (STH artifacts persisted — set hasStitchWireframes: true):
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":{current},"hasWireframes":true,"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":true}'
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
