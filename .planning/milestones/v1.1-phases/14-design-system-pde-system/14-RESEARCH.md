# Phase 14: Design System (/pde:system) - Research

**Researched:** 2026-03-15
**Domain:** Design token generation, DTCG format, CSS custom properties, skill workflow authoring
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Token scope:**
- All 7 token categories: color, typography, spacing, shadows, borders, motion, components
- Components include CSS utility classes (.pde-btn, .pde-card, .pde-input) for direct wireframe use
- Basic layout utility classes included (spacing utilities .mt-*, .p-*, flex helpers, width/gap classes)
- Motion tokens: duration and easing values only (--duration-fast, --easing-default), not full transition shorthands
- Shadow tokens: 5 elevation levels (xs, sm, md, lg, xl)
- Border tokens: radius + width + style (full border vocabulary, not radius-only)

**Preset system:**
- Default behavior: fully custom generation from brief context (no preset auto-applied)
- When brief lacks brand colors/fonts: generate algorithmically from product name or domain keywords
- Typography scale ratio: derived from brief context (data-dense -> Minor Third, marketing -> Perfect Fourth, reading -> Augmented Fourth)
- Optional --preset flag available as power user override (minimal|corporate|playful|editorial)
- Presets use the curated defaults from references/typography.md and references/color-systems.md

**Dark mode:**
- Both light and dark mode tokens generated in v1.1
- CSS implementation: both @media (prefers-color-scheme: dark) AND [data-theme="dark"] attribute selector
- DTCG JSON uses $extensions condition pattern: { "$extensions": { "com.pde.condition": "dark" } }
- Component CSS classes (.pde-btn, etc.) have explicit dark variants (.dark .pde-btn) rather than auto-adapting

**Output artifacts:**
- Per-category CSS files in visual/ (SYS-colors.css, SYS-typography.css, SYS-spacing.css, SYS-shadows.css, SYS-borders.css, SYS-motion.css, SYS-components.css, SYS-utilities.css)
- Unified assets/tokens.css aggregating all categories
- DTCG JSON canonical source: visual/SYS-tokens.json (single file with $extensions for dark mode)
- Browser-viewable preview: visual/SYS-preview.html with color swatches, type scale, spacing, component demos, light/dark toggle
- Markdown usage guide: visual/SYS-usage-guide.md with actual token values, import instructions, code examples
- Design manifest (design-manifest.json) updated with SYS artifact entry on completion
- DESIGN-STATE.md updated to mark system stage complete

### Claude's Discretion
- Exact component class API beyond .pde-btn, .pde-card, .pde-input (which specific components to include)
- Specific utility class naming convention (Tailwind-like vs BEM vs custom)
- OKLCH gamut clamping implementation details
- Preview HTML layout and styling
- How to derive hue algorithmically from product name/domain keywords when no brand colors specified

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYS-01 | /pde:system generates DTCG JSON tokens as canonical source (W3C 2025.10 format) | DTCG format fully documented in references/color-systems.md and references/typography.md. dtcgToCssLines() in design.cjs already validates $value/$type node shape. Workflow must produce valid DTCG JSON with all 7 token categories. |
| SYS-02 | CSS custom properties derived from DTCG tokens for wireframe consumption | design.cjs:generateCssVars() + dtcgToCssLines() already implement this conversion. assets/tokens.css is the unified output file that wireframes `<link>`. Per-category files in visual/ are the source. |
| SYS-03 | Typography scale, color palette, and spacing tokens generated | Covered by references/color-systems.md (OKLCH palette algorithm), references/typography.md (modular scale + derivation formulas). All three token categories are mandatory parts of the 7-category scope. |
</phase_requirements>

---

## Summary

Phase 14 implements the `/pde:system` skill — the design token generator that all downstream pipeline skills (wireframe, critique, handoff) depend on. The skill reads the product brief, generates a canonical DTCG 2025.10 JSON file covering 7 token categories, derives CSS custom properties from that JSON, and writes 12 output artifacts to `.planning/design/visual/` and `assets/`.

The infrastructure required for this skill is already complete from Phase 12: `design.cjs` provides `dtcgToCssLines()`, `generateCssVars()`, `updateManifestArtifact()`, write-lock, and all manifest operations. The token generation algorithms are fully specified in `references/color-systems.md` (OKLCH palette science) and `references/typography.md` (modular scale math). The output template structure is defined in `templates/design-system.md`. The workflow pattern to follow is `workflows/brief.md` (7-step structure with MCP probe, write-lock, domain DESIGN-STATE, manifest update).

