# Typography Reference Library

> Curated typography knowledge for the `/pde:system` skill's typography subagent.
> Loaded via `@` reference from `system.md` during token generation.

---

## Modular Scale Algorithms

### Named Ratios

Modular scales create mathematical harmony in type hierarchies. Each ratio produces a distinct visual rhythm.

| Ratio Name | Value | Character | Best For |
|---|---|---|---|
| Minor Second | 1.067 | Barely perceptible steps | Dense data UIs, compact tables |
| Major Second | 1.125 | Subtle, restrained | Admin panels, form-heavy interfaces |
| Minor Third | 1.200 | Balanced, versatile | General-purpose apps, SaaS dashboards |
| Major Third | 1.250 | Clear hierarchy, professional | Corporate sites, documentation |
| Perfect Fourth | 1.333 | Expressive, spacious | Marketing pages, playful products |
| Augmented Fourth | 1.414 | Dramatic, editorial | Long-form reading, magazines, blogs |
| Perfect Fifth | 1.500 | Bold, high contrast | Hero-heavy landing pages, presentations |

### Preset Mapping

Each PDE preset maps to a specific ratio that matches its intended personality:

| Preset | Ratio | Value | Rationale |
|---|---|---|---|
| minimal | Minor Third | 1.200 | Subtle hierarchy suits clean, restrained design |
| corporate | Major Third | 1.250 | Professional clarity without drama |
| playful | Perfect Fourth | 1.333 | Expressive spacing communicates energy |
| editorial | Augmented Fourth | 1.414 | Dramatic scale for reading-focused layouts |

### Scale Generation Formula

Generate a type scale from a base size and ratio:

```
size = base * ratio^n

where:
  base = 1rem (16px default)
  ratio = selected ratio value
  n = scale position:
    xs:   n = -2
    sm:   n = -1
    base: n = 0
    lg:   n = 1
    xl:   n = 2
    2xl:  n = 3
    3xl:  n = 4
    4xl:  n = 5
```

**Example with Minor Third (1.200), base = 1rem:**

| Step | n | Calculation | Result (rem) | Result (px) |
|---|---|---|---|---|
| xs | -2 | 1 * 1.2^-2 | 0.694 | 11.1 |
| sm | -1 | 1 * 1.2^-1 | 0.833 | 13.3 |
| base | 0 | 1 * 1.2^0 | 1.000 | 16.0 |
| lg | 1 | 1 * 1.2^1 | 1.200 | 19.2 |
| xl | 2 | 1 * 1.2^2 | 1.440 | 23.0 |
| 2xl | 3 | 1 * 1.2^3 | 1.728 | 27.6 |
| 3xl | 4 | 1 * 1.2^4 | 2.074 | 33.2 |
| 4xl | 5 | 1 * 1.2^5 | 2.488 | 39.8 |

Round all values to 3 decimal places.

### Line-Height Derivation

Line-height decreases as font size increases. Larger text needs tighter leading.

```
lineHeight = max(1.1, 1.6 - (step * 0.05))

where step maps to scale position:
  xs:   step = 0  -> lineHeight = 1.60
  sm:   step = 1  -> lineHeight = 1.55
  base: step = 2  -> lineHeight = 1.50
  lg:   step = 3  -> lineHeight = 1.45
  xl:   step = 4  -> lineHeight = 1.40
  2xl:  step = 5  -> lineHeight = 1.35
  3xl:  step = 6  -> lineHeight = 1.30
  4xl:  step = 7  -> lineHeight = 1.25
```

Clamp to range [1.1, 1.6]. For display sizes (3xl+), prefer even tighter (1.1-1.2) when the typeface allows.

### Letter-Spacing Derivation

Letter-spacing adjusts with size: slight positive at small sizes for readability, negative at large sizes for visual density.

```
letterSpacing (em):
  xs:   +0.04em   (open for small text legibility)
  sm:   +0.02em
  base:  0.00em   (neutral at body size)
  lg:   -0.005em
  xl:   -0.01em
  2xl:  -0.02em   (tighten for visual weight)
  3xl:  -0.02em
  4xl:  -0.025em
```

