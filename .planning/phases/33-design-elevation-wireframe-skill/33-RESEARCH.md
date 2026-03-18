# Phase 33: Design Elevation — Wireframe Skill - Research

**Researched:** 2026-03-18
**Domain:** Wireframe composition — grid theory, visual weight, spatial asymmetry, viewport-aware layout, content hierarchy annotation
**Confidence:** HIGH (composition-typography.md reference validated, CSS patterns verified against MDN/web.dev, design theory from established sources)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| WIRE-01 | Wireframe skill applies named grid systems (12-column, modular, golden ratio, asymmetric) with explicit rationale for grid choice per layout | composition-typography.md Named Grid Systems section + CSS implementation patterns verified against MDN CSS Grid |
| WIRE-02 | Wireframe skill annotates visual weight distribution across each layout — showing where the eye is drawn and why | composition-typography.md Visual Weight Analysis + Eye-Path Annotation Guide; F-pattern/Z-pattern eye tracking research |
| WIRE-03 | Wireframe skill uses spatial asymmetry intentionally: at least one axis breaks symmetry per page with documented purpose | composition-typography.md Spatial Asymmetry Principles; asymmetry documentation format already defined |
| WIRE-04 | Wireframe skill includes viewport-aware composition: distinct layout strategies for mobile (375), tablet (768), and desktop (1440) — not just fluid scaling | Recomposition vs scaling distinction researched; CSS subgrid + media query strategy for distinct composition |
| WIRE-05 | Wireframe skill documents content hierarchy with numbered visual priority (what users see 1st, 2nd, 3rd) per viewport | composition-typography.md Viewport-Aware Hierarchy Documentation Format; numbered priority annotation pattern defined |
</phase_requirements>

---

## Summary

Phase 33 elevates the existing `/pde:wireframe` skill to produce wireframes with intentional, documented composition decisions. The current skill (workflows/wireframe.md) generates structurally correct HTML/CSS wireframes with proper accessibility and fidelity rules, but makes no composition decisions explicit — grids are unnamed defaults, visual weight is undirected, layouts scale fluidly rather than recomposing per viewport.

The elevation is conceptually straightforward: add a composition layer to the wireframe generation step (Step 4 of the 7-step pipeline). The skill must select a named grid system per screen type, document the rationale, annotate visual weight distribution in HTML comments, intentionally break at least one axis of symmetry per page, and document distinct layout strategies for three canonical viewport widths. None of this requires new dependencies — it is knowledge encoded into the skill's generation instructions, consuming the existing `references/composition-typography.md` which already contains the complete frameworks for all five requirements.

The critical implementation insight is that composition decisions are content-type-driven. A login screen and a dashboard use different grids for documented reasons, not because of a default. The skill must apply decision logic: "given this screen type and product type, which named grid system is appropriate, and why?" The composition-typography.md reference already contains the selection criteria — the elevation is wiring that criteria into Step 4 of the wireframe pipeline.

**Primary recommendation:** Add a composition decision block to Step 4/7 of `workflows/wireframe.md`, loading `@references/composition-typography.md` in `required_reading`. The block executes before HTML generation and produces HTML comment annotations embedded in the output. No new reference files are needed — composition-typography.md is complete. No new dependencies. The change is additive to the existing pipeline.

---

## Standard Stack

### Core References Already in Project

| Reference | Path | What It Provides | Confidence |
|-----------|------|------------------|------------|
| composition-typography.md | `references/composition-typography.md` | Named grid systems, CSS patterns, visual weight factors, eye-path annotation format, spatial asymmetry table, type pairing, viewport-aware hierarchy format | HIGH |
| web-modern-css.md | `references/web-modern-css.md` | CSS custom properties, modern layout, already in wireframe required_reading | HIGH |
| skill-style-guide.md | `references/skill-style-guide.md` | Output conventions, annotation format, already in wireframe required_reading | HIGH |

### CSS Implementation Patterns (from composition-typography.md)

All four named grid systems are fully implemented in composition-typography.md with production-ready CSS. No external library needed:

```css
/* 12-column grid — standard responsive foundation */
/* Source: MDN CSS Grid Layout */
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: clamp(16px, 2vw, 24px);
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(16px, 5vw, 80px);
}

/* Asymmetric 7:5 grid — deliberate dominant left column */
.grid-asymmetric {
  display: grid;
  grid-template-columns: 7fr 5fr;
  column-gap: clamp(24px, 3vw, 48px);
}

/* Golden ratio grid — ~61.8% / 38.2% split */
.grid-golden {
  display: grid;
  grid-template-columns: 61.8fr 38.2fr;
  column-gap: clamp(24px, 3vw, 48px);
}

/* Modular grid — uniform cells for repeating content */
.grid-modular {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(16px, 2vw, 24px);
}
```

