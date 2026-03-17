# Composition and Typography Reference

> Grid systems, visual weight analysis, type pairing rationale, spatial asymmetry principles, and APCA contrast thresholds.
> Loaded via `@` reference from wireframe.md, system.md, and critique.md during composition and typography decisions.
>
> **Scope boundary:** This file covers spatial composition, grid selection, type pairing classification, and APCA thresholds.
> Variable font axes and animation belong in motion-design.md. WCAG 2.x ratios belong in wcag-baseline.md.
> Font loading and @font-face patterns belong in typography.md.

---

**Version:** 1.0
**Scope:** Composition decisions — grid systems, visual weight, type pairing, APCA contrast, spatial asymmetry
**Ownership:** WFR, SYS, CRT (Phases 32, 33, 34)
**Boundary:** Does NOT cover font loading, WCAG 2.x compliance, color palette generation, or motion

---

## Named Grid Systems

| System | Column Count | Use Case | When to Choose | Key Characteristic |
|--------|-------------|----------|---------------|--------------------|
| 12-column | 12 | Multi-content pages, dashboards | Flexible subdivision needed (2/3/4/6 column sections) | Most flexible; industry standard for responsive |
| Modular | N×N cells (e.g. 6×4) | Product catalogs, portfolios, galleries | Regular repetition required | Both horizontal and vertical grid lines active |
| Golden ratio | Proportional (~1:1.618) | Editorial, landing pages, portfolio showcases | Strong focal hierarchy needed | Primary:secondary column ratio creates natural visual weight |
| Rule of thirds | 3×3 overlay | Photography, hero sections, single-focus pages | Single dominant element needs anchoring | Intersections (power points) are optimal element positions |
| Asymmetric | Unequal column weights (e.g. 7:5, 8:4) | Brand pages, editorial, luxury products | Deliberate tension and sophistication required | Breaks neutrality; forces a dominant reading axis |

### Grid Selection Rationale Format

When choosing a grid, document the rationale in this format:

> "Using [system] because [content type] requires [characteristic]. [Alternative] was rejected because [reason]."

**Example:** "Using asymmetric 7:5 grid because this brand landing page requires a dominant reading axis pulling toward the CTA. 12-column was rejected because it produces neutral, interchangeable column weights."

### CSS Grid Implementation Patterns

```css
/* Source: MDN CSS Grid Layout */

/* 12-column grid — standard responsive foundation */
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

---

## Visual Weight Analysis

| Weight Factor | High Weight | Low Weight | Notes |
|---------------|------------|-----------|-------|
| Size | Large elements | Small elements | Dominant in scanning order |
| Contrast | High contrast vs background | Low contrast | Contrast amplifies apparent size |
| Color | Warm/saturated hues | Cool/desaturated hues | Warm colors advance; cool recede |
| Density | Dense content clusters | Whitespace areas | Density creates visual mass |
| Position | Upper-left, rule-of-thirds intersections | Lower-right, near-edge | F-pattern and Z-pattern reading governs |
| Shape | Irregular/organic forms | Regular/geometric forms | Irregular forms draw more attention |
| Isolation | Element with surrounding whitespace | Element in a dense cluster | Isolation elevates perceived importance |

### Eye-Path Annotation Guide

When annotating wireframe layouts, mark all three:

1. **First attention anchor** — what has highest weight (largest, highest contrast, warmest color, most isolated)
2. **Reading axis** — horizontal (F-pattern: information-dense) or diagonal/Z (marketing: scan to CTA)
3. **Rest point** — where the eye settles after scanning (typically the CTA or primary action)

> Every layout should have all three annotated. A layout without a documented reading axis is an undirected composition.

**Annotation format:**
```
[1st] Hero image (full-bleed, warm colors, upper position)
 → [2nd] Headline (36px bold, high contrast)
 → [3rd] Body copy (16px, secondary contrast)
 → [rest] CTA button (action color, isolated, rule-of-thirds anchor)
