# Phase 32: Design Elevation — System Skill - Research

**Researched:** 2026-03-17
**Domain:** Design token generation — DTCG format, OKLCH color science, APCA contrast, motion tokens, variable fonts, type pairing, optical spacing
**Confidence:** HIGH (all seven domains verified against official specs or existing project references)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SYS-01 | Motion tokens in DTCG transition format: 5+ duration steps, easing curves (ease-in, ease-out, ease-in-out, spring, bounce), delay tokens for choreography | DTCG 2025.10 `transition` composite type documented; spring workaround via `$extensions` + `linear()` table clarified |
| SYS-02 | Variable font axis animation tokens: weight, width, optical-size, custom axes with animation parameters | MDN-verified axes; token representation pattern using composite structure documented |
| SYS-03 | OKLCH color palettes with perceptual harmony (analogous, complementary, split-complementary, triadic) | Hue rotation formulas verified; chroma adjustment rules for perceptual balance documented |
| SYS-04 | APCA-aware contrast checking with Lc values at each type scale step | APCA 0.98G formula documented; Lc threshold table verified from git.apcacontrast.com |
| SYS-05 | Advanced spacing with optical adjustments for density contexts (hero, content, dense UI) | IBM Carbon density pattern (compact/cozy/normal) + optical adjustment principles documented |
| SYS-06 | Type pairing recommendations with documented contrast rationale | Vox-ATypI classification system documented; 4-field rationale format from composition-typography.md confirmed |
</phase_requirements>

---

## Summary

Phase 32 elevates the existing `/pde:system` skill to produce advanced design tokens across six domains. The existing skill (workflows/system.md) already has a solid foundation: DTCG 2025.10 format, OKLCH primary palettes, a 5-step duration scale, and basic easing curves. The elevation consists of specific additions and upgrades, not a rewrite.

The most technically complex areas are (1) APCA Lc computation — the formula is stable (version 0.98G) and the skill must embed it as pseudocode guidance since it cannot execute JavaScript; (2) DTCG spring/bounce easing — the `cubicBezier` type supports single-overshoot only; multi-bounce springs require a `$extensions` + description workaround with the full `linear()` value stored as a string; and (3) OKLCH harmony generation — the existing `color-systems.md` already documents the hue-rotation formulas but the skill does not yet invoke them for secondary harmony palettes beyond a single complementary color.

The skill generates static token files (JSON + CSS) at invocation time. It has no runtime library dependencies. All algorithms must be embedded as generation-time knowledge: the skill computes values using documented formulas and writes them to files. The test infrastructure follows the established bash-script pattern from phases 29-31.

**Primary recommendation:** Extend `workflows/system.md` to add new Step 4 subsections for each SYS-01 through SYS-06 domain. Add `@references/motion-design.md` and `@references/composition-typography.md` to `required_reading`. Do not replace existing token generation — append the six new domains to the existing pipeline.

---

## Standard Stack

### Core References Already in Project

| Reference | Path | What It Provides | Confidence |
|-----------|------|------------------|------------|
| color-systems.md | `references/color-systems.md` | OKLCH palette generation algorithm, harmony hue offsets, DTCG color format | HIGH |
| motion-design.md | `references/motion-design.md` | Duration scale, easing curves, spring fidelity levels, DTCG motion format | HIGH |
| composition-typography.md | `references/composition-typography.md` | APCA thresholds table, type pairing classification, type role assignment | HIGH |
| typography.md | `references/typography.md` | Modular scale ratios, font family selection, line-height formulas | HIGH |

### External Specifications Referenced

| Spec | Version | Source | Confidence |
|------|---------|--------|------------|
| DTCG Format Module | 2025.10 (first stable) | designtokens.org/tr/drafts/format/ | HIGH |
| APCA contrast algorithm | 0.98G-4g | git.apcacontrast.com / github.com/Myndex/SAPC-APCA | HIGH |
| CSS font-variation-settings | Living standard | MDN | HIGH |
| CSS linear() timing function | CR | MDN / joshwcomeau.com | HIGH — 88% browser support as of Dec 2023 |

---

## Architecture Patterns

### Existing Skill Structure

The current `workflows/system.md` has a 7-step pipeline:

```
Step 1: Initialize design directories
Step 2: Check prerequisites (brief detection, version bump)
Step 3: Probe MCP (Sequential Thinking)
Step 4: Generate token data  ← All SYS-01 through SYS-06 additions go here
Step 5: Write files
Step 6: Generate preview page
Step 7: Update DESIGN-STATE and manifest
```

Step 4 already has subsections for: color tokens, typography tokens, spacing tokens, shadow tokens, border tokens, motion tokens, component tokens. The elevation adds content to existing subsections or appends new ones.

### Pattern 1: DTCG Transition Token (SYS-01)

The DTCG 2025.10 `transition` composite type is the standard for motion tokens:

```json
{
  "motion": {
    "transition": {
      "micro": {
        "$type": "transition",
        "$value": {
          "duration": { "value": 100, "unit": "ms" },
          "delay": { "value": 0, "unit": "ms" },
          "timingFunction": [0.4, 0, 0.2, 1]
        },
        "$description": "100ms — state changes: button press, checkbox, toggle"
      },
      "fast": {
        "$type": "transition",
        "$value": {
          "duration": { "value": 200, "unit": "ms" },
          "delay": { "value": 0, "unit": "ms" },
          "timingFunction": [0.4, 0, 0.2, 1]
        },
        "$description": "200ms — hover transitions, small UI feedback"
      }
    }
  }
}
```

Source: DTCG Format Module 2025.10, section 9.4

### Pattern 2: Spring Easing in DTCG (SYS-01 — Key Finding)

**Critical:** The DTCG `cubicBezier` type only accepts a 4-element array `[P1x, P1y, P2x, P2y]`. It can represent a single-overshoot spring (`[0.34, 1.56, 0.64, 1]`) but CANNOT represent multi-bounce springs. The `linear()` CSS function required for multi-bounce is not a native DTCG type.

**The canonical workaround** (used by leading design systems): Store the spring easing token using `$type: "cubicBezier"` for the single-overshoot approximation, plus a `$extensions` field carrying the full `linear()` value as a string for tool consumption. The `$description` documents the limitation and the fallback strategy:

```json
{
  "motion": {
    "easing": {
      "spring": {
        "$type": "cubicBezier",
        "$value": [0.34, 1.56, 0.64, 1],
        "$description": "Single-overshoot spring — universal browser support. For multi-bounce, see $extensions.linear.",
        "$extensions": {
          "pde.linearSpring": "linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%, 0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%, 1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%, 1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%, 1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1)"
        }
      },
      "bounce": {
        "$type": "cubicBezier",
        "$value": [0.34, 1.56, 0.64, 1],
        "$description": "Bounce easing — single overshoot. Multi-bounce linear() in $extensions.",
        "$extensions": {
          "pde.browserSupport": "88% (Chrome, Firefox, Safari, Edge since Dec 2023)"
        }
      }
    }
  }
}
```

Source: DTCG spec §9.3 cubicBezier; motion-design.md spring fidelity levels

### Pattern 3: Duration Scale (SYS-01)

The existing skill has only 3 duration tokens (fast/normal/slow = 150ms/250ms/400ms). SYS-01 requires 5+ steps from micro to dramatic. The upgrade aligns with motion-design.md which has 5 steps:

```json
{
  "motion": {
    "duration": {
      "micro":    { "$type": "duration", "$value": { "value": 100, "unit": "ms" }, "$description": "State changes: button press, checkbox, toggle" },
      "fast":     { "$type": "duration", "$value": { "value": 200, "unit": "ms" }, "$description": "Hover transitions, small UI feedback" },
      "standard": { "$type": "duration", "$value": { "value": 300, "unit": "ms" }, "$description": "Modal open/close, drawer slide, tooltip" },
      "slow":     { "$type": "duration", "$value": { "value": 500, "unit": "ms" }, "$description": "Page transitions, hero entrance, complex reveals" },
      "dramatic": { "$type": "duration", "$value": { "value": 800, "unit": "ms" }, "$description": "Cinematic entrance, brand moments, first-load hero" }
    }
  }
}
```

Source: motion-design.md Duration Scale section; Material Design motion duration tokens

### Pattern 4: Choreography Delay Tokens (SYS-01)

Stagger/delay tokens for orchestrating entrance sequences. These are standard `duration` type tokens in DTCG:

```json
{
  "motion": {
    "delay": {
      "none":      { "$type": "duration", "$value": { "value": 0,   "unit": "ms" }, "$description": "No delay — immediate" },
      "stagger-sm": { "$type": "duration", "$value": { "value": 60,  "unit": "ms" }, "$description": "Small stagger — card lists, navigation items (3-5 items)" },
      "stagger-md": { "$type": "duration", "$value": { "value": 120, "unit": "ms" }, "$description": "Medium stagger — feature grids (5-8 items)" },
      "stagger-lg": { "$type": "duration", "$value": { "value": 200, "unit": "ms" }, "$description": "Large stagger — section reveals, hero sequences" },
      "page":       { "$type": "duration", "$value": { "value": 300, "unit": "ms" }, "$description": "Page transition delay — content waits for route change" }
    }
  }
}
```

Industry convention: stagger values are 50-200ms; sub-50ms is imperceptible, over-200ms reads as broken. Source: GSAP stagger patterns, motion-design.md choreography section.

### Pattern 5: Variable Font Axis Tokens (SYS-02)

Variable font axes do not have a native DTCG composite type. The standard approach is to use composite tokens with a `$extensions` field to encode axis-specific parameters:

```json
{
  "font": {
    "variable": {
      "weight": {
        "axis": {
          "$value": "wght",
          "$type": "string",
          "$description": "CSS: font-weight property. Maps directly — no font-variation-settings needed."
        },
        "range": {
          "$value": { "min": 100, "max": 900 },
          "$type": "dimension",
          "$description": "Typical range for variable fonts with wght axis (Inter, Roboto Flex, Source Sans 3)"
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
          "$description": "CSS: font-variation-settings 'wdth' <value>. Roboto Flex range: 25-151."
        },
        "range": { "$value": { "min": 75, "max": 125 }, "$type": "dimension" },
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
          "$description": "CSS: font-optical-sizing: auto (preferred) or font-variation-settings 'opsz' <value>"
        },
        "ranges": {
          "caption": { "$value": { "min": 6, "max": 12 } },
          "body": { "$value": { "min": 12, "max": 24 } },
          "display": { "$value": { "min": 24, "max": 144 } }
        },
        "transition": {
          "$type": "transition",
          "$value": {
            "duration": { "value": 300, "unit": "ms" },
            "delay": { "value": 0, "unit": "ms" },
            "timingFunction": [0.4, 0, 0.2, 1]
          }
        }
      }
    }
  }
}
```

Source: MDN font-variation-settings; motion-design.md Variable Font Axis Animation section

**Performance note:** Animating `font-weight` (wght axis) is GPU-composited in Chromium 112+, Firefox 116+. Animating `font-variation-settings` directly may trigger layout recalculation on some axes — use `font-weight`, `font-stretch`, `font-style` CSS shorthand properties where the axis maps to them (wght→font-weight, wdth→font-stretch, slnt/ital→font-style). Only use `font-variation-settings` directly for custom axes or opsz. Source: MDN.

### Pattern 6: OKLCH Harmony Palettes (SYS-03)

The existing skill generates only complementary secondary palettes. SYS-03 requires all four harmony types. The hue-rotation rules are already in `color-systems.md`:

```
Analogous:          H ± 30
Complementary:      H + 180
Split-complementary: H ± 150
Triadic:            H ± 120
```

**Perceptual balance rule:** When generating harmony palettes, keep the Lightness (L) and seed Chroma (C) identical to the primary. Do NOT adjust for "balance" by eye — OKLCH's perceptual uniformity means equal L and C across hues produces visually balanced palettes by construction. Exception: when two harmonies land near-identical hues (within 15°), increase chroma separation by ±0.04.

**Chroma capping:** Each harmony palette must apply the same `C_safe_max` clamps from the scale generation table in color-systems.md. High-chroma out-of-gamut colors render inconsistently across sRGB monitors.

The skill output structure for harmonies:

```json
{
  "color": {
    "harmony": {
      "analogous-warm": {
        "description": "Analogous +30° from primary (H=280 → H=310)",
        "500": { "$value": "oklch(0.55 0.18 310)", "$type": "color" }
      },
      "analogous-cool": {
        "description": "Analogous -30° from primary (H=280 → H=250)",
        "500": { "$value": "oklch(0.55 0.18 250)", "$type": "color" }
      },
      "complementary": {
        "description": "Complementary +180° (H=280 → H=100)",
        "500": { "$value": "oklch(0.55 0.18 100)", "$type": "color" }
      },
      "split-warm": {
        "description": "Split-complementary +150° (H=280 → H=70)",
        "500": { "$value": "oklch(0.55 0.18 70)", "$type": "color" }
      },
      "split-cool": {
        "description": "Split-complementary -150° (H=280 → H=130)",
        "500": { "$value": "oklch(0.55 0.18 130)", "$type": "color" }
      },
      "triadic-a": {
        "description": "Triadic +120° (H=280 → H=40)",
        "500": { "$value": "oklch(0.55 0.18 40)", "$type": "color" }
      },
      "triadic-b": {
        "description": "Triadic -120° (H=280 → H=160)",
        "500": { "$value": "oklch(0.55 0.18 160)", "$type": "color" }
      }
    }
  }
}
```

Source: color-systems.md Color Harmony Rules; ColorAide OKLCH harmonies documentation

### Pattern 7: APCA Guidance in Tokens (SYS-04)

The APCA Lc value cannot be stored as a raw token — it is a property of a color PAIR (text + background), not of a single color. The correct approach is to embed Lc guidance in the `$description` field of text color tokens, and generate a separate APCA guidance table as a comment block in the CSS output.

**APCA Lc thresholds** (from composition-typography.md, verified against git.apcacontrast.com):

| Font Size | Weight | Minimum |Lc| | Preferred |Lc| |
|-----------|--------|----------|------------|
| 48px+ | Any | 30 | 45 |
| 36px | 300+ | 45 | 60 |
| 24px | 700 | 45 | 60 |
| 18px | 400 | 75 | 90 |
| 16px | 500 | 75 | 90 |
| 14px | 700 | 75 | 90 |
| 12px | 900 | 90 | — |