### External Standards Referenced

| Standard/Source | Version | URL | Confidence |
|----------------|---------|-----|------------|
| CSS Grid Layout | Living Standard | developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout | HIGH |
| CSS Subgrid | 97% browser support (2024+) | developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid | HIGH |
| CSS Container Queries | 98%+ browser support | developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries | HIGH |
| F-pattern eye tracking | Nielsen Norman Group research | nngroup.com/articles/f-shaped-pattern-reading-web-content/ | HIGH |
| Golden ratio grid | Nielsen Norman Group | nngroup.com/articles/golden-ratio-ui-design/ | MEDIUM-HIGH |

**No npm packages needed.** The wireframe skill generates static HTML/CSS files. Grid systems are expressed as CSS `grid-template-columns` declarations inline in the generated wireframe HTML. No runtime libraries, no build step.

---

## Architecture Patterns

### Existing Wireframe Pipeline (Step 4 is the target)

```
Step 1: Initialize design directories
Step 2: Check prerequisites (screen inventory, fidelity, tokens)
Step 3: Probe MCP tools
Step 4: Generate wireframe HTML per screen  ← All WIRE-01 through WIRE-05 additions go here
Step 5: Write output files
Step 6: Update ux domain DESIGN-STATE
Step 7: Update root DESIGN-STATE and manifest
```

Step 4 has sub-steps 4a through 4e (context, fidelity rules, HTML generation, annotations, accessibility). The elevation adds a new sub-step **4f: Composition decisions** that executes BEFORE HTML generation and produces annotation blocks embedded in the HTML.

### Pattern 1: Composition Decision Block (new Step 4f)

The skill must execute a composition decision sequence for each screen before generating HTML. This is not optional — it is required for WIRE-01 through WIRE-05.

**Decision logic:**

```
4f. Determine composition decisions for this screen:

  i. Grid system selection (WIRE-01):
     - Read screen type (from INVENTORY) and PRODUCT_TYPE (from brief)
     - Apply grid selection logic:
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
     - Store as GRID_RATIONALE (one sentence using the format from composition-typography.md)

  ii. Visual weight mapping (WIRE-02):
     - Identify the highest-weight element: the element that is largest, highest-contrast,
       warmest color, or most isolated
     - Identify the reading axis: F-pattern (information-dense) or Z-pattern (marketing/CTA-focused)
     - Identify the rest point: the CTA or primary action
     - Store as EYE_PATH (numbered annotation: 1st → 2nd → 3rd → CTA)

  iii. Asymmetry decision (WIRE-03):
     - Identify which axis will break symmetry:
       - Horizontal: unequal column split (7:5, golden ratio, or offset element)
       - Vertical: intentional whitespace gap or visual weight imbalance between top/bottom halves
       - At least one axis MUST be documented
     - Store as ASYMMETRY_AXIS ("horizontal" or "vertical")
     - Store as ASYMMETRY_RATIONALE (one sentence using composition-typography.md format)

  iv. Viewport composition strategy (WIRE-04):
     - Mobile 375px: single-column stack; identify element reorder (e.g., image moves above headline)
     - Tablet 768px: 2-column or content-focused recomposition (not just same as desktop shrunk)
     - Desktop 1440px: full grid system applied
     - Store as VIEWPORT_STRATEGIES (three distinct strategy descriptions)
     - CRITICAL: these must be DISTINCT strategies, not "same layout but narrower"

  v. Content hierarchy numbering (WIRE-05):
     - Number 1st, 2nd, 3rd attention priority for each viewport
     - Format: per composition-typography.md Viewport-Aware Hierarchy Documentation Format
     - Store as CONTENT_HIERARCHY (table: viewport × priority)
```

### Pattern 2: Composition Annotation Block in HTML

The composition decisions are embedded as a structured HTML comment block immediately after `<!-- State: default -->`. This block is the primary output of WIRE-01 through WIRE-05.