**Primary recommendation:** Author `workflows/system.md` as a 7-step workflow mirroring the brief workflow pattern, replace the stub `commands/system.md` with the full skill definition, and generate all 12 output artifacts using the existing infrastructure — no new Node.js library code is needed.

---

## Standard Stack

### Core (all zero-dependency, Node.js builtins only)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bin/lib/design.cjs` | Phase 12 | DTCG-to-CSS conversion, manifest CRUD, write-lock | Built in Phase 12; fully tested. `dtcgToCssLines()` and `generateCssVars()` handle the entire JSON→CSS transform. |
| `bin/pde-tools.cjs` | Current | CLI router: `design tokens-to-css`, `design manifest-update`, `design lock-acquire/release` | All design operations already routed through this entry point |
| `references/color-systems.md` | 1.0.0 | OKLCH palette algorithm, semantic mappings, dark mode strategy | Canonical color science reference loaded by the skill at runtime |
| `references/typography.md` | 1.0.0 | Modular scale algorithm, font pairing rules, DTCG typography token format | Canonical typography reference loaded by the skill at runtime |
| `templates/design-system.md` | Current | Output structure template for SYS-usage-guide.md | Defines required sections and examples |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sequential Thinking MCP | n/a | Deeper palette reasoning when brief context is ambiguous | Available when `SEQUENTIAL_THINKING_AVAILABLE = true`; graceful fallback if absent |
| `design.cjs:ensureDesignDirs()` | Phase 12 | Create `.planning/design/` directory tree on first run | Step 1 of every design skill (idempotent) |
| `design.cjs:cmdManifestSetTopLevel()` | Phase 13.2 | Set `designCoverage.hasDesignSystem = true` | After successful SYS artifact registration |

### No Alternatives

The "zero npm dependencies" decision from Phase 12 is locked. All token math (OKLCH scale generation, modular scale arithmetic) must be implemented inline in the workflow using Claude's own computation. There is no `style-dictionary`, `theo`, or `token-transformer` dependency. The DTCG JSON is constructed by Claude as a literal object, not through a library.

---

## Architecture Patterns

### Recommended Project Structure (outputs)

```
.planning/design/
├── visual/
│   ├── SYS-tokens.json          # DTCG canonical source (all 7 categories + dark $extensions)
│   ├── SYS-colors.css           # Color primitives + semantic custom props
│   ├── SYS-typography.css       # Font families, sizes, weights, leading, tracking
│   ├── SYS-spacing.css          # Space scale custom props
│   ├── SYS-shadows.css          # 5 elevation levels
│   ├── SYS-borders.css          # Radius + width + style
│   ├── SYS-motion.css           # Duration + easing
│   ├── SYS-components.css       # .pde-btn, .pde-card, .pde-input + dark variants
│   ├── SYS-utilities.css        # .mt-*, .p-*, flex helpers, width/gap
│   ├── SYS-preview.html         # Visual preview with light/dark toggle
│   └── SYS-usage-guide.md       # Usage guide (from templates/design-system.md)
├── assets/
│   └── tokens.css               # Unified: @import all SYS-*.css files
└── DESIGN-STATE.md              # Updated: system stage marked complete
```

### Workflow File Location

```
workflows/system.md              # Full skill logic (replaces stub)
commands/system.md               # Minimal: frontmatter + reference to workflow
```

### Pattern 1: 7-Step Workflow Structure (mirrors brief.md)

**What:** Every design skill uses the same 7-step skeleton. `system.md` must follow it exactly.

**Steps:**

```
Step 1/7: Initialize design directories    (ensureDesignDirs, idempotent)
Step 2/7: Check prerequisites              (read brief, detect product type/context)
Step 3/7: Probe MCP                        (Sequential Thinking availability)
Step 4/7: Generate token data              (OKLCH palettes, type scale, spacing, etc.)
Step 5/7: Write output artifacts           (JSON, per-category CSS, preview HTML, usage guide)
Step 6/7: Update visual domain DESIGN-STATE
Step 7/7: Update root DESIGN-STATE + manifest (write-lock, release, coverage flag)
```

**When to use:** Always — this is the canonical PDE skill structure.

### Pattern 2: DTCG JSON Construction