```

---

## Spatial Asymmetry Principles

> Symmetry is the default. Asymmetry requires intention. For Awwwards-level work, at least one axis per layout must break symmetry with a documented purpose.

| Asymmetry Type | How to Achieve | Visual Effect | When to Use |
|----------------|---------------|---------------|-------------|
| Horizontal weight imbalance | Unequal column split (e.g. 7:5 grid) | Dominant reading direction | Editorial, brand-forward layouts |
| Vertical rhythm break | Intentional whitespace gap in vertical flow | Rest and pacing | Long-scroll pages, editorial |
| Type size contrast | Large display type vs small body | Hierarchy and drama | Hero sections, feature highlights |
| Negative space as composition | Leave large areas empty intentionally | Luxury, sophistication, breathing room | Premium brand, portfolio |
| Off-grid element | One element breaks the grid boundary | Dynamism, tension | Hero images, pull quotes, decorative elements |

> **Rule:** Accidental asymmetry (caused by content length variation) is not intentional asymmetry. Document the asymmetric choice explicitly.

**Example documentation:** "Left column is wider (7fr vs 5fr) to create a dominant reading axis pulling the eye toward the primary CTA in the left column. The narrower right column provides supporting context without competing."

---

## Type Pairing Classification

> A pairing requires classification, purpose, or structural contrast. Using two fonts that differ only in size is not a pairing — it is a scale.

| Pairing Type | Classification Contrast | Example Pairs | Avoid |
|-------------|------------------------|---------------|-------|
| Serif + Geometric sans | Category contrast (stroke style) | Playfair Display + Inter, Libre Baskerville + DM Sans | Pairing within same classification (Garamond + Georgia = too similar) |
| Humanist + Transitional | x-height and stroke contrast | EB Garamond + Source Sans 3 | Pairing fonts by same designer without documented reason |
| Slab + Grotesque | Structural contrast (slab stems vs clean grotesque) | Roboto Slab + Roboto | Slab + serif (structural noise, competing personalities) |
| Display + Neutral | Purpose contrast (expressive vs functional) | Clash Display + Satoshi | Two display fonts (fighting for attention) |
| Monospace + Humanist | Character contrast (fixed vs proportional) | JetBrains Mono + Lato | Two monospace fonts (no contrast; both read as code) |

### Pairing Rationale Documentation Format

Every type pairing must document all four fields:

> **[Pairing name]:** [Font A] ([classification, style]) + [Font B] ([classification, style]) — [contrast type]. [Font A] serves [purpose]; [Font B] ensures [purpose].

**Example:** "Playfair Display (transitional serif, display) + Inter (geometric sans, neutral) — category contrast. Playfair establishes brand character and editorial authority; Inter ensures UI readability at small sizes."

### Type Role Assignment

| Role | Characteristics | Selection Criteria |
|------|----------------|-------------------|
| Display / Brand | Expressive, distinctive, personality-forward | Chosen for character, not readability. Used at 32px+ only |
| Body / Reading | High legibility at 14–18px, generous x-height | Optimized for sustained reading; never use display fonts here |
| UI / Functional | Neutral, space-efficient, clear numerals | Used for labels, metadata, data tables; Inter/DM Sans typical |
| Code / Monospace | Fixed-width, clear 0/O and 1/I/l distinction | Required for code blocks and numeric data |

---

## APCA Contrast Thresholds

> **APCA polarity:** APCA Lc values can be positive (dark text on light background) or negative (light text on dark background). Always use absolute value |Lc| for comparisons and documentation. The myndex.com/APCA calculator handles polarity automatically.

### Threshold Table by Context

| Context | Minimum |Lc| | Preferred |Lc| | Font Weight Minimum | Notes |
|---------|------------|------------|---------------------|-------|
| Body text (fluent reading) | 75 | 90 | 400 at 16px+ | Primary content, paragraphs |
| Content text | 60 | 75 | 400 at 14px+ | Secondary content, captions |
| Large headlines (36px+, normal weight) | 45 | 60 | 300 at 36px+ | Display headings |
| Large headlines (24px+, bold) | 45 | 60 | 700 at 24px+ | Subheadings |
| Spot-readable (placeholders, disabled) | 30 | 45 | Any | Non-interactive, non-critical |
| Non-semantic (decorative dividers, focus rings) | 15 | 30 | N/A | Visual structure only |

### Font Size × Weight Interaction

| Size | Weight | Minimum |Lc| |
|------|--------|-----------|
| 48px+ | Any | 30 |
| 36px | 300+ | 45 |
| 24px | 700 | 45 |
| 18px | 400 | 75 |
| 16px | 500 | 75 |
| 14px | 700 | 75 |
| 12px | 900 | 90 |

### APCA Implementation Guidance

Use myndex.com/APCA to calculate Lc values for any text/background pair.

For token-based design systems, document the |Lc| value alongside every semantic color token:

```json
{
  "color": {
    "text": {
      "primary": {
        "$value": "oklch(0.15 0.005 250)",
        "$type": "color",
        "$description": "Primary text — |Lc| 95 on white background (exceeds preferred 90)"
      },
      "secondary": {
        "$value": "oklch(0.40 0.005 250)",
        "$type": "color",
        "$description": "Secondary text — |Lc| 72 on white background (meets minimum 60)"
      }
    }
  }
}
```

### WCAG 2.x Compatibility Note

For tooling compatibility, include WCAG 2.x ratios (4.5:1 AA, 3:1 large text) alongside APCA values. WCAG 2.x remains the legal compliance standard; APCA provides perceptual accuracy. Document both:

> "Text/background pair: |Lc| 88 (APCA preferred) / 6.2:1 (WCAG 2.x AA — compliant)"

---

## Content Hierarchy and Reading Order

### Viewport-Aware Hierarchy Documentation Format

For each layout, number content priority per viewport:

```
Desktop (1440px):
  1st = [element] — [why: size, contrast, position, color]
  2nd = [element] — [why]
  3rd = [element] — [why]
  CTA = [element] — [position relative to reading path]

