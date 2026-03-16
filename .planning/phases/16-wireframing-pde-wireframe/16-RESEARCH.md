# Phase 16: Wireframing (/pde:wireframe) - Research

**Researched:** 2026-03-15
**Domain:** HTML/CSS wireframe generation, fidelity-controlled output, design token consumption, PDE skill workflow pattern
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WFR-01 | /pde:wireframe generates browser-viewable HTML/CSS at controlled fidelity levels (lofi/midfi/hifi) | `templates/wireframe-spec.md` specifies the exact HTML scaffold, fidelity CSS class names (`.pde-layout--lofi`, `.pde-layout--midfi`, `.pde-layout--hifi`), state variants (default/loading/error), responsive breakpoints, and annotation comment patterns. The fidelity argument is an enum — the workflow validates it before generating. Skill outputs one self-contained `.html` file per screen, using the 7-step workflow pattern from `workflows/flows.md` and `workflows/system.md`. |
| WFR-02 | Wireframes consume design system tokens for consistent styling | `assets/tokens.css` is referenced via `<link rel="stylesheet" href="../../assets/tokens.css">` in the HTML scaffold. The spec also requires a fallback path: when `assets/tokens.css` is absent, use product-type-aware defaults inline. The `design artifact-path` CLI call can locate the tokens file. The key constraint (from Phase 14-01): `assets/tokens.css` is INLINE (no @import) so it works at `file://` URLs without a server. |
| WFR-03 | Fidelity level is enforced by enum — no drift between levels | The three levels (`lofi`, `midfi`, `hifi`) are explicitly defined with non-overlapping CSS class sets and content rules in `templates/wireframe-spec.md`. Each level has a deterministic content specification (lo-fi: gray boxes + text labels only; mid-fi: realistic proportions + placeholder content; hi-fi: full token application + full microcopy). The fidelity enum is validated at Step 2; the workflow applies ONLY the rules for the selected level, never mixing them. Running twice at the same fidelity produces the same structural layout because the rules are prescriptive, not LLM-creative. |
</phase_requirements>

---

## Summary

Phase 16 implements the `/pde:wireframe` skill — the screen-by-screen HTML/CSS wireframe generator. It reads the screen inventory from Phase 15 (`ux/FLW-screen-inventory.json`), reads the design system tokens from Phase 14 (`assets/tokens.css`), and produces one browser-viewable self-contained HTML file per screen at the requested fidelity level.

This is a pure workflow-authoring phase. All required infrastructure is already in place from Phase 12: `design.cjs` provides write-lock, manifest update, coverage-check, and domain DESIGN-STATE operations. The output scaffold is specified in `templates/wireframe-spec.md`. The CSS patterns are documented in `references/web-modern-css.md`. The workflow pattern to follow is the established 7-step pipeline with the additional concern that wireframe needs both a ux domain consumer (the screen inventory) and a visual domain consumer (the design tokens).

Three novel engineering concerns distinguish this phase from earlier workflow phases. First: the fidelity enum must be validated and the content rules for each level strictly enforced so that running the command twice at the same fidelity produces structurally identical output. Second: the screen selection argument (comma-separated screen slugs from the inventory) drives batched file generation. Third: each HTML file must be a standalone `file://`-openable document — the `<link>` to `assets/tokens.css` uses a relative path that works only when files are opened from the correct directory, which the workflow must document.

**Primary recommendation:** Author `workflows/wireframe.md` as a 7-step workflow mirroring `flows.md`, update `commands/wireframe.md` to delegate via `@workflows/wireframe.md`, and produce one HTML file per screen into `.planning/design/ux/wireframes/`. The fidelity level is validated at Step 2 against the `lofi|midfi|hifi` enum. No new Node.js code is required — all infrastructure calls are existing `pde-tools.cjs design` subcommands.

---

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| `pde-tools.cjs design` subcommands | Phase 12 | Init, lock, manifest, coverage | Already built; all skills use the same pattern |
| `templates/wireframe-spec.md` | Current | Output scaffold: HTML structure, fidelity rules, responsive breakpoints, token dependency section | Fully specified — this is the authoritative fidelity contract |
| `references/web-modern-css.md` | 1.0 | CSS patterns: cascade layers, container queries, CSS nesting, responsive breakpoints, custom property patterns | Shared reference for /pde:system and /pde:wireframe — confirmed in file header |
| `assets/tokens.css` | Phase 14 output | Design token custom properties consumed via `<link>` in wireframe HTML | Inline CSS (no @import) — works at `file://` — decided in Phase 14-01 |
| `ux/FLW-screen-inventory.json` | Phase 15 output | Canonical screen list (slug, label, journey, persona, type) | Fixed path, unversioned — decided in Phase 15-01 |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| `references/skill-style-guide.md` | 1.0 | Flag naming, output summary table, error messaging conventions | Step output formatting and flag handling |
| `references/mcp-integration.md` | 1.0 | Playwright MCP validation probe, Sequential Thinking MCP, MCP source tag patterns | Step 3 (MCP probe) |
| `templates/design-state-domain.md` | Current | UX domain DESIGN-STATE scaffold | Step 6: ux/DESIGN-STATE.md already exists after Phase 15; update it |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline-CSS self-contained HTML files | External CSS files per screen | External files break `file://` opening unless paths are managed correctly; inline style for screen-specific CSS is acceptable |
| `<link>` relative path to `assets/tokens.css` | Inline copy of token CSS | Copy would bloat each wireframe file; relative link is correct and Phase 14 already made `assets/tokens.css` inline (no @import), so the file itself is safe to link |
| Separate HTML file per screen | Single multi-page HTML | Multi-page HTML does not open in browser without a server; separate files with inter-page `<a href="other.html">` links is the correct approach (confirmed by template) |