**APCA Lc calculation algorithm** (for use in skill generation logic):

The skill cannot execute JavaScript. It must approximate Lc by providing pre-computed values for the specific token pairs it generates. The embedded algorithm (for the skill to follow):

```
Step 1: Convert text and background OKLCH to sRGB hex
Step 2: For each channel (R, G, B) divide by 255 → [0, 1]
Step 3: Linearize each channel: if value > 0.04045, use (value + 0.055) / 1.055)^2.4
        else use value / 12.92
Step 4: Luminance Y = 0.2126729 * R_lin + 0.7151522 * G_lin + 0.0721750 * B_lin
Step 5: Black clamp: if Y < 0.022, Y = Y + (0.022 - Y)^1.414
Step 6: Background power: Ybg^0.56, Text power: Ytxt^0.57
        (these exponents flip if text is lighter than background)
Step 7: SAPC = (Ybg^0.56 - Ytxt^0.57) * 1.14  [positive = dark text on light bg]
Step 8: If |SAPC| < 0.1: Lc = 0 (too low to be meaningful)
        else: Lc = (SAPC - 0.027) * 100 [for positive SAPC]
              or:  Lc = (SAPC + 0.027) * 100 [for negative SAPC]
Step 9: Report as |Lc| (absolute value) for documentation
```

Source: github.com/Myndex/SAPC-APCA documentation/APCA-W3-LaTeX.md (version 0.98G-4g-base-W3)

**Skill output format** — embed Lc in token `$description`:

```json
{
  "color": {
    "text": {
      "primary": {
        "$value": "oklch(0.15 0.005 250)",
        "$type": "color",
        "$description": "Primary text on white bg: |Lc| ~95 (exceeds preferred 90). Meets APCA for all font sizes."
      },
      "secondary": {
        "$value": "oklch(0.40 0.005 250)",
        "$type": "color",
        "$description": "Secondary text on white bg: |Lc| ~68 (meets minimum 60). Use 16px+/400 or 14px+/700."
      }
    }
  }
}
```

And in the CSS comment block:
```css
/*
 * APCA Contrast Guidance — Type Scale
 * Background: --color-bg-default (oklch(0.97 0.005 250) ≈ white)
 *
 * Scale Step | Min Size/Weight | |Lc| | Threshold Met
 * text-4xl   | 36px/300        | ~90  | Preferred (45 min)
 * text-3xl   | 24px/300        | ~90  | Preferred (45 min)
 * text-2xl   | 18px/400        | ~88  | Preferred (75 min)
 * text-xl    | 16px/500        | ~85  | Preferred (75 min)
 * text-lg    | 14px/700        | ~85  | Preferred (75 min)
 * text-base  | 16px/400        | ~85  | Preferred (75 min)
 * text-sm    | 12px/900        | ~85  | Preferred (90 min — verify weight)
 * text-xs    | Use sparingly   | ~85  | Decorative only at very small sizes
 *
 * Calculator: myndex.com/APCA
 */
```

### Pattern 8: Optical Spacing Tokens (SYS-05)

The existing skill has a simple linear 4px-base spacing scale (15 steps). SYS-05 requires density context variants. The IBM Carbon pattern is the industry standard for this:

**Three density contexts:**

| Context | Purpose | Spacing Multiplier | Typical Use |
|---------|---------|-------------------|-------------|
| `compact` (dense) | Data tables, code editors, admin panels | 0.75× base | Maximum information density, reduced whitespace |
| `default` (normal) | General web applications, dashboards | 1× base | Standard PDE output |
| `cozy` (hero) | Marketing pages, landing pages, hero sections | 1.5× base | Generous whitespace, editorial breathing room |

**Token generation approach:** Generate three semantic spacing sets that reference the same primitive scale with context multipliers. The CSS output uses `data-density` attribute or modifier classes:

```css
/* Primitive spacing tokens (unchanged) */
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-8: 32px;
  --space-16: 64px;
}

/* Default density semantic tokens */
:root {
  --spacing-component-gap: var(--space-4);    /* 16px */
  --spacing-section-gap:   var(--space-16);   /* 64px */
  --spacing-content-gap:   var(--space-8);    /* 32px */
  --spacing-inline:        var(--space-2);    /* 8px */
}

/* Compact density override */
[data-density="compact"] {
  --spacing-component-gap: var(--space-2);    /* 8px — 0.75× (rounded to scale) */
  --spacing-section-gap:   var(--space-8);    /* 32px */
  --spacing-content-gap:   var(--space-4);    /* 16px */
  --spacing-inline:        var(--space-1);    /* 4px */
}

/* Cozy density override */
[data-density="cozy"] {
  --spacing-component-gap: var(--space-8);    /* 32px — 1.5× (rounded to scale) */
  --spacing-section-gap:   var(--space-24);   /* 96px */
  --spacing-content-gap:   var(--space-12);   /* 48px */
  --spacing-inline:        var(--space-4);    /* 16px */
}
```