Mobile (375px):
  1st = [element] — [why: full-bleed, top position]
  2nd = [element] — [why]
  CTA = [element] — [full-width, bottom of stack]
```

**Example:**
```
Desktop (1440px):
  1st = Hero headline (48px bold, high contrast, upper-left dominant)
  2nd = Product image (rule-of-thirds anchor, right column)
  3rd = Body copy (16px, below headline)
  CTA = "Get started" button (action color, adjacent to image, isolated whitespace)

Mobile (375px):
  1st = Product image (full-bleed, top)
  2nd = Headline (24px bold, below image)
  3rd = Body copy (16px, 4-line max on mobile)
  CTA = "Get started" button (full-width, high contrast, below body)
```

### Spacing and Rhythm Ratios

Apply consistent spatial ratios to reinforce hierarchy through whitespace:

| Relationship | Spacing Multiplier | Example (base 8px) |
|---|---|---|
| Section separation | 8× base | 64px between major sections |
| Component separation | 4× base | 32px between cards or blocks |
| Element separation (within component) | 2× base | 16px between label and input |
| Inline separation (text + icon) | 1× base | 8px between icon and text |

---

## Citations

| Source | URL | Used In |
|--------|-----|---------|
| APCA contrast documentation | git.apcacontrast.com/documentation/APCA_in_a_Nutshell | APCA section |
| APCA calculator | myndex.com/APCA | APCA thresholds |
| Golden ratio grid theory | nngroup.com/articles/golden-ratio-web-design | Grid systems section |
| Type classification contrast | fonts.google.com/knowledge/choosing_type | Type pairing section |
| Visual weight principles | smashingmagazine.com/2017/12/building-better-ui-designs-with-layout-grids | Visual weight section |
| MDN CSS Grid Layout | developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout | CSS grid patterns |
| WCAG 2.2 contrast criteria | w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | WCAG compatibility note |

---

*Version: 1.0*
*Last updated: 2026-03-17*
*Loaded by: wireframe.md, system.md, critique.md via `@` reference*
