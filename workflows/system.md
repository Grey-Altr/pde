<purpose>
Generate a complete DTCG 2025.10 design token set from product brief context. Produces a canonical JSON token source and derived CSS custom properties across all 7 token categories (color, typography, spacing, shadows, borders, motion, components), a standalone browser-viewable preview page with light/dark toggle, and a markdown usage guide. All outputs are registered in DESIGN-STATE and the design manifest so downstream wireframe, critique, and handoff skills can locate and consume them.
</purpose>

<required_reading>
@references/skill-style-guide.md
@references/mcp-integration.md
@references/color-systems.md
@references/typography.md
@references/motion-design.md
@references/composition-typography.md
@references/business-track.md
@references/launch-frameworks.md
</required_reading>

<flags>
## Supported Flags

| Flag | Type | Behavior |
|------|------|----------|
| `--dry-run` | Boolean | Show planned output without executing. Runs Steps 1-3 (init, prerequisites, MCP probe) but writes NO files. Displays planned file paths, detected input path, token category counts, estimated token usage. |
| `--quick` | Boolean | Skip MCP enhancements (Sequential Thinking MCP probe) for faster execution. Useful for rapid iteration when MCP enhanced reasoning is not needed. |
| `--verbose` | Boolean | Show detailed progress and MCP probe results, timing per step, reference loading details. |
| `--no-mcp` | Boolean | Skip ALL MCP probes. Pure baseline mode using training knowledge and local files only. |
| `--no-sequential-thinking` | Boolean | Skip Sequential Thinking MCP specifically while allowing other MCPs. |
| `--force` | Boolean | Skip the confirmation prompt when a design system already exists and auto-increment to the next version. |
| `--preset` | String | Override default brief-derived token generation with a curated preset. Values: `minimal`, `corporate`, `playful`, `editorial`. Uses curated defaults from references/typography.md and references/color-systems.md. |
</flags>

<process>

## /pde:system — Design System Generation Pipeline

Check for flags in $ARGUMENTS before beginning: `--dry-run`, `--quick`, `--verbose`, `--no-mcp`, `--no-sequential-thinking`, `--force`, `--preset`.

If `--preset` is provided, extract the preset value (minimal|corporate|playful|editorial) and store as PRESET_NAME.

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
  Check that .planning/ exists and is writable, then re-run /pde:system.
```

Halt on error. On success, display: `Step 1/7: Design directories initialized.`

---

### Step 2/7: Check prerequisites

**Read the design brief:**

Use the Glob tool to search for `.planning/design/strategy/BRF-brief-v*.md`. Sort results by version number descending (highest version first) and read the highest-version file using the Read tool.

- If **no brief found AND `--preset` flag provided**: warn that brief is missing but continue — the preset provides all necessary defaults for token generation. Set INPUT_PATH = "c" (preset override). Log: `  -> Warning: No design brief found. Continuing with --preset ${PRESET_NAME} defaults.`
- If **no brief found AND no `--preset`**: display the following error and HALT:
  ```
  Error: No design brief found. Run /pde:brief first, or use --preset to generate tokens without a brief.
  ```
- If **brief found**: read the highest-version brief. Extract and record:
  - `PRODUCT_NAME` — from brief frontmatter or `# Design Brief` heading context
  - `PRODUCT_TYPE` — from `**Type:**` line in brief (software|hardware|hybrid|experience)
  <!-- Experience product type (Phase 74 architecture, Phase 76 implementation): experience-specific tokens generated in Step 5b — see PRODUCT_TYPE == "experience" block below. -->
  <!-- Business product type (Phase 88): business brand system and marketing tokens generated in Steps 5c/5d — see businessMode == "true" block below. Step 5b (experience) and Steps 5c/5d (business) are independent conditional blocks — both run for business:experience compositions. -->
  - `PLATFORM` — from `**Platform:**` line in brief (web|mobile|desktop|embedded|multi-platform)
  - `BRAND_COLORS` — from any brand color mentions (hex, oklch, rgb values listed in brief)
  - `TYPOGRAPHY_PREFS` — any font family preferences stated in brief
  - `PRODUCT_CHARACTER` — infer from brief content:
    - data-dense/dashboard products → `data-dense`
    - marketing/landing pages → `marketing`
    - reading/editorial products → `reading`
    - default → `general`

**Determine INPUT_PATH:**

```
(a) Brief found with explicit brand colors → INPUT_PATH = "a" (brief + brand data)
(b) Brief found but no brand colors → INPUT_PATH = "b" (brief, derive algorithmically)
(c) --preset flag provided → INPUT_PATH = "c" (preset override, may override a or b)
```

If both brief and `--preset` are present, INPUT_PATH = "c" (preset takes precedence for colors and typography, brief still used for product name/context).

**Check for existing design system:**

Use the Glob tool to search for `.planning/design/visual/SYS-tokens.json`.

- If **no system exists**: set N = 1.
- If **system exists AND `--force` flag NOT present**: prompt the user:
  ```
  A design system already exists (SYS-tokens.json). Generate a new version?
  This will create updated SYS files without modifying existing v{current} artifacts.
  (yes / no)
  ```
  If user answers "no": display `Aborted. Existing design system preserved at .planning/design/visual/SYS-tokens.json` and halt.
  If user answers "yes": determine N = current version + 1.
- If **system exists AND `--force` flag present**: auto-increment. Log: `  -> --force flag detected, auto-incrementing to v{N}.`

Display: `Step 2/7: Prerequisites satisfied. Brief: v{X} loaded. Input path: {a|b|c}. System version: v{N}.`

If `--dry-run` is active: display planned output and HALT:
```
Dry run mode. No files will be written.

Planned output:
  Files: .planning/design/visual/ (12 artifacts)
  Categories: color (OKLCH + dark mode), typography, spacing, shadows, borders, motion, components + utilities

Input path: {a|b|c}
Product type: {type}
Preset: {PRESET_NAME or "custom"}

Token estimates:
  Color: ~88 primitives + 77 harmony (7 harmonies x 11 steps) + 12 semantic + 12 dark overrides
  Typography: ~8 sizes + 3 families + 4 weights + 8 line-heights + 8 letter-spacings
  Spacing: 15 primitives + 6 semantic + 12 density overrides (compact + cozy)
  Shadows: 5 levels
  Borders: 7 radii + 3 widths + 1 style
  Motion: 5 durations + 5 easings + 5 delays + 3 transitions + 3 font axes
  Components: .pde-btn (5 variants), .pde-card (3 parts), .pde-input (4 parts) + dark variants
  Utilities: spacing (104), flex (10), width (7), gap (6), display (4), text (3)

Estimated token usage: ~{estimate}
MCP enhancements: {Sequential Thinking: available/unavailable}
```

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
  SKIP Sequential Thinking probe (quick mode -- no MCP overhead)
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

### Step 4/7: Generate token data

This is the core generation step. Generate the complete DTCG JSON token tree and all derived CSS values. Work through each category in order. Do all computation in working memory — the output is written in Step 5.

---

#### Color tokens

**Determine seed color based on INPUT_PATH:**

**(a) Brief with brand colors (INPUT_PATH = "a"):**
- Extract the brand primary color from the brief content (any format: hex, rgb, oklch).
- Convert to OKLCH if needed: extract L (lightness 0-1), C (chroma 0-~0.4), H (hue 0-360).
- This becomes the seed: `SEED_L`, `SEED_C`, `SEED_H`.

**(b) Brief without brand colors (INPUT_PATH = "b"):**
- Derive seed hue algorithmically from product name and domain keywords found in the brief.
- Method: Sum the character codes of the product name, take modulo 360 to get a base hue. Adjust by domain keyword lookup:
  - finance/banking/enterprise → subtract 30 (shift toward cool blue)
  - health/medical/wellness → add 30 (shift toward green)
  - creative/design/art → add 60 (shift toward purple/violet)
  - food/restaurant/cooking → add 15 (shift toward warm orange)
  - education/learning → subtract 15 (shift toward teal)
  - No keyword match → use base hue unchanged
- Set `SEED_H = derived_hue`, `SEED_C = 0.18` (moderate default chroma), `SEED_L = 0.55` (mid-brightness).
- If SEQUENTIAL_THINKING_AVAILABLE: use `mcp__sequential-thinking__think` with prompt: `"I'm generating a brand color hue for a product described as: {brief summary}. The product name is {PRODUCT_NAME}. Suggest a color hue angle (0-360) in the OKLCH color space that best represents this product's personality and domain. Consider industry associations: blue (250) for trust/tech, green (145) for health/growth, violet (290) for creativity, orange (45) for energy, red (25) for urgency. Return just the numeric hue value."` Use the response to refine SEED_H if it provides a more appropriate value.

**(c) Preset override (INPUT_PATH = "c"):**
- Use seed colors from references/color-systems.md product-type fallback palettes section:
  - `minimal` → SaaS palette: SEED_H=250, SEED_C=0.18, SEED_L=0.55
  - `corporate` → SaaS palette with adjustment: SEED_H=250, SEED_C=0.14, SEED_L=0.55
  - `playful` → SEED_H=290 (violet), SEED_C=0.20, SEED_L=0.55
  - `editorial` → Content/Editorial palette: SEED_H=250, SEED_C=0.12, SEED_L=0.35

**Generate primary palette (11 steps, 50-950):**

Apply the OKLCH scale generation table from references/color-systems.md. For each step:
```
L_step = table value (fixed per step)
C_step = min(SEED_C * multiplier, C_safe_max)
H_step = SEED_H (fixed -- hue never changes within a palette)
Result: oklch(L_step C_step H_step)
```

Scale table (exact values):
| Step | L | C Multiplier | C_safe_max |
|------|---|------|------|
| 50 | 0.97 | 0.08 | 0.05 |
| 100 | 0.93 | 0.18 | 0.05 |
| 200 | 0.87 | 0.32 | 0.08 |
| 300 | 0.77 | 0.55 | 0.25 |
| 400 | 0.67 | 0.80 | 0.25 |
| 500 | 0.55 | 1.00 | 0.25 |
| 600 | 0.47 | 0.90 | 0.25 |
| 700 | 0.39 | 0.75 | 0.25 |
| 800 | 0.31 | 0.55 | 0.25 |
| 900 | 0.23 | 0.35 | 0.04 |
| 950 | 0.15 | 0.20 | 0.04 |

Round L and C to 3 decimal places in the oklch() value.

**Generate secondary palette:**
- Secondary hue: `SECONDARY_H = (SEED_H + 180) % 360` (complementary)
- Same scale table with secondary hue, same SEED_C.

**Generate harmony palettes:**

Using the seed color (SEED_H, SEED_C, SEED_L), generate 7 harmony colors across 4 harmony types. Apply the hue-rotation formulas from references/color-systems.md:

| Harmony Token | Hue Formula | Example (SEED_H=280) |
|---------------|-------------|----------------------|
| analogous-warm | SEED_H + 30 | 310 |
| analogous-cool | SEED_H - 30 | 250 |
| complementary  | SEED_H + 180 | 100 |
| split-warm     | SEED_H + 150 | 70  |
| split-cool     | SEED_H - 150 | 130 |
| triadic-a      | SEED_H + 120 | 40  |
| triadic-b      | SEED_H - 120 | 160 |

**All hue values wrap at 360** (e.g., 280 + 150 = 430 → 70, computed as `(SEED_H + offset) % 360`).

**Perceptual balance rules:**
- Keep L and C identical to SEED_L and SEED_C for all harmonies. OKLCH perceptual uniformity means equal L/C across hues produces visually balanced palettes by construction.
- Exception: If two harmony hues land within 15 degrees of each other, increase chroma separation by +/-0.04 on the closer pair.
- Apply C_safe_max clamps from the scale generation table (same as primary palette). High-chroma out-of-gamut colors render inconsistently on sRGB monitors.

