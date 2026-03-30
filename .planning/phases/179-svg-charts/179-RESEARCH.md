# Phase 179: SVG Charts - Research

**Researched:** 2026-03-30
**Domain:** Parametric SVG generation (pure Node.js / CJS, zero npm dependencies)
**Confidence:** HIGH

## Summary

Phase 179 produces four SVG chart generators as a single `bin/lib/charts.cjs` module. Each generator is a pure function that accepts data derived from the existing IR and returns a valid inline SVG string. No external chart library, no runtime JavaScript, no new npm packages. The charts are embedded by the renderer (`render-presentation.cjs`) at section-build time — the renderer calls chart functions and injects the returned SVG string directly into HTML output.

SVG is a well-understood W3C text format with no dependency requirements. All patterns (viewBox, polyline, rect, text, aria-labelledby, foreignObject summary table) are native SVG 1.1 and widely supported. The chart module follows the same `'use strict'; module.exports = { ... }` CJS pattern used throughout `bin/lib/`.

**Primary recommendation:** Implement four deterministic SVG generator functions in `bin/lib/charts.cjs`; wire them into `render-presentation.cjs`; test them in `tests/phase-179/`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None explicitly locked — the CONTEXT.md mode is "Auto-generated (infrastructure phase)".

### Claude's Discretion
All implementation choices are at Claude's discretion — use ROADMAP success criteria and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHT-01 | System can generate a burndown chart (remaining tasks/requirements over time) as inline SVG | IR provides `requirements.{total,completed,pending}` and `phases.{total,completed}` — series can be synthesised per-phase from phase completion data |
| CHT-02 | System can generate a velocity chart (tasks completed per phase/sprint) as inline SVG | IR `phases.phase_list` gives per-phase completion counts; bar chart maps naturally |
| CHT-03 | System can generate a phase timeline chart (planned vs actual duration per phase) as inline SVG | IR `cost_timing` gives per-phase durations in minutes; horizontal bar Gantt-style chart |
| CHT-04 | System can generate an effort breakdown chart (token cost or task count by category) as inline SVG | IR `requirements.categories` maps directly to a pie/donut or horizontal bar by category |
| CHT-05 | Charts are embedded directly in HTML presentations (no external dependencies) | SVG strings returned by chart functions are injected into `section.content` in `render-presentation.cjs` |
| CHT-06 | Charts include accessible text alternatives (aria-labels, data tables as fallback) | `<title>` + `aria-labelledby` on `<svg>`, plus `<details><summary>Data table</summary><table>...</table></details>` fallback beneath each chart |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-ins (fs, path) | Node 20 (already installed) | File I/O if charts need to cache output | Project uses Node 20.20.0 throughout |
| SVG 1.1 primitives | W3C spec | line, polyline, rect, text, path, circle, title | Zero-dependency, universal browser support, embeds directly in HTML |

### Supporting
None. The module is pure string manipulation; no supporting libraries are needed or allowed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled SVG strings | D3.js, Chart.js, Recharts | Forbidden — project constraint is no runtime JavaScript, no external deps. D3 and Chart.js both require a DOM and JS runtime. |
| Inline `<svg>` in HTML | `<img src="chart.svg">` external file | External file violates RND-01 (no external URLs, self-contained HTML) |
| foreignObject for fallback table | `<desc>` text only | foreignObject data table is richer for screen readers; `<desc>` with a short text summary is sufficient minimum if foreignObject causes parsing issues in PDF |

**Installation:** No new packages. Zero install step required.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── charts.cjs               # NEW — four SVG generator functions
├── presentation.cjs         # Existing — IR extraction (Phase 176)
└── render-presentation.cjs  # Existing — renderer calls charts.cjs

tests/phase-179/
└── charts.test.mjs          # Vitest unit tests for all four generators
```

### Pattern 1: Chart Function Signature
**What:** Each chart is a pure function `chartXxx(ir) → string` (SVG string). No side effects, no file I/O.
**When to use:** Called from section-builder functions inside `render-presentation.cjs`.
**Example:**
```javascript
// bin/lib/charts.cjs
'use strict';

/**
 * Generate a burndown SVG from IR data.
 * @param {object} ir - buildPresentationIR() output
 * @returns {string} Complete <svg>...</svg> element string
 */
