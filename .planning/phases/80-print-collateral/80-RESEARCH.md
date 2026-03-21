# Phase 80: Print Collateral — Research

**Researched:** 2026-03-21
**Domain:** CSS paged media, print-spec HTML generation, CMYK approximation, series identity templates, Awwwards-level print composition
**Confidence:** HIGH (CSS @page spec verified via MDN; CMYK formula verified via RapidTables; bleed standards verified via print house specs; project conventions verified via codebase inspection)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PRNT-01 | Event flyer generated as print-ready HTML at standard dimensions (A5, A4, Instagram square/story) | CSS @page named sizes + pixel variants; bleed/safe-zone visualization pattern documented |
| PRNT-02 | Series identity template generated with `{{variable}}` slots for recurring events | No-library template slot pattern documented; `recurring-series` sub-type gate documented |
| PRNT-03 | Festival program generated as multi-page HTML (schedule grid, artist bios, map, sponsors) | Multi-page @page named-page pattern documented; print composition for dense schedule grids documented |
| PRNT-04 | All print artifacts follow Awwwards-level composition (focal point, negative space, type hierarchy, max 2-3 typefaces) | Composition rules, grid choices, and typography constraints documented in Architecture Patterns |
</phase_requirements>

---

## Summary

Phase 80 generates self-contained HTML files that serve as composition references for print collateral — event flyers (FLY), series identity templates (SIT), and festival programs (PRG). These are design-phase artifacts, not production print files. This distinction is architectural: the "print-ready" prohibition (locked in STATE.md) is structural to the prepress disclaimer system.

The core technical challenge is that CSS `@page` has split support: the `size` descriptor (including named keywords like `A5`, `A4`) is **well-supported** across Chrome, Firefox, and Safari as of late 2024 ("Baseline 2024"). However, the `bleed` and `marks` descriptors are **not implemented in any browser**. This means the canonical "bleed box" visualization must be faked using CSS `box-shadow` or border insets on the page container div, not via `@page` properties. Chrome is the only reliable browser for printing — this aligns with the STATE.md research flag.

For CMYK approximation, no npm library is needed. The standard sRGB-to-CMYK formula (normalize to 0–1, derive K from max channel, derive C/M/Y from remainder) is a dozen lines of pure JavaScript. These are approximation tables for visual reference only — the prepress disclaimer covers the gap. The formula produces "good enough" values for identifying ink-heavy colors but is not ICC-profile accurate.

The `{{variable}}` slot pattern for series identity templates should be implemented as literal `{{placeholder}}` strings in the HTML output with a CSS class for visual highlighting. No template engine library is needed — the slots are editorial markers for human substitution, not programmatic substitution. This is consistent with how the REQUIREMENTS.md describes the feature: "edition-specific values."

**Primary recommendation:** Implement all print artifacts as pure HTML/CSS with inline styles and no external dependencies. Use named `@page { size: A5 }` for paper formats. Fake bleed with a dashed `outline` or `box-shadow` on `.page-container`. Generate CMYK tables with a 12-line inline function. Use `{{VARIABLE_NAME}}` slots with `background-color: rgba(255,200,0,0.3)` for visual identification. Embed Google Fonts via `<link>` in the `<head>` — self-contained offline embedding via base64 `@font-face` is only needed if offline file portability is a hard requirement (it is not stated).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (pure HTML/CSS) | — | Print artifact generation | No build step; self-contained file:// compatible; matches existing WFR artifact pattern |
| Node.js built-in | v20 | CMYK table generation as inline JS | No dependency; formula is 12 lines; already used for pde-tools.cjs |

### Supporting (optional, not required)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pagedjs | 0.4.3 (last published 2024-10-04) | CSS Paged Media polyfill enabling `bleed`, `marks`, margin boxes | ONLY if production-quality bleed boxes become a hard requirement; last published Oct 2024, MIT license |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline CMYK function | `color-convert` npm (v3.1.3) | color-convert is zero-dependency, well-tested, but adds an npm install to a workflow that generates static HTML — not worth it for a 12-line formula |
| `{{slot}}` markers in HTML | Mustache/Handlebars template engine | Handlebars requires runtime JS execution; the slots are design-time editorial markers, not programmatic templates; literal strings are simpler and self-documenting |
| Faked bleed borders | `pagedjs` polyfill | Paged.js adds ~180KB JS to each HTML file and requires a `<script>` tag that breaks file:// isolation for offline use; faked borders are visually sufficient for composition reference |