For each harmony color, generate a full 11-step scale (50-950) using the same scale table as the primary palette but with the harmony hue. Store as:
```
--color-harmony-analogous-warm-{step}: oklch({L} {C} {H});
--color-harmony-analogous-cool-{step}: oklch({L} {C} {H});
--color-harmony-complementary-{step}: oklch({L} {C} {H});
--color-harmony-split-warm-{step}: oklch({L} {C} {H});
--color-harmony-split-cool-{step}: oklch({L} {C} {H});
--color-harmony-triadic-a-{step}: oklch({L} {C} {H});
--color-harmony-triadic-b-{step}: oklch({L} {C} {H});
```

**Generate neutral palette:**
- Same scale table with `C = 0.010` (barely perceptible tint), `H = SEED_H` (brand-tinted gray).
- At steps 50, 100: use `C = 0.005` for near-white. At steps 900, 950: use `C = 0.008`.

**Generate semantic palettes (4 colors, each 11 steps):**
- success: H=145, SEED_C=0.16
- warning: H=85, SEED_C=0.15
- error: H=25, SEED_C=0.18
- info: H=250, SEED_C=0.14

Apply same scale table for each.

**Semantic color aliases — light mode:**
```
--color-action: var(--color-primary-500)
--color-action-hover: var(--color-primary-600)
--color-bg-default: var(--color-neutral-50)
--color-bg-surface: var(--color-neutral-100)
--color-bg-elevated: #ffffff
--color-text-primary: var(--color-neutral-900)   /* |Lc| ~95 on white bg — meets APCA preferred for all sizes */
--color-text-secondary: var(--color-neutral-600) /* |Lc| ~68 on white bg — meets APCA min 60; use 16px+/400 or 14px+/700 */
--color-text-muted: var(--color-neutral-400)     /* |Lc| ~45 on white bg — decorative/large text only (24px+). Below body text threshold. */
--color-border: var(--color-neutral-200)
--color-success: var(--color-success-500)
--color-warning: var(--color-warning-500)
--color-error: var(--color-error-500)
--color-info: var(--color-info-500)
```

**Dark mode semantic overrides:**
```
--color-action: var(--color-primary-400)
--color-action-hover: var(--color-primary-300)
--color-bg-default: var(--color-neutral-900)
--color-bg-surface: var(--color-neutral-800)
--color-bg-elevated: var(--color-neutral-700)
--color-text-primary: var(--color-neutral-50)
--color-text-secondary: var(--color-neutral-300)
--color-text-muted: var(--color-neutral-500)
--color-border: var(--color-neutral-700)
```

---

#### Typography tokens

**Determine scale ratio from context:**

If INPUT_PATH = "c" (preset), use preset mapping from references/typography.md:
- minimal → Minor Third (1.200)
- corporate → Major Third (1.250)
- playful → Perfect Fourth (1.333)
- editorial → Augmented Fourth (1.414)

If INPUT_PATH = "a" or "b" (from brief), derive from PRODUCT_CHARACTER:
- data-dense → Minor Third (1.200)
- marketing → Perfect Fourth (1.333)
- reading → Augmented Fourth (1.414)
- general → Minor Third (1.200)

Store as SCALE_RATIO and SCALE_RATIO_NAME.

**Generate font size scale (8 steps):**

Formula: `size = 1rem * SCALE_RATIO^n`, round to 3 decimal places.

| Step | n | Formula |
|------|---|---------|
| xs | -2 | 1 * ratio^-2 |
| sm | -1 | 1 * ratio^-1 |
| base | 0 | 1.000rem |
| lg | 1 | 1 * ratio^1 |
| xl | 2 | 1 * ratio^2 |
| 2xl | 3 | 1 * ratio^3 |
| 3xl | 4 | 1 * ratio^4 |
| 4xl | 5 | 1 * ratio^5 |

**Generate line-heights per step:**

```
lineHeight = max(1.1, 1.6 - (step_index * 0.05))
```

| Step | step_index | lineHeight |
|------|------------|------------|
| xs | 0 | 1.600 |
| sm | 1 | 1.550 |
| base | 2 | 1.500 |
| lg | 3 | 1.450 |
| xl | 4 | 1.400 |
| 2xl | 5 | 1.350 |
| 3xl | 6 | 1.300 |
| 4xl | 7 | 1.250 |

**Letter-spacing per step:**

| Step | Value |
|------|-------|
| xs | +0.04em |
| sm | +0.02em |
| base | 0em |
| lg | -0.005em |
| xl | -0.010em |
| 2xl | -0.015em |
| 3xl | -0.020em |
| 4xl | -0.025em |

**Font families:**

If brief specifies fonts (INPUT_PATH = "a" or "b" with TYPOGRAPHY_PREFS set): use the brief-specified fonts.

If INPUT_PATH = "c" (preset), use preset recommendations from references/typography.md:
- minimal → display: system-ui, body: system-ui
- corporate → display: Inter, body: Source Serif 4 (with system fallbacks)
- playful → display: DM Sans, body: DM Serif Display (with system fallbacks)
- editorial → display: Literata, body: Inter (with system fallbacks)

Default (no brief fonts, no preset): use system font stacks:
- display: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- body: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- mono: `ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace`

**Font weights:** normal=400, medium=500, semibold=600, bold=700.

---

#### Type pairing recommendations

Generate type pairing guidance in the usage guide output (SYS-guide.md). This is design recommendation content, not raw token data — pairings are design decisions that require rationale, not measurable values.

**Classification taxonomy** (Vox-ATypI simplified for digital, from references/composition-typography.md):

| Category | Description | Examples | Token value |
|----------|-------------|---------|-------------|
| Humanist serif | Variable stroke, bracketed serifs, calligraphic origin | EB Garamond, Libre Baskerville, Playfair Display | `humanist-serif` |
| Transitional serif | Geometric regularization, vertical stress, high contrast | Georgia, Charter | `transitional-serif` |
| Geometric sans | Minimal contrast, circular forms, single-storey a/g | Futura, DM Sans, Circular | `geometric-sans` |
| Humanist sans | Calligraphic influence, variable stroke, two-storey a | Inter, Gill Sans, Fira Sans | `humanist-sans` |
| Grotesque sans | Realist, minimal contrast, derived from early 19th C. | Helvetica, Arial, Aktiv | `grotesque-sans` |
| Slab serif | Square brackets, low contrast, sturdy | Roboto Slab, Zilla Slab | `slab-serif` |
| Display | Expressive, concept-specific, legibility not primary | Clash Display, Fraunces | `display` |
| Monospace | Fixed-width, code/data contexts | JetBrains Mono, Fira Code | `monospace` |

**Generate at least 5 pairings in the usage guide with this 4-field format:**

```
### Recommendation {N}: {Display Font} ({classification}) + {Body Font} ({classification})
**Classification contrast:** {serif vs sans | geometric vs humanist | etc.} — {category contrast | personality contrast | purpose contrast | rhythm contrast}
**{Display Font}** serves {role: display headings, hero text, etc.} at {size range} where {quality: personality, authority, impact, etc.} matters.
**{Body Font}** serves {role: body text, UI labels, etc.} at {size range} where {quality: legibility, neutrality, readability} is critical.
**APCA note:** Pair requires |Lc| >= {threshold} for {Body Font} at body sizes ({size}/{weight}); {Display Font} at {display size}+ needs |Lc| >= {threshold}.
**Avoid:** {Anti-pattern — e.g., using display font below certain size, mixing two fonts of same classification}
```

**The 5 recommended pairings to generate:**

**Recommendation 1: Playfair Display (humanist serif) + Inter (humanist sans)**
- **Classification contrast:** serif vs sans — category contrast in stroke style
- **Playfair Display** serves display headings (32px+) where personality and authority matter
- **Inter** serves body text and UI labels where legibility at small sizes is critical
- **APCA note:** |Lc| >= 75 for Inter at body sizes (16px/400); Playfair Display at 36px+ needs |Lc| >= 45
- **Avoid:** Using Playfair Display below 24px — serifs at small sizes reduce legibility

**Recommendation 2: EB Garamond (humanist serif) + DM Sans (geometric sans)**
- **Classification contrast:** humanist serif + geometric sans — personality contrast (calligraphic vs constructed)
- **EB Garamond** serves editorial headings (24px+) with classical, bookish character
- **DM Sans** serves body and UI with clean geometric neutrality
- **APCA note:** |Lc| >= 75 for DM Sans body (16px/400); EB Garamond at 24px+ needs |Lc| >= 45
- **Avoid:** Mixing EB Garamond with another humanist serif — insufficient contrast

**Recommendation 3: Fraunces (display serif) + Source Sans 3 (humanist sans)**
- **Classification contrast:** display + humanist sans — expressive vs functional role contrast
- **Fraunces** serves high-impact hero/brand moments with optical size axis animation
- **Source Sans 3** serves body text with neutral readability and variable font wght axis
- **APCA note:** |Lc| >= 75 for Source Sans 3 body; Fraunces display-only at 36px+
- **Avoid:** Using Fraunces for body text — display fonts sacrifice legibility for personality

**Recommendation 4: JetBrains Mono (monospace) + Inter (humanist sans)**
- **Classification contrast:** monospace + humanist sans — character rhythm contrast
- **JetBrains Mono** serves code blocks, data displays, terminal-like contexts
- **Inter** serves prose, UI, and navigation with proportional readability
- **APCA note:** |Lc| >= 75 for both at body sizes; monospace at 14px+ needs |Lc| >= 75
- **Avoid:** Using monospace for body prose — fixed-width reduces reading speed 10-15%

**Recommendation 5: Clash Display (display) + Satoshi (grotesque sans)**
- **Classification contrast:** display + grotesque — purpose contrast (expressive vs neutral)
- **Clash Display** serves startup/creative hero headings with geometric personality
- **Satoshi** serves body text with clean, modern neutrality
- **APCA note:** |Lc| >= 75 for Satoshi body; Clash Display at 36px+ needs |Lc| >= 45
- **Avoid:** Using Clash Display below 32px or for body text — display fonts need optical size

---

#### Spacing tokens

Standard scale with 4px base unit:

| Token | Value |
|-------|-------|
| --space-0 | 0px |
| --space-px | 1px |
| --space-0_5 | 2px |
| --space-1 | 4px |
| --space-2 | 8px |
| --space-3 | 12px |
| --space-4 | 16px |
| --space-5 | 20px |
| --space-6 | 24px |
| --space-8 | 32px |
| --space-10 | 40px |
| --space-12 | 48px |
| --space-16 | 64px |
| --space-20 | 80px |
| --space-24 | 96px |

Note: use underscores for decimal values in CSS custom property names (--space-0_5 not --space-0.5).

**Semantic spacing tokens** (reference the primitive scale above):

These tokens map spacing intent to primitive values. Downstream CSS uses semantic names, not raw scale numbers.

```css
/* Default density semantic tokens */
:root {
  --spacing-component-gap: var(--space-4);    /* 16px — gap between components in a group */
  --spacing-section-gap:   var(--space-16);   /* 64px — gap between page sections */
  --spacing-content-gap:   var(--space-8);    /* 32px — gap between content blocks */
  --spacing-inline:        var(--space-2);    /* 8px  — inline element spacing (icon + label) */
  --spacing-card-padding:  var(--space-6);    /* 24px — card/panel internal padding */
  --spacing-page-margin:   var(--space-8);    /* 32px — page-level side margins */
}
```