function burndownChart(ir) {
  // ... build SVG string ...
  return svgStr;
}
module.exports = { burndownChart, velocityChart, phaseTimelineChart, effortBreakdownChart };
```

### Pattern 2: SVG Document Structure
**What:** Each returned SVG uses a consistent structure with accessibility baked in.
**When to use:** All four charts.
```xml
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 600 300"
     role="img"
     aria-labelledby="chart-title-CHARTID"
     style="max-width:100%;height:auto;background:#161b22;">
  <title id="chart-title-CHARTID">Human-readable chart title</title>
  <!-- chart content -->
</svg>
<details class="chart-data-table">
  <summary>Data table: [Chart Name]</summary>
  <table>...</table>
</details>
```

### Pattern 3: Unavailable Data Handling
**What:** If the IR field is absent or has `unavailable: true`, return a "data unavailable" SVG placeholder (matching the sentinel pattern in render-presentation.cjs).
**When to use:** Any chart function where the required IR fields may not exist.
```javascript
if (!ir.requirements || ir.requirements.unavailable) {
  return unavailableSvg('Burndown chart: requirements data unavailable');
}
```

### Pattern 4: Renderer Integration
**What:** Add chart imports and section-content injection in `render-presentation.cjs` without breaking existing sections. Each persona's section builder adds a chart section.
**When to use:** When wiring charts into existing persona builders.
```javascript
// In render-presentation.cjs
const { burndownChart } = require('./charts.cjs');