**Optical adjustment principle:** After generating mathematical spacing, apply optical corrections:
- First child of section: reduce top padding by 1 scale step (flush to header)
- Icon + label pairs: reduce gap by half (icons read as visually larger than their pixel dimensions)
- Numeric data columns: use compact density regardless of page density (data readability)

Source: IBM Carbon Design System spacing/density; Nathan Curtis "Space in Design Systems" (EightShapes); Atlassian Design spacing optical adjustments

### Pattern 9: Type Pairing Recommendations (SYS-06)

The skill should generate type pairing recommendations in its output guidance document (not as raw tokens — pairing is a design decision, not a measurable value). Format: use the 4-field rationale already specified in composition-typography.md.

**Classification taxonomy to embed** (Vox-ATypI simplified, industry-standard for digital):

| Category | Description | Examples | DTCG `font.classification` value |
|----------|-------------|---------|--------------------------------|
| Humanist serif | Variable stroke, bracketed serifs, calligraphic origin | EB Garamond, Libre Baskerville, Playfair Display | `humanist-serif` |
| Transitional serif | Geometric regularization, vertical stress, high contrast | Georgia, Charter | `transitional-serif` |
| Geometric sans | Minimal contrast, circular forms, single-storey a/g | Futura, DM Sans, Circular | `geometric-sans` |
| Humanist sans | Calligraphic influence, variable stroke, two-storey a | Inter, Gill Sans, Fira Sans | `humanist-sans` |
| Grotesque sans | Realist, minimal contrast, derived from early 19th C. | Helvetica, Arial, Aktiv | `grotesque-sans` |
| Slab serif | Square brackets, low contrast, sturdy | Roboto Slab, Zilla Slab | `slab-serif` |
| Display | Expressive, concept-specific, legibility not primary | Clash Display, Fraunces | `display` |
| Monospace | Fixed-width, code/data contexts | JetBrains Mono, Fira Code | `monospace` |

**Recommended pairings to generate:**

| Pairing | Classification Contrast | When to Use | Contrast Type |
|---------|------------------------|-------------|---------------|
| Playfair Display + Inter | Humanist serif + Humanist sans | Editorial, brand, portfolio | Category contrast (stroke style, serif vs clean) |
| EB Garamond + DM Sans | Humanist serif + Geometric sans | Reading-forward, professional | Personality contrast (calligraphic vs constructed) |
| Fraunces + Source Sans 3 | Display serif + Humanist sans | High-impact marketing | Expressive vs functional role contrast |
| JetBrains Mono + Inter | Monospace + Humanist sans | Technical documentation, SaaS | Character rhythm contrast |
| Clash Display + Satoshi | Display + Grotesque | Startup, creative, modern | Purpose contrast (expressive vs neutral) |

**Output format** in the skill's usage guide (markdown, not JSON tokens):

```
## Type Pairings

### Recommendation 1: Playfair Display (humanist serif) + Inter (humanist sans)
Classification contrast: serif vs sans — category contrast in stroke style.
Playfair Display serves display headings (32px+) where personality and authority matter.
Inter serves body text and UI labels where legibility at small sizes is critical.
APCA note: Pair requires |Lc| ≥ 75 for Inter at body sizes (16px/400); Playfair at 36px+ needs |Lc| ≥ 45.
Avoid: Using Playfair below 24px — serifs at small sizes reduce legibility.
```

Source: composition-typography.md Type Pairing Classification; Google Fonts Knowledge "Choosing type"; pangrampangram.com font pairings 2025

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DTCG token format | Custom JSON schema | DTCG 2025.10 spec format | First stable spec as of Oct 2025; tool ecosystem (Style Dictionary, Tokens Studio) already adopted it |
| OKLCH harmony math | Custom color math | Embedded hue-rotation table from color-systems.md | Formulas already verified and present in the project; re-deriving creates inconsistency |
| APCA Lc values | Custom contrast ratio formula | APCA 0.98G pseudocode (embeddable) | WCAG 2.x formula is perceptually incorrect for modern displays; APCA is the emerging W3C standard |
| Spring easing values | Manually tuning cubic-bezier | motion-design.md verified values (level 1: `[0.34, 1.56, 0.64, 1]`; level 2: `linear(...)`) | These are empirically tuned values matching human perception — guessing produces wrong feel |
| Density spacing system | Ad hoc multipliers | IBM Carbon compact/normal/cozy pattern with semantic token overrides | Industry-validated; avoids magic numbers |
| Variable font axis ranges | Checking every font spec | Embedded axis ranges table (wght: 100-900, wdth: 75-125, opsz: 6-144) | These are the standard registered axis ranges per CSS Fonts Level 4 spec |