```html
<!-- COMPOSITION: {screen slug}
  Grid system: {GRID_SYSTEM} — {GRID_RATIONALE}

  Visual weight distribution:
    1st = {element} — {why: size/contrast/position/isolation}
     -> 2nd = {element} — {why}
     -> 3rd = {element} — {why}
     -> CTA = {element} — {position relative to reading path}
  Reading axis: {F-pattern | Z-pattern}

  Asymmetry ({ASYMMETRY_AXIS}): {ASYMMETRY_RATIONALE}

  Viewport strategies:
    Desktop 1440px: {grid system name}, {columns}, {description}
    Tablet 768px: {DISTINCT strategy, not shrunk desktop}
    Mobile 375px: {DISTINCT strategy, full recomposition}

  Content hierarchy:
    Desktop 1440px:
      1st = {element} — {why}
      2nd = {element} — {why}
      3rd = {element} — {why}
      CTA = {element} — {position}
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

This comment block MUST be present in every generated wireframe HTML file, regardless of fidelity level. It is a structural requirement, not a quality enhancement.

### Pattern 3: Grid CSS Application

The selected grid system is applied as a CSS class on the `<main>` element. The grid class names and implementations come from composition-typography.md:

```html
<!-- Grid applied to main container -->
<main role="main" id="main-content" class="pde-grid pde-grid--{grid-type}">
```

```css
/* In the @layer wireframe-layout block */

/* 12-column grid */
.pde-grid--12-column {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  column-gap: clamp(16px, 2vw, 24px);
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 clamp(16px, 5vw, 80px);
}

/* Asymmetric 7:5 — or 8:4, depending on rationale */
.pde-grid--asymmetric {
  display: grid;
  grid-template-columns: 7fr 5fr;
  column-gap: clamp(24px, 3vw, 48px);
}

/* Golden ratio ~61.8:38.2 */
.pde-grid--golden-ratio {
  display: grid;
  grid-template-columns: 61.8fr 38.2fr;
  column-gap: clamp(24px, 3vw, 48px);
}

/* Modular grid */
.pde-grid--modular {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: clamp(16px, 2vw, 24px);
}
```

### Pattern 4: Viewport-Aware Breakpoint Strategy (WIRE-04)

The skill's current responsive breakpoints use fluid scaling within a single layout pattern. The elevated skill must produce DISTINCT layout strategies. The three canonical viewports from the requirements:

```css
/* Mobile: 375px — single column, reordered stack */
/* base (no query): single column, max-width 375px focus */
.pde-grid--12-column {
  grid-template-columns: 1fr;
}

/* Tablet: 768px — 2-column or content-focused */
@media (min-width: 768px) {
  .pde-grid--12-column {
    grid-template-columns: repeat(8, 1fr); /* reduced columns for tablet */
  }
  .pde-grid--asymmetric {
    grid-template-columns: 3fr 2fr; /* narrower asymmetry on tablet */
  }
}

/* Desktop: 1440px — full grid system */
@media (min-width: 1024px) {
  .pde-grid--12-column {
    grid-template-columns: repeat(12, 1fr);
  }
  .pde-grid--asymmetric {
    grid-template-columns: 7fr 5fr;
  }
}
```

**The distinction criterion:** At mobile, the secondary column (supporting content in desktop asymmetric/golden layouts) moves BELOW the primary content, not beside it at smaller size. On tablet, the layout enters an intermediate composition where supporting content may be moved to a top rail or collapsed panel — not just narrower columns. This is the "distinct strategy" requirement.

### Pattern 5: Asymmetry Implementation Patterns

From composition-typography.md Spatial Asymmetry Principles:

```css
/* Horizontal weight imbalance — unequal column split */
.pde-asymmetric--horizontal {
  grid-template-columns: 7fr 5fr; /* left column dominates */
}

/* Off-grid element — breaks the grid boundary for dynamism */
.pde-pull-out {
  margin-left: -clamp(16px, 5vw, 80px); /* bleeds into padding zone */
}