**Density context overrides** (3 contexts — compact, default, cozy — following the IBM Carbon density pattern from references/composition-typography.md):

```css
/* Compact density — data tables, admin panels, code editors */
/* Multiplier: ~0.75x — maps semantic tokens to smaller primitive values */
[data-density="compact"] {
  --spacing-component-gap: var(--space-2);    /* 8px  (was 16px) */
  --spacing-section-gap:   var(--space-8);    /* 32px (was 64px) */
  --spacing-content-gap:   var(--space-4);    /* 16px (was 32px) */
  --spacing-inline:        var(--space-1);    /* 4px  (was 8px)  */
  --spacing-card-padding:  var(--space-3);    /* 12px (was 24px) */
  --spacing-page-margin:   var(--space-4);    /* 16px (was 32px) */
}

/* Cozy density — hero sections, marketing pages, editorial layouts */
/* Multiplier: ~1.5x — maps semantic tokens to larger primitive values */
[data-density="cozy"] {
  --spacing-component-gap: var(--space-8);    /* 32px (was 16px) */
  --spacing-section-gap:   var(--space-24);   /* 96px (was 64px) */
  --spacing-content-gap:   var(--space-12);   /* 48px (was 32px) */
  --spacing-inline:        var(--space-4);    /* 16px (was 8px)  */
  --spacing-card-padding:  var(--space-10);   /* 40px (was 24px) */
  --spacing-page-margin:   var(--space-16);   /* 64px (was 32px) */
}
```

**Optical spacing adjustments** (apply after mathematical spacing):
- First child of section: reduce top padding by 1 scale step (visually flush to header)
- Icon + label pairs: reduce gap by half (icons read as visually larger than their pixel box)
- Numeric data columns: use compact density regardless of page density (data readability)
- Touch targets: maintain 44px minimum regardless of density context (accessibility)

---

#### Shadow tokens (5 elevation levels)

```
--shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.05)
--shadow-sm: 0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1)
--shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)
--shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)
--shadow-xl: 0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)
```

---

#### Border tokens

**Radius:**
```
--radius-none: 0
--radius-sm: 0.125rem
--radius-md: 0.375rem
--radius-lg: 0.5rem
--radius-xl: 0.75rem
--radius-2xl: 1rem
--radius-full: 9999px
```

**Width:**
```
--border-width-thin: 1px
--border-width-default: 1px
--border-width-thick: 2px
```

**Style:**
```
--border-style-default: solid
```

---

#### Motion tokens

**Duration scale** (5 steps from micro to dramatic — aligned with references/motion-design.md):

```
--duration-micro:    100ms   /* State changes: button press, checkbox, toggle */
--duration-fast:     200ms   /* Hover transitions, small UI feedback */
--duration-standard: 300ms   /* Modal open/close, drawer slide, tooltip */
--duration-slow:     500ms   /* Page transitions, hero entrance, complex reveals */
--duration-dramatic: 800ms   /* Cinematic entrance, brand moments, first-load hero */
```

**Easing curves** (5 named curves including spring and bounce):

```
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)    /* Material standard — general UI */
--ease-enter:    cubic-bezier(0, 0, 0.2, 1)       /* Deceleration — elements entering */
--ease-exit:     cubic-bezier(0.4, 0, 1, 1)       /* Acceleration — elements leaving */
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1) /* Single-overshoot spring */
/* Multi-bounce spring (88% browser support): */
--ease-spring-bounce: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%, 0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%, 1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%, 1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%, 1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1)
```

**Delay / choreography tokens** (5 delay values for sequencing entrance animations):

```
--delay-none:       0ms     /* Immediate — no delay */
--delay-stagger-sm: 60ms    /* Card lists, navigation items (3-5 items) */
--delay-stagger-md: 120ms   /* Feature grids (5-8 items) */
--delay-stagger-lg: 200ms   /* Section reveals, hero sequences */
--delay-page:       300ms   /* Route-change delay — content waits for transition */
```

**DTCG transition composites** (pre-composed duration+delay+easing for common patterns):

```
transition.default:         300ms + 0ms delay + ease-standard  /* Modal, drawer, tooltip */
transition.hover:           200ms + 0ms delay + ease-standard  /* Button/link hover state */
transition.spring-feedback: 200ms + 0ms delay + ease-spring    /* Press feedback with overshoot */
```

---

#### Variable font axis animation tokens

Generate variable font axis tokens for the three registered CSS axes. These tokens describe animation parameters for typographic motion effects.

**IMPORTANT:** Not all variable fonts support all axes. The `$description` for each axis must state which common fonts support it. Verify font axis support at v-fonts.com before applying.

**Performance note:** Animate `font-weight` (wght) and `font-stretch` (wdth) via their CSS shorthand properties — these are GPU-composited in modern browsers. Only use `font-variation-settings` directly for custom axes or opsz.

**Weight axis (wght):**
- Axis tag: `wght`
- CSS property: `font-weight` (direct mapping, no font-variation-settings needed)
- Range: `"min": 100` (thin) to `"max": 900` (black)
- Resting value: 400 (body text default)
- Animated target: 700 (hover/active — bold snap)
- Transition: duration-fast (200ms) + ease-spring (cubic-bezier(0.34, 1.56, 0.64, 1))
- Supported fonts: Inter, Roboto Flex, Source Sans 3, DM Sans

**Width axis (wdth):**
- Axis tag: `wdth`
- CSS property: `font-stretch` (preferred) or `font-variation-settings 'wdth'`
- Range: `"min": 75` (condensed) to `"max": 125` (expanded)
- Resting value: 100 (normal)
- Transition: duration-standard (300ms) + ease-enter (deceleration — width feels physical)
- Supported fonts: Roboto Flex (25-151)

**Optical size axis (opsz):**
- Axis tag: `opsz`
- CSS property: `font-optical-sizing: auto` (preferred) or `font-variation-settings 'opsz'`
- Ranges by context: caption (`"min": 6`, `"max": 12`), body (`"min": 12`, `"max": 24`), display (`"min": 24`, `"max": 144`)
- Transition: duration-standard (300ms) + ease-standard
- Supported fonts: Roboto Flex, Literata, Source Serif 4

---

#### Component tokens

Define CSS classes using var() references to semantic tokens. Do NOT hardcode raw color values — every color reference MUST use var(--color-...).

**Button component:**

```css
.pde-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  font-family: var(--font-family-display);
  line-height: 1;
  border-radius: var(--radius-md);
  border: var(--border-width-default) var(--border-style-default) transparent;
  cursor: pointer;
  transition: background-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  text-decoration: none;
}

.pde-btn--primary {
  background-color: var(--color-action);
  color: #ffffff;
  border-color: var(--color-action);
}

.pde-btn--primary:hover {
  background-color: var(--color-action-hover);
  border-color: var(--color-action-hover);
}

.pde-btn--secondary {
  background-color: transparent;
  color: var(--color-action);
  border-color: var(--color-action);
}

.pde-btn--secondary:hover {
  background-color: var(--color-bg-surface);
}

.pde-btn--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
}

.pde-btn--lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--font-size-lg);
}
```

**Card component:**

```css
.pde-card {
  background-color: var(--color-bg-surface);
  border: var(--border-width-thin) var(--border-style-default) var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.pde-card__header {
  padding: var(--space-4) var(--space-6);
  border-bottom: var(--border-width-thin) var(--border-style-default) var(--color-border);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}

.pde-card__body {
  padding: var(--space-6);
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  line-height: 1.5;
}

.pde-card__footer {
  padding: var(--space-4) var(--space-6);
  border-top: var(--border-width-thin) var(--border-style-default) var(--color-border);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
```

**Input component:**

```css
.pde-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.pde-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-primary);
}

.pde-input {
  display: block;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-base);
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background-color: var(--color-bg-default);
  border: var(--border-width-default) var(--border-style-default) var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease-standard),
              box-shadow var(--duration-fast) var(--ease-standard);
  outline: none;
}

.pde-input:focus {
  border-color: var(--color-action);
  box-shadow: 0 0 0 3px oklch(from var(--color-action) l c h / 0.15);
}

.pde-error {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}
```

**Dark variants (explicit — not auto-adapting):**

```css
.dark .pde-btn--primary {
  background-color: var(--color-action);
  border-color: var(--color-action);
}

.dark .pde-btn--secondary {
  color: var(--color-action);
  border-color: var(--color-action);
}

.dark .pde-card {
  background-color: var(--color-bg-surface);
  border-color: var(--color-border);
}

.dark .pde-input {
  background-color: var(--color-bg-default);
  border-color: var(--color-border);
  color: var(--color-text-primary);
}
```

Note: In dark mode, the semantic tokens (--color-action, --color-bg-surface, etc.) are already remapped by the dark mode CSS block, so .dark variants primarily serve as explicit fallbacks and ensure correct specificity.

---

#### Utility classes

**Spacing utilities** — for scale values 0, 1, 2, 3, 4, 5, 6, 8:

```css
/* Margin */
.m-{n}  { margin: var(--space-{n}); }
.mt-{n} { margin-top: var(--space-{n}); }
.mb-{n} { margin-bottom: var(--space-{n}); }
.ml-{n} { margin-left: var(--space-{n}); }
.mr-{n} { margin-right: var(--space-{n}); }
.mx-{n} { margin-left: var(--space-{n}); margin-right: var(--space-{n}); }
.my-{n} { margin-top: var(--space-{n}); margin-bottom: var(--space-{n}); }

/* Padding */
.p-{n}  { padding: var(--space-{n}); }
.pt-{n} { padding-top: var(--space-{n}); }
.pb-{n} { padding-bottom: var(--space-{n}); }
.pl-{n} { padding-left: var(--space-{n}); }
.pr-{n} { padding-right: var(--space-{n}); }
.px-{n} { padding-left: var(--space-{n}); padding-right: var(--space-{n}); }
.py-{n} { padding-top: var(--space-{n}); padding-bottom: var(--space-{n}); }
```

Generate all combinations. For n=0, use --space-0. For n=0_5, use --space-0_5.

**Flex utilities:**
```css
.flex         { display: flex; }
.flex-col     { flex-direction: column; }
.flex-row     { flex-direction: row; }
.flex-wrap    { flex-wrap: wrap; }
.items-center { align-items: center; }
.items-start  { align-items: flex-start; }
.items-end    { align-items: flex-end; }
.justify-center  { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-start   { justify-content: flex-start; }
.justify-end     { justify-content: flex-end; }
```

**Width utilities:**
```css
.w-full  { width: 100%; }
.w-auto  { width: auto; }
.w-1\/2  { width: 50%; }
.w-1\/3  { width: 33.333%; }
.w-2\/3  { width: 66.667%; }
.w-1\/4  { width: 25%; }
.w-3\/4  { width: 75%; }
```

**Gap utilities** — for scale values 1, 2, 3, 4, 6, 8:
```css
.gap-{n} { gap: var(--space-{n}); }
```

**Display utilities:**
```css
.block        { display: block; }
.inline-block { display: inline-block; }
.inline       { display: inline; }
.hidden       { display: none; }
```

**Text alignment:**
```css
.text-center { text-align: center; }
.text-left   { text-align: left; }
.text-right  { text-align: right; }
```

---

#### Construct DTCG JSON token tree

Assemble the complete DTCG 2025.10 token tree as a single JSON object with these 7 top-level category keys: `color`, `typography`, `spacing`, `shadow`, `border`, `motion`, `component`.