**Key insight:** The skill embeds design knowledge as generation instructions, not runtime code. Every formula, threshold, and range must be fully specified in the skill prose so Claude can compute correct values without external calls.

---

## Common Pitfalls

### Pitfall 1: DTCG Duration Format Changed in 2025.10
**What goes wrong:** Using `"$value": "200ms"` (string) for duration tokens.
**Why it happens:** Earlier DTCG drafts accepted string format. The 2025.10 stable spec requires `{ "value": 200, "unit": "ms" }` object format.
**How to avoid:** Always use the object form: `{ "value": 200, "unit": "ms" }` or `{ "value": 0.2, "unit": "s" }`.
**Warning signs:** Style Dictionary v4+ will reject string duration values with schema validation errors.

Note: The existing motion-design.md has `"$value": "100ms"` in its example — this is the PRE-2025.10 format. The skill must use the new object format. The existing skill's motion tokens section also uses the old string format and needs upgrading in this phase.

### Pitfall 2: APCA Polarity Confusion
**What goes wrong:** Using signed Lc values (-80 vs +80) inconsistently.
**Why it happens:** APCA Lc is negative when text is lighter than background (dark mode). Comparisons against thresholds fail.
**How to avoid:** Always use absolute value |Lc| for documentation and threshold comparisons. Use the myndex.com/APCA calculator which handles polarity. Document as "|Lc| 80" not "Lc -80".
**Warning signs:** Composition-typography.md already uses |Lc| notation — follow this established convention.

### Pitfall 3: OKLCH Harmony Colors Out of sRGB Gamut
**What goes wrong:** Harmony palettes generate OKLCH values with high chroma that display as neon or clipped on sRGB monitors.
**Why it happens:** OKLCH can express P3 and wide-gamut colors. High-chroma yellows and cyans in particular overflow sRGB.
**How to avoid:** Apply C_safe_max clamps from the scale table in color-systems.md. At L=0.55 (step 500), cap C at 0.25 maximum. Provide hex approximation alongside each OKLCH value.
**Warning signs:** Harmony colors with C > 0.30 at mid-lightness (L 0.4-0.7) are likely out of sRGB gamut.

### Pitfall 4: Spring Token Using Wrong DTCG Type
**What goes wrong:** Marking spring easing as `$type: "string"` or `$type: "custom"`.
**Why it happens:** `linear()` isn't a native DTCG type; developers reach for string.
**How to avoid:** Use `$type: "cubicBezier"` with the single-overshoot values as the canonical value, then store the `linear()` string in `$extensions.pde.linearSpring`. This makes the token valid per spec while preserving the full fidelity value for tools that support it.
**Warning signs:** Tools like Style Dictionary cannot transform `$type: "string"` to CSS easing — it just passes through as-is.

### Pitfall 5: Conflating Spacing Density with Scale Changes
**What goes wrong:** Generating a completely different spacing scale for each density context.
**Why it happens:** Misunderstanding density as "different numbers" vs "different semantic mappings to the same scale."
**How to avoid:** Keep ONE primitive spacing scale (15 steps, 4px base). Density contexts change only the semantic token assignments (`--spacing-component-gap` etc.) that reference different steps on the same primitive scale.
**Warning signs:** If compact mode has different step intervals than normal mode, the scale is wrong.

### Pitfall 6: Variable Font Axes That Don't Exist on the Loaded Font
**What goes wrong:** Generating wdth or slnt tokens for fonts that don't have those axes.
**Why it happens:** Not all variable fonts support all axes. Inter has wght. Roboto Flex has wght+wdth+opsz. Many fonts only have wght.
**How to avoid:** Document in the skill: "These tokens are generated as a capability map. Verify which axes your loaded font supports at v-fonts.com before applying axis animation." The token `$description` must explicitly state which fonts the axis applies to.
**Warning signs:** CSS `font-variation-settings: 'wdth' 120` on a font without wdth axis is silently ignored — but the token gives a false impression of functionality.

### Pitfall 7: WCAG 2.x vs APCA Contradiction
**What goes wrong:** A token pair meets APCA |Lc| 60 but fails WCAG 2.x 4.5:1 AA.
**Why it happens:** APCA and WCAG 2.x use fundamentally different models. A pair can satisfy one and fail the other.
**How to avoid:** Document BOTH values. WCAG 2.x is the legal compliance standard in most jurisdictions. APCA is the perceptual accuracy improvement. The composition-typography.md note is the correct pattern: "Text/background pair: |Lc| 88 (APCA preferred) / 6.2:1 (WCAG 2.x AA — compliant)".
**Warning signs:** Tokens that only document APCA values will fail WCAG 2.x compliance audits.

---

## Code Examples

### Complete Motion Token Block (SYS-01) — DTCG 2025.10 Format

```json
{
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
      "spring":   {
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
  }
}
```

Source: DTCG Format Module 2025.10 §9.4; motion-design.md

### CSS Output for Motion Tokens