**Installation:** No new packages. All tooling is existing `pde-tools.cjs` and `design.cjs`.

---

## Architecture Patterns

### Recommended Project Structure (outputs)

```
.planning/design/
├── ux/
│   ├── DESIGN-STATE.md             # Updated: WFR artifact entry appended
│   ├── FLW-screen-inventory.json   # Input: read at Step 2
│   ├── FLW-flows-v1.md             # Input: optional context reading
│   └── wireframes/
│       ├── index.html              # Navigation index: links to all screens
│       ├── {screen-slug}.html      # One file per screen at requested fidelity
│       └── {screen-slug}.html      # ...
└── assets/
    └── tokens.css                  # Input: linked by <link> in each wireframe

workflows/
└── wireframe.md                    # Full /pde:wireframe skill workflow (7-step pipeline)

commands/
└── wireframe.md                    # Updated: delegates to @workflows/wireframe.md
```

### Pattern 1: 7-Step Skill Workflow (Established Convention)

**What:** Every PDE skill workflow follows the 7-step structure: init dirs, check prerequisites, probe MCP, generate output, write files, update domain DESIGN-STATE, update root DESIGN-STATE and manifest.

**When to use:** Always — this is the mandatory pattern for all pipeline skills.

**Source:** `workflows/flows.md` (Phase 15), `workflows/system.md` (Phase 14)

```
Step 1/7: Initialize design directories    (pde-tools.cjs design ensure-dirs, idempotent)
Step 2/7: Check prerequisites and parse fidelity argument
Step 3/7: Probe MCP                        (Playwright MCP availability + Sequential Thinking)
Step 4/7: Generate wireframe HTML per screen
Step 5/7: Write output HTML files + index.html
Step 6/7: Update ux domain DESIGN-STATE    (append WFR row)
Step 7/7: Update root DESIGN-STATE + manifest (write-lock, coverage flag hasWireframes: true)
```

### Pattern 2: Fidelity Enum Validation at Step 2

**What:** The fidelity level is a required argument with exactly 3 valid values: `lofi`, `midfi`, `hifi`. It must be validated at Step 2 before any file generation. This is the enforcement mechanism for WFR-03.

**When to use:** Always, before Step 4.

**Validation logic:**

```
Parse $ARGUMENTS for fidelity:
  - Check for --lofi, --midfi, --hifi flags (boolean forms)
  - Check for positional fidelity argument ("lofi", "midfi", or "hifi" as string)
  - If a comma-separated screen list is provided, distinguish it from the fidelity arg

Valid values: "lofi" | "midfi" | "hifi"

If no fidelity provided OR value not in enum:
  Error: Fidelity level required: lofi, midfi, or hifi.
    Usage: /pde:wireframe "screen1, screen2" lofi
    Or: /pde:wireframe --midfi
  HALT.

Store as FIDELITY (lowercase, validated).
```

**Why determinism requires strict enum enforcement:** Each fidelity level has a prescriptive content specification (see Pattern 3). If the level is unclear or free-form, Claude's generation varies between runs. The enum is the architectural guarantee for WFR-03.

### Pattern 3: Per-Fidelity Content Specification

**What:** Each fidelity level has a non-overlapping set of content rules. These come directly from `templates/wireframe-spec.md` and must be followed exactly.

**Source:** `templates/wireframe-spec.md` — Fidelity Notes section

**Lo-fi rules (structural skeleton):**
- Gray boxes with dimension labels for images and media (e.g., `[Image: 400x200]`)
- Text labels only ("Username", "Submit", "Navigation") — no realistic content
- Dashed borders on placeholder regions
- No color from design tokens (neutral gray only)
- Click-through navigation between pages active (`<a href>` links work)
- Body class: `pde-layout pde-layout--lofi`