**Installation:** No npm packages required for Phase 80. All generation logic lives inside the wireframe.md workflow file as Claude-executed code.

---

## Architecture Patterns

### Recommended Project Structure

Print artifacts live in the `physical` design domain, which was added to `DOMAIN_DIRS` in Phase 74 as a non-breaking additive change. Artifact codes follow the established PDE convention:

```
.planning/design/physical/print/
├── FLY-event-flyer-v1.html       # FLY artifact — event flyer, all format variants
├── SIT-series-identity-v1.html   # SIT artifact — series identity template (recurring-series only)
└── PRG-festival-program-v1.html  # PRG artifact — multi-page program (multi-day/festival only)
```

**Note on PRNT-03 (festival program):** PRNT-01, PRNT-02, and PRNT-04 are Phase 80 core scope. PRNT-03 (festival program) requires multi-page HTML and is more complex — it should be Plan 2 of the phase and may target `multi-day` sub-type only.

### Pattern 1: CSS @page Named Size with Screen/Print Dual Mode

For paper-sized artifacts (A5, A4), use named `@page` keywords. For digital-only formats (Instagram), use pixel dimensions. Dual mode via `@media` lets the file look correct in browser AND print:

```css
/* Source: MDN CSS @page/size — Baseline 2024, all major browsers */

/* Paper variant — A5 flyer */
@page {
  size: A5 portrait;
  margin: 0;
}

/* Override for digital variants: Instagram square = 1080x1080px */
/* Use a .format-instagram-square class on <body> to switch contexts */
@page {
  /* For screen-only digital variants, omit @page entirely — use fixed px dimensions on .page-container */
}

/* Screen preview mode (all artifacts) */
.page-container {
  width: 148mm;        /* A5 width */
  height: 210mm;       /* A5 height */
  margin: 20mm auto;   /* Preview breathing room */
  position: relative;
  background: white;
}

/* Bleed zone — 3mm standard (print house spec for A5 flyers) */
/* Cannot use @page { bleed: 3mm } — no browser implements this */
/* Workaround: outline on container + negative overflow */
.page-container::before {
  content: '';
  position: absolute;
  inset: -3mm;
  border: 1px dashed rgba(0,0,255,0.4);  /* Dashed blue = bleed zone */
  pointer-events: none;
}

/* Safe zone — 5mm inside trim (per PRNT-01 success criteria) */
.page-container::after {
  content: '';
  position: absolute;
  inset: 5mm;
  border: 1px dashed rgba(255,0,0,0.3);  /* Dashed red = safe zone */
  pointer-events: none;
}

/* Print mode — hide bleed/safe guides, enforce @page size */
@media print {
  .page-container::before,
  .page-container::after { display: none; }
  .bleed-legend, .cmyk-table, .prepress-disclaimer { display: none; }
}
```

**Why this works:** The dashed pseudo-element borders are visible in browser preview but hidden on print. The actual `@page { size: A5 }` tells the browser's print dialog the target paper size. Chrome reliably respects this when printing to PDF.

### Pattern 2: Instagram Digital Format — Fixed Pixel Dimensions

Instagram formats are screen-only, not paper. Do NOT use `@page` for these:

```css
/* Source: Buffer/Instagram official sizing guides — 2026 current */
/* Instagram square: 1080x1080px */
/* Instagram story: 1080x1920px (9:16 aspect ratio) */

/* Use format-specific classes, toggled via HTML tabs or separate files */
.format-ig-square .page-container {
  width: 1080px;
  height: 1080px;
  /* Scale down for screen viewing */
  transform: scale(0.35);
  transform-origin: top left;
}

.format-ig-story .page-container {
  width: 1080px;
  height: 1920px;
  transform: scale(0.25);
  transform-origin: top left;
}
```