/* Vertical rhythm break — intentional gap in flow */
.pde-section-accent {
  margin-top: clamp(64px, 10vw, 128px); /* oversized gap creates rest point */
  margin-bottom: clamp(16px, 3vw, 32px); /* asymmetric padding creates pacing */
}
```

### Anti-Patterns to Avoid

- **Unnamed grid:** Never use `display: grid` without a corresponding `pde-grid--{type}` class and composition comment block.
- **Symmetric at all breakpoints:** The mobile layout collapsing columns is not intentional asymmetry — document the deliberate asymmetry on the desktop layout's primary axis.
- **Fluid-only responsiveness:** Tablet layout is NOT desktop layout at 768px wide. It requires a documented recomposition decision (element reorder, column count change, secondary content repositioning).
- **Generic hierarchy:** "1st = hero, 2nd = headline, 3rd = body" without explaining WHY (size/contrast/position/isolation) is an incomplete annotation.
- **Accidental asymmetry:** Content length differences that happen to create unequal columns are not intentional asymmetry. Document the INTENTIONAL asymmetric choice.
- **Grid choice without rationale:** "Using 12-column grid" without the rationale sentence fails WIRE-01.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Grid system CSS | Custom fr-unit combinations guessed per screen | composition-typography.md Named Grid Systems CSS patterns | Four named systems already specified with production-ready clamp values |
| Visual weight rubric | Ad hoc "this looks important" judgment | composition-typography.md Visual Weight Analysis table (7 factors) | Documented criteria produce consistent, defensible decisions |
| Eye-path annotation format | Freeform description | composition-typography.md Eye-Path Annotation Guide with numbered format | Planner-parseable format: `[1st] X → [2nd] Y → [rest] Z` |
| Asymmetry rationale | Generic "for balance" explanations | composition-typography.md asymmetry documentation format | Explicit pattern: "Left column wider (7fr:5fr) to create dominant reading axis toward CTA. Narrower right provides supporting context without competing." |
| Viewport hierarchy table | Screen-specific numbering schemes | composition-typography.md Viewport-Aware Hierarchy Documentation Format | Consistent desktop/mobile priority notation already defined |
| Grid selection logic | Per-screen judgment without criteria | Screen-type × product-type decision table (in Architecture Patterns section above) | Reproducible decisions across wireframe runs |

**Key insight:** The composition decisions for wireframes are knowledge already in `references/composition-typography.md`. The elevation is not adding new design theory — it is connecting that theory to Step 4 of the wireframe pipeline. The planner should NOT create tasks to research grid theory; that research is already done in the reference file.

---

## Common Pitfalls

### Pitfall 1: Symmetry by Default

**What goes wrong:** The wireframe generates a centered, two-equal-column layout because equal columns are the path of least resistance with `grid-template-columns: 1fr 1fr`.
**Why it happens:** CSS grid's simplest form produces symmetric columns. Without explicit composition decisions, all layouts default to balanced/neutral.
**How to avoid:** Apply the grid selection decision table before generating HTML. The grid class name on `<main>` must be one of four named types — `pde-grid--{type}` — never `pde-grid` alone.
**Warning signs:** A wireframe where all columns are equal-width `1fr` has defaulted to symmetric. Verify the composition comment block is present.

### Pitfall 2: Fluid Scaling Masquerading as Recomposition

**What goes wrong:** The tablet (768px) breakpoint simply shows the same layout as desktop, but narrower. The mobile breakpoint shows the same layout as desktop, but stacked.
**Why it happens:** CSS `repeat(auto-fill, minmax(...))` or `column-count: auto` produces fluid scaling. It satisfies responsive behavior but does not meet WIRE-04.
**How to avoid:** Each of the three canonical viewports (375, 768, 1440) must have a DISTINCT strategy annotation in the composition comment block. "Distinct" means at least one structural difference beyond column width: element reorder, column count change, secondary content repositioning, or navigation pattern change.
**Warning signs:** If the tablet viewport strategy description is "same as desktop but narrower columns," it is not distinct.

### Pitfall 3: Visual Weight Annotation Without Explanation

**What goes wrong:** The composition comment block lists `1st = hero image, 2nd = headline, 3rd = body` without explaining the weight factors.
**Why it happens:** The numbered priority is intuitive but incomplete without the "why."
**How to avoid:** Every priority entry must include the weight factor from composition-typography.md: size, contrast, color, density, position, shape, or isolation. Format: `1st = {element} — {why: weight factor}`.
**Warning signs:** A priority list without " — " followed by a weight factor explanation is incomplete.

### Pitfall 4: Asymmetry Applied at Mobile Only

**What goes wrong:** The developer treats single-column mobile layout as the intentional asymmetry. Single-column IS symmetric (vertically centered content).
**Why it happens:** Responsive stacking feels like asymmetry because columns disappear.
**How to avoid:** Intentional asymmetry is on the desktop layout's primary axis. On mobile, document the asymmetry as absent (by design) or achieved through vertical weight distribution (e.g., oversized hero image creates vertical weight imbalance).
**Warning signs:** If ASYMMETRY_AXIS is documented as "none on desktop, mobile collapse only," WIRE-03 is not satisfied.

### Pitfall 5: Grid System Misapplication by Screen Type

**What goes wrong:** A login screen uses a 12-column grid with content spanning all 12 columns — which is functionally identical to no grid.
**Why it happens:** 12-column is the default; applying it without content-type rationale produces a neutral, undirected layout.
**How to avoid:** Apply the grid selection logic from Architecture Patterns. Login/auth screens use golden ratio (single focal hierarchy). Dashboard screens use 12-column (flexible subdivision). Overriding the table is allowed but requires explicit documented rationale.
**Warning signs:** A login screen using 12-column with a single-column form spanning all 12 columns has no actual grid — the grid was applied but not used. The form should be constrained to the 38.2% column.

### Pitfall 6: required_reading Not Updated

**What goes wrong:** The elevated wireframe.md lacks `@references/composition-typography.md` in its `required_reading` block, so the composition decisions are made without the reference.
**Why it happens:** Plan task omits the required_reading update, or the task adds composition logic to Step 4 but forgets to load the reference.
**How to avoid:** Wave 0 task (or Plan 01 Task 1) must add `@references/composition-typography.md` to `required_reading` in workflows/wireframe.md BEFORE adding Step 4f logic.
**Warning signs:** Step 4f references grid names and rationale formats that are only defined in composition-typography.md — if that file is not in required_reading, the skill generates them from training knowledge, which may drift from the project's established conventions.

---

## Code Examples

### Composition Decision Block (Step 4f) — Complete Example

```html
<!-- COMPOSITION: dashboard-main
  Grid system: 12-column — Dashboard requires flexible 2/3/4/6 column subdivision for metric cards, data tables, and sidebar panels. Modular rejected because card widths are non-uniform; golden ratio rejected because no single dominant focal element.

  Visual weight distribution:
    1st = Primary metric card (upper-left, 4-column span, high contrast, isolated whitespace)
     -> 2nd = Data table (center, 8-column span, dense content, below fold)
     -> 3rd = Secondary metric row (equal-width cards, grouped proximity, row below primary)
     -> CTA = "Add widget" button (action color, isolated, rule-of-thirds anchor upper-right)
  Reading axis: F-pattern (information-dense dashboard; user scans top row then left column)

  Asymmetry (horizontal): Primary metric card spans 4 of 12 columns in left position; data table occupies 8 columns right — 4:8 ratio creates dominant reading axis toward data table while keeping metric card as isolated attention anchor.

  Viewport strategies:
    Desktop 1440px: 12-column grid, metric cards in top row (3 × 4-col), data table full width below
    Tablet 768px: 8-column grid, metric cards stack 2 per row (each 4-col), data table becomes scrollable (overflow-x: auto)
    Mobile 375px: Single column stack — metric cards full-width, data table replaced with card-based summary list (table hidden, summary cards shown via CSS class toggle)

  Content hierarchy:
    Desktop 1440px:
      1st = Primary metric card (upper-left, 4-column, high contrast value)
      2nd = Secondary metrics row (3 cards, grouped proximity, below primary)
      3rd = Data table header row (large type, spans width)
      CTA = "Add widget" (action color, upper-right, isolated whitespace)
    Tablet 768px:
      1st = Primary metric (full-width card, top)
      2nd = Secondary metrics (2-up row below)
      CTA = "Add widget" (full-width, action color, below metrics)
    Mobile 375px:
      1st = Primary metric (full-width card, high contrast, top)
      2nd = Summary list (top 5 items, below metric)
      CTA = "View all" / "Add widget" (full-width, sticky bottom or below list)