**CRITICAL DTCG rules:**
- Every leaf node MUST have both `$value` and `$type` (W3C 2025.10 format).
- Dark mode semantics use `$extensions: { "com.pde.condition": "dark" }` on the dark semantic group.
- `$type` at a parent group level applies to all children by inheritance, but leaf-level `$type` is required for strict compliance.
- Skipping `$type` on any leaf is invalid and will fail downstream token tooling.

Example structure:

```json
{
  "color": {
    "primitive": {
      "primary": {
        "50": { "$value": "oklch(0.97 0.014 250)", "$type": "color" },
        "100": { "$value": "oklch(0.93 0.032 250)", "$type": "color" },
        "500": { "$value": "oklch(0.55 0.180 250)", "$type": "color", "$description": "Primary brand shade" }
      },
      "secondary": {
        "500": { "$value": "oklch(0.55 0.180 70)", "$type": "color" }
      },
      "neutral": {
        "50": { "$value": "oklch(0.97 0.005 250)", "$type": "color" }
      },
      "success": {
        "500": { "$value": "oklch(0.55 0.160 145)", "$type": "color" }
      }
    },
    "semantic": {
      "action": { "$value": "{color.primitive.primary.500}", "$type": "color" },
      "bg": {
        "default": { "$value": "{color.primitive.neutral.50}", "$type": "color" }
      },
      "text": {
        "primary": {
          "$value": "{color.primitive.neutral.900}",
          "$type": "color",
          "$description": "Primary text on default bg: |Lc| ~95 (exceeds preferred 90). Meets APCA for all font sizes."
        },
        "secondary": {
          "$value": "{color.primitive.neutral.600}",
          "$type": "color",
          "$description": "Secondary text on default bg: |Lc| ~68 (meets minimum 60). Use 16px+/400 or 14px+/700."
        },
        "muted": {
          "$value": "{color.primitive.neutral.400}",
          "$type": "color",
          "$description": "Muted/decorative text on default bg: |Lc| ~45. Large text only (24px+)."
        }
      },
      "dark": {
        "$extensions": { "com.pde.condition": "dark" },
        "action": { "$value": "{color.primitive.primary.400}", "$type": "color" },
        "bg": {
          "default": { "$value": "{color.primitive.neutral.900}", "$type": "color" }
        },
        "text": {
          "primary": {
            "$value": "{color.primitive.neutral.50}",
            "$type": "color",
            "$description": "Primary text on dark bg: |Lc| ~95 (light on dark — APCA polarity reversed). Meets all sizes."
          },
          "secondary": {
            "$value": "{color.primitive.neutral.300}",
            "$type": "color",
            "$description": "Secondary text on dark bg: |Lc| ~65. Use 16px+/400."
          }
        }
      }
    },
    "harmony": {
      "analogous-warm": {
        "$description": "Analogous +30 degrees from primary hue",
        "50":  { "$value": "oklch({L_50}  {C_50}  {SEED_H+30})", "$type": "color" },
        "100": { "$value": "oklch({L_100} {C_100} {SEED_H+30})", "$type": "color" },
        "200": { "$value": "oklch({L_200} {C_200} {SEED_H+30})", "$type": "color" },
        "300": { "$value": "oklch({L_300} {C_300} {SEED_H+30})", "$type": "color" },
        "400": { "$value": "oklch({L_400} {C_400} {SEED_H+30})", "$type": "color" },
        "500": { "$value": "oklch({L_500} {C_500} {SEED_H+30})", "$type": "color" },
        "600": { "$value": "oklch({L_600} {C_600} {SEED_H+30})", "$type": "color" },
        "700": { "$value": "oklch({L_700} {C_700} {SEED_H+30})", "$type": "color" },
        "800": { "$value": "oklch({L_800} {C_800} {SEED_H+30})", "$type": "color" },
        "900": { "$value": "oklch({L_900} {C_900} {SEED_H+30})", "$type": "color" },
        "950": { "$value": "oklch({L_950} {C_950} {SEED_H+30})", "$type": "color" }
      },
      "analogous-cool": {
        "$description": "Analogous -30 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H-30})", "$type": "color" }
      },
      "complementary": {
        "$description": "Complementary +180 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H+180})", "$type": "color" }
      },
      "split-warm": {
        "$description": "Split-complementary +150 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H+150})", "$type": "color" }
      },
      "split-cool": {
        "$description": "Split-complementary -150 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H-150})", "$type": "color" }
      },
      "triadic-a": {
        "$description": "Triadic +120 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H+120})", "$type": "color" }
      },
      "triadic-b": {
        "$description": "Triadic -120 degrees from primary hue",
        "500": { "$value": "oklch(0.55 0.18 {SEED_H-120})", "$type": "color" }
      }
    }
  },
  "typography": {
    "fontFamily": {
      "display": {
        "$value": ["system-ui", "-apple-system", "sans-serif"],
        "$type": "fontFamily",
        "$description": "Display/heading typeface. Classification: determined at generation time from pairing selection."
      },
      "body": {
        "$value": ["system-ui", "-apple-system", "sans-serif"],
        "$type": "fontFamily",
        "$description": "Body/UI typeface. Classification: determined at generation time from pairing selection."
      },
      "mono": { "$value": ["ui-monospace", "Cascadia Code", "monospace"], "$type": "fontFamily" }
    },
    "pairing": {
      "$type": "string",
      "$value": "system-default",
      "$description": "Type pairing rationale — see SYS-guide.md Type Pairings section for full classification contrast documentation."
    },
    "fontSize": {
      "xs":   { "$value": "0.694rem", "$type": "dimension" },
      "base": { "$value": "1rem",     "$type": "dimension" },
      "4xl":  { "$value": "2.488rem", "$type": "dimension" }
    },
    "fontWeight": {
      "normal":   { "$value": 400, "$type": "fontWeight" },
      "medium":   { "$value": 500, "$type": "fontWeight" },
      "semibold": { "$value": 600, "$type": "fontWeight" },
      "bold":     { "$value": 700, "$type": "fontWeight" }
    },
    "lineHeight": {
      "xs":   { "$value": 1.6,  "$type": "number" },
      "base": { "$value": 1.5,  "$type": "number" },
      "4xl":  { "$value": 1.25, "$type": "number" }
    },
    "letterSpacing": {
      "xs":   { "$value": "0.04em",   "$type": "dimension" },
      "base": { "$value": "0em",      "$type": "dimension" },
      "4xl":  { "$value": "-0.025em", "$type": "dimension" }
    }
  },
  "spacing": {
    "0":    { "$value": "0px",  "$type": "dimension" },
    "1":    { "$value": "4px",  "$type": "dimension" },
    "4":    { "$value": "16px", "$type": "dimension" },
    "semantic": {
      "component-gap": { "$value": "{spacing.4}",  "$type": "dimension", "$description": "Default density — 16px between components" },
      "section-gap":   { "$value": "{spacing.16}", "$type": "dimension", "$description": "Default density — 64px between sections" },
      "content-gap":   { "$value": "{spacing.8}",  "$type": "dimension", "$description": "Default density — 32px between content blocks" },
      "inline":        { "$value": "{spacing.2}",  "$type": "dimension", "$description": "Default density — 8px inline spacing" },
      "compact": {
        "$extensions": { "com.pde.condition": "density-compact" },
        "component-gap": { "$value": "{spacing.2}", "$type": "dimension" },
        "section-gap":   { "$value": "{spacing.8}", "$type": "dimension" },
        "content-gap":   { "$value": "{spacing.4}", "$type": "dimension" },
        "inline":        { "$value": "{spacing.1}", "$type": "dimension" }
      },
      "cozy": {
        "$extensions": { "com.pde.condition": "density-cozy" },
        "component-gap": { "$value": "{spacing.8}",  "$type": "dimension" },
        "section-gap":   { "$value": "{spacing.24}", "$type": "dimension" },
        "content-gap":   { "$value": "{spacing.12}", "$type": "dimension" },
        "inline":        { "$value": "{spacing.4}",  "$type": "dimension" }
      }
    }
  },
  "shadow": {
    "xs": { "$value": "0 1px 2px 0 oklch(0 0 0 / 0.05)", "$type": "shadow" },
    "sm": { "$value": "0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1)", "$type": "shadow" }
  },
  "border": {
    "radius": {
      "none": { "$value": "0",      "$type": "dimension" },
      "md":   { "$value": "0.375rem", "$type": "dimension" },
      "full": { "$value": "9999px", "$type": "dimension" }
    },
    "width": {
      "thin":    { "$value": "1px", "$type": "dimension" },
      "default": { "$value": "1px", "$type": "dimension" },
      "thick":   { "$value": "2px", "$type": "dimension" }
    },
    "style": {
      "default": { "$value": "solid", "$type": "strokeStyle" }
    }
  },
  "motion": {
    "$description": "Motion token system — duration scale, easing curves, delay choreography, spring physics",
    "duration": {
      "micro":    { "$type": "duration", "$value": { "value": 100, "unit": "ms" }, "$description": "State changes: button press, checkbox, toggle" },
      "fast":     { "$type": "duration", "$value": { "value": 200, "unit": "ms" }, "$description": "Hover transitions, small UI feedback" },
      "standard": { "$type": "duration", "$value": { "value": 300, "unit": "ms" }, "$description": "Modal open/close, drawer, tooltip" },
      "slow":     { "$type": "duration", "$value": { "value": 500, "unit": "ms" }, "$description": "Page transitions, hero entrance, complex reveals" },
      "dramatic": { "$type": "duration", "$value": { "value": 800, "unit": "ms" }, "$description": "Cinematic entrance, brand moments" }
    },
    "easing": {
      "standard": { "$type": "cubicBezier", "$value": [0.4, 0, 0.2, 1],   "$description": "Material standard — general UI transitions" },
      "enter":    { "$type": "cubicBezier", "$value": [0, 0, 0.2, 1],     "$description": "Deceleration — elements entering screen" },
      "exit":     { "$type": "cubicBezier", "$value": [0.4, 0, 1, 1],     "$description": "Acceleration — elements leaving screen" },
      "spring": {
        "$type": "cubicBezier",
        "$value": [0.34, 1.56, 0.64, 1],
        "$description": "Single-overshoot spring — universal browser support. Multi-bounce in $extensions.",
        "$extensions": {
          "pde.linearSpring": "linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%, 0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%, 1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%, 1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%, 1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1)",
          "pde.browserSupport": "88% (Chrome, Firefox, Safari, Edge since Dec 2023)"
        }
      }
    },
    "delay": {
      "none":       { "$type": "duration", "$value": { "value": 0,   "unit": "ms" }, "$description": "Immediate — no delay" },
      "stagger-sm": { "$type": "duration", "$value": { "value": 60,  "unit": "ms" }, "$description": "Card lists, nav items (3-5 items)" },
      "stagger-md": { "$type": "duration", "$value": { "value": 120, "unit": "ms" }, "$description": "Feature grids (5-8 items)" },
      "stagger-lg": { "$type": "duration", "$value": { "value": 200, "unit": "ms" }, "$description": "Section reveals, hero sequences" },
      "page":       { "$type": "duration", "$value": { "value": 300, "unit": "ms" }, "$description": "Route-change delay — content waits for transition" }
    },
    "transition": {
      "default": {
        "$type": "transition",
        "$value": {
          "duration": { "value": 300, "unit": "ms" },
          "delay": { "value": 0, "unit": "ms" },
          "timingFunction": [0.4, 0, 0.2, 1]
        },
        "$description": "Standard UI transition — modal, drawer, tooltip"
      },
      "hover": {
        "$type": "transition",
        "$value": {
          "duration": { "value": 200, "unit": "ms" },
          "delay": { "value": 0, "unit": "ms" },
          "timingFunction": [0.4, 0, 0.2, 1]
        },
        "$description": "Button/link hover state"
      },
      "spring-feedback": {
        "$type": "transition",
        "$value": {
          "duration": { "value": 200, "unit": "ms" },
          "delay": { "value": 0, "unit": "ms" },
          "timingFunction": [0.34, 1.56, 0.64, 1]
        },
        "$description": "Interactive element press feedback — spring overshoot"
      }
    }
  },
  "font": {
    "$description": "font.variable — variable font axis animation tokens for wght, wdth, opsz axes",
    "variable": {
      "weight": {
        "axis": {
          "$value": "wght",
          "$type": "string",
          "$description": "CSS: font-weight property. Maps directly — no font-variation-settings needed. Supported fonts: Inter, Roboto Flex, Source Sans 3, DM Sans."
        },
        "range": {
          "$value": { "min": 100, "max": 900 },
          "$type": "dimension",
          "$description": "Typical range for variable fonts with wght axis"
        },
        "resting": {
          "$value": 400,
          "$type": "number",
          "$description": "Default/resting weight for body text"
        },
        "animated": {
          "$value": 700,
          "$type": "number",
          "$description": "Hover/active weight — use with transition.fast + easing.spring"
        },
        "transition": {
          "$type": "transition",
          "$value": {
            "duration": { "value": 200, "unit": "ms" },
            "delay": { "value": 0, "unit": "ms" },
            "timingFunction": [0.34, 1.56, 0.64, 1]
          },
          "$description": "Spring easing for weight snap-to-bold feel"
        }
      },
      "width": {
        "axis": {
          "$value": "wdth",
          "$type": "string",
          "$description": "CSS: font-variation-settings 'wdth' <value>. Roboto Flex range: 25-151. Verify axis support at v-fonts.com."
        },
        "range": {
          "$value": { "min": 75, "max": 125 },
          "$type": "dimension",
          "$description": "Standard registered wdth axis range (CSS Fonts Level 4)"
        },
        "transition": {
          "$type": "transition",
          "$value": {
            "duration": { "value": 400, "unit": "ms" },
            "delay": { "value": 0, "unit": "ms" },
            "timingFunction": [0, 0, 0.2, 1]
          },
          "$description": "Deceleration easing — width feels physical, not snappy"
        }
      },
      "opticalSize": {
        "axis": {
          "$value": "opsz",
          "$type": "string",
          "$description": "CSS: font-optical-sizing: auto (preferred) or font-variation-settings 'opsz' <value>. Supported: Roboto Flex, Literata, Source Serif 4."
        },
        "ranges": {
          "caption": { "$value": { "min": 6,  "max": 12  }, "$type": "dimension", "$description": "Caption text — small label sizes" },
          "body":    { "$value": { "min": 12, "max": 24  }, "$type": "dimension", "$description": "Body text — standard reading sizes" },
          "display": { "$value": { "min": 24, "max": 144 }, "$type": "dimension", "$description": "Display text — headline and hero sizes" }
        },
        "transition": {
          "$type": "transition",
          "$value": {
            "duration": { "value": 300, "unit": "ms" },
            "delay": { "value": 0, "unit": "ms" },
            "timingFunction": [0.4, 0, 0.2, 1]
          },
          "$description": "Standard easing for optical size transitions"
        }
      }
    }
  },
  "component": {
    "_note": "Component tokens are expressed as CSS classes in SYS-components.css, not as DTCG leaf tokens. See SYS-components.css for .pde-btn, .pde-card, .pde-input definitions."
  }
}
```