**Important constraint:** Instagram artifacts are compositional references for designing the image. The HTML is not submitted to Instagram — it is a layout guide. No `@page` rule is appropriate. The artist/designer exports it as an image.

### Pattern 3: CMYK Approximation Table — Inline Generation

No npm package needed. Embed this function in the wireframe.md generation prompt:

```javascript
// Source: RapidTables RGB-to-CMYK standard formula
// Limitation: sRGB-only, no ICC profile correction, gamut mapping absent
// Purpose: composition reference only — NOT for production color matching

function rgbToCmyk(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
  const kk = Math.round(k * 100);
  const inkTotal = c + m + y + kk;
  return { c, m, y, k: kk, inkTotal };
}

// Ink total warning: professional print houses require < 300% total ink coverage
// (240% for uncoated/newsprint). Flag in the CMYK table if inkTotal > 300.

function hexToCmyk(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return rgbToCmyk(r, g, b);
}
```

**CMYK table HTML template** (embed inline in flyer HTML):

```html
<!-- Source: inline generation from SYS-experience-tokens.json brand colors -->
<table class="cmyk-approx-table">
  <caption>CMYK Approximation — Composition Reference Only</caption>
  <thead>
    <tr>
      <th>Color</th><th>Hex</th><th>C</th><th>M</th><th>Y</th><th>K</th>
      <th>Ink Total</th><th>Warning</th>
    </tr>
  </thead>
  <tbody>
    <!-- Generated per brand color in SYS-experience-tokens.json -->
    <tr>
      <td><span style="display:inline-block;width:20px;height:20px;background:#FF5500"></span></td>
      <td>#FF5500</td><td>0%</td><td>67%</td><td>100%</td><td>0%</td>
      <td>167%</td><td>—</td>
    </tr>
  </tbody>
</table>
<p class="cmyk-disclaimer">
  ⚠ COMPOSITION REFERENCE ONLY. These CMYK values are mathematical approximations from
  sRGB hex values. They do not account for ICC profiles, paper stock, or press calibration.
  Provide actual brand color specifications (Pantone, CMYK from brand guide) to your print
  supplier. This artifact is NOT print-ready.
</p>
```

### Pattern 4: {{Variable}} Slots for Series Identity Templates

For recurring-series sub-type. No template library needed. Slots are visual editorial markers:

```html
<!-- Source: REQUIREMENTS.md PRNT-02 spec — {{variable}} slots for edition-specific values -->
<!-- Gate: only generate SIT when experienceSubType === "recurring-series" -->

<style>
  .template-slot {
    background: rgba(255, 200, 0, 0.25);
    border: 1px dashed rgba(200,150,0,0.6);
    padding: 2px 4px;
    border-radius: 2px;
    font-style: italic;
    color: #7a5c00;
  }
</style>

<h2 class="flyer-headline">
  <span class="template-slot">{{EVENT_NAME}}</span>
</h2>
<p class="flyer-date">
  <span class="template-slot">{{DATE}}</span> —
  <span class="template-slot">{{VENUE}}</span>
</p>
<p class="flyer-headliner">
  Headliner: <span class="template-slot">{{HEADLINER}}</span>
</p>
```

**Mandatory slots for recurring-series SIT:** `{{EVENT_NAME}}`, `{{DATE}}`, `{{VENUE}}`, `{{HEADLINER}}`, `{{EDITION_NUMBER}}` (e.g., "Vol. 12"). These are the minimum edition-specific values per PRNT-02.

### Pattern 5: Multi-Format Variant Switcher (Single HTML File)

A5, A4, Instagram square, and Instagram story as tabs or format-select in a single self-contained file:

```html
<!-- Format selector — JavaScript toggling CSS classes on <body> -->
<nav class="format-selector" aria-label="Print format variants">
  <button onclick="setFormat('a5')" class="format-btn active">A5 Flyer</button>
  <button onclick="setFormat('a4')" class="format-btn">A4 Poster</button>
  <button onclick="setFormat('ig-square')" class="format-btn">Instagram Square</button>
  <button onclick="setFormat('ig-story')" class="format-btn">Instagram Story</button>
</nav>
<script>
function setFormat(f) {
  document.body.dataset.format = f;
  document.querySelectorAll('.format-btn').forEach(b =>
    b.classList.toggle('active', b.textContent.toLowerCase().includes(f.replace('-',' ')))
  );
}
</script>
```

Each format's `@page` rule and container dimensions are controlled by `body[data-format="a5"] .page-container { ... }` selectors.

### Pattern 6: Prepress Disclaimer — Mandatory Placement

Per STATE.md locked decision: "print-ready" phrase is prohibited without adjacent prepress disclaimer. Pattern:

```html
<!-- Mandatory: appears once per artifact, immediately below page-container -->
<aside class="prepress-disclaimer" role="note" aria-label="Prepress notice">
  <strong>COMPOSITION REFERENCE — NOT A PRODUCTION PRINT FILE.</strong>
  This artifact is a design composition guide. It is not suitable for submission to a
  print supplier. Resolution, color accuracy, bleed registration, and ICC profile
  conformance have not been verified. Provide production-ready artwork (PDF/X-1a or
  PDF/X-4, 300dpi, CMYK, embedded fonts) to your print supplier.
</aside>
```

### Anti-Patterns to Avoid

- **Using `@page { bleed: 3mm }` or `@page { marks: crop }` in the generated HTML** — no browser implements these; they silently do nothing. Use pseudo-element borders instead.
- **Using `@import` in `<style>` blocks** — does not work at `file://` in all browsers (documented in wireframe.md prohibited patterns). Use `<link rel="stylesheet">` only.
- **Absolute filesystem paths in `href`/`src`** — breaks when files are moved. Use inline styles and data URIs for self-contained files.
- **Embedding fonts as base64 data URIs in the generated HTML** — base64 adds ~33% size overhead and makes the file uneditable. Use `<link href="https://fonts.googleapis.com/...">` for connected mode; document this as a limitation for offline mode.
- **Using "print-ready" in any generated output without the prepress disclaimer** — locked architectural constraint in STATE.md.
- **Generating CMYK values without the approximation disclaimer** — the formula is mathematically correct but not colorimetrically accurate; the disclaimer is non-negotiable.
- **Treating Instagram formats as print formats** — Instagram square/story are screen-only (72–96 PPI). Never assign `@page { size: 1080px }` for Instagram — use fixed px container dimensions with `transform: scale()` for screen preview.
- **Generating SIT (series identity template) for non-recurring-series sub-types** — the gate `IF experienceSubType === "recurring-series"` must precede SIT generation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CMYK conversion | Custom formula from scratch | The 12-line inline formula documented above | Formula is mathematically standard; edge cases (k=1 division-by-zero) are known and handled |
| Template variable substitution | Mustache/Handlebars runtime | Literal `{{SLOT_NAME}}` strings in HTML output | The slots are editorial markers for human substitution, not programmatic templates; runtime engine adds complexity with no benefit |
| Bleed crop marks | Custom SVG crop mark generator | Dashed pseudo-element borders (documented pattern) | CSS pseudo-elements are self-contained; SVG crop marks would need to be positioned precisely and add significant complexity |
| Font loading for offline files | Base64 `@font-face` embed | Google Fonts `<link>` with documented offline caveat | Base64 encoding makes files uneditable and adds 33% size; the offline use case is not stated in requirements |
| Page dimension lookup | Custom paper size database | CSS `@page { size: A5 }` named keywords | Named keywords (A5, A4, letter) are part of the CSS paged media spec, Baseline 2024 |

**Key insight:** This phase generates HTML composition reference artifacts, not production print tools. The appropriate complexity level is "sophisticated HTML/CSS hand-written by a skilled author" — the same architecture as existing WFR wireframe artifacts.

---

## Common Pitfalls