**Mid-fi rules (realistic structure):**
- Real layout with proper spacing and alignment using token values
- Realistic placeholder content (fake names, sample data, lorem ipsum replaced with domain-relevant text)
- Icon/silhouette placeholders indicating content type (SVG shape, not icon)
- Basic chart shapes for data visualization (bar/line/pie outlines, no data)
- Primary state + empty state
- Microcopy: realistic button labels, validation messages
- Body class: `pde-layout pde-layout--midfi`

**Hi-fi rules (full token application):**
- Design tokens applied from `assets/tokens.css` — colors, typography, shadows, spacing
- Near-real content pulling from brief (product name, features, messaging)
- Rendered charts with sample data via inline SVG
- All state variants: primary + empty + loading + error
- Full microcopy with tooltips
- Body class: `pde-layout pde-layout--hifi`

### Pattern 4: Self-Contained HTML File Structure

**What:** Each wireframe is a single HTML file that opens in a browser via `file://` without a server. The template defines the exact scaffold.

**Source:** `templates/wireframe-spec.md` — HTML Structure section

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{Product Name} - {Screen Name}</title>
  <!-- Relative path: works at file:// when wireframes/ is inside ux/ -->
  <link rel="stylesheet" href="../../assets/tokens.css">
  <style>
    @layer tokens, wireframe-layout, components, utilities;

    @layer wireframe-layout {
      /* Screen-specific layout styles */
      /* Fidelity-specific rules applied here */
    }
  </style>
</head>
<body class="pde-layout pde-layout--{fidelity}">
  <header role="banner">...</header>
  <nav aria-label="Main navigation">
    <!-- ALWAYS include: <a href="index.html">All Screens</a> -->
    <!-- Inter-page links: <a href="{other-slug}.html">{Label}</a> -->
  </nav>
  <main role="main">
    <!-- Semantic HTML + ARIA landmarks on all interactive elements -->
    <!-- Annotation comments describing interaction behavior -->
    <!-- State variants (default, loading, error) as hidden sections -->
  </main>
  <footer role="contentinfo">...</footer>
  <script>
    /* Theme toggle (hi-fi only) */
    function toggleTheme() {
      const html = document.documentElement;
      html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    }
  </script>
</body>
</html>
```

**Path resolution:** The `<link href="../../assets/tokens.css">` path is relative to `ux/wireframes/{screen}.html`. This resolves to `.planning/design/assets/tokens.css`. This works at `file://` because it is a relative filesystem path, not an absolute web path.

**If `assets/tokens.css` is absent:** Do not halt. Use inline fallback palette derived from product type:
- software SaaS: neutral gray + blue action color
- marketing: bold action colors
- Include comment: `<!-- Fallback: run /pde:system first for branded tokens -->`

### Pattern 5: State Variants as Hidden Sections

**What:** Each screen must include state variants: default, loading, error. At lo-fi and mid-fi, only default and error are required (loading is optional). At hi-fi, all three are required.

**When to use:** Step 4 generation, for every screen.

```html
<!-- State: default (visible by default) -->
<div class="pde-state pde-state--default" aria-live="polite">
  {screen content}
</div>

<!-- State: loading (hidden by default; toggle via JS in hi-fi) -->
<!-- ANNOTATION: Shown during data fetch. Skeleton screens replace content cards. -->
<div class="pde-state pde-state--loading" hidden>
  {loading skeleton or spinner}
</div>

<!-- State: error (hidden by default) -->
<!-- ANNOTATION: Shown when API call fails. Retry button triggers re-fetch. -->
<div class="pde-state pde-state--error" hidden>
  {error message + retry CTA}
</div>
```

**State variant annotations** must describe the interaction trigger and recovery path, e.g.:
```html
<!-- ANNOTATION: Loading state triggered by form submit. Skeleton replaces form while
     API processes. On success, transition to success-confirmation screen.
     On failure, display inline field error and re-enable submit. -->
```

### Pattern 6: Screen Selection Argument (Batched Generation)

**What:** `/pde:wireframe` accepts a comma-separated list of screen slugs as its primary argument. If no argument is given, all screens from the inventory are generated. Slugs must match exactly what is in `FLW-screen-inventory.json`.

**Source:** `references/skill-style-guide.md` — Per-Item Filtering section

```
/pde:wireframe "login, dashboard, settings" lofi
/pde:wireframe --hifi                          # generates ALL screens
/pde:wireframe "login" --midfi --verbose
```

**Slug matching:** Exact match against `screens[].slug` in `FLW-screen-inventory.json`. If a slug is not found:
```
Warning: Screen "loginn" not found in screen inventory. Skipping.
  Available screens: login, dashboard, settings, profile
  Check /pde:flows was run and FLW-screen-inventory.json is current.
```

### Pattern 7: index.html Navigation Page

**What:** Every wireframe run produces or updates an `index.html` in `ux/wireframes/` that links to all generated wireframe files. This allows users to navigate the full wireframe set from a single browser tab.