**What:** Build the token tree as a plain JS/JSON object with `$value`/`$type` leaves. Nested groups produce hyphenated CSS variable names via `dtcgToCssLines()`.

**DTCG node shapes:**

```javascript
// Leaf token (has $value)
{ "$value": "oklch(0.55 0.18 250)", "$type": "color", "$description": "Primary blue" }

// Group (no $value — recursed into with hyphen prefix)
{
  "color": {
    "$type": "color",
    "primitive": {
      "blue": {
        "500": { "$value": "oklch(0.55 0.18 250)", "$type": "color" }
      }
    }
  }
}
// Produces: --color-primitive-blue-500: oklch(0.55 0.18 250);
```

**Dark mode extension pattern (decided in CONTEXT.md):**

```json
{
  "color": {
    "semantic": {
      "$extensions": { "com.pde.condition": "dark" },
      "bg": {
        "default": { "$value": "{color.primitive.neutral.900}", "$type": "color" }
      }
    }
  }
}
```

**Dark mode CSS output (decided in CONTEXT.md):**

```css
/* Light mode in :root (default) */
:root {
  --color-bg-default: var(--color-neutral-50);
}

/* Dark mode via media query */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-default: var(--color-neutral-900);
  }
}

/* Dark mode via data attribute (explicit toggle) */
[data-theme="dark"] {
  --color-bg-default: var(--color-neutral-900);
}

/* Component dark variants (explicit, not auto-adapting) */
.dark .pde-btn--primary { ... }
```

**Important:** `dtcgToCssLines()` outputs plain lines. The workflow must write the `:root {}` wrapper, dark mode media query blocks, and `[data-theme="dark"]` blocks manually — these are NOT handled by `generateCssVars()` (which only wraps a flat token set in `:root {}`).

### Pattern 3: OKLCH Palette Generation (from references/color-systems.md)

**What:** Generate an 11-step scale (50–950) from a seed color. Hue stays fixed; Lightness and Chroma vary per the scale table.

```
Scale table (L fixed, C = seed_chroma * multiplier):
  50:  L=0.97, C×0.08    100: L=0.93, C×0.18    200: L=0.87, C×0.32
  300: L=0.77, C×0.55    400: L=0.67, C×0.80    500: L=0.55, C×1.00 (seed)
  600: L=0.47, C×0.90    700: L=0.39, C×0.75    800: L=0.31, C×0.55
  900: L=0.23, C×0.35    950: L=0.15, C×0.20
```

**Neutral palette:** Same algorithm with C=0.005–0.015, H = brand primary hue.

**Semantic palette hues:** Success ~H145, Warning ~H85, Error ~H25, Info ~H250.