// In buildExecutiveSummary() — add a new section:
{ id: 'burndown', title: 'Burndown', level: 2, content: burndownChart(ir) }
```

### Pattern 5: Design Token Colours in SVG
**What:** Use hardcoded hex values matching PDE design tokens (defined in PDE_CSS in render-presentation.cjs) rather than CSS variables — SVG `fill`/`stroke` attributes do not resolve CSS custom properties set outside the SVG element.
```javascript
// PDE token map for SVG use:
const SVG_COLORS = {
  bg:      '#161b22',  // --pde-surface
  text:    '#e6edf3',  // --pde-text
  muted:   '#8b949e',  // --pde-text-muted
  accent:  '#58a6ff',  // --pde-accent
  success: '#3fb950',  // --pde-success
  warning: '#d29922',  // --pde-warning
  danger:  '#f85149',  // --pde-danger
  border:  '#30363d',  // --pde-border
};
```

### Anti-Patterns to Avoid
- **CSS variables in SVG fill/stroke:** `fill="var(--pde-accent)"` does NOT work when SVG is inline in HTML and the CSS variable is set on `:root` outside the SVG. Use hardcoded hex values.
- **JavaScript in SVG:** `<script>` tags are forbidden (RND-01). All layout must be computed in Node at generation time.
- **External resource references:** No `href` to external URLs, no `xlink:href` to external files.
- **Fixed px dimensions without viewBox:** Always use `viewBox` with `width="100%"` or `style="max-width:100%;height:auto"` so charts scale properly in HTML output and PDF export.
- **Missing `xmlns` attribute:** Inline SVG in HTML5 does not strictly require `xmlns`, but it is required for valid standalone SVG and for PDF rendering via Playwright. Always include `xmlns="http://www.w3.org/2000/svg"`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG rendering | Custom DOM/canvas renderer | Native SVG primitives (string templates) | SVG is a text format; string concatenation is sufficient and zero-dep |
| Accessibility | Custom aria solution | `role="img"` + `aria-labelledby` + `<title>` + data table | W3C ARIA spec pattern, universally supported |
| Number formatting | Custom locale formatter | `toLocaleString()` or simple `Math.round()` + string template | Sufficient for chart labels; no i18n complexity needed |

**Key insight:** SVG charts are text — there is nothing complex enough to warrant a library. The hard part is getting the math right for coordinate mapping, not the rendering.

---

## Common Pitfalls

### Pitfall 1: Empty / Zero Data
**What goes wrong:** Chart generator receives IR with `total: 0` or empty arrays and renders a blank SVG or throws.
**Why it happens:** Phase 179 runs before all phases are complete; many IR fields may have low counts.
**How to avoid:** Guard every array and numeric field. If data length < 2, render an explicit "insufficient data" placeholder SVG rather than an empty chart. Never call `.map()` on undefined.
**Warning signs:** `TypeError: Cannot read property 'map' of undefined` in tests.

### Pitfall 2: CSS Variables Not Resolving in SVG
**What goes wrong:** Chart text/lines are invisible (inheriting page background) because `fill="var(--pde-accent)"` doesn't resolve inside inline SVG.
**Why it happens:** CSS custom properties defined on `:root` in a `<style>` block are accessible from SVG elements in the same document IF the SVG is inline HTML5 — but only if the browser resolves them. For PDF export via Playwright, resolution is less reliable.
**How to avoid:** Use hardcoded hex values from the SVG_COLORS constant. Never use CSS variables in SVG fill/stroke attributes.
**Warning signs:** Charts appear invisible or monochrome in Playwright PDF output.

### Pitfall 3: SVG Height Overflow in HTML
**What goes wrong:** Chart takes up too much vertical space in the rendered presentation, pushing subsequent sections off-screen.
**Why it happens:** Fixed height without `height:auto` scaling.
**How to avoid:** Always use `viewBox="0 0 600 300"` (or similar) with `style="max-width:100%;height:auto;"` on the SVG element. Avoid fixed `height` attributes.

### Pitfall 4: `<details>` / `<table>` Inside SVG
**What goes wrong:** Developer puts the fallback data table inside the SVG element as a `<foreignObject>`, which breaks SVG validity and Playwright PDF rendering.
**Why it happens:** Trying to keep the table co-located with the chart.
**How to avoid:** Place the `<details><summary>...</summary><table>...</table></details>` as a sibling HTML element AFTER the `</svg>` closing tag, not inside it. The chart function returns a string that contains both the SVG element and the trailing details block.

### Pitfall 5: IR Data Shape Assumptions
**What goes wrong:** Chart code assumes `ir.phases.phase_list` is always an array, but `buildPresentationIR` can return `{ unavailable: true }` for that field.
**Why it happens:** Phase 176 was built to return sentinel objects when source files are missing.
**How to avoid:** Always check `if (field && !field.unavailable && Array.isArray(field.phase_list))` before accessing nested properties. Follow the `sentinelHtml` pattern from `render-presentation.cjs`.

### Pitfall 6: Chart ID Collision in `aria-labelledby`
**What goes wrong:** Multiple charts on the same page have the same `id` for their `<title>` element, making `aria-labelledby` ambiguous.
**Why it happens:** Copy-pasting chart templates.
**How to avoid:** Each chart function must use a unique, predictable `id` prefix: `burndown-title`, `velocity-title`, `timeline-title`, `effort-title`.

---

## Code Examples

### Minimal Valid Inline SVG with Accessibility
```xml
<!-- Source: W3C SVG Accessibility Guidelines / ARIA in HTML spec -->
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 600 200"
     role="img"
     aria-labelledby="burndown-title"
     style="max-width:100%;height:auto;display:block;">
  <title id="burndown-title">Burndown: 42 requirements remaining of 58 total</title>
  <rect x="0" y="0" width="600" height="200" fill="#161b22"/>
  <!-- axes -->
  <line x1="50" y1="10" x2="50" y2="170" stroke="#30363d" stroke-width="1"/>
  <line x1="50" y1="170" x2="590" y2="170" stroke="#30363d" stroke-width="1"/>
  <!-- data line -->
  <polyline points="50,20 200,80 350,140 590,160"
            fill="none" stroke="#58a6ff" stroke-width="2"/>
  <!-- axis labels -->
  <text x="50" y="190" fill="#8b949e" font-size="11" text-anchor="middle">Phase 1</text>
  <text x="590" y="190" fill="#8b949e" font-size="11" text-anchor="end">Now</text>
</svg>
<details class="chart-data-table">
  <summary>Data table: Burndown</summary>
  <table>
    <thead><tr><th>Phase</th><th>Remaining</th></tr></thead>
    <tbody>
      <tr><td>Phase 1</td><td>58</td></tr>
      <tr><td>Phase 2</td><td>42</td></tr>
    </tbody>
  </table>