Populate ALL values with the computed numbers from the generation steps above. Do not leave placeholder values in the final JSON.

---

### Step 5/7: Write output artifacts

Write all 12 artifacts using the Write tool. Paths are relative to `.planning/design/` unless otherwise noted.

Display after each file: `  -> Created: {path}`

---

**File 1: `visual/SYS-tokens.json`**

The complete DTCG JSON tree (canonical source). Write with 2-space indentation. Include ALL 7 categories with all computed values from Step 4.

---

**File 2: `visual/SYS-colors.css`**

Structure:
```css
/* SYS-colors.css — Color Tokens */
/* Generated by /pde:system | {ISO date} */

/* === Primitive Colors: Primary === */
:root {
  --color-primary-50: oklch({L} {C} {H});
  /* ... all 11 primary steps ... */
}

/* === Primitive Colors: Secondary === */
:root {
  --color-secondary-50: oklch({L} {C} {H});
  /* ... all 11 secondary steps ... */
}

/* === Primitive Colors: Neutral === */
:root {
  --color-neutral-50: oklch({L} {C} {H});
  /* ... all 11 neutral steps ... */
}

/* === Primitive Colors: Semantic Palettes === */
:root {
  --color-success-50: oklch({L} {C} 145);
  /* ... all steps for success, warning, error, info ... */
}

/* === Harmony Colors === */
:root {
  /* Analogous warm (H + 30) */
  --color-harmony-analogous-warm-50: oklch({L} {C} {H});
  --color-harmony-analogous-warm-100: oklch({L} {C} {H});
  --color-harmony-analogous-warm-200: oklch({L} {C} {H});
  --color-harmony-analogous-warm-300: oklch({L} {C} {H});
  --color-harmony-analogous-warm-400: oklch({L} {C} {H});
  --color-harmony-analogous-warm-500: oklch({L} {C} {H});
  --color-harmony-analogous-warm-600: oklch({L} {C} {H});
  --color-harmony-analogous-warm-700: oklch({L} {C} {H});
  --color-harmony-analogous-warm-800: oklch({L} {C} {H});
  --color-harmony-analogous-warm-900: oklch({L} {C} {H});
  --color-harmony-analogous-warm-950: oklch({L} {C} {H});
  /* Analogous cool (H - 30) */
  --color-harmony-analogous-cool-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
  /* Complementary (H + 180) */
  --color-harmony-complementary-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
  /* Split-complementary warm (H + 150) */
  --color-harmony-split-warm-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
  /* Split-complementary cool (H - 150) */
  --color-harmony-split-cool-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
  /* Triadic A (H + 120) */
  --color-harmony-triadic-a-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
  /* Triadic B (H - 120) */
  --color-harmony-triadic-b-50: oklch({L} {C} {H});
  /* ... all 11 steps ... */
}

/* Note: Generate full 11-step scale (50-950) for each harmony, identical to primary palette scale generation.
 * Use computed hue values: analogous-warm = (SEED_H + 30) % 360, analogous-cool = (SEED_H - 30 + 360) % 360,
 * complementary = (SEED_H + 180) % 360, split-warm = (SEED_H + 150) % 360, split-cool = (SEED_H - 150 + 360) % 360,
 * triadic-a = (SEED_H + 120) % 360, triadic-b = (SEED_H - 120 + 360) % 360.
 * Apply C_safe_max clamps from scale table. */

/* === Semantic Colors (Light Mode) === */
:root {
  --color-action: var(--color-primary-500);
  --color-action-hover: var(--color-primary-600);
  --color-bg-default: var(--color-neutral-50);
  --color-bg-surface: var(--color-neutral-100);
  --color-bg-elevated: #ffffff;
  --color-text-primary: var(--color-neutral-900);    /* |Lc| ~95 on white bg — meets APCA preferred for all sizes */
  --color-text-secondary: var(--color-neutral-600);  /* |Lc| ~68 on white bg — meets APCA min 60; use 16px+/400 or 14px+/700 */
  --color-text-muted: var(--color-neutral-400);      /* |Lc| ~45 on white bg — decorative/large text only (24px+). Below body text threshold. */
  --color-border: var(--color-neutral-200);
  --color-success: var(--color-success-500);
  --color-warning: var(--color-warning-500);
  --color-error: var(--color-error-500);
  --color-info: var(--color-info-500);
}

/* === Dark Mode === */
@media (prefers-color-scheme: dark) {
  :root {
    --color-action: var(--color-primary-400);
    --color-action-hover: var(--color-primary-300);
    --color-bg-default: var(--color-neutral-900);
    --color-bg-surface: var(--color-neutral-800);
    --color-bg-elevated: var(--color-neutral-700);
    --color-text-primary: var(--color-neutral-50);
    --color-text-secondary: var(--color-neutral-300);
    --color-text-muted: var(--color-neutral-500);
    --color-border: var(--color-neutral-700);
  }
}

[data-theme="dark"] {
  --color-action: var(--color-primary-400);
  --color-action-hover: var(--color-primary-300);
  --color-bg-default: var(--color-neutral-900);
  --color-bg-surface: var(--color-neutral-800);
  --color-bg-elevated: var(--color-neutral-700);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-300);
  --color-text-muted: var(--color-neutral-500);
  --color-border: var(--color-neutral-700);
}
```

---

**File 3: `visual/SYS-typography.css`**

```css
/* SYS-typography.css — Typography Tokens */
/* Generated by /pde:system | {ISO date} */

:root {
  /* Font families */
  --font-family-display: {computed display stack};
  --font-family-body: {computed body stack};
  --font-family-mono: {computed mono stack};

  /* Font sizes (modular scale: {SCALE_RATIO_NAME}, ratio {SCALE_RATIO}) */
  --font-size-xs:   {computed}rem;
  --font-size-sm:   {computed}rem;
  --font-size-base: 1rem;
  --font-size-lg:   {computed}rem;
  --font-size-xl:   {computed}rem;
  --font-size-2xl:  {computed}rem;
  --font-size-3xl:  {computed}rem;
  --font-size-4xl:  {computed}rem;

  /* Font weights */
  --font-weight-normal:   400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;

  /* Line heights */
  --line-height-xs:   1.6;
  --line-height-sm:   1.55;
  --line-height-base: 1.5;
  --line-height-lg:   1.45;
  --line-height-xl:   1.4;
  --line-height-2xl:  1.35;
  --line-height-3xl:  1.3;
  --line-height-4xl:  1.25;

  /* Letter spacing */
  --letter-spacing-xs:   0.04em;
  --letter-spacing-sm:   0.02em;
  --letter-spacing-base: 0em;
  --letter-spacing-lg:   -0.005em;
  --letter-spacing-xl:   -0.01em;
  --letter-spacing-2xl:  -0.015em;
  --letter-spacing-3xl:  -0.02em;
  --letter-spacing-4xl:  -0.025em;
}

/*
 * APCA Contrast Guidance — Type Scale
 * Background: --color-bg-default (oklch(0.97 0.005 {H}) ~ white)
 * Text: --color-text-primary (oklch(0.23 ... {H}) ~ near-black)
 *
 * Scale Step | Computed Size | Min Weight | |Lc| (primary text) | Threshold
 * text-4xl   | {computed}rem  | 300        | ~95                  | Preferred (min 45)
 * text-3xl   | {computed}rem  | 300        | ~95                  | Preferred (min 45)
 * text-2xl   | {computed}rem  | 400        | ~95                  | Preferred (min 75)
 * text-xl    | {computed}rem  | 400        | ~90                  | Preferred (min 75)
 * text-lg    | {computed}rem  | 400        | ~90                  | Preferred (min 75)
 * text-base  | 1rem (16px)    | 400        | ~90                  | Preferred (min 75)
 * text-sm    | {computed}rem  | 500        | ~85                  | Check weight (min 75)
 * text-xs    | {computed}rem  | 700        | ~85                  | Needs bold weight (min 75)
 *
 * For secondary text (--color-text-secondary, |Lc| ~68):
 * - Minimum size: 16px at weight 500, or 14px at weight 700
 * - NOT suitable for body text at weight 400 below 18px
 *
 * For muted text (--color-text-muted, |Lc| ~45):
 * - Minimum size: 24px at any weight (decorative/large text only)
 * - NOT suitable for informational text at any size
 *
 * Calculator: myndex.com/APCA
 * Algorithm: APCA 0.98G-4g (|Lc| absolute value notation per project convention)
 */
```