### Pitfall 1: Confusing Bleed Implementation With @page Properties
**What goes wrong:** Developer writes `@page { bleed: 3mm; marks: crop; }` expecting bleed zone to appear. It silently does nothing in all browsers.
**Why it happens:** The CSS Paged Media spec defines these properties but no browser implements them (verified via MDN as of 2024).
**How to avoid:** Use `::before` pseudo-element with `inset: -3mm; border: 1px dashed` for bleed visualization. Use `::after` with `inset: 5mm; border: 1px dashed` for safe zone.
**Warning signs:** The generated HTML shows no visual bleed indicator in Chrome.

### Pitfall 2: Chrome vs Firefox @page Rendering
**What goes wrong:** `@page { size: A5 }` renders correctly in Chrome when printing, but Firefox may not respect the exact paper size in its print dialog.
**Why it happens:** As of 2024, `@page size` is "Baseline 2024" (all major browsers), but margin box at-rules (`@top-center`, `@bottom-right`) are Chrome-only. Firefox has partial support.
**How to avoid:** Document Chrome as the canonical browser for print output in the prepress disclaimer. Do not use `@page` margin boxes (running headers/footers) — they are Chrome-only.
**Warning signs:** Footer/header text in margin boxes is invisible in Firefox.

### Pitfall 3: CMYK Ink Total Overflow
**What goes wrong:** Dark brand colors (e.g., very dark navy `#0A0A1E`) produce C=100 M=100 Y=50 K=93 = 343% ink total, which many presses refuse.
**Why it happens:** The standard sRGB-to-CMYK formula does not perform GCR (Grey Component Replacement) or UCR (Under Color Removal) optimizations that a RIP would apply.
**How to avoid:** Calculate `inkTotal = C+M+Y+K`. Flag any value > 300% in the table with a red warning cell. The prepress disclaimer already covers this but an inline flag helps the user identify specific colors.
**Warning signs:** Dark colors in the brand palette generate inkTotal > 300.

### Pitfall 4: Instagram Format Using @page
**What goes wrong:** `@page { size: 1080px 1080px }` is applied to Instagram square format. The browser treats this as a tiny print page and produces incorrect output.
**Why it happens:** Instagram formats are screen artifacts, not paper. The `@page` rule is only appropriate for paper-sized outputs.
**How to avoid:** Instagram formats use fixed `px` dimensions on `.page-container` and `transform: scale()` for preview. No `@page` rule. Add `@media print { display: none }` for Instagram format containers.
**Warning signs:** Instagram format HTML looks correct on screen but prints at wrong size.

### Pitfall 5: Series Template Generated for Non-Recurring Sub-Types
**What goes wrong:** A SIT (series identity template) file is generated for a `single-night` event that has no recurring series.
**Why it happens:** Missing sub-type gate in wireframe.md experience branch.
**How to avoid:** Gate SIT generation with `IF experienceSubType === "recurring-series"`. For all other sub-types, skip SIT entirely with a log message.
**Warning signs:** `SIT-series-identity-v1.html` appears in `.planning/design/physical/print/` for a single-night event.

### Pitfall 6: Phrase "print-ready" Without Disclaimer
**What goes wrong:** Generated HTML contains the phrase "print-ready" (e.g., in a heading or description block) without the adjacent prepress disclaimer.
**Why it happens:** Content generation may produce the natural phrase when describing print artifacts.
**How to avoid:** The Nyquist test suite MUST assert that the `print-ready` string is absent OR is immediately adjacent to the disclaimer text (within 200 characters). The test should use a negative assertion: `assert.ok(!content.includes('print-ready'), ...)` OR a proximity check.
**Warning signs:** Test grep on `print-ready` finds occurrences without the disclaimer next to them.

---

## Code Examples

### Complete A5 Flyer HTML Scaffold