</details>
```

### Coordinate Mapping Helper
```javascript
// Map a value in [minVal, maxVal] to SVG y coordinate in [yTop, yBottom]
// (SVG y increases downward, so higher values map to lower y)
function mapY(value, minVal, maxVal, yTop, yBottom) {
  if (maxVal === minVal) return yTop;
  return yBottom - ((value - minVal) / (maxVal - minVal)) * (yBottom - yTop);
}

// Map a position index [0, count-1] to SVG x coordinate in [xLeft, xRight]
function mapX(index, count, xLeft, xRight) {
  if (count <= 1) return xLeft;
  return xLeft + (index / (count - 1)) * (xRight - xLeft);
}
```

### Unavailable Placeholder SVG
```javascript
function unavailableSvg(message) {
  const safe = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100"
     role="img" aria-label="${safe}"
     style="max-width:100%;height:auto;display:block;">
  <rect width="600" height="100" fill="#161b22" rx="6"/>
  <text x="300" y="55" text-anchor="middle" fill="#8b949e" font-size="13">${safe}</text>
</svg>`;
}
```

### Per-Chart Data Derivation from IR

**Burndown (CHT-01):** Use `ir.requirements` for totals. Since per-phase over-time snapshots are not stored in the current IR schema, derive a synthetic cumulative burndown: `[total, total - (completed * (phase_index/total_phases)), ..., pending]` using `phases.completed` as the denominator. This approximates a linear burndown and is honest about being an approximation.

**Velocity (CHT-02):** Use `ir.phases.phase_list` (if available). Each entry in the array represents one phase. Velocity = number of completed phases in groups of N. If `phase_list` is unavailable, fall back to `ir.phases.completed` / `ir.phases.total` as a single bar.

**Phase Timeline (CHT-03):** Use `ir.cost_timing`. Fields: `session_count`, `total_duration_min`, `phases_with_timing`, `average_phase_duration_min`. A horizontal bar chart showing one bar per phase that has timing data (from SUMMARY.md frontmatter). If `phases_with_timing` is 0, show unavailable placeholder.

**Effort Breakdown (CHT-04):** Use `ir.requirements.categories`. Each category key maps to `{ total, completed, blocked }`. A horizontal bar or stacked bar per category showing completed vs remaining. If categories is empty, fall back to `ir.git_velocity.estimated_loc_added` as a proxy for effort if available.

---

## IR Data Shape Reference

Key fields relevant to chart generation (verified by reading `presentation.cjs`):

```javascript
ir.requirements = {
  total: number,          // total v1 requirements
  completed: number,      // checked [x] requirements
  blocked: number,
  pending: number,
  categories: {           // object keyed by category name
    [categoryName]: {
      total: number,
      completed: number,
      blocked: number
    }
  }
  // OR: { unavailable: true, reason: string }
}

ir.phases = {
  total: number,
  completed: number,
  in_progress: number,
  planned: number,
  current_phase: string|null,
  current_phase_name: string|null,
  progress_percent: number,
  milestone: string|null,
  milestone_name: string|null,
  plans_total: number,
  plans_completed: number,
  // NOTE: phase_list array is NOT in the current IR schema from Phase 176.
  // render-presentation.cjs references ir.phases.phase_list but it isn't produced.
  // Charts must handle this missing field gracefully.
  // OR: { unavailable: true, reason: string }
}

ir.cost_timing = {
  session_count: number,
  total_duration_min: number,
  phases_with_timing: number,
  average_phase_duration_min: number,
  // OR: { unavailable: true, reason: string }
}

ir.git_velocity = {
  total_commits: number,
  commits_last_30_days: number,
  contributors: string[],
  estimated_loc_added: number,
  // OR: { unavailable: true, reason: string }
}
```

**Important finding:** `ir.phases.phase_list` is referenced in the Phase 178 render code and in MOCK_IR test fixtures but is NOT produced by `extractPhaseCompletion()` in `presentation.cjs`. The `phase_list` field is absent from the real IR. Chart code must not rely on it. Use aggregate counts (`phases.completed`, `phases.total`) instead.

---

## Module Integration Points

### How `render-presentation.cjs` Calls Charts

The renderer currently builds sections as arrays of `{ id, title, level, content }` objects. Charts integrate by adding new section entries whose `content` field is the SVG string + data table HTML returned by a chart function:

```javascript
// In render-presentation.cjs
const charts = require('./charts.cjs');

// Inside buildExecutiveSummary(ir):
{ id: 'burndown',  title: 'Burndown',          level: 2, content: charts.burndownChart(ir) },
{ id: 'velocity',  title: 'Velocity',           level: 2, content: charts.velocityChart(ir) },
```

The `renderHTML` function already wraps each section in `<section id="...">` tags, so no structural changes to the renderer are needed — only new section entries in the persona builder functions.

### Chart CSS Additions
The `PDE_CSS` constant in `render-presentation.cjs` needs two additions for chart-adjacent elements:
```css
/* Charts */
.chart-data-table { margin-top: 0.5rem; font-size: 0.85rem; }
.chart-data-table summary { cursor: pointer; color: var(--pde-text-muted); }
svg { display: block; }
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.1 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/phase-179/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHT-01 | `burndownChart(ir)` returns string containing `<svg` | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |
| CHT-02 | `velocityChart(ir)` returns string containing `<svg` | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |
| CHT-03 | `phaseTimelineChart(ir)` returns string containing `<svg` | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |
| CHT-04 | `effortBreakdownChart(ir)` returns string containing `<svg` | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |
| CHT-05 | SVG output contains no `<script>`, no external `href`/`src` | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |
| CHT-06 | SVG contains `role="img"` + `aria-labelledby` + `<title>` element; output contains `<table>` fallback | unit | `npx vitest run tests/phase-179/charts.test.mjs` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-179/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-179/charts.test.mjs` — covers CHT-01 through CHT-06 (all six requirements)

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — pure Node.js string generation, zero CLI tools required).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External SVG libraries (D3, Chart.js) | Parametric SVG string generation | N/A — project constraint from REQUIREMENTS.md (no JS in HTML output) | Forces pure server-side string generation; actually simpler for static presentations |
| CSS variable fill in SVG | Hardcoded hex values | SVG spec always — CSS variables only work in SVG when resolved by a DOM | Charts work in both browser and Playwright PDF |