---

## Font Pairing Rules

### Core Principle

**Contrast in structure, harmony in proportions.**

Pair typefaces that differ in classification (sans-serif + serif, geometric + humanist) but share similar proportions (x-height, character width). This creates visual interest without dissonance.

### Key Pairing Guidelines

1. **One display, one body.** Never use two display faces or two body faces together.
2. **Match x-height.** Faces with similar x-heights feel cohesive even when structurally different.
3. **Limit to 2 families.** A display face and a body face cover all needs. Use weight/style variants within each family for additional hierarchy.
4. **Test at body size first.** The body face must be comfortable at 16px. Display faces only need to work at 24px+.
5. **Consider language support.** Both faces must cover the project's required character sets.

### Curated Pairings

| Display Font | Body Font | Mood | Best For |
|---|---|---|---|
| Inter | Inter | Clean, neutral, systematic | SaaS dashboards, admin tools, developer products |
| Space Grotesk | Inter | Technical, modern, precise | Developer tools, fintech, technical documentation |
| DM Sans | DM Serif Display | Friendly, warm, approachable | Consumer apps, creative tools, portfolios |
| Inter | Merriweather | Professional, trustworthy | Corporate sites, legal, finance |
| Instrument Serif | DM Sans | Elegant, contemporary | Fashion, luxury, editorial brands |
| Space Grotesk | Lora | Modern + classic contrast | Hybrid editorial, magazines with data |
| Sora | Inter | Geometric, futuristic | Web3, AI products, innovation brands |
| Fraunces | Inter | Distinctive, characterful | Brand-forward products, premium SaaS |
| Plus Jakarta Sans | Literata | Warm professional | Content platforms, education, publishing |
| Geist | Geist Mono | Developer-native | CLI tools, code editors, developer platforms |

### System Font Stacks (Fallbacks)

Always provide system font fallbacks that approximate the web font's metrics:

**Sans-serif stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
```

**Serif stack:**
```css
font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
```

**Monospace stack:**
```css
font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
```

---

## Web Font Loading Strategy

### font-display Strategy

Always use `font-display: swap` to prevent Flash of Invisible Text (FOIT):

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

### Fallback Font Metrics Matching

Use CSS font metric overrides to reduce Cumulative Layout Shift (CLS) when the web font loads:

```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107.64%;
  ascent-override: 90%;
  descent-override: 22.43%;
  line-gap-override: 0%;
}
```

Apply fallback in the font stack:

```css
:root {
  --font-family-body: 'Inter', 'Inter Fallback', sans-serif;
}
```

### Subsetting Guidance

- **Latin subset** (`unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`): sufficient for most English-language projects
- **Latin Extended** (`U+0100-024F, U+0259, U+1E00-1EFF`): add for European languages
- **Full Unicode range**: only when project requires CJK, Arabic, Devanagari, or other non-Latin scripts
- Each subset should be a separate `@font-face` rule with its own `unicode-range` for automatic browser-managed loading

### Loading Priority

1. **Critical fonts** (body text, primary heading): preload in `<head>`
   ```html
   <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
   ```
2. **Secondary fonts** (decorative, display): standard `@font-face` (browser loads on first use)
3. **Icon fonts**: prefer inline SVG icons instead; if font icons required, load via standard `@font-face`

### Variable Fonts Preference

Prefer variable fonts when available:
- Single file replaces multiple weight/style files
- Smaller total download for projects using 3+ weights
- Enable fine-grained weight control (e.g., `font-weight: 450`)
- Most modern typefaces (Inter, DM Sans, Space Grotesk) offer variable font files

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;      /* Full weight range */
  font-style: normal;
  font-display: swap;
}
```

---

## DTCG Token Format for Typography

### Composite Typography Token

```json
{
  "typography": {
    "heading-1": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{fontFamily.display}",
        "fontSize": "{fontSize.4xl}",
        "fontWeight": 700,
        "lineHeight": 1.1,
        "letterSpacing": "-0.02em"
      },
      "$description": "Primary heading style"
    },
    "body": {
      "$type": "typography",
      "$value": {
        "fontFamily": "{fontFamily.body}",
        "fontSize": "{fontSize.base}",
        "fontWeight": 400,
        "lineHeight": 1.5,
        "letterSpacing": "0em"
      },
      "$description": "Default body text style"
    }
  }
}
```