```html
<!DOCTYPE html>
<!-- Source: PDE Phase 80 — FLY artifact pattern -->
<!-- PREPRESS NOTICE: This is a composition reference, NOT a production print file. -->
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FLY — {{EVENT_NAME}} — Event Flyer (Composition Reference)</title>
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Artifact meta display */
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
    body[data-format="a4"] @page { size: A4 portrait; margin: 0; }
    body[data-format="a4"] .page-container { width: 210mm; height: 297mm; }

    /* ---- INSTAGRAM SQUARE ---- */
    body[data-format="ig-square"] .page-container {
      width: 1080px; height: 1080px;
      transform: scale(0.35); transform-origin: top left;
      margin-bottom: calc(1080px * (0.35 - 1) + 24px);
    }

    /* ---- INSTAGRAM STORY ---- */
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

    /* Bleed zone (3mm) — faked via pseudo-element, NOT @page { bleed: 3mm } */
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
    }
  </style>
</head>
<body data-format="a5">

  <nav class="format-selector" aria-label="Format variants">
    <button class="format-btn active" onclick="setFormat('a5','A5 Flyer',this)">A5 Flyer (148×210mm)</button>
    <button class="format-btn" onclick="setFormat('a4','A4 Poster',this)">A4 Poster (210×297mm)</button>
    <button class="format-btn" onclick="setFormat('ig-square','Instagram Square',this)">Instagram Square (1080×1080px)</button>
    <button class="format-btn" onclick="setFormat('ig-story','Instagram Story',this)">Instagram Story (1080×1920px)</button>
  </nav>

  <div class="page-container">
    <!-- COMPOSITION: event-flyer
      Format: A5/A4/Instagram
      Grid: [rule-of-thirds | golden-ratio | asymmetric] — chosen based on event type
      Typefaces: max 3 — [display face], [body face], [accent face if needed]
      Hierarchy: L1 event name | L2 headliner | L3 date/venue | L4 secondary info
      Negative space: minimum 25% of page area intentionally empty
    -->

    <!-- Flyer content generated here from SYS-experience-tokens.json + brief data -->
    <!-- Typography: display face for event name (L1), body for date/venue (L3) -->
    <!-- Color: brand colors from experience tokens; dark background preferred for event flyers -->

  </div>

  <div class="zone-legend">
    <span class="bleed-swatch">Bleed zone (3mm — simulated)</span>
    <span class="safe-swatch">Safe zone (5mm inside trim)</span>
  </div>

  <!-- CMYK approximation table — generated from brand colors -->
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
      <!-- Row generated per brand color — Claude generates rows here -->
    </tbody>
  </table>
  <p style="font-size:11px; color:#666; margin-top:8px; max-width:600px;">
    These values are mathematical sRGB-to-CMYK approximations. No ICC profiles or GCR/UCR applied.
    Total ink &gt; 300% may cause issues on press. Provide actual brand color specifications to your supplier.
  </p>

  <!-- MANDATORY prepress disclaimer — do NOT use the phrase "print-ready" without this block -->
  <aside class="prepress-disclaimer" style="margin-top:24px; padding:12px 16px; background:#fff8dc; border:1px solid #e0c060; border-radius:4px; font-size:12px; max-width:600px;">
    <strong>COMPOSITION REFERENCE — NOT A PRODUCTION PRINT FILE.</strong>
    This artifact is a design layout guide. Resolution, color fidelity, bleed registration,
    and ICC profile conformance have not been verified. Submit production-ready artwork
    (PDF/X-1a or PDF/X-4, minimum 300 DPI, CMYK, embedded fonts) to your print supplier.
  </aside>

  <script>
    function setFormat(f, label, btn) {
      document.body.dataset.format = f;
      document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  </script>
</body>
</html>
```

### CMYK Conversion Function (Inline in Generation Prompt)

```javascript
// Source: RapidTables standard sRGB-to-CMYK formula
// For use inside the wireframe.md generation step — NOT an npm package

function rgbToCmyk(r, g, b) {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100, inkTotal: 100 };
  const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
  const kk = Math.round(k * 100);
  return { c, m, y, k: kk, inkTotal: c + m + y + kk };
}

function hexToCmyk(hex) {
  const h = hex.replace('#','');
  return rgbToCmyk(parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16));
}
```

### Nyquist Test Pattern (Node Built-in — Phase 79 Pattern)