**When to use:** Step 5 always — write `index.html` as the last file.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{Product Name} - Wireframe Index</title>
  <link rel="stylesheet" href="../../assets/tokens.css">
</head>
<body>
  <h1>{Product Name} — Wireframes</h1>
  <p>Fidelity: {lofi | midfi | hifi} | Generated: {date}</p>
  <ul>
    <li><a href="{slug}.html">{Screen Label} ({journey} — {persona})</a></li>
    <!-- one <li> per generated screen -->
  </ul>
</body>
</html>
```

### Pattern 8: Manifest Registration (WFR artifact code)

**What:** The wireframe skill registers its output using artifact code `WFR`. One manifest entry covers the entire batch (not one entry per screen). The domain is `ux`.

**Source:** `workflows/flows.md` Step 7 / `workflows/system.md` Step 7 (same pattern, different codes)

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR code WFR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR name "Wireframes"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR type wireframes
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR path ".planning/design/ux/wireframes/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR version {N}

# Coverage flag — read current first, never hardcode
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
# ... parse and merge hasWireframes: true into full object ...
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasWireframes":true,"hasFlows":{current},"hasDesignSystem":{current},...}'
```

### Anti-Patterns to Avoid

- **Validating fidelity loosely:** Accept only exact `lofi`, `midfi`, `hifi`. Never accept `lo-fi`, `low`, `high`, or capitalized variants silently. Emit an error and halt if the value is unrecognized.
- **Mixing fidelity rules:** A `midfi` wireframe must NOT include hi-fi token application or lo-fi placeholder boxes. Each level is exclusive. Never apply partial rules from another level.
- **Using `@import` in wireframe HTML:** The `<link>` tag in `<head>` must reference `assets/tokens.css` directly. `@import` inside `<style>` blocks does not work with `file://` in all browsers.
- **Breaking `file://` with absolute paths:** Never use absolute filesystem paths in `href` or `src` attributes. All asset references must be relative.
- **Skipping coverage flag read-before-set:** Set `hasWireframes: true` only after reading current `coverage-check` output and merging. Same clobber risk as in Phase 15 and 14.
- **Registering one manifest entry per screen:** The WFR manifest entry represents the entire wireframe set. Path is the directory `ux/wireframes/`, not an individual file.
- **Generating wireframes without screen inventory:** If `FLW-screen-inventory.json` is absent AND no screen argument is provided, the skill has no screen list. This is a hard error (not a warning) — there is nothing to wireframe.
- **Forgetting state variant annotation comments:** The handoff skill (Phase 19) relies on annotation comments to generate component APIs. Sparse or absent annotations degrade handoff quality. (Research flag from STATE.md.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Directory init | Custom mkdir logic | `pde-tools.cjs design ensure-dirs` | Already built, idempotent, handles templates |
| Write-lock | Custom file locking | `pde-tools.cjs design lock-acquire/release` | 60s TTL, stale-lock auto-clear, tested Phase 12 |
| Manifest update | Direct JSON editing | `pde-tools.cjs design manifest-update` | Atomic, merge semantics |
| Coverage flag | Custom field setter | `pde-tools.cjs design coverage-check` + `manifest-set-top-level` | Prevents clobber across skills |
| Token path discovery | Custom glob | `pde-tools.cjs design artifact-path SYS` | Resolves canonical path from manifest |
| Screen inventory lookup | Custom JSON parse | Read `ux/FLW-screen-inventory.json` at fixed path | Phase 15-01 locked this as a fixed path — no discovery needed |
| Responsive CSS patterns | Custom breakpoint logic | Follow patterns from `references/web-modern-css.md` | Documented Tailwind-convention breakpoints (640/768/1024/1280px) |
| Cascade layer architecture | Ad-hoc CSS | Use `@layer tokens, wireframe-layout, components, utilities` per `references/web-modern-css.md` | Eliminates specificity conflicts with token classes |

**Key insight:** Phase 12 was built to cover all infrastructure. This phase is exclusively a workflow-authoring task and HTML/CSS content generation task — no new Node.js code is required.

---

## Common Pitfalls

### Pitfall 1: Fidelity Drift Between Runs (WFR-03 Violation)

**What goes wrong:** If the fidelity rules are described loosely ("use some color at mid-fi"), the second run of `/pde:wireframe "login" midfi` produces a different structural layout than the first run. WFR-03 explicitly requires "running the command twice at the same fidelity level produces the same structural output."

**Why it happens:** LLM generation is non-deterministic. Without prescriptive rules pinning each fidelity level to specific structural choices, the output varies.

**How to avoid:** The workflow must specify each fidelity level as an exhaustive closed list of rules (see Pattern 3). Every content decision at a given fidelity must be a rule, not a guideline. Rules such as "use gray boxes for images" (not "gray boxes or icon placeholders") eliminate variance.

**Warning signs:** Two runs of the same command produce different numbers of HTML elements, different class names, or different section structures.

### Pitfall 2: Broken `file://` URL Due to Token Link

**What goes wrong:** Wireframe HTML opens in browser but styles are missing — the design tokens are not applied.

**Why it happens:** Three sub-causes:
1. The `<link>` path is wrong (e.g., `./assets/tokens.css` instead of `../../assets/tokens.css`)
2. `assets/tokens.css` uses `@import` pointing to per-category files — fixed in Phase 14, but must be verified
3. Wireframes are written to a different directory than `ux/wireframes/` — changing the directory changes the relative path

**How to avoid:** Always output wireframes to `ux/wireframes/` (2 levels deep from `assets/`). The relative path `../../assets/tokens.css` is hardcoded in the template. If the output directory ever changes, the link path must change with it.

**Warning signs:** Browser DevTools shows a 404 for `tokens.css`; custom properties resolve to empty strings.

### Pitfall 3: Screen Inventory Absent or Stale

**What goes wrong:** `/pde:wireframe` runs without a screen inventory. Without Phase 15 having been run, there is no `FLW-screen-inventory.json` to read.

**Why it happens:** User runs `/pde:wireframe` before `/pde:flows`.

**How to avoid:** Step 2 checks for `ux/FLW-screen-inventory.json` using Glob.
- If absent AND no screen argument: halt with error:
  ```
  Error: No screen inventory found at .planning/design/ux/FLW-screen-inventory.json.
    Run /pde:flows first to generate the screen inventory, then retry /pde:wireframe.
  ```
- If absent AND screen argument provided: warn but continue — generate wireframes from the argument alone without inventory context (no journey/persona metadata).

### Pitfall 4: Coverage Flag Clobbering (Same as Phase 15)

**What goes wrong:** `hasFlows: true` and `hasDesignSystem: true` (set by earlier skills) are reset to `false` because the wireframe skill sets `designCoverage` as a hardcoded object.

**Why it happens:** `manifest-set-top-level designCoverage` replaces the entire `designCoverage` object.

**How to avoid:** Always run `design coverage-check` first, parse all six flags, merge `hasWireframes: true`, write the full merged object. Identical to Phase 15 Step 7 pattern.

**Warning signs:** `hasFlows` or `hasDesignSystem` revert to `false` after running `/pde:wireframe`.

### Pitfall 5: Sparse Annotation Comments Degrading Phase 19

**What goes wrong:** Wireframe HTML is structurally correct but has no annotation comments. Phase 19 (`/pde:handoff`) reads wireframe annotations to generate TypeScript component APIs. If annotations are absent, the handoff skill cannot infer prop shapes, event handlers, or state transitions.

**Why it happens:** The workflow doesn't enforce annotation requirements.

**How to avoid:** The workflow must require annotation comments at two levels:
1. Each interactive element: `<!-- ANNOTATION: Click opens modal dialog with {ID} -->`
2. Each state variant: `<!-- ANNOTATION: Loading state shown while API fetches {resource}. Skeleton screens in place of cards. -->`

The minimum annotation requirement: every state variant block MUST have an annotation comment describing trigger and recovery. Each interactive element with non-obvious behavior (modals, drawers, async forms) must have an annotation.

**Warning signs:** Wireframe HTML has no `<!-- ANNOTATION:` comments; Phase 19 handoff spec has empty component API sections.

### Pitfall 6: Dashboard / Data Table Rendering at Lo-fi (Research Flag)

**What goes wrong:** Information-heavy screens (dashboards with 6+ cards, data tables with 20+ columns) produce lo-fi wireframes that are either incomprehensibly sparse or incorrectly detailed.

**Why it happens:** Lo-fi rules say "text labels only" but a data table with column headers and row content needs some structure to be comprehensible.

**How to avoid:** The workflow must include specific lo-fi rules for complex screen types:
- Data tables: render header row + 3 placeholder rows with gray cells, column count matches actual design
- Dashboards: render all card regions as gray boxes with dimension labels and card type annotation (e.g., `[Card: Metric — 200x100]`)
- Charts: render bounding box only with chart type label (e.g., `[Chart: Line — 400x200]`)

**Warning signs:** Lo-fi wireframes for dashboards are either empty or contain mid-fi-level detail.

### Pitfall 7: Missing index.html Prevents Navigation

**What goes wrong:** Individual wireframe files are generated but no index page exists. User must know each file name to open them.

**Why it happens:** Workflow generates per-screen files but forgets the navigation index.

**How to avoid:** Step 5 always writes `index.html` as the LAST file. Even if only one screen is generated, `index.html` must be present.

---

## Code Examples

Verified patterns from existing project source files:

### Step 1: Initialize Design Directories

```bash
# Source: workflows/flows.md Step 1 / workflows/system.md Step 1
INIT=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design ensure-dirs)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

### Step 2: Read Screen Inventory

```bash
# Fixed path — no versioning, no discovery needed (Phase 15-01 decision)
# Read .planning/design/ux/FLW-screen-inventory.json using the Read tool
# If absent AND no screen argument: halt with error
# If absent AND screen argument provided: warn, continue with arg-only list
```

### Step 2: Fidelity Validation

```
Parse $ARGUMENTS:
  - If --lofi present: FIDELITY = "lofi"
  - If --midfi present: FIDELITY = "midfi"
  - If --hifi present: FIDELITY = "hifi"
  - Else: check positional args for "lofi", "midfi", "hifi"
  - If still not found: ERROR and HALT
  - If value found but not in {"lofi","midfi","hifi"}: ERROR and HALT
```

### Step 2: Screen Selection

```
Parse $ARGUMENTS for comma-separated screen list:
  - Split on comma, trim whitespace
  - Match each slug against FLW-screen-inventory.json screens[].slug
  - For unrecognized slugs: WARNING, skip (never halt)
  - If no argument: use all screens from inventory (full batch)
  - Store as SCREENS array with full inventory metadata for each match
```

### Step 7: Coverage Flag (Preserve-Then-Merge Pattern)

```bash
# Source: workflows/flows.md Step 7 (identical pattern, different flag key)
COV=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design coverage-check)
if [[ "$COV" == @file:* ]]; then COV=$(cat "${COV#@file:}"); fi
# Parse COV JSON to extract current values for ALL fields
# Merge hasWireframes: true
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-set-top-level designCoverage \
  '{"hasWireframes":true,"hasFlows":{current},"hasDesignSystem":{current},"hasCritique":{current},"hasHandoff":{current},"hasHardwareSpec":{current}}'