### Font Family Tokens

```json
{
  "fontFamily": {
    "display": {
      "$type": "fontFamily",
      "$value": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      "$description": "Display/heading font stack"
    },
    "body": {
      "$type": "fontFamily",
      "$value": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      "$description": "Body text font stack"
    },
    "mono": {
      "$type": "fontFamily",
      "$value": ["Geist Mono", "ui-monospace", "Cascadia Code", "Source Code Pro", "monospace"],
      "$description": "Monospace font stack for code"
    }
  }
}
```

### Font Size Tokens (Dimension Type)

```json
{
  "fontSize": {
    "$type": "dimension",
    "xs":   { "$value": "0.694rem", "$description": "Extra small text" },
    "sm":   { "$value": "0.833rem", "$description": "Small text, captions" },
    "base": { "$value": "1rem",     "$description": "Body text (16px)" },
    "lg":   { "$value": "1.2rem",   "$description": "Large body, introductions" },
    "xl":   { "$value": "1.44rem",  "$description": "Subheadings" },
    "2xl":  { "$value": "1.728rem", "$description": "Section headings" },
    "3xl":  { "$value": "2.074rem", "$description": "Page headings" },
    "4xl":  { "$value": "2.488rem", "$description": "Display text" }
  }
}
```

### CSS Custom Property Naming Convention

```css
/* Font families */
--font-family-display: 'Inter', sans-serif;
--font-family-body: 'Inter', sans-serif;
--font-family-mono: 'Geist Mono', monospace;

/* Font sizes (from modular scale) */
--font-size-xs: 0.694rem;
--font-size-sm: 0.833rem;
--font-size-base: 1rem;
--font-size-lg: 1.2rem;
--font-size-xl: 1.44rem;
--font-size-2xl: 1.728rem;
--font-size-3xl: 2.074rem;
--font-size-4xl: 2.488rem;

/* Font weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line heights (leading) */
--leading-xs: 1.6;
--leading-sm: 1.55;
--leading-base: 1.5;
--leading-lg: 1.45;
--leading-xl: 1.4;
--leading-2xl: 1.35;
--leading-3xl: 1.3;
--leading-4xl: 1.25;

/* Letter spacing (tracking) */
--tracking-xs: 0.04em;
--tracking-sm: 0.02em;
--tracking-base: 0em;
--tracking-lg: -0.005em;
--tracking-xl: -0.01em;
--tracking-2xl: -0.02em;
--tracking-3xl: -0.02em;
--tracking-4xl: -0.025em;
```

---

## Curated Defaults per Preset

### Minimal

**Personality:** Clean, restrained, invisible design. Content speaks.

| Property | Value |
|---|---|
| Display Font | Inter (or system-ui) |
| Body Font | Inter (or system-ui) |
| Scale Ratio | Minor Third (1.200) |
| Spacing Feel | Tight -- compact but breathable |
| Font Weights | 400, 500, 600 (skip 700 for restraint) |
| Heading Style | Semibold (600), no uppercase |
| Base Line-Height | 1.5 |

**Real-world references:** Linear, Vercel, Raycast, Arc Browser

**Key characteristics:**
- Single typeface (Inter or system-ui) used for everything
- Hierarchy through weight and size only, never decoration
- Minimal letter-spacing adjustments
- Labels and captions at `--font-size-xs` with `--font-weight-medium`

### Corporate

**Personality:** Professional, trustworthy, structured clarity.

| Property | Value |
|---|---|
| Display Font | Inter |
| Body Font | Source Serif 4 (or Merriweather for serif variant) |
| Scale Ratio | Major Third (1.250) |
| Spacing Feel | Standard -- balanced whitespace |
| Font Weights | 400, 500, 600, 700 |
| Heading Style | Bold (700), sentence case |
| Base Line-Height | 1.5 |