```javascript
// Source: tests/phase-79/critique-hig-extensions.test.mjs — established pattern for Phase 80

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

describe('PRNT-01: FLY artifact — wireframe.md experience branch', () => {
  const content = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md contains FLY artifact generation block', () => {
    assert.ok(content.includes('FLY'), 'wireframe.md missing FLY artifact code');
  });

  test('wireframe.md contains @page A5 size directive', () => {
    assert.ok(content.includes('@page') && content.includes('A5'),
      'wireframe.md missing @page A5 size');
  });

  test('wireframe.md contains bleed zone visualization (not @page bleed)', () => {
    assert.ok(content.includes('bleed') && !content.includes('@page { bleed'),
      'wireframe.md uses unsupported @page bleed property instead of CSS workaround');
  });
});

describe('PRNT-02: print-ready prohibition check', () => {
  // Check generated artifact files — this test runs AFTER generation
  // For pre-generation structural check: assert wireframe.md itself enforces the rule
  const wfContent = readFileSync(join(ROOT, 'workflows/wireframe.md'), 'utf8');

  test('wireframe.md has print-ready prohibition instruction', () => {
    assert.ok(
      wfContent.includes('print-ready') &&
      (wfContent.includes('prohibited') || wfContent.includes('disclaimer') || wfContent.includes('MUST NOT')),
      'wireframe.md missing print-ready prohibition instruction'
    );
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@page { bleed: 3mm }` for bleed visualization | CSS pseudo-element `::before` with `inset: -3mm; border: dashed` | Never changed — `bleed` was never implemented | Critical: @page bleed is spec-only, has zero browser support |
| Third-party PDF library (Puppeteer, wkhtmltopdf) for HTML-to-print | Chrome native print-to-PDF via `@page` | Chrome 131 (Nov 2024) improved @page support | PDE does not need PDF generation; HTML composition reference is sufficient |
| Handlebars/Mustache for template slots | Literal `{{SLOT}}` strings with CSS highlighting | Never needed for editorial markers | Eliminates a library dependency for a feature that is content, not code |
| `@page` margin boxes for running headers | Not applicable to flyers (single-page composition) | Chrome-only feature | Irrelevant for single-page flyer artifacts; relevant only for festival program |
| `size: 1080px 1080px` in @page for Instagram | Fixed `px` dimensions on `.page-container` | Design principle | @page is for paper — Instagram is screen. Separate concerns. |

**Deprecated/outdated:**
- `paper-css` npm package: no recent maintenance evidence, unnecessary when named `@page` size keywords work natively
- `paged.js` polyfill for bleed marks: last published Oct 2024, adds 180KB+ to every generated HTML file, not appropriate for composition reference artifacts

---

## Open Questions

1. **PRNT-03: Festival program — Plan 1 or Plan 2?**
   - What we know: festival programs require multi-page HTML (schedule grid, artist bios, map, sponsors); this is significantly more complex than a single-page flyer
   - What's unclear: should PRNT-03 be implemented in the same plan as PRNT-01/02, or as a separate plan to manage scope?
   - Recommendation: Plan 2. PRNT-01 + PRNT-02 + PRNT-04 (flyer + series template + composition rules) form a coherent Plan 1. PRNT-03 (festival program) adds multi-page complexity and should be Plan 2.

2. **Experience token dependency — what if Phase 76 tokens are absent?**
   - What we know: Phase 80 depends on Phase 76 for brand color tokens. The CMYK table uses colors from `SYS-experience-tokens.json`.
   - What's unclear: Phase 76 (experience design token architecture) is "not started" per STATE.md. The CMYK table generation needs real brand colors. What is the fallback?
   - Recommendation: Implement the same soft-dependency pattern used in wireframe.md: if `SYS-experience-tokens.json` is absent, use a hardcoded 3-color fallback palette (black, brand-primary: `#1a1a1a`, brand-accent: `#ff5500`) and warn the user to run `/pde:system` first. Do not HALT.