**Algorithmic hue from product context (Claude's Discretion):**
- No brand color in brief → derive seed hue from product name/domain keywords
- The derivation method is at implementor's discretion (simple hash, keyword→hue map, etc.)

### Pattern 4: Modular Type Scale (from references/typography.md)

```
size = 1rem × ratio^n   (where ratio chosen from brief context)

Brief context → ratio mapping:
  data-dense → Minor Third (1.200)
  marketing  → Perfect Fourth (1.333)
  reading    → Augmented Fourth (1.414)
  default    → Minor Third (1.200)

Scale steps n: xs=-2, sm=-1, base=0, lg=1, xl=2, 2xl=3, 3xl=4, 4xl=5
Line-height:   lineHeight = max(1.1, 1.6 - (step_index × 0.05))
Letter-spacing: xs=+0.04em, sm=+0.02em, base=0, lg=-0.005em, ..., 4xl=-0.025em
```

### Pattern 5: CSS Token File Assembly

**What:** Write per-category CSS files first; then assemble `assets/tokens.css` by concatenating or `@import`-ing them.

**Preferred approach:** Write all category files independently, then write `assets/tokens.css` containing all the raw CSS custom property declarations (not `@import`) so it works as a single standalone file for wireframes. The per-category files remain as developer-facing modular sources.

**Structure of a per-category CSS file:**

```css
/* SYS-colors.css — Color Tokens */
/* Generated by /pde:system | {date} */

/* === Primitive Colors === */
:root {
  --color-primary-50: oklch(0.97 0.014 250);
  /* ... all primitive steps ... */
}

/* === Semantic Colors (Light Mode) === */
:root {
  --color-action: var(--color-primary-500);
  /* ... */
}

/* === Dark Mode === */
@media (prefers-color-scheme: dark) {
  :root { --color-action: var(--color-primary-400); }
}
[data-theme="dark"] {
  --color-action: var(--color-primary-400);
}
```

### Pattern 6: Brief Context Reading

**What:** The skill reads the brief to extract product context for token generation. The brief lives at `.planning/design/strategy/BRF-brief-v*.md`.

**What to extract:**
- Product type (software/hardware/hybrid)
- Product name and domain (for algorithmic hue derivation)
- Brand colors if specified (primary hex/rgb/oklch)
- Typography preferences if specified
- Product character (data-dense / marketing / reading) for type scale ratio

**Soft dependency:** If no brief exists, warn and fall back to the --preset flag value or the SaaS defaults from `references/color-systems.md`.

### Anti-Patterns to Avoid

- **Writing tokens.css without the per-category files:** Downstream tooling (future HIG skill) expects per-category files in `visual/`. Always write both.
- **Using generateCssVars() for dark mode:** `generateCssVars()` only outputs `:root {}`. Dark mode blocks require manually assembled CSS strings — do not force the DTCG dark tree through `generateCssVars()`.
- **Skipping write-lock for root DESIGN-STATE:** The brief.md workflow demonstrates the correct lock-acquire → update → lock-release pattern. `system.md` MUST follow the same pattern.
- **Semantic tokens with raw oklch values instead of aliases:** Semantic tokens like `--color-action` MUST reference primitive tokens (`var(--color-primary-500)`), not hardcoded oklch values. This enables theme swapping.
- **Single SYS-tokens.json file without per-category CSS:** The canonical JSON source is SYS-tokens.json but wireframes consume `assets/tokens.css`. Both must be generated.
- **Forgetting to set `designCoverage.hasDesignSystem = true`:** Phase 20 (build orchestrator) reads this flag. Use `manifest-set-top-level` after registering the SYS artifact.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON → CSS custom properties conversion | Custom recursive tree walker | `design.cjs:dtcgToCssLines()` | Already implemented and tested in Phase 12. Handles nested groups with hyphenated prefix exactly as needed. |
| Write-lock acquisition/release | Custom file locking | `design.cjs:acquireWriteLock()` / `releaseWriteLock()` | 60s TTL, stale lock clearing, already integrated with DESIGN-STATE.md table format |
| Manifest artifact registration | Custom manifest writes | `pde-tools.cjs design manifest-update` + `manifest-set-top-level` | Tested CRUD wrappers. `updateManifestArtifact()` uses merge semantics (Object.assign) |
| Design directory creation | `fs.mkdirSync` calls | `pde-tools.cjs design ensure-dirs` | Idempotent, initializes DESIGN-STATE.md and manifest from templates |
| OKLCH palette math | Ad-hoc color computation | The scale table in `references/color-systems.md` | Curated lightness/chroma values already validated for visual consistency |
| Modular type scale | Manual `Math.pow()` calls | The formula and scale steps in `references/typography.md` | Rounded values already computed in the reference; line-height and letter-spacing derivations included |

**Key insight:** Phase 12 was explicitly designed so Phase 14 has no infrastructure work. The only new code this phase writes is: the workflow file, the command file, and the generated design artifact files (JSON, CSS, HTML, Markdown).

---

## Common Pitfalls

### Pitfall 1: dtcgToCssLines() Skips $extensions

**What goes wrong:** The `$extensions` key on a DTCG group starts with `$`, so `dtcgToCssLines()` skips it entirely. Dark mode tokens stored as a sibling group with `$extensions: { "com.pde.condition": "dark" }` will NOT be emitted by the standard converter.

**Why it happens:** The converter is designed for light mode `:root {}` output. Dark mode requires a second pass with different CSS wrapper (media query + attribute selector).

**How to avoid:** Process the DTCG JSON in two passes:
1. First pass: extract light mode tokens (nodes WITHOUT `$extensions.com.pde.condition === "dark"`) → wrap in `:root {}`
2. Second pass: extract dark mode tokens (nodes WITH the dark condition) → wrap in `@media (prefers-color-scheme: dark) { :root { ... } }` AND `[data-theme="dark"] { ... }`

**Warning signs:** Color tokens file has no `@media (prefers-color-scheme: dark)` block after generation.

### Pitfall 2: OKLCH Chroma Clamping at Extremes

**What goes wrong:** At very light (L > 0.90) or very dark (L < 0.20) values, high-chroma OKLCH values exceed the sRGB gamut. CSS browsers perform gamut mapping but the clamped colors may look different from expected.

**Why it happens:** The palette scale has low chroma multipliers at steps 50 and 950 (0.08 and 0.20) specifically to stay in gamut, but if the seed color has an unusually high base chroma (C > 0.25), even the multiplied extremes can go out of gamut.

**How to avoid:** Cap computed chroma for each step: `C_step = min(C_input × multiplier, C_safe_max)` where `C_safe_max` at L>0.90 is ~0.05 and at L<0.20 is ~0.04. For mid-range steps, `C_safe_max ≈ 0.25` is adequate.

**Warning signs:** Palette steps 50 and 950 look unexpectedly vivid when compared to step 100/900.

### Pitfall 3: Missing Visual Domain DESIGN-STATE.md

**What goes wrong:** If `visual/DESIGN-STATE.md` doesn't exist when the skill writes SYS artifacts, the artifact index table for the visual domain is never created. The `/pde:wireframe` skill (Phase 16) reads the visual DESIGN-STATE to discover available design system versions.

**Why it happens:** `ensureDesignDirs()` creates the `visual/` directory but NOT `visual/DESIGN-STATE.md`. Domain DESIGN-STATE files are created on demand by each skill (see the brief.md Step 6 pattern).

**How to avoid:** Step 6 of the system workflow must check for `visual/DESIGN-STATE.md` and create it from `templates/design-state-domain.md` if absent — mirroring exactly how `brief.md` creates `strategy/DESIGN-STATE.md`.

**Warning signs:** No `visual/DESIGN-STATE.md` after skill completes; `/pde:wireframe` can't discover the design system.

### Pitfall 4: assets/tokens.css Not Consumable Standalone

**What goes wrong:** If `assets/tokens.css` uses `@import` references to the per-category files in `visual/`, it only works when the file is served from a web server with the correct relative path. Wireframes that open as `file://` will see broken `@import` paths.

**Why it happens:** The `visual/` and `assets/` directories have different relative positions in the filesystem.

**How to avoid:** Write `assets/tokens.css` as a FULL inline copy of all CSS custom property declarations — no `@import`. The per-category files in `visual/` remain as modular sources; `assets/tokens.css` is a consolidated copy. Comment headers can indicate which category each block came from.

**Warning signs:** Wireframes open without styling when loaded as local `file://` URLs.

### Pitfall 5: Token Naming Inconsistency Between JSON and CSS

**What goes wrong:** DTCG JSON uses dot-path keys (e.g., `color.primitive.blue.500`). CSS custom properties use hyphen-separated names (e.g., `--color-primitive-blue-500`). If any workflow step constructs CSS variable names manually (e.g., in semantic alias tokens), they must match exactly what `dtcgToCssLines()` would produce for the referenced primitive.

**Why it happens:** Semantic tokens reference primitives with `var(--color-primitive-blue-500)` in the CSS output. If the CSS property name doesn't match what the primitive produces, the `var()` reference resolves to empty.

**How to avoid:** Always derive semantic CSS from the primitive CSS names mechanically: replace dots with hyphens in the DTCG path. Do not hardcode CSS variable names.

**Warning signs:** Color swatches on SYS-preview.html show fallback/transparent colors.

### Pitfall 6: Forgetting --preset Flag Logic

**What goes wrong:** The workflow needs to handle three input paths: (a) brief exists with brand data, (b) brief exists without brand data, (c) --preset flag provided. Implementing path (a) and forgetting paths (b) and (c) produces a workflow that silently generates wrong tokens when the brief lacks colors.

**Why it happens:** The `references/color-systems.md` product-type fallback palettes cover path (b) and the preset flag covers path (c), but they require explicit branching logic in the workflow.

**How to avoid:** Step 2 (prerequisites check) must explicitly determine which input path is active and record it so Step 4 uses the correct generation strategy.

---

## Code Examples

Verified patterns from existing codebase and reference documentation:

### Calling dtcgToCssLines() for Light Mode Tokens

```javascript
// Source: bin/lib/design.cjs (Phase 12)
const { dtcgToCssLines, generateCssVars } = require('./design.cjs');

// Build DTCG token tree
const colorTokens = {
  color: {
    primitive: {
      primary: {
        "500": { $value: "oklch(0.55 0.18 250)", $type: "color" }
      }
    },
    semantic: {
      action: { $value: "{color.primitive.primary.500}", $type: "color" }
    }
  }
};

// Generate light-mode CSS
const lightCss = generateCssVars(colorTokens);
// Produces:
// :root {
//   --color-primitive-primary-500: oklch(0.55 0.18 250);
//   --color-semantic-action: {color.primitive.primary.500};
// }
```

### Dark Mode CSS Block Construction

```javascript
// Manual construction — dtcgToCssLines() is called on dark-mode-only token subtree
// then wrapped in the appropriate CSS blocks

const darkSemanticTokens = {
  action: { $value: "var(--color-primary-400)", $type: "color" },
  "bg-default": { $value: "var(--color-neutral-900)", $type: "color" }
};

const darkLines = dtcgToCssLines(darkSemanticTokens, "color-");
// darkLines = ["  --color-action: var(--color-primary-400);", ...]

const darkCss = [
  "@media (prefers-color-scheme: dark) {",
  "  :root {",
  ...darkLines.map(l => "  " + l),
  "  }",
  "}",
  "[data-theme=\"dark\"] {",
  ...darkLines,
  "}"
].join("\n");
```

### CLI Pattern for Manifest Registration (mirrors brief.md Step 7)

```bash
# Register SYS artifact (mirrors BRF pattern from workflows/brief.md)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS code SYS
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS name "Design System"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS type design-system
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS domain visual
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS path ".planning/design/visual/SYS-tokens.json"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update SYS version 1

# Set coverage flag
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage.hasDesignSystem true
```

**Note:** `manifest-set-top-level` was added in Phase 13.2 with signature `(cwd, field, value, raw)`. The field can use dot notation for nested objects (e.g., `designCoverage.hasDesignSystem`). Verify this works with the current implementation before using — the existing cmdManifestSetTopLevel in design.cjs sets a top-level field directly: `manifest[field] = value`. Dot notation may require nested key handling.

### OKLCH Scale Generation (Inline Computation)

```javascript
// Source: references/color-systems.md — scale table implementation
function generateOklchScale(seedL, seedC, seedH) {
  const steps = [
    { name: "50",  L: 0.97, mult: 0.08 },
    { name: "100", L: 0.93, mult: 0.18 },
    { name: "200", L: 0.87, mult: 0.32 },
    { name: "300", L: 0.77, mult: 0.55 },
    { name: "400", L: 0.67, mult: 0.80 },
    { name: "500", L: 0.55, mult: 1.00 },
    { name: "600", L: 0.47, mult: 0.90 },
    { name: "700", L: 0.39, mult: 0.75 },
    { name: "800", L: 0.31, mult: 0.55 },
    { name: "900", L: 0.23, mult: 0.35 },
    { name: "950", L: 0.15, mult: 0.20 },
  ];
  const result = {};
  for (const step of steps) {
    const C = Math.min(seedC * step.mult, 0.25); // gamut clamp
    result[step.name] = {
      $value: `oklch(${step.L} ${C.toFixed(3)} ${seedH})`,
      $type: "color"
    };
  }
  return result;
}
```

### Modular Scale Generation (Inline Computation)

```javascript
// Source: references/typography.md — scale formula
function generateTypeScale(ratio) {
  const steps = [
    { name: "xs",   n: -2, lineStep: 0 },
    { name: "sm",   n: -1, lineStep: 1 },
    { name: "base", n:  0, lineStep: 2 },
    { name: "lg",   n:  1, lineStep: 3 },
    { name: "xl",   n:  2, lineStep: 4 },
    { name: "2xl",  n:  3, lineStep: 5 },
    { name: "3xl",  n:  4, lineStep: 6 },
    { name: "4xl",  n:  5, lineStep: 7 },
  ];
  const result = {};
  for (const step of steps) {
    const size = Math.round(Math.pow(ratio, step.n) * 1000) / 1000;
    const lineHeight = Math.max(1.1, 1.6 - step.lineStep * 0.05);
    result[step.name] = {
      fontSize: { $value: `${size}rem`, $type: "dimension" },
      lineHeight: { $value: String(lineHeight.toFixed(2)), $type: "number" }
    };
  }
  return result;
}
```

### Spacing Scale Token Structure

```javascript
// Standard T-shirt spacing scale using 4px base unit
// Source: CONTEXT.md decisions (spacing tokens required)
const spacingTokens = {
  spacing: {
    "0":  { $value: "0px",    $type: "dimension" },
    "px": { $value: "1px",    $type: "dimension" },
    "0.5":{ $value: "2px",    $type: "dimension" },
    "1":  { $value: "4px",    $type: "dimension" },
    "2":  { $value: "8px",    $type: "dimension" },
    "3":  { $value: "12px",   $type: "dimension" },
    "4":  { $value: "16px",   $type: "dimension" },
    "5":  { $value: "20px",   $type: "dimension" },
    "6":  { $value: "24px",   $type: "dimension" },
    "8":  { $value: "32px",   $type: "dimension" },
    "10": { $value: "40px",   $type: "dimension" },
    "12": { $value: "48px",   $type: "dimension" },
    "16": { $value: "64px",   $type: "dimension" },
    "20": { $value: "80px",   $type: "dimension" },
    "24": { $value: "96px",   $type: "dimension" },
  }
};
// Produces: --spacing-0: 0px; --spacing-1: 4px; --spacing-4: 16px; etc.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HSL color spaces for palette generation | OKLCH (perceptually uniform) | 2023 (Chrome/Firefox 111+/113+) | Algorithmically generated palettes look visually consistent across hues |
| Style Dictionary / Theo for token transforms | Custom `dtcgToCssLines()` (zero-dep) | Phase 12 decision | No npm dependency; fully controlled; fits zero-dep constraint |
| W3C DTCG "community group draft" format | W3C DTCG 2025.10 (`$value`/`$type` per leaf) | 2024-2025 | Leaf-level `$type` is required by 2025.10 spec (not just group-level) |
| Dark mode via lightness inversion | Semantic token remapping (primitive stays same, only semantic aliases change) | Material Design v3+ standard | More control, predictable results, avoids washed-out colors |
| `@import` in aggregated CSS file | Full inline copy in `assets/tokens.css` | Phase 14 decision | Works as `file://` — no CORS/import restrictions for wireframes |

**Deprecated/outdated:**
- DTCG group-level `$type` (putting `$type` on a group node, not each leaf): The 2025.10 spec moved to leaf-level `$type`. `dtcgToCssLines()` already expects leaf-level shape (`'$value' in node`), which aligns with 2025.10.
- `@import` in aggregated token CSS: Breaks local file:// consumption. Use inline copy.

---

## Open Questions

1. **`manifest-set-top-level` with nested dot-notation fields**
   - What we know: `cmdManifestSetTopLevel(cwd, field, value, raw)` does `manifest[field] = value` — flat key only
   - What's unclear: `designCoverage.hasDesignSystem` needs setting. Does the current implementation handle dot-notation paths or does it need `manifest['designCoverage']['hasDesignSystem'] = true`?
   - Recommendation: In the workflow, call `manifest-set-top-level designCoverage '{"hasDesignSystem":true}'` and handle as a JSON merge, OR read the manifest, mutate `designCoverage.hasDesignSystem`, and write back. Alternatively, the workflow can issue two CLI calls: one to set `designCoverage` as a full replacement object. Verify implementation before relying on dot-notation. The safest approach is to read `coverage-check` first, merge the object in memory, and call `manifest-set-top-level designCoverage` with the full JSON value.

2. **Brief-reading: which version to read when multiple BRF versions exist**
   - What we know: The glob pattern `BRF-brief-v*.md` can return v1, v2, v3
   - What's unclear: No established convention for "latest brief" in the workflow
   - Recommendation: Sort by version number descending, use highest version. Add a comment in the workflow explaining this logic. Brief.md's `--force` auto-increment pattern implies v-latest is canonical.

3. **Preview HTML: dark mode toggle JavaScript**
   - What we know: `SYS-preview.html` must include a light/dark toggle (CONTEXT.md)
   - What's unclear: Inline `<script>` complexity for `data-theme` toggle
   - Recommendation: Simple inline `<script>` that toggles `document.documentElement.setAttribute('data-theme', 'dark')`. No library needed. Keep under 10 lines.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + `--self-test` pattern (established in Phases 12–13) |
| Config file | None — self-test is activated by `--self-test` CLI flag on each lib file |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test && node bin/pde-tools.cjs design ensure-dirs 2>&1` |

**No external test runner (jest/vitest/mocha) exists in this project.** The established pattern is `runSelfTest()` exported from each `bin/lib/*.cjs` file, activated by `--self-test`. Phase 14 adds a new lib file (`bin/lib/system.cjs` if needed, or inline in workflow) following the same self-test pattern.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYS-01 | DTCG JSON produced with correct `$value`/`$type` leaf structure for all 7 categories | unit | `node bin/lib/design.cjs --self-test` (existing tests cover dtcgToCssLines node shape) | ✅ existing |
| SYS-01 | DTCG JSON contains color, typography, spacing, shadows, borders, motion, components sections | integration | Manual inspection of `visual/SYS-tokens.json` after skill run | ❌ Wave 0 (manual verification) |
| SYS-02 | `assets/tokens.css` is generated and contains CSS custom properties | integration | `node -e "require('fs').readFileSync('.planning/design/assets/tokens.css','utf-8').includes('--color')"` | ❌ Wave 0 |
| SYS-02 | Dark mode blocks present in CSS output (`@media` + `[data-theme="dark"]`) | unit | Add to design.cjs self-test: verify dark mode CSS block assembly | ❌ Wave 0 |
| SYS-03 | Typography tokens present (font-family, font-size-*, leading-*, tracking-*) | integration | Manual inspection of `visual/SYS-typography.css` | ❌ Wave 0 (manual) |
| SYS-03 | Color palette present with all 11 steps (50–950) | integration | Manual inspection of `visual/SYS-colors.css` | ❌ Wave 0 (manual) |
| SYS-03 | Spacing tokens present with standard scale | integration | Manual inspection of `visual/SYS-spacing.css` | ❌ Wave 0 (manual) |

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test`
- **Per wave merge:** `node bin/lib/design.cjs --self-test` + manual verification of generated CSS files
- **Phase gate:** Full suite green + manual SYS-preview.html visual inspection before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] Add dark mode CSS block assembly tests to `bin/lib/design.cjs` self-test — covers SYS-02 dark mode requirement
- [ ] Add integration smoke test: run `/pde:system` against a test brief and verify `assets/tokens.css` and `visual/SYS-tokens.json` exist with expected shape

*(The core `dtcgToCssLines` and manifest CRUD tests already exist in design.cjs self-test from Phase 12.)*

---

## Sources

### Primary (HIGH confidence)

- `bin/lib/design.cjs` — Read directly; confirmed: `dtcgToCssLines()`, `generateCssVars()`, `updateManifestArtifact()`, `acquireWriteLock()`, `releaseWriteLock()`, `cmdManifestSetTopLevel()` all present and tested
- `references/color-systems.md` (v1.0.0, 2026-03-10) — OKLCH algorithm, scale table, semantic mappings, dark mode strategy, DTCG color token format
- `references/typography.md` (v1.0.0, 2026-03-10) — Modular scale formula, line-height/letter-spacing derivation, DTCG typography token format, preset mappings
- `workflows/brief.md` — Read directly; confirmed 7-step workflow pattern, MCP probe, write-lock, domain DESIGN-STATE, manifest update
- `templates/design-system.md` — Read directly; confirmed output structure for SYS-usage-guide.md
- `templates/design-manifest.json` — Read directly; confirmed `SYS` artifact schema shape and `designCoverage.hasDesignSystem` flag
- `.planning/design/design-manifest.json` — Read directly; confirmed current state: `artifacts: {}`, `designCoverage.hasDesignSystem: false`
- `.planning/config.json` — Confirmed `workflow.nyquist_validation: true`

### Secondary (MEDIUM confidence)

- W3C Design Tokens Community Group format specification (2025.10) — known from training data (Aug 2025 cutoff); leaf-level `$value`/`$type` confirmed as current standard by `dtcgToCssLines()` implementation which matches this shape
- OKLCH browser support: Chrome 111+ (March 2023), Firefox 113+ (May 2023), Safari 15.4+ (March 2022) — referenced in `references/color-systems.md` with MDN citation

### Tertiary (LOW confidence)

- None — all key claims are backed by project files read directly

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all infrastructure read directly from codebase; no external library needed
- Architecture: HIGH — workflow pattern extracted from existing `workflows/brief.md`; DTCG format and CSS patterns extracted from existing reference files
- Pitfalls: HIGH for pitfalls 1/3/4/5 (derived from code inspection); MEDIUM for pitfall 2 (gamut clamping behavior in browsers — not directly testable from files alone)

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (stable domain — DTCG spec and CSS color specs move slowly)