```

### Step 7: Manifest Registration

```bash
# Source: workflows/flows.md Step 7 (FLW) / workflows/system.md Step 7 (SYS)
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR code WFR
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR name "Wireframes"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR type wireframes
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR domain ux
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR path ".planning/design/ux/wireframes/"
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR status draft
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" design manifest-update WFR version {N}
```

### Cascade Layer Architecture (from references/web-modern-css.md)

```css
/* Layer declaration order: later layers have higher specificity priority */
@layer tokens, wireframe-layout, components, utilities;

@layer wireframe-layout {
  /* Lo-fi placeholder styles */
  .pde-layout--lofi .pde-placeholder {
    background: var(--color-neutral-200, #e5e7eb);
    border: 2px dashed var(--color-neutral-400, #9ca3af);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-neutral-500, #6b7280);
    font-size: var(--font-size-sm, 0.875rem);
  }

  /* Mid-fi refinements */
  .pde-layout--midfi .pde-card {
    padding: var(--space-4, 1rem);
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: var(--radius-md, 0.375rem);
  }
}
```

### State Variant HTML Pattern (from templates/wireframe-spec.md)

```html
<!-- Default state (visible) -->
<div class="pde-state pde-state--default">
  <!-- Screen content here -->
</div>

<!-- Loading state (hidden; revealed by JS or shown by toggling hidden attr) -->
<!-- ANNOTATION: Loading state shown after form submit while /api/login processes.
     Spinner replaces submit button. Input fields become readonly.
     On success: redirect to dashboard. On failure: display inline error. -->
<div class="pde-state pde-state--loading" hidden>
  <div class="pde-spinner" aria-label="Loading..."></div>
</div>

<!-- Error state (hidden; revealed on API failure) -->
<!-- ANNOTATION: Error state shown when login API returns 401 or network error.
     Error banner above form. Retry: user corrects credentials and resubmits. -->
<div class="pde-state pde-state--error" hidden>
  <div role="alert" class="pde-error-banner">{error message}</div>
</div>
```

### Accessibility Requirements (from templates/wireframe-spec.md)

```html
<!-- Required on every wireframe regardless of fidelity -->
<header role="banner">...</header>
<nav aria-label="Main navigation">
  <a href="index.html">All Screens</a>
  <!-- inter-page links -->
</nav>
<main role="main">
  <!-- skip-to-main link at very top of <body> -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
  <div id="main-content">...</div>
</main>
<footer role="contentinfo">...</footer>

<!-- All form inputs must have associated labels -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">

<!-- Images need alt text at all fidelity levels -->
<img src="..." alt="Product screenshot showing dashboard overview">
<!-- Decorative: alt="" -->
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Wireframe as stub ("PDE v2") | Full implementation in Phase 16 | Phase 16 (this phase) | Unblocks critique, iterate, handoff pipeline |
| ASCII wireframes (text art) | Self-contained HTML/CSS files | Established in templates/wireframe-spec.md | Browser-viewable, no rendering required, accessible |
| Image/Figma-based wireframes | Pure HTML + CSS custom properties | PDE design decision (text output only) | Works without external tools; tokens cascade |
| Per-MCP validation | Playwright MCP optional probe | MCP integration pattern in mcp-integration.md | Browser rendering validation when available; degrades gracefully |

**Deprecated/outdated:**
- `commands/wireframe.md` stub text "Planned -- available in PDE v2": replaced by `@workflows/wireframe.md` delegation in this phase.
- No CSS file per screen approach: wireframes use inline `<style>` for screen-specific overrides plus the shared token `<link>`.

---

## Open Questions

1. **Versioning of the wireframes directory**
   - What we know: `workflows/system.md` and `workflows/flows.md` both version their primary output artifact (v1, v2...). The wireframe template has `Version: v{N}` in its frontmatter.
   - What's unclear: Should the wireframes directory be versioned (`wireframes-v1/`, `wireframes-v2/`) or fixed (`wireframes/`)? Versioning would allow "re-run at same fidelity and compare"; a fixed directory would match the FLW-screen-inventory pattern (always reflects latest).
   - Recommendation: Use a fixed directory `wireframes/` mirroring the screen inventory pattern. The manifest version field tracks which generation this represents. If partial re-generation is needed, overwrite individual screen files. This avoids the directory-discovery complexity that versioning would create for Phase 17 (critique).

2. **Inter-page navigation links in wireframes**
   - What we know: The template requires working `<a href="other-screen.html">` links between pages. The navigation section always includes `<a href="index.html">All Screens</a>`.
   - What's unclear: If only a subset of screens is generated in a batch (e.g., just "login"), links to screens not yet generated will 404 in the browser.
   - Recommendation: Generate links to ALL known screens from the inventory (not just those in the current batch). For screens not yet generated, the `<a href>` still works once those screens are generated in a subsequent run. Add a comment: `<!-- Not yet generated — run /pde:wireframe "{slug}" {fidelity} to create this file -->`.

3. **Playwright MCP validation probe**
   - What we know: `references/mcp-integration.md` documents Playwright MCP as an available enhancement. The wireframe template references `[Validated by Playwright MCP]` / `[Not validated]` tags.
   - What's unclear: Exact Playwright MCP tool call signature for screenshot/validation of a local `file://` HTML file.
   - Recommendation: Include Playwright MCP probe at Step 3 with graceful degradation. The skill works without it. Document the MCP tool call in the workflow but flag it as enhancement-only. Exact tool name can be confirmed from `mcp__playwright__*` namespace when the MCP is available.

4. **Dashboard/data-heavy screen complexity (research flag from STATE.md)**
   - What we know: STATE.md flags this as a stress-test concern — "ASCII wireframe generation reliability for information-heavy screens (dashboards, data tables) should be stress-tested in acceptance criteria."
   - What's unclear: What constitutes an acceptable lo-fi wireframe for a 12-column data table or a 6-widget dashboard?
   - Recommendation: Define explicit lo-fi rules for complex screen types in the workflow (see Pitfall 6). Add to acceptance criteria: the workflow must produce meaningful lo-fi for a hypothetical "12-column data table" screen. This can be validated by running `/pde:wireframe` on a project that has generated such flows.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `assert` + manual end-to-end (same as Phases 14-15) |
| Config file | None — no test runner; infrastructure tests use `--self-test` flag pattern |
| Quick run command | `node bin/lib/design.cjs --self-test` |
| Full suite command | `node bin/lib/design.cjs --self-test` + manual: run `/pde:wireframe` on a test project and inspect HTML output |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WFR-01 | `/pde:wireframe "login" lofi` produces `ux/wireframes/login.html` that opens in browser without a server | manual + smoke | `node -e "require('fs').existsSync('.planning/design/ux/wireframes/login.html')"` after skill run | ❌ Wave 0 (workflow authoring) |
| WFR-01 | `ux/wireframes/index.html` always present after any wireframe run | smoke | `node -e "require('fs').existsSync('.planning/design/ux/wireframes/index.html')"` | ❌ Wave 0 |
| WFR-01 | State variants (default, loading, error) present in HTML as `.pde-state--{variant}` elements | smoke | `node -e "const h = require('fs').readFileSync('...login.html','utf8'); require('assert')(h.includes('pde-state--error'))"` | ❌ Wave 0 |
| WFR-01 | Fidelity enum validation halts on unknown value | unit | Workflow instruction check: running `/pde:wireframe "login" highfidelity` must emit error and halt without writing files | ❌ Wave 0 (manual) |
| WFR-02 | Wireframe HTML `<link>`s to `assets/tokens.css` | smoke | `node -e "const h = require('fs').readFileSync('...login.html','utf8'); require('assert')(h.includes('tokens.css'))"` | ❌ Wave 0 |
| WFR-02 | Fallback palette used when tokens absent (no crash) | manual | Delete `assets/tokens.css`, run `/pde:wireframe`, verify HTML opens with fallback inline styles | ❌ Wave 0 (manual) |
| WFR-03 | Two runs at same fidelity produce same structural HTML (same element count, same class names) | manual | Run `/pde:wireframe "login" lofi` twice, diff the output HTML structurally | ❌ Wave 0 (manual) |

### Sampling Rate

- **Per task commit:** `node bin/lib/design.cjs --self-test` (Phase 12 infrastructure)
- **Per wave merge:** Manual end-to-end: run `/pde:wireframe "login" lofi` and open `index.html` in browser; verify `assets/tokens.css` link resolves; verify `pde-state--error` section present
- **Phase gate:** All three WFR requirements verified before `/gsd:verify-work`:
  - WFR-01: HTML produced, browser-openable, state variants present, fidelity enum enforced
  - WFR-02: `assets/tokens.css` linked; fallback degrades gracefully
  - WFR-03: Two identical runs produce identical structure

### Wave 0 Gaps

- [ ] `workflows/wireframe.md` — primary deliverable (Wave 1)
- [ ] `commands/wireframe.md` — update from stub to `@workflows/wireframe.md` delegation (Wave 1)
- [ ] No new test file needed in `design.cjs` — wireframe uses no new infrastructure code
- [ ] Manual smoke test procedure: document in VALIDATION.md (Phase gate)

*(No new test infrastructure gaps — existing `design.cjs` self-tests cover all infrastructure calls. Wireframe content generation is validated by manual end-to-end execution.)*

---

## Sources

### Primary (HIGH confidence)

- `templates/wireframe-spec.md` — Read directly: HTML scaffold, fidelity rules, state variants, responsive breakpoints, token dependency section, accessibility requirements, MCP tag format
- `workflows/flows.md` — Read directly: 7-step pipeline pattern, Step 1-7 structure, write-lock pattern, manifest registration (7-call pattern), coverage flag preserve-and-merge pattern, anti-patterns section
- `workflows/system.md` — Read directly: same 7-step pattern, MCP probe step, Step 2 prerequisites pattern
- `bin/pde-tools.cjs` — Read directly: confirmed design subcommand list: `ensure-dirs`, `manifest-read`, `manifest-update`, `manifest-set-top-level`, `artifact-path`, `tokens-to-css`, `coverage-check`, `lock-acquire`, `lock-release`, `lock-status`
- `references/web-modern-css.md` — Read directly: cascade layers, wireframe layer extension pattern, CSS nesting, container queries, responsive breakpoints, animation accessibility (`prefers-reduced-motion`)
- `references/skill-style-guide.md` — Read directly: universal flags, per-item filtering (comma-separated screen argument), output summary table, error messaging standards, output ordering convention
- `templates/design-manifest.json` — Read directly: `designCoverage` shape with `hasWireframes` field confirmed
- `.planning/design/design-manifest.json` — Read directly: current state `hasWireframes: false`; `artifacts: {}`
- `.planning/STATE.md` — Read directly: Phase 14-01 decision (assets/tokens.css inline, no @import); Phase 15-01 decision (FLW-screen-inventory.json fixed path); research flags for Phase 16

### Secondary (MEDIUM confidence)

- `commands/wireframe.md` — Read directly: confirmed current stub status; argument-hint `'"screen1, screen2, ..."'` establishes comma-separated argument convention
- `references/mcp-integration.md` — Read (first 60 lines): Playwright MCP exists as a supported MCP; `--no-playwright` flag pattern documented; full probe signature not read but known to exist

### Tertiary (LOW confidence)

- Playwright MCP exact tool call signature — not read; known only from mcp-integration.md reference and common knowledge. Flag for verification at Step 3 implementation time.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all tooling is existing project infrastructure; no external libraries; template fully specifies output format
- Architecture patterns: HIGH — directly derived from `workflows/flows.md` and `workflows/system.md` (implemented, working); template provides exact HTML scaffold
- Fidelity specification: HIGH — `templates/wireframe-spec.md` defines all three fidelity levels with non-overlapping rules
- Token consumption: HIGH — Phase 14-01 decision (inline CSS, no @import) ensures `file://` compatibility; relative path `../../assets/tokens.css` confirmed by file placement
- Pitfalls: HIGH for pitfalls 1-5 (derived from template, STATE.md flags, Phase 14-15 patterns); MEDIUM for pitfall 6 (dashboard complexity noted in STATE.md but specific rules are proposed, not yet validated by implementation)
- Open questions: LOW confidence on Playwright MCP exact API (not read); MEDIUM on versioning decision (proposed, not locked)

**Research date:** 2026-03-15
**Valid until:** Stable — no external dependencies; all tooling is in-project; valid until Phase 17 changes ux DESIGN-STATE schema