-->
```

### Grid Application in HTML Body

```html
<main role="main" id="main-content" class="pde-grid pde-grid--12-column" aria-live="polite">
  <!-- ... state blocks ... -->
</main>
```

### Asymmetric Layout — Golden Ratio Login Example

```html
<!-- COMPOSITION: login
  Grid system: golden-ratio — Login screen has single focal hierarchy; 38.2% right column draws eye to form as primary action. 12-column rejected because it produces neutral, undirected columns that give no inherent hierarchy.

  Visual weight distribution:
    1st = Brand illustration (61.8% left column, full-height, warm brand color, dominant size)
     -> 2nd = Form header "Sign in" (large type, 36px, high contrast, upper section of right column)
     -> 3rd = Email/password fields (16px labels, reading-weight contrast, sequential proximity grouping)
     -> CTA = "Sign in" button (action color, full-width within right column, isolated from fields by 24px gap)
  Reading axis: Z-pattern (simple layout, two columns, eye travels left hero → right form → CTA)

  Asymmetry (horizontal): Left column 61.8% (brand/visual), right column 38.2% (functional/form). Left is decorative and high visual weight; right is the action zone. The weight imbalance creates deliberate visual hierarchy that directs focus to the narrow column's CTA.

  Viewport strategies:
    Desktop 1440px: Golden ratio 2-column — illustration left (61.8%), form right (38.2%)
    Tablet 768px: Illustration reduced to 40% top banner (horizontal strip), form below full-width — brand presence retained, form accessible without squeezing
    Mobile 375px: Illustration hidden (display: none), form full-width single column with brand logo above — cognitive focus on task, no decorative distraction on small screen

  Content hierarchy:
    Desktop 1440px:
      1st = Brand illustration (61.8% column, full-bleed, warm color, dominant)
      2nd = "Sign in" heading (36px bold, right column upper, high contrast)
      3rd = Email field (first form field, proximity group start)
      CTA = "Sign in" button (action color, full-width right column, 24px below fields)
    Tablet 768px:
      1st = Brand banner (top strip, color presence)
      2nd = "Sign in" heading (below banner, 28px)
      CTA = "Sign in" button (full-width, below fields)
    Mobile 375px:
      1st = Logo (small, centered, top)
      2nd = "Sign in" heading (24px, below logo, center-aligned)
      CTA = "Sign in" button (full-width, high contrast, bottom of form)