3. **Sub-type gate for festival program (PRNT-03)**
   - What we know: PRNT-03 targets "festival program" but no sub-type maps directly to "festival" — the sub-types are single-night, multi-day, recurring-series, installation, hybrid-event
   - What's unclear: should PRG be generated for `multi-day` only, or also `recurring-series` (which could be an annual festival)?
   - Recommendation: Generate PRG for `multi-day` sub-type. For `recurring-series`, generate SIT (per PRNT-02). The distinction: multi-day = single large event with a program; recurring-series = reusable template. This is a planner decision to confirm.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in test runner (`node:test`) — v20.20.0 |
| Config file | None — run directly via `node --test` |
| Quick run command | `node --test tests/phase-80/print-collateral.test.mjs` |
| Full suite command | `node --test tests/phase-74/experience-regression.test.mjs tests/phase-79/critique-hig-extensions.test.mjs tests/phase-80/print-collateral.test.mjs` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRNT-01 | wireframe.md experience branch generates FLY artifact with @page A5 | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-01 | wireframe.md contains bleed visualization (not @page bleed) | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-01 | wireframe.md contains CMYK table generation instructions | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-02 | wireframe.md has print-ready prohibition instruction | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-02 | wireframe.md gates SIT generation on recurring-series sub-type | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-03 | wireframe.md generates PRG artifact for multi-day sub-type | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |
| PRNT-04 | wireframe.md print generation block contains composition annotation (max-3-typefaces, focal-hierarchy) | structural | `node --test tests/phase-80/print-collateral.test.mjs` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `node --test tests/phase-80/print-collateral.test.mjs`
- **Per wave merge:** `node --test tests/phase-74/experience-regression.test.mjs tests/phase-79/critique-hig-extensions.test.mjs tests/phase-80/print-collateral.test.mjs`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/phase-80/print-collateral.test.mjs` — covers PRNT-01 through PRNT-04; must be written BEFORE wireframe.md edits

*(Existing test infrastructure: `node:test` runner, established patterns from Phase 74 and Phase 79 — no new framework install needed)*

---

## Sources

### Primary (HIGH confidence)

- MDN CSS @page documentation — `size` descriptor support verified as "Baseline 2024"; `bleed`/`marks` confirmed as not implemented in any browser
- MDN CSS paged media module — margin box support confirmed as Chrome-only
- RapidTables RGB-to-CMYK formula — mathematical formula verified; limitations documented
- A5 print house specifications (Leafletfrog, Route1Print PDF, StressFreePrint) — 3mm bleed standard for A5 flyers confirmed; 5mm safe zone confirmed (aligns with PRNT-01 success criteria)
- PDE codebase inspection — wireframe.md artifact pattern, DOMAIN_DIRS physical domain, tests/phase-79 Nyquist pattern, STATE.md locked decisions

### Secondary (MEDIUM confidence)

- Smashing Magazine "Designing For Print With CSS" — CSS paged media architecture; noted that specialized user agents (Prince) are required for full spec; relevant for understanding what browsers don't support
- Chrome 131 release notes (via WebSearch/Doppio.sh) — improved @page support confirmed; bleed/marks still unsupported
- gotprint.com bleed/safe zone tutorial — 3mm bleed + 5mm safe zone confirmed as industry standard; multiple print house sources agree
- Buffer Instagram dimensions guide (2026) — 1080×1080 square, 1080×1920 story confirmed as current standard
- pagedjs npm page (v0.4.3, published Oct 2024) — version confirmed via `npm view pagedjs version`

### Tertiary (LOW confidence)

- Awwwards compositional standards for print — no direct Awwwards source found for print specifically; findings from graphic design education sources (RMCAD, Canva, VistaPrint) align with standard print composition principles; the "max 3 typefaces" and "intentional negative space" rules are universally documented across sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CSS @page named sizes are Baseline 2024; CMYK formula is mathematically standardized; no-library approach is verified against project patterns
- Architecture patterns: HIGH — bleed workaround verified against browser support data; slot pattern derived from REQUIREMENTS.md spec; all patterns are consistent with existing wireframe.md artifact conventions
- Pitfalls: HIGH — @page bleed/marks non-support verified via MDN; Chrome-only margin boxes verified; Instagram pixel-not-mm constraint is straightforward

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (CSS @page support is stable; Instagram dimensions change infrequently)