```css
/* Source: DTCG motion tokens → derived CSS custom properties */

/* Duration scale */
:root {
  --duration-micro:    100ms;
  --duration-fast:     200ms;
  --duration-standard: 300ms;
  --duration-slow:     500ms;
  --duration-dramatic: 800ms;
}

/* Easing curves */
:root {
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter:    cubic-bezier(0, 0, 0.2, 1);
  --ease-exit:     cubic-bezier(0.4, 0, 1, 1);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
  /* Multi-bounce spring: use --ease-spring-bounce for 88%-support environments */
  --ease-spring-bounce: linear(
    0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 15%,
    0.721 19.4%, 0.877 23.8%, 1.003 27.3%, 1.096 29.8%,
    1.143 31.7%, 1.175 33.8%, 1.194 36%, 1.199 38.8%,
    1.185 42.8%, 1.126 49.6%, 1.067 56.3%, 1.027 62.8%,
    1.005 70.8%, 0.995 79.4%, 0.998 86.6%, 1
  );
}

/* Delay / choreography tokens */
:root {
  --delay-none:       0ms;
  --delay-stagger-sm: 60ms;
  --delay-stagger-md: 120ms;
  --delay-stagger-lg: 200ms;
  --delay-page:       300ms;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| DTCG duration as string (`"200ms"`) | Duration as object `{ value: 200, unit: "ms" }` | DTCG 2025.10 (Oct 2025) | Existing motion tokens in the skill need upgrading |
| WCAG 2.x contrast ratios only | APCA Lc alongside WCAG 2.x ratios | 2021-2025 (adoption phase) | WCAG 2.x still legally required; APCA improves perceptual accuracy |
| HSL color harmonies | OKLCH color harmonies with perceptual uniformity | 2022-2023 (widespread browser support) | Algorithmic palettes are reliable vs HSL which produces inconsistent visual weight |
| Single-overshoot cubic-bezier for "spring" | `linear()` for true multi-bounce spring (88% browser support) | Dec 2023 (Chrome/Firefox/Safari/Edge) | Single-overshoot is still the safe default; linear() unlocks physical feel |
| Static secondary color | Full harmony palette (4 types) | 2024-2025 (design system maturity) | Systems with harmony palettes score higher on Awwwards for non-generic color |
| Linear spacing scale only | Density context spacing (compact/default/cozy) | 2020+ (IBM Carbon established pattern) | Enables same token set to serve hero sections and data-dense views |

**Deprecated/outdated:**
- `$type: "custom"` for non-standard token types: use `$type: <closest standard type>` + `$extensions` instead (per DTCG 2025.10 guidance)
- WCAG 2.x contrast as the sole accessibility metric: supplement with APCA (do not replace, for legal reasons)
- Font pairing by size contrast only: classification contrast (category contrast) is now the documented standard

---

## Validation Architecture

> `nyquist_validation: true` in `.planning/config.json` — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bash test scripts (`.sh` pattern established in Phases 29-31) |
| Config file | None — standalone shell scripts |
| Quick run command | `bash .planning/phases/32-design-elevation-system-skill/test_sys01_motion_tokens.sh` |
| Full suite command | `for f in .planning/phases/32-design-elevation-system-skill/test_sys*.sh; do bash "$f"; done` |
| Estimated runtime | ~5 seconds |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SYS-01 | Motion tokens output contains 5+ duration steps, easing names, delay tokens in DTCG format | smoke (content check on generated JSON) | `bash .planning/phases/32-design-elevation-system-skill/test_sys01_motion_tokens.sh` | ❌ Wave 0 |
| SYS-02 | Variable font axis tokens present with wght/wdth/opsz axes and animation parameters | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys02_varfont_tokens.sh` | ❌ Wave 0 |
| SYS-03 | Harmony palettes block contains analogous-warm, analogous-cool, complementary, split-warm, split-cool, triadic-a, triadic-b entries | smoke (JSON key presence) | `bash .planning/phases/32-design-elevation-system-skill/test_sys03_harmony_palettes.sh` | ❌ Wave 0 |
| SYS-04 | APCA $description annotations present on primary and secondary text color tokens; CSS comment block with Lc guidance present | smoke (content grep) | `bash .planning/phases/32-design-elevation-system-skill/test_sys04_apca_guidance.sh` | ❌ Wave 0 |
| SYS-05 | CSS output contains `[data-density="compact"]` and `[data-density="cozy"]` blocks with semantic spacing tokens | smoke | `bash .planning/phases/32-design-elevation-system-skill/test_sys05_density_spacing.sh` | ❌ Wave 0 |
| SYS-06 | Skill usage guide output contains type pairing section with at least 3 pairings, each with 4-field rationale | smoke (content check on .md output) | `bash .planning/phases/32-design-elevation-system-skill/test_sys06_type_pairings.sh` | ❌ Wave 0 |