-->
```

### Viewport-Aware CSS (Distinct Strategies)

```css
/* Base (mobile 375px): single column — illustration hidden */
.pde-grid--golden-ratio {
  display: grid;
  grid-template-columns: 1fr;
}
.pde-grid--golden-ratio .pde-illustration {
  display: none; /* mobile: remove decorative visual, focus on form */
}

/* Tablet 768px: illustration as top banner, form full-width below */
@media (min-width: 768px) {
  .pde-grid--golden-ratio {
    grid-template-columns: 1fr;
    grid-template-rows: 200px 1fr; /* illustration as horizontal banner */
  }
  .pde-grid--golden-ratio .pde-illustration {
    display: block;
    height: 200px;
    object-fit: cover;
  }
}

/* Desktop 1440px: full golden ratio split */
@media (min-width: 1024px) {
  .pde-grid--golden-ratio {
    grid-template-columns: 61.8fr 38.2fr;
    grid-template-rows: 1fr; /* reset row constraint */
    min-height: 100vh;
  }
  .pde-grid--golden-ratio .pde-illustration {
    height: 100%;
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Unnamed grid (just flexbox or equal columns) | Named grid systems with explicit rationale per screen type | 2020-2024 (design system maturity) | Planner and developers can trace WHY a layout was chosen; prevents generic symmetric defaults |
| Single breakpoint responsive (mobile / desktop) | Three-viewport recomposition strategy (375 / 768 / 1440) | 2021-2024 (industry standard) | Each viewport has a distinct composition story, not just a scaled version |
| Post-hoc accessibility annotations | Embedded composition annotations alongside accessibility annotations | 2022-2025 (design documentation practices) | Composition intent is preserved alongside implementation, not lost in handoff |
| CSS subgrid: not production-ready | CSS subgrid: 97% browser support, production-ready (2024+) | 2024 | Nested grid children can now align to the outer grid's tracks — enables asymmetric layouts with aligned nested content |
| Media queries for all responsive behavior | Container queries (98%+ support) for component-level response + media queries for macro layout | 2023-2024 | Macro grid layout still uses media queries; individual components within the grid use container queries for fine-grained response |
| Visual weight as intuition | Visual weight as documented factors: size, contrast, color, density, position, shape, isolation | 2020-present (Gestalt applied to UX) | Composition decisions become defensible and reproducible, not taste-dependent |

**Deprecated/outdated:**
- Fluid-only responsive (single breakpoint or fluid scaling without recomposition): does not meet WIRE-04 standards
- F-pattern as universal layout guide: Z-pattern is established as the correct guide for marketing/landing pages; F-pattern applies to information-dense content; neither is universal
- Symmetric two-column default for marketing: asymmetric 7:5 or golden ratio is the current standard for Awwwards-level layout quality

---

## Design Theory Foundations

These are the theoretical foundations that govern the five requirements. The planner does not need to research these — they are documented here to explain the WHY behind each requirement.

### Grid Theory (Müller-Brockmann, Vignelli)

Josef Müller-Brockmann established the principle that grids are not neutral scaffolding — grid choice is a primary compositional decision. An asymmetric grid (unequal columns) creates a dominant reading direction. A modular grid enforces regularity. A golden ratio grid creates inherent focal hierarchy. The skill's grid selection logic follows this: for each screen type, the grid choice must be motivated by the screen's compositional intent, not selected as a default.

Key principle: "A symmetric grid produces neutral, interchangeable columns. An asymmetric grid forces a dominant reading axis." This is the justification for WIRE-03 (break at least one axis of symmetry).

### Gestalt Principles (applied)

The visual weight analysis in WIRE-02 applies four core Gestalt principles:
- **Proximity:** Elements grouped together are read as related; this governs how form fields are annotated as a group below the headline
- **Figure-Ground:** The isolated CTA button in whitespace becomes the figure; the content becomes the ground
- **Common Fate:** Elements that share grid alignment are read as belonging together
- **Continuity:** The reading axis (F/Z pattern) follows from the grid's structural lines

The eye-path annotation (1st → 2nd → 3rd → CTA) is a direct application of Gestalt scanning principles: the eye follows the path of highest visual weight, then highest contrast, then established reading patterns.

### F-Pattern vs Z-Pattern (Nielsen Norman Group)

Eye tracking research establishes two dominant scanning patterns:
- **F-pattern:** Information-dense layouts (dashboards, articles). Users scan a top horizontal band, then a second shorter horizontal band, then vertically down the left column. Implication: left column elements receive more attention; top-left is the highest-value position.
- **Z-pattern:** Simple layouts with a clear CTA (landing pages, login). Users scan top-left to top-right, then diagonally to bottom-left, then right to the CTA. Implication: place CTA at bottom-right or center-bottom; keep the diagonal path clear.

The skill uses these to determine reading axis in the composition annotation.

### Responsive Recomposition (vs Fluid Scaling)

The distinction the requirements draw (WIRE-04) is between:
- **Fluid scaling:** Same layout, column widths change proportionally with viewport
- **Recomposition:** Different element arrangements, content priority shifts, structural changes at specific viewport breakpoints

Professional responsive design practice (established 2014-2024) holds that mobile is not a "small desktop" — it is a different use context with different content priorities. The three canonical viewports in WIRE-04 (375/768/1440) represent mobile (thumb use, vertical scroll, single-column focus), tablet (flexible, often two-handed, can support two columns), and desktop (pointer, wide viewport, full composition).

Container queries (97%+ support in 2025) complement but do not replace viewport-based macro layout decisions. The wireframe skill uses CSS media queries at the three canonical breakpoints for macro layout composition, and may use container queries for component-level adaptation within the grid.

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bash test scripts (same pattern as Phases 29-32) |
| Config file | None — standalone shell scripts |
| Quick run command | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire01_grid_system.sh` |
| Full suite command | `for f in .planning/phases/33-design-elevation-wireframe-skill/test_wire*.sh; do bash "$f"; done` |
| Estimated runtime | ~5-10 seconds |

### Test Approach

Unlike Phase 32 (which tested token file contents), Phase 33 tests generated wireframe HTML files. Tests grep the generated HTML for required annotation patterns. Test fixtures should run `/pde:wireframe` against a synthetic project (brief + screen inventory fixture) and grep the output.

**Fixture approach:** Create `.planning/phases/33-design-elevation-wireframe-skill/fixtures/` with:
- `FLW-screen-inventory.json` — 3-4 screens (login, dashboard, landing) covering different grid types
- `BRF-brief-v1.md` — minimal brief establishing product type
- Expected output: HTML files with composition annotations

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WIRE-01 | Generated wireframe HTML contains `<!-- COMPOSITION:` block with "Grid system:" line naming one of the four named systems | smoke (grep on generated HTML) | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire01_grid_system.sh` | ❌ Wave 0 |
| WIRE-02 | Composition block contains "Visual weight distribution:" section with numbered priorities and weight factor explanations | smoke (grep pattern check) | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire02_visual_weight.sh` | ❌ Wave 0 |
| WIRE-03 | Composition block contains "Asymmetry (" with documented axis and rationale sentence | smoke (grep) | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire03_asymmetry.sh` | ❌ Wave 0 |
| WIRE-04 | Generated CSS contains three distinct @media breakpoints (768px AND 1024px at minimum) AND distinct grid-template-columns values at each breakpoint | smoke (grep CSS content) | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire04_viewport.sh` | ❌ Wave 0 |
| WIRE-05 | Composition block contains "Content hierarchy:" with "Desktop 1440px:" AND "Mobile 375px:" sections, each with numbered priorities | smoke (grep) | `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire05_hierarchy.sh` | ❌ Wave 0 |

**Manual-only items:** None — all five requirements produce verifiable structural patterns in generated HTML.

**Test constraint:** Tests must run against generated HTML fixtures, not against the skill definition. Wave 0 creates the fixture infrastructure. Tests run by grepping the fixture output files for structural patterns.

### Sampling Rate

- **Per task commit:** `bash .planning/phases/33-design-elevation-wireframe-skill/test_wire01_grid_system.sh` (fastest, tests core WIRE-01 structural requirement)
- **Per wave merge:** `for f in .planning/phases/33-design-elevation-wireframe-skill/test_wire*.sh; do bash "$f"; done`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test_wire01_grid_system.sh` — covers WIRE-01
- [ ] `test_wire02_visual_weight.sh` — covers WIRE-02
- [ ] `test_wire03_asymmetry.sh` — covers WIRE-03
- [ ] `test_wire04_viewport.sh` — covers WIRE-04
- [ ] `test_wire05_hierarchy.sh` — covers WIRE-05
- [ ] `fixtures/FLW-screen-inventory.json` — 3-screen fixture (login, dashboard, landing) for test execution
- [ ] `fixtures/BRF-brief-v1.md` — minimal brief fixture

*(Test scripts must be created in Wave 0 before implementation tasks. Each test greps fixture HTML output for required annotation patterns.)*

---

## Open Questions

1. **Grid selection for unrecognized screen types**
   - What we know: The decision table covers common screen types (dashboard, login, landing, catalog, editorial, settings). Many projects have custom screens not in this list.
   - What's unclear: Should the skill HALT and ask the user, or use 12-column as fallback with explicit documentation?
   - Recommendation: Use 12-column as documented fallback — it is the most flexible. The skill should explicitly annotate "Using 12-column (fallback) — no grid selection criterion matched screen type '{type}'. Override in WIRE-01 rationale if a different system is appropriate."

2. **Composition comment verbosity at lo-fi fidelity**
   - What we know: Lo-fi wireframes use gray boxes and labels only. The composition annotation block could feel out of place when the content is purely structural placeholders.
   - What's unclear: Should WIRE-01 through WIRE-05 annotations be present at lofi, midfi, and hifi, or only midfi+?
   - Recommendation: All fidelity levels — the composition block documents the INTENDED composition, regardless of how the content is rendered. Lo-fi wireframes with named grids are more useful than lo-fi wireframes with unnamed defaults. The annotation block is the specification; the HTML is the implementation.

3. **CSS subgrid integration**
   - What we know: CSS subgrid has 97% browser support (2024). It solves asymmetric layout problems where nested content needs to align to the outer grid.
   - What's unclear: Should the elevated wireframe skill use subgrid for nested content alignment, or is this beyond Phase 33 scope?
   - Recommendation: Phase 33 scope is composition decisions, not subgrid adoption. Use standard grid nesting with explicit track definitions. Subgrid adoption can be a future enhancement. Document as a known improvement opportunity in the wireframe skill's comment block.

---

## Sources

### Primary (HIGH confidence)
- `references/composition-typography.md` (project reference) — Named grid systems, CSS patterns, visual weight analysis, eye-path annotation format, spatial asymmetry table, viewport hierarchy format; the primary source for all five WIRE requirements
- `developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout` — CSS Grid Layout specification, pattern verification
- `developer.mozilla.org/en-US/docs/Web/CSS/Guides/Grid_layout/Subgrid` — CSS Subgrid, 97% browser support confirmed
- `web.dev/articles/css-subgrid` — CSS Subgrid production guidance
- `workflows/wireframe.md` (project file) — existing 7-step pipeline, current Step 4 structure

### Secondary (MEDIUM confidence)
- `nngroup.com/articles/f-shaped-pattern-reading-web-content/` — F-pattern eye tracking (NNGroup research, verified)
- `nngroup.com/articles/golden-ratio-ui-design/` — Golden ratio in UI design contexts
- CSS Grid Level 3 first working draft (2024): `w3.org/news/2024/first-public-working-draft-css-grid-layout-module-level-3/` — masonry layout direction
- `joshwcomeau.com/css/subgrid/` — Subgrid practical patterns (verified against MDN)

### Tertiary (LOW confidence)
- Müller-Brockmann "Grid Systems in Graphic Design" (1961) — foundational grid theory; principles applied but not directly verifiable online
- F-pattern/Z-pattern search synthesis — multiple corroborating sources; eye tracking pattern claims are well-established but original Nielsen study pre-dates 2020

---

## Metadata

**Confidence breakdown:**
- WIRE-01 (named grid systems): HIGH — CSS patterns verified against MDN; selection rationale format from composition-typography.md project reference
- WIRE-02 (visual weight): HIGH — framework from composition-typography.md; F/Z pattern from NNGroup research
- WIRE-03 (asymmetry): HIGH — composition-typography.md documents 5 asymmetry types with CSS patterns
- WIRE-04 (viewport strategies): HIGH — three-viewport standard well-established; CSS media query patterns verified; recomposition vs scaling distinction researched
- WIRE-05 (content hierarchy): HIGH — format defined in composition-typography.md; numbered priority system is established design documentation practice

**Research date:** 2026-03-18
**Valid until:** 2026-09-18 (stable domain; grid theory and CSS patterns slow-moving; 6 months safe)