**Real-world references:** Stripe, Notion, Atlassian, Shopify Admin

**Key characteristics:**
- Sans-serif headings + serif body text for authority
- Clear weight differentiation between heading levels
- Standard letter-spacing (body at 0, headings slightly negative)
- Strong visual hierarchy supporting scannable content

### Playful

**Personality:** Energetic, friendly, expressive, creative.

| Property | Value |
|---|---|
| Display Font | DM Sans (or Plus Jakarta Sans) |
| Body Font | DM Serif Display (or DM Sans for all-sans variant) |
| Scale Ratio | Perfect Fourth (1.333) |
| Spacing Feel | Generous -- open, airy layouts |
| Font Weights | 400, 500, 700 |
| Heading Style | Bold (700), sometimes rounded |
| Base Line-Height | 1.55 |

**Real-world references:** Figma, Framer, Canva, Notion Marketing

**Key characteristics:**
- Larger size jumps between scale steps create energy
- Display font with distinctive character (geometric or rounded)
- Generous line-height and spacing for breathing room
- Occasional use of heavier weights for emphasis

### Editorial

**Personality:** Reading-focused, literary, spacious, contemplative.

| Property | Value |
|---|---|
| Display Font | Literata (or Instrument Serif, Fraunces) |
| Body Font | Inter (or DM Sans) |
| Scale Ratio | Augmented Fourth (1.414) |
| Spacing Feel | Spacious -- prioritizes reading comfort |
| Font Weights | 400, 500, 700 |
| Heading Style | Serif italic or serif bold, elegant |
| Base Line-Height | 1.6 |

**Real-world references:** Medium, Substack, The Verge, Monocle

**Key characteristics:**
- Dramatic size contrast between body and headings
- Serif display font for editorial authority
- Maximum line-height for comfortable reading
- Generous paragraph spacing (1.5-2em between paragraphs)
- Optimal reading line length: 55-75 characters (set with `max-width: 65ch`)

---

## Responsive Typography

### Fluid Type Scaling

For responsive designs, scale font sizes between viewport breakpoints:

```css
/* Fluid base size: 16px at 320px viewport, 18px at 1280px viewport */
:root {
  --font-size-base: clamp(1rem, 0.875rem + 0.4167vw, 1.125rem);
}
```

All scale sizes derived from `--font-size-base` automatically scale when using `rem` units.

### Breakpoint Adjustments

At narrow viewports, reduce the scale ratio to prevent oversized headings:

```css
/* Default: full ratio */
:root {
  --type-ratio: 1.250;
}

/* Mobile: compress ratio */
@media (max-width: 640px) {
  :root {
    --type-ratio: 1.125;
  }
}
```

### Reading Width

Constrain body text to optimal reading width regardless of viewport:

```css
.prose {
  max-width: 65ch;     /* 55-75 characters per line */
  margin-inline: auto; /* Center in container */
}
```

---

## Citations

- **Modular Scale Calculator:** https://www.modularscale.com/ -- interactive ratio calculator and scale visualization
- **MDN @font-face:** https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face -- specification reference for font loading
- **MDN font-display:** https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display -- swap, fallback, optional strategies
- **Google Fonts API:** https://fonts.google.com/ -- source for Inter, DM Sans, Literata, Space Grotesk, and other referenced typefaces
- **DTCG Format Module:** https://www.designtokens.org/tr/drafts/format/ -- token format specification including typography composite type
- **Web.dev Font Best Practices:** https://web.dev/articles/font-best-practices -- preload, fallback metrics, CLS reduction
- **Smashing Magazine Variable Fonts Guide:** https://www.smashingmagazine.com/2017/09/new-font-technologies-improve-web/ -- variable font advantages
- **Linear Design:** https://linear.app/ -- reference for minimal typography approach
- **Stripe Design:** https://stripe.com/ -- reference for corporate typography approach
- **Figma Design:** https://figma.com/ -- reference for playful typography approach
- **Medium Design:** https://medium.com/ -- reference for editorial typography approach

---

*Version: 1.0.0*
*Last updated: 2026-03-10*
*Loaded by: system.md typography subagent via @ reference*