---

**File 4: `visual/SYS-spacing.css`**

```css
/* SYS-spacing.css — Spacing Tokens */
/* Generated by /pde:system | {ISO date} */

:root {
  --space-0:    0px;
  --space-px:   1px;
  --space-0_5:  2px;
  --space-1:    4px;
  --space-2:    8px;
  --space-3:    12px;
  --space-4:    16px;
  --space-5:    20px;
  --space-6:    24px;
  --space-8:    32px;
  --space-10:   40px;
  --space-12:   48px;
  --space-16:   64px;
  --space-20:   80px;
  --space-24:   96px;
}

/* === Semantic Spacing (Default Density) === */
:root {
  --spacing-component-gap: var(--space-4);
  --spacing-section-gap:   var(--space-16);
  --spacing-content-gap:   var(--space-8);
  --spacing-inline:        var(--space-2);
  --spacing-card-padding:  var(--space-6);
  --spacing-page-margin:   var(--space-8);
}

/* === Compact Density === */
[data-density="compact"] {
  --spacing-component-gap: var(--space-2);
  --spacing-section-gap:   var(--space-8);
  --spacing-content-gap:   var(--space-4);
  --spacing-inline:        var(--space-1);
  --spacing-card-padding:  var(--space-3);
  --spacing-page-margin:   var(--space-4);
}

/* === Cozy Density === */
[data-density="cozy"] {
  --spacing-component-gap: var(--space-8);
  --spacing-section-gap:   var(--space-24);
  --spacing-content-gap:   var(--space-12);
  --spacing-inline:        var(--space-4);
  --spacing-card-padding:  var(--space-10);
  --spacing-page-margin:   var(--space-16);
}
```

---

**File 5: `visual/SYS-shadows.css`**

```css
/* SYS-shadows.css — Shadow Tokens */
/* Generated by /pde:system | {ISO date} */

:root {
  --shadow-xs: 0 1px 2px 0 oklch(0 0 0 / 0.05);
  --shadow-sm: 0 1px 3px 0 oklch(0 0 0 / 0.1), 0 1px 2px -1px oklch(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1);
}
```

---

**File 6: `visual/SYS-borders.css`**

```css
/* SYS-borders.css — Border Tokens */
/* Generated by /pde:system | {ISO date} */

:root {
  /* Border radius */
  --radius-none: 0;
  --radius-sm:   0.125rem;
  --radius-md:   0.375rem;
  --radius-lg:   0.5rem;
  --radius-xl:   0.75rem;
  --radius-2xl:  1rem;
  --radius-full: 9999px;

  /* Border width */
  --border-width-thin:    1px;
  --border-width-default: 1px;
  --border-width-thick:   2px;

  /* Border style */
  --border-style-default: solid;
}
```

---

**File 7: `visual/SYS-motion.css`**

```css
/* SYS-motion.css — Motion Tokens */
/* Generated by /pde:system | {ISO date} */

:root {
  /* Duration scale (micro → dramatic) */
  --duration-micro:    100ms;
  --duration-fast:     200ms;
  --duration-standard: 300ms;
  --duration-slow:     500ms;
  --duration-dramatic: 800ms;

  /* Easing curves */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter:    cubic-bezier(0, 0, 0.2, 1);
  --ease-exit:     cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring-bounce: linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%, 0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%, 1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%, 1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%, 1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1);

  /* Delay / choreography tokens */
  --delay-none:       0ms;
  --delay-stagger-sm: 60ms;
  --delay-stagger-md: 120ms;
  --delay-stagger-lg: 200ms;
  --delay-page:       300ms;
}
```

---

**File 8: `visual/SYS-components.css`**

Write the complete component CSS from Step 4 component tokens section (.pde-btn and variants, .pde-card and parts, .pde-input/.pde-label/.pde-field/.pde-error, plus all .dark variants). Add file header comment.

---

**File 9: `visual/SYS-utilities.css`**

Write the complete utility CSS from Step 4 utility classes section (all spacing utilities for n=0,1,2,3,4,5,6,8, flex utilities, width utilities, gap utilities, display utilities, text utilities). Generate each class explicitly — do NOT use SCSS loops. Add file header comment.

---

**File 10: `assets/tokens.css`**

Generate by running the `tokens-to-css` CLI against the canonical DTCG source, then appending dark mode blocks manually.

**Step A: Generate base :root {} block via CLI:**

```bash
CSS=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-tokens.json" --raw)
if [[ "$CSS" == @file:* ]]; then CSS=$(cat "${CSS#@file:}"); fi
```

The `$CSS` variable now contains a complete `:root { ... }` block with all DTCG tokens converted to CSS custom properties.

**Step B: Write `assets/tokens.css` using Write tool:**

Compose the file with:
1. Header comment: `/* tokens.css — Unified Design Token File */` + `/* Generated by /pde:system | {ISO date} */` + `/* All tokens are inlined. No @import. Works as a standalone file:// stylesheet. */`
2. The `$CSS` content from Step A (the `:root { ... }` block)
3. Dark mode blocks (manual — `generateCssVars()` does NOT produce @media blocks):
   - `@media (prefers-color-scheme: dark) { :root { ... } }` block with dark color overrides
   - `[data-theme="dark"] { ... }` block with the same dark overrides (for manual toggle)

Write to `.planning/design/assets/tokens.css`.

**IMPORTANT:** The file MUST NOT use `@import`. It must work standalone when opened as a `file://` URL. Dark mode blocks are NOT generated by the CLI — they must be composed manually based on the color token values, inverting bg/text relationships.

---

**File 11: `visual/SYS-preview.html`**

Self-contained HTML preview page. Must be fully functional with no external dependencies.

Structure:
```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{PRODUCT_NAME} Design System Preview</title>
  <link rel="stylesheet" href="../assets/tokens.css">
  <style>
    /* Preview page chrome styles only -- not design tokens */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-family-body);
      background: var(--color-bg-default);
      color: var(--color-text-primary);
      padding: var(--space-8);
    }
    /* ... minimal layout styles for preview page ... */
  </style>
</head>
<body>
  <!-- HEADER with toggle -->
  <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-8);">
    <h1 style="font-size:var(--font-size-2xl); font-weight:var(--font-weight-bold);">{PRODUCT_NAME} Design System</h1>
    <button id="theme-toggle" class="pde-btn pde-btn--secondary" onclick="toggleTheme()">Toggle Dark Mode</button>
  </header>

  <!-- COLOR SWATCHES -->
  <section>
    <h2>Color Palette</h2>
    <!-- Primary palette: one swatch per step (50-950) showing oklch value -->
    <!-- Secondary palette swatches -->
    <!-- Neutral palette swatches -->
    <!-- Semantic palette swatches (success, warning, error, info) -->
    <!-- Semantic alias swatches (action, bg-default, bg-surface, text-primary, etc.) -->
  </section>

  <!-- TYPOGRAPHY SCALE -->
  <section>
    <h2>Typography Scale</h2>
    <!-- One row per size step: label + "The quick brown fox" text at that size -->
    <!-- Font family specimens -->
  </section>

  <!-- SPACING SCALE -->
  <section>
    <h2>Spacing Scale</h2>
    <!-- Visual bars showing each spacing value -->
  </section>

  <!-- SHADOW SCALE -->
  <section>
    <h2>Shadows</h2>
    <!-- Cards showing each elevation level -->
  </section>

  <!-- COMPONENT DEMOS -->
  <section>
    <h2>Components</h2>

    <!-- Buttons -->
    <div>
      <button class="pde-btn pde-btn--primary">Primary Action</button>
      <button class="pde-btn pde-btn--secondary">Secondary</button>
      <button class="pde-btn pde-btn--primary pde-btn--sm">Small</button>
      <button class="pde-btn pde-btn--primary pde-btn--lg">Large</button>
    </div>

    <!-- Card -->
    <div class="pde-card">
      <div class="pde-card__header">Card Header</div>
      <div class="pde-card__body">Card body content demonstrates the surface hierarchy.</div>
      <div class="pde-card__footer">
        <button class="pde-btn pde-btn--primary pde-btn--sm">Action</button>
      </div>
    </div>

    <!-- Input -->
    <div class="pde-field">
      <label class="pde-label" for="demo-input">Email address</label>
      <input class="pde-input" type="email" id="demo-input" placeholder="you@example.com">
      <span class="pde-error">Example error message</span>
    </div>
  </section>

  <script>
    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      document.getElementById('theme-toggle').textContent =
        next === 'dark' ? 'Switch to Light Mode' : 'Toggle Dark Mode';
    }
  </script>
</body>
</html>
```