---

## Open Questions

1. **Phase list data for velocity chart**
   - What we know: `ir.phases.phase_list` is referenced in test fixtures and render code but NOT produced by `extractPhaseCompletion()` in `presentation.cjs`.
   - What's unclear: Does Phase 176 intend to add this field but hasn't yet, or is the render code ahead of the extractor?
   - Recommendation: Treat `phase_list` as absent for Phase 179 purposes. Velocity chart falls back to aggregate `completed`/`total` counts (a single bar showing overall completion). Phase 181+ can enrich when the extractor is updated. Do NOT block CHT-02 on this.

2. **Effort breakdown data granularity**
   - What we know: `ir.requirements.categories` gives per-category totals but not time-spent-per-category.
   - What's unclear: CHT-04 spec says "token cost or task count by category" — token cost is not in the IR schema.
   - Recommendation: Use task count by category (from `ir.requirements.categories`). This is deterministic and available. Token cost can be added later when EXT-06 is enriched with per-category cost data.

---

## Sources

### Primary (HIGH confidence)
- Direct code review of `bin/lib/presentation.cjs` — IR schema verified from source
- Direct code review of `bin/lib/render-presentation.cjs` — section model, CSS tokens, integration point verified
- Direct code review of `tests/phase-178/render-presentation.test.mjs` — MOCK_IR shape, test patterns
- `vitest.config.ts` — test framework config confirmed
- W3C SVG 1.1 spec (embedded knowledge, HIGH confidence — stable spec since 2011)
- WAI-ARIA 1.2 `role="img"` + `aria-labelledby` pattern (well-established, HIGH confidence)

### Secondary (MEDIUM confidence)
- Phase 176 ROADMAP entry — confirms IR was built in Phase 176, charts depend on it
- Phase 178 ROADMAP entry + test fixtures — confirms `phase_list` is expected but not yet in extractor

### Tertiary (LOW confidence)
- None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure SVG, zero external deps, verified by codebase constraints
- Architecture: HIGH — patterns derived directly from existing render-presentation.cjs code
- IR data shapes: HIGH — read directly from presentation.cjs source
- Pitfalls: HIGH — derived from direct code inspection of existing modules
- `phase_list` gap finding: HIGH — confirmed by cross-reading presentation.cjs and render-presentation.cjs

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable domain — SVG spec and CJS patterns are not changing)