**Manual-only items:** None — all six requirements have verifiable structural outputs in generated files.

### Sampling Rate

- **Per task commit:** `bash .planning/phases/32-design-elevation-system-skill/test_sys04_apca_guidance.sh` (fastest, tests the hardest requirement)
- **Per wave merge:** `for f in .planning/phases/32-design-elevation-system-skill/test_sys*.sh; do bash "$f"; done`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test_sys01_motion_tokens.sh` — covers SYS-01
- [ ] `test_sys02_varfont_tokens.sh` — covers SYS-02
- [ ] `test_sys03_harmony_palettes.sh` — covers SYS-03
- [ ] `test_sys04_apca_guidance.sh` — covers SYS-04
- [ ] `test_sys05_density_spacing.sh` — covers SYS-05
- [ ] `test_sys06_type_pairings.sh` — covers SYS-06

Note: Tests must run against a generated token file (requires `/pde:system` to have run). Wave 0 should create a fixture token file at `.planning/phases/32-design-elevation-system-skill/fixtures/SYS-tokens-fixture.json` for tests to validate against. All tests grep this fixture and the generated CSS file.

---

## Open Questions

1. **DTCG duration object format vs existing skill string format**
   - What we know: DTCG 2025.10 requires `{ value: N, unit: "ms" }` but existing skill uses `"200ms"` strings
   - What's unclear: Whether to upgrade ALL existing motion tokens or only the new ones
   - Recommendation: Upgrade all motion tokens to object format in this phase — the spec is stable and tools expect it

2. **APCA Lc pre-computation strategy**
   - What we know: The skill cannot execute JavaScript at generation time; APCA requires arithmetic on linearized sRGB values
   - What's unclear: Whether to embed the full pseudocode algorithm or rely on pre-computed table lookup for the specific token values the system generates
   - Recommendation: Use pre-computed table for the fixed semantic tokens (primary/secondary text on default backgrounds), plus embed the algorithm pseudocode so the skill can compute values for custom colors provided in briefs

3. **Harmony palette integration with existing secondary palette**
   - What we know: Current skill generates one complementary secondary. SYS-03 wants all 4 harmony types
   - What's unclear: Whether to replace the existing secondary with the harmony block, or add the harmony block alongside the existing secondary
   - Recommendation: Keep the existing `color.secondary` (complementary) as the primary semantic alias; add `color.harmony` as a new block with all 7 harmonies (both analogous variants, both split variants, both triadic variants, and the complementary already present in secondary)

---

## Sources

### Primary (HIGH confidence)
- `designtokens.org/tr/drafts/format/` — DTCG Format Module 2025.10, first stable spec, all token type definitions
- `git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html` — APCA Lc thresholds and readability levels
- `github.com/Myndex/SAPC-APCA/blob/master/documentation/APCA-W3-LaTeX.md` — APCA 0.98G-4g formula (version 0.0.98G-4g-base-W3)
- `references/color-systems.md` — OKLCH harmony hue-rotation formulas, palette generation algorithm (project reference)
- `references/motion-design.md` — Duration scale, easing curves, spring fidelity levels, existing DTCG motion examples (project reference)
- `references/composition-typography.md` — APCA threshold table, type pairing classification (project reference)
- `developer.mozilla.org/en-US/docs/Web/CSS/font-variation-settings` — Variable font axes, CSS implementation, browser support

### Secondary (MEDIUM confidence)
- `joshwcomeau.com/animation/linear-timing-function/` — CSS linear() spring technique, multi-bounce values (verified against MDN)
- `w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/` — DTCG stable release announcement
- IBM Carbon Design System spacing density docs — compact/cozy/normal pattern (verified via multiple Carbon references)
- `facelessuser.github.io/coloraide/harmonies/` — OKLCH harmony computation (verified against color-systems.md)

### Tertiary (LOW confidence)
- pangrampangram.com font pairings 2025 — contemporary pairing examples (marketing content, not specification)

---

## Metadata

**Confidence breakdown:**
- DTCG token format: HIGH — first stable spec (2025.10), fetched directly from designtokens.org
- DTCG duration object format: HIGH — confirmed by spec fetch; notable upgrade from existing skill
- OKLCH harmony math: HIGH — formulas already in project references, cross-checked against coloraide docs
- APCA Lc computation: HIGH — formula verified from official SAPC-APCA repo; threshold table from official documentation
- Variable font axes: HIGH — MDN living standard; confirmed by existing motion-design.md
- Type pairing theory: HIGH — Vox-ATypI taxonomy confirmed; rationale format already established in project
- Spacing density: MEDIUM-HIGH — IBM Carbon is authoritative but the "hero/content/dense" naming used in SYS-05 maps to "cozy/normal/compact" in Carbon; naming translation needed

**Research date:** 2026-03-17
**Valid until:** 2026-09-17 (stable spec + slow-moving domain — 6 months safe)