Fill in all real token values in swatches and examples. The preview must display correctly in a browser by opening `.planning/design/visual/SYS-preview.html` directly (file:// URL).

---

**File 12: `visual/SYS-usage-guide.md`**

Use `templates/design-system.md` as the output structure. Replace all `{placeholder}` values with actual computed values:
- Fill frontmatter: Generated date, version v{N}, preset name or "custom", MCP list
- Fill Token Overview table with actual token counts per category
- Fill Brand Configuration table with actual computed values (primary oklch, secondary oklch, display font, body font, ratio name, base unit)
- Fill Usage Guide section with import paths correct for the project structure
- Fill Color Usage, Typography Usage, Component Usage examples with actual token names
- Fill Files Generated table with actual paths

Display: `Step 5/7: All 12 artifacts written.`

---

#### Step 5b: Experience token file (experience products only)

**If `PRODUCT_TYPE == "experience"`:**

Read the five experience brief sections from the loaded brief file:

- `VIBE_CONTRACT` — Emotional arc, peak timing, aesthetic register, energy level
- `VENUE_CONSTRAINTS` — Capacity, curfew, noise limits, fixed infrastructure
- `AUDIENCE_ARCHETYPE` — Crowd composition, mobility needs, group size, energy profile
- `PROMISE_STATEMENT` — One-sentence attendee summary
- `REPEATABILITY_INTENT` — One-off, recurring-series, or multi-day cadence

Generate `SYS-experience-tokens.json` as a DTCG-compliant JSON file with 6 top-level category keys:
`sonic`, `lighting`, `spatial`, `atmospheric`, `wayfinding`, `brand-coherence`.

Total token count across all 6 categories MUST NOT exceed 30 leaf nodes (30-token cap).

Each leaf node MUST have `$value`, `$type`, and `$description` fields per DTCG 2025.10.

If brief fields contain `[PROVIDE: ...]` placeholders, propagate them verbatim as the `$value` string.

**Token categories and fields:**

**sonic** (5 tokens — derive from Vibe Contract energy level + Venue Constraints fixed infrastructure):
- `bpm-range` (`$type`: string) — Target BPM corridor derived from vibe contract energy level
- `genre-primary` (`$type`: string) — Primary genre from vibe contract aesthetic register
- `volume-curve` (`$type`: string, values: gradual-ramp|drop-in|steady) — Volume progression
- `system-spec` (`$type`: string) — Minimum PA specification from venue fixed infrastructure
- `transition-strategy` (`$type`: string, values: beatmatch|silence|crossfade|live-segue) — DJ/act transition approach

**lighting** (5 tokens — derive from Vibe Contract aesthetic register + Venue Constraints fixed infrastructure):
- `zone-main-color` (`$type`: color, oklch) — Primary lighting hue for main floor
- `intensity-curve` (`$type`: string, values: slow-build|flash-on|dawn-ramp) — Lighting intensity progression
- `fixture-type-primary` (`$type`: string) — Primary fixture type from venue infrastructure
- `peak-color` (`$type`: color, oklch) — Peak moment lighting color
- `house-lights-protocol` (`$type`: string, values: full-off|safety-only|dim-wash) — House lights behavior

**spatial** (5 tokens — derive from Audience Archetype crowd composition + Venue Constraints capacity):
- `zone-count` (`$type`: number) — Number of distinct spatial zones
- `main-floor-mood` (`$type`: string) — Primary floor spatial character
- `density-target` (`$type`: number) — Target crowd density in people per sqm
- `sightlines` (`$type`: string) — Sightline quality descriptor
- `material-palette` (`$type`: string) — Primary material/surface palette

**atmospheric** (5 tokens — derive from Venue Constraints fixed infrastructure + Vibe Contract aesthetic register):
- `ventilation-type` (`$type`: string) — HVAC/ventilation approach
- `indoor-outdoor` (`$type`: string, values: indoor|outdoor|hybrid) — Venue indoor/outdoor classification
- `haze-level` (`$type`: string, values: none|light|heavy) — Atmospheric haze level
- `temperature-target` (`$type`: string) — Target ambient temperature range
- `air-movement` (`$type`: string) — Air circulation strategy

**wayfinding** (5 tokens — derive from Audience Archetype mobility needs + Venue Constraints capacity):
- `sign-hierarchy` (`$type`: string) — Signage hierarchy system description
- `arrow-standard` (`$type`: string) — Arrow/icon standard for directional signage
- `legibility-distance` (`$type`: string) — Required legibility distance for signs
- `outdoor-contrast` (`$type`: string, values: day-bright|night-lit|mixed) — Contrast requirement for outdoor signage
- `hierarchy-levels` (`$type`: number) — Number of wayfinding hierarchy levels

**brand-coherence** (5 tokens — derive from Promise Statement + Vibe Contract aesthetic register):
- `identity-thread` (`$type`: string) — Unifying visual/brand thread across all touchpoints
- `tone-of-voice` (`$type`: string) — Brand communication tone
- `sensory-signature` (`$type`: string) — Distinctive sensory brand element
- `collateral-sequence` (`$type`: string) — Collateral touchpoint sequence (e.g., flyer → wristband → signage → merch)
- `wristband-color` (`$type`: color, oklch) — Wristband accent color in oklch

Write to: `.planning/design/visual/SYS-experience-tokens.json`

Display: `  -> Created: visual/SYS-experience-tokens.json`

**Register in manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP code SYS-EXP
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP name "Experience Design Tokens"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP type experience-tokens
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP path ".planning/design/visual/SYS-experience-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-EXP status draft
```

**Generate CSS from experience token file:**

```bash
CSS_EXP=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-experience-tokens.json" --raw)
if [[ "$CSS_EXP" == @file:* ]]; then CSS_EXP=$(cat "${CSS_EXP#@file:}"); fi
```

Write `$CSS_EXP` output to `.planning/design/visual/SYS-experience-tokens.css`.

Display: `  -> Created: visual/SYS-experience-tokens.css`

**End experience token block.**

---

#### Step 5c: Brand token generation (business mode only)

BM=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessMode 2>/dev/null)
BT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-get-top-level businessTrack 2>/dev/null)

**IF `$BM == "true"`:** proceed to Steps 5c and 5d below before continuing to Step 6.

**ELSE (`$BM != "true"`):** Skip silently. Set BRAND_TOKENS_GENERATED=false. Set MKT_WRITTEN=false. Continue to Step 6.

---

Generate `SYS-brand-tokens.json` as a DTCG 2025.10 compliant JSON file with 1 top-level category key: `brand-marketing`. Two sub-groups: `brand-voice` (5 tokens) and `campaign-palette-variants` (4 tokens). Total: 9 leaf nodes.

Each leaf node MUST have `$value`, `$type`, and `$description` fields per DTCG 2025.10.

**DTCG structure:**

```json
{
  "brand-marketing": {
    "$description": "Marketing-specific brand tokens. Extends SYS-tokens.json without modifying core design system categories.",
    "brand-voice": {
      "tone-primary": {
        "$value": "[BRAND_VOICE_PRIMARY_DERIVED_FROM_UVP]",
        "$type": "string",
        "$description": "Primary tone descriptor derived from UVP and business thesis"
      },
      "tone-spectrum-warm": {
        "$value": "[WARM_END_OF_TONE_SPECTRUM]",
        "$type": "string",
        "$description": "Warm/approachable end of the tone of voice spectrum"
      },
      "tone-spectrum-authoritative": {
        "$value": "[AUTHORITATIVE_END_OF_TONE_SPECTRUM]",
        "$type": "string",
        "$description": "Authoritative/expert end of the tone of voice spectrum"
      },
      "positioning-statement": {
        "$value": "[POSITIONING_STATEMENT_FROM_MKT_ARTIFACT]",
        "$type": "string",
        "$description": "Reference to MKT artifact positioning statement — for downstream consumption by wireframe and pitch deck"
      },
      "audience-voice-descriptor": {
        "$value": "[HOW_AUDIENCE_TALKS_DERIVED_FROM_LEAN_CANVAS_CUSTOMER_SEGMENTS]",
        "$type": "string",
        "$description": "Language register of target audience — calibrates copy tone"
      }
    },
    "campaign-palette-variants": {
      "primary-campaign": {
        "$value": "{color.primitive.primary.500}",
        "$type": "color",
        "$description": "Primary campaign color — references core design system primary via token alias"
      },
      "accent-campaign": {
        "$value": "{color.harmony.analogous-warm.500}",
        "$type": "color",
        "$description": "Accent campaign color — warm harmony from design system"
      },
      "neutral-campaign": {
        "$value": "{color.primitive.neutral.100}",
        "$type": "color",
        "$description": "Campaign background neutral — light surface from design system"
      },
      "cta-campaign": {
        "$value": "{color.semantic.action}",
        "$type": "color",
        "$description": "Campaign CTA color — semantic action alias from design system"
      }
    }
  }
}
```

**CRITICAL:** Campaign palette variant `$value` fields use `{token.path}` alias syntax pointing into `SYS-tokens.json` categories — never raw oklch values. This ensures they inherit dark mode overrides and stay coherent with the core palette.

**CRITICAL:** Derive `brand-voice` token `$value` fields from the loaded brief's `## Domain Strategy` section (which contains brand positioning seeds from BRIEF-05). The `$value` strings above are STRUCTURAL PLACEHOLDERS — the agent fills them with content derived from the brief context at generation time.

Write to: `.planning/design/visual/SYS-brand-tokens.json`

Display: `  -> Created: visual/SYS-brand-tokens.json`

**Generate CSS custom properties from brand tokens:**

```bash
CSS_BRAND=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design tokens-to-css ".planning/design/visual/SYS-brand-tokens.json" --raw)
if [[ "$CSS_BRAND" == @file:* ]]; then CSS_BRAND=$(cat "${CSS_BRAND#@file:}"); fi
```

Write `$CSS_BRAND` to `.planning/design/visual/SYS-brand-tokens.css`

Display: `  -> Created: visual/SYS-brand-tokens.css`

**Register brand tokens in manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND code SYS-BRAND
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND name "Brand Marketing Tokens"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND type brand-tokens
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND path ".planning/design/visual/SYS-brand-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS-BRAND dependsOn '["SYS","BRF","BTH"]'
```

Set BRAND_TOKENS_GENERATED=true.

---

#### Step 5d: MKT brand system artifact (business mode only)

**IF `$BM == "true"` AND BRAND_TOKENS_GENERATED == true:**

Read the brief's `## Domain Strategy` section for brand positioning seeds (project name, category, audience descriptor, brand personality seeds). Also read BTH artifact sections (Problem, Solution, Market, Unfair Advantage) and LCV UVP box from the brief context loaded in Step 2.

Generate the MKT artifact at `.planning/design/strategy/MKT-brand-system-v{N}.md` using the template from `@references/launch-frameworks.md` `## Brand System` section.

The MKT artifact content follows this structure:

```markdown
---
artifact: MKT-brand-system
version: v{N}
Skill: /pde:system (MKT)
businessTrack: {$BT}
dependsOn: BRF, BTH, LCV
---

# Brand & Marketing System

*Generated by /pde:system (business mode) v{N} | {ISO date}*

## Positioning Statement

For [target customer from LCV Customer Segments], [product name from BRF] is the [category from BTH Market] that [primary benefit from BTH Solution] because [unique differentiator from BTH Unfair Advantage + LCV UVP].

## Tone of Voice Spectrum

| Dimension | Warm End | Authoritative End | Primary Position |
|-----------|----------|-------------------|-----------------|
| Formality | Conversational | Professional | [position derived from audience archetype] |
| Energy | Calm | Dynamic | [position derived from product category] |
| Expertise | Accessible | Expert | [position derived from businessTrack — solo_founder leans Accessible, product_leader leans Expert] |
| Personality | Playful | Serious | [position derived from brand personality seeds] |

**Primary tone descriptor:** [Single most important voice characteristic]
**Secondary tone descriptor:** [Supporting voice characteristic]
**Voice to avoid:** [Tone that would undermine brand positioning]

## Visual Differentiation Rationale

**Category visual conventions:** [What competitors in this space typically look like — derive from CMP competitive positioning matrix if available]
**Our differentiation:** [How visual choices deliberately depart from category conventions]
**Primary palette role:** [How the design system's primary color supports brand positioning]
**Typography personality:** [How typeface selection reinforces brand character]

## Brand Voice Examples

*Track-depth controlled: solo_founder = 2 examples, startup_team = 4 examples, product_leader = 6 examples*

| Context | Avoid | Prefer |
|---------|-------|--------|
| Headline | [generic category language] | [differentiating brand language] |
| CTA | [commodity phrasing] | [brand-specific action language] |

## Downstream References

- Landing page wireframe (Phase 89): Use Positioning Statement for hero headline framing, Tone of Voice for CTA and feature copy
- Pitch deck (Phase 89): Use Positioning Statement for solution slide, Visual Differentiation for competition slide

---
*Generated by /pde:system (MKT) v{N} | {ISO date}*
```

**Financial content check (mandatory):**

```bash
if grep -qE '\$[0-9]' ".planning/design/strategy/MKT-brand-system-v${N}.md" 2>/dev/null; then
  echo "ERROR: Dollar amount detected in MKT artifact. Use [YOUR_X] placeholders only."
  grep -nE '\$[0-9]' ".planning/design/strategy/MKT-brand-system-v${N}.md"
  exit 1
fi
```

Display: `  -> Created: strategy/MKT-brand-system-v{N}.md`

**Register MKT artifact in manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT code MKT
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT name "Brand Marketing System"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT type brand-system
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT domain strategy
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT path ".planning/design/strategy/MKT-brand-system-v${N}.md"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update MKT dependsOn '["BRF","BTH","LCV"]'
```

Set MKT_WRITTEN=true.

**ELSE:** Set MKT_WRITTEN=false. Skip silently.

---

### Step 6/7: Update visual domain DESIGN-STATE

Use the Glob tool to check if `.planning/design/visual/DESIGN-STATE.md` exists.

**If it does NOT exist:** Create it from `templates/design-state-domain.md`:
- Replace `{domain_name}` with `visual`
- Replace `{Domain}` with `Visual`
- Replace `{date}` with current ISO 8601 date
- Use the Write tool to create `.planning/design/visual/DESIGN-STATE.md`

**Add/update SYS artifact row in the Artifact Index table:**

If the file was just created: the Artifact Index table is empty (comment-only). Add the SYS row after the table header row.

If the file already exists (re-run scenario): use the Edit tool to update the existing SYS row's Version and Updated columns in place. If no SYS row exists yet, add one.

The SYS row format:
```
| SYS | Design System | /pde:system | draft | v{N} | {comma-separated MCP names used, or "none"} | -- | {YYYY-MM-DD} |
```

Display: `Step 6/7: Visual DESIGN-STATE.md updated with SYS artifact entry.`

---

### Step 7/7: Update root DESIGN-STATE and manifest

**Acquire write lock:**

```bash
LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-system)
if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
```

Parse `{"acquired": true/false}` from the result.

- If `"acquired": true`: proceed.
- If `"acquired": false`: wait 2 seconds (stale locks auto-clear after 60s TTL), then retry once:
  ```bash
  sleep 2
  LOCK=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-acquire pde-system)
  if [[ "$LOCK" == @file:* ]]; then LOCK=$(cat "${LOCK#@file:}"); fi
  ```
  If still `"acquired": false`:
  ```
  Error: Could not acquire write lock for root DESIGN-STATE.md.
    Another process may be writing to the design state.
    Wait a moment and retry /pde:system.
  ```
  Release lock anyway and halt.

**Update root `.planning/design/DESIGN-STATE.md`:**

Read the current root DESIGN-STATE.md, then apply these four updates using the Edit tool:

1. **Cross-Domain Dependency Map** — add SYS row if not already present:
   ```
   | SYS | visual | BRF | current |
   ```

2. **Quick Reference section** — add or update these rows:
   ```
   | Design System | v{N} |
   | Type Scale Ratio | {SCALE_RATIO_NAME} ({SCALE_RATIO}) |
   ```

3. **Decision Log** — append entry:
   ```
   | SYS | design system generated, {N} token categories | {YYYY-MM-DD} |
   ```

4. **Iteration History** — append entry:
   ```
   | SYS-tokens.json | v{N} | Created by /pde:system | {YYYY-MM-DD} |
   ```

**IF `MKT_WRITTEN == true`:**

Add MKT row to root DESIGN-STATE.md (inside the existing write lock window):

1. **Cross-Domain Dependency Map** — add MKT row:
   ```
   | MKT | strategy | BRF,BTH | current |
   ```

2. **Quick Reference section** — add row:
   ```
   | Brand System | v{N} |
   ```

3. **Decision Log** — append entry:
   ```
   | MKT | brand system generated, {businessTrack} track | {YYYY-MM-DD} |
   ```

4. **Iteration History** — append entry:
   ```
   | MKT-brand-system-v{N}.md | v{N} | Created by /pde:system | {YYYY-MM-DD} |
   ```

**ALWAYS release write lock, even if an error occurred during state update above:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design lock-release
```

**Update design manifest:**

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS code SYS
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS name "Design System"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS type design-system
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS path ".planning/design/visual/SYS-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS version {N}
```

**Set designCoverage flag (CRITICAL: preserve existing flags):**

First read current coverage state:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check
```

Parse the JSON output from coverage-check. Extract ALL twenty current flag values: `hasDesignSystem`, `hasWireframes`, `hasFlows`, `hasHardwareSpec`, `hasCritique`, `hasIterate`, `hasHandoff`, `hasIdeation`, `hasCompetitive`, `hasOpportunity`, `hasMockup`, `hasHigAudit`, `hasRecommendations`, `hasStitchWireframes`, `hasPrintCollateral`, `hasProductionBible`, `hasBusinessThesis`, `hasMarketLandscape`, `hasServiceBlueprint`, `hasLaunchKit`. Default any absent field to `false`. Merge `hasDesignSystem: true` while preserving all other nineteen values. Then write the full merged twenty-field object:

Then write the full merged object back:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage '{"hasDesignSystem":true,"hasWireframes":{current},"hasFlows":{current},"hasHardwareSpec":{current},"hasCritique":{current},"hasIterate":{current},"hasHandoff":{current},"hasIdeation":{current},"hasCompetitive":{current},"hasOpportunity":{current},"hasMockup":{current},"hasHigAudit":{current},"hasRecommendations":{current},"hasStitchWireframes":{current},"hasPrintCollateral":{current},"hasProductionBible":{current},"hasBusinessThesis":{current},"hasMarketLandscape":{current},"hasServiceBlueprint":{current},"hasLaunchKit":{current}}'
```

Use the actual values read from coverage-check — do not hardcode false for fields that may have been set by other skills. The key invariant: `manifest-set-top-level` performs FLAT key assignment, so `designCoverage` must be set as the FULL twenty-field JSON object every time. All 20 fields: hasDesignSystem, hasWireframes, hasFlows, hasHardwareSpec, hasCritique, hasIterate, hasHandoff, hasIdeation, hasCompetitive, hasOpportunity, hasMockup, hasHigAudit, hasRecommendations, hasStitchWireframes, hasPrintCollateral, hasProductionBible, hasBusinessThesis, hasMarketLandscape, hasServiceBlueprint, hasLaunchKit.

Display: `Step 7/7: Root DESIGN-STATE and manifest updated.`

---

### Pencil Token Sync (conditional — PEN-01)

After generating the design system, check if Pencil is connected and automatically push tokens to the Pencil canvas.

```bash
PENCIL_CHECK=$(node --input-type=module <<'EOF'
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const b = req(`${process.env.CLAUDE_PLUGIN_ROOT}/bin/lib/mcp-bridge.cjs`);
const conn = b.loadConnections();
const pen = conn.connections && conn.connections.pencil;
const status = pen && pen.status || 'not_configured';
process.stdout.write(JSON.stringify({ pencilConnected: status === 'connected' }));
EOF
)
```

Parse the JSON output. If `pencilConnected` is `true`:

Display: `Pencil is connected. Pushing design tokens to Pencil canvas...`

Follow @workflows/sync-pencil.md exactly. The sync-pencil workflow handles its own error recovery and degraded mode — if it fails, /pde:system continues to the Summary step normally.

If `pencilConnected` is `false`:

Display: `Pencil not connected — skipping token push. Run /pde:connect pencil to enable automatic Pencil sync.`

Continue to Summary step.

**Important:** This dispatch is non-blocking. If sync-pencil.md encounters any error, /pde:system must still display its Summary and complete normally. The Pencil sync is an enhancement, not a hard dependency.

---

## Summary

Display the final summary table (always the last output):

```
## Summary

| Property | Value |
|----------|-------|
| Files created | visual/SYS-tokens.json, visual/SYS-colors.css, visual/SYS-typography.css, visual/SYS-spacing.css, visual/SYS-shadows.css, visual/SYS-borders.css, visual/SYS-motion.css, visual/SYS-components.css, visual/SYS-utilities.css, assets/tokens.css, visual/SYS-preview.html, visual/SYS-usage-guide.md (12 files) |
| Files created (business mode) | visual/SYS-brand-tokens.json, visual/SYS-brand-tokens.css, strategy/MKT-brand-system-v{N}.md |
| Files modified | .planning/design/DESIGN-STATE.md, .planning/design/visual/DESIGN-STATE.md, .planning/design/design-manifest.json |
| Next suggested skill | /pde:wireframe or /pde:flows |
| Elapsed time | {duration} |
| Estimated tokens | ~{count} |
| MCP enhancements | {comma-separated list of MCPs actually used, or "none"} |
```

---

## Anti-Patterns (Guard Against)

- NEVER use `generateCssVars()` for dark mode blocks. `generateCssVars()` only wraps output in `:root {}`. Dark mode requires `@media (prefers-color-scheme: dark) { :root { ... } }` and `[data-theme="dark"] { ... }` — these MUST be written manually.
- NEVER use `@import` in `assets/tokens.css`. The unified tokens file must contain all declarations inline. `@import` breaks `file://` URL consumption (browser blocks cross-origin file:// imports).
- NEVER write semantic tokens with raw oklch values. Semantic tokens (--color-action, --color-bg-default, etc.) MUST use `var(--color-primitive-...)` aliases. Raw oklch values belong ONLY in primitive tokens.
- NEVER skip the write-lock for root DESIGN-STATE.md updates. Always call `design lock-acquire` before editing DESIGN-STATE.md and `design lock-release` after (even on error).
- NEVER skip creating `visual/DESIGN-STATE.md`. The wireframe skill reads this file to discover SYS artifacts. If it does not exist, wireframe will fail.
- NEVER use dot-notation with `manifest-set-top-level`. The function does FLAT key assignment only (sets `manifest[field] = value`). Pass the FULL JSON object for `designCoverage` — never try to set `designCoverage.hasDesignSystem` directly.
- ALWAYS release the write lock even if an error occurs during root DESIGN-STATE.md updates. The lock has a 60s TTL but releasing immediately prevents blocking other skills.
- ALWAYS include `$type` on EVERY DTCG leaf node. W3C 2025.10 requires leaf-level `$type`. Omitting it breaks token tooling and Style Dictionary transforms.
- NEVER set `hasBrief` in `designCoverage`. The brief completion flag `hasBrief` is managed by `/pde:brief`. Only set `hasDesignSystem: true` and preserve all other existing flags from `coverage-check` output.
- NEVER merge brand tokens into SYS-tokens.json. Write a separate SYS-brand-tokens.json file. The manifest-set-top-level command has no deep merge — writing a new root key into SYS-tokens.json risks corrupting all 7 existing categories.
- NEVER use raw oklch values in campaign-palette-variants tokens. Campaign palette tokens MUST use {token.path} alias syntax pointing into SYS-tokens.json (e.g., {color.primitive.primary.500}). Raw values drift out of sync when the core system is regenerated.
- NEVER use ELSE IF or ELSE branching between Step 5b (experience tokens) and Steps 5c/5d (business brand tokens). Both are independent conditional blocks — a business:experience composition must run BOTH.

</process>

<output>
- `.planning/design/visual/SYS-tokens.json` — DTCG canonical token source (all 7 categories)
- `.planning/design/visual/SYS-colors.css` — Color primitives + semantics + dark mode
- `.planning/design/visual/SYS-typography.css` — Type scale, font families, weights, line-heights, letter-spacing
- `.planning/design/visual/SYS-spacing.css` — Spacing scale (15 values, 4px base)
- `.planning/design/visual/SYS-shadows.css` — 5 elevation levels
- `.planning/design/visual/SYS-borders.css` — Radii, widths, style
- `.planning/design/visual/SYS-motion.css` — Duration and easing values
- `.planning/design/visual/SYS-components.css` — .pde-btn, .pde-card, .pde-input + dark variants
- `.planning/design/visual/SYS-utilities.css` — Spacing, flex, width, gap, display, text utilities
- `.planning/design/assets/tokens.css` — Full inline unified token file (no @import, file:// safe)
- `.planning/design/visual/SYS-preview.html` — Browser-viewable preview with light/dark toggle
- `.planning/design/visual/SYS-usage-guide.md` — Filled usage guide from templates/design-system.md
- `.planning/design/visual/DESIGN-STATE.md` — Visual domain state (created if absent, SYS row added)
- `.planning/design/DESIGN-STATE.md` — Root state updated (Cross-Domain Map, Quick Reference, Decision Log, Iteration History)
- `.planning/design/design-manifest.json` — Manifest updated with SYS artifact entry and designCoverage flag
- `.planning/design/visual/SYS-brand-tokens.json` — DTCG brand marketing token extension (business mode only)
- `.planning/design/visual/SYS-brand-tokens.css` — CSS custom properties from brand tokens (business mode only)
- `.planning/design/strategy/MKT-brand-system-v{N}.md` — Brand marketing system artifact (business mode only)
</output>
