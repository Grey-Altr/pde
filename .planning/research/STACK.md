# Stack Research

**Domain:** Stakeholder presentation synthesis engine — generates communication documents from PDE project artifacts
**Researched:** 2026-03-29
**Confidence:** HIGH (all versions verified against npm registry; integration patterns verified against existing PDE codebase)

---

## Context: What Already Exists (Do Not Re-Add)

The following are already installed at the plugin root (`package.json`) and MUST NOT be reinstalled:

| Already Installed | Version | Relevant Capability |
|-------------------|---------|---------------------|
| `playwright` | ^1.58.2 | Headless Chromium — **use for PDF export** |
| `satori` | ^0.26.0 | JSX/element-tree → SVG (used in image-pipeline) |
| `@resvg/resvg-js` | ^2.6.2 | SVG → PNG rasterization |
| `sharp` | ^0.34.5 | Image processing |
| `@fontsource/inter` | ^5.2.8 | Inter font data |
| `inter-ui` | ^4.1.1 | Inter font WOFF files |

Zero-npm-deps constraint applies to the plugin root. All new packages go into an isolated subdirectory: `bin/lib/presentation-pipeline/` with its own `package.json` (same pattern as image-pipeline, video-pipeline, 3d-pipeline).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `ejs` | 5.0.1 | HTML + Markdown template rendering | Zero-config, zero peer deps, ships as CJS. `ejs.render(templateString, data)` produces final HTML/MD from structured PDE artifacts. 25M weekly npm downloads; battle-tested. Supports includes, partials, conditionals — enough for 10 persona types without a framework. Avoids Handlebars (compile-time overhead), Nunjucks (larger binary), or raw string concatenation (unmaintainable at 10 template variants). |
| `markdown-it` | 14.1.1 | Markdown → HTML conversion (bidirectional output) | CommonJS-native (`require('markdown-it')`). Strict CommonMark compliance + extension plugins. Used to: (a) render Markdown outputs to HTML for embedding in reports, (b) convert existing `.planning/` Markdown state files to structured HTML sections. Lightweight (~100KB), zero runtime deps. |
| Hand-coded SVG templates (zero dep) | n/a | Velocity/burndown/progress charts | SVG charts for burndown, velocity, phase timeline, and effort breakdown are ~30–80 lines of parametric SVG math. No library justifies the dep footprint for 4–6 chart types. Pattern: pure function `chartBurndown(data) → svgString`. Embedded directly into HTML output as inline `<svg>`. This is the approach used by GitHub's own contribution graphs and Observable Framework's static output. |
| `playwright` (already installed) | ^1.58.2 | PDF export from HTML | Chromium print-to-PDF produces pixel-perfect results from self-contained HTML. PDE already has `playwright` in root `package.json` — no new install needed. Pattern: `page.pdf({ path, format: 'A4', printBackground: true })`. PDF export is optional/on-demand, not part of the primary HTML+MD pipeline. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `markdown-it` | 14.1.1 | `.planning/` Markdown state → structured HTML sections | Always — state files (SUMMARY.md, PLAN.md, RETROSPECTIVE.md, etc.) are Markdown; need HTML rendering for presentation output |
| Node.js built-ins: `fs`, `path`, `child_process` | (built-in) | Cross-project directory walking for portfolio synthesis | Always — no glob library needed. `fs.readdirSync` with recursive option (Node 18.17+) replaces `glob` or `fast-glob`. PDE targets Node 18+. |
| `ejs` | 5.0.1 | Per-persona HTML + Markdown templates | Always — drives all 10 output types from shared data model |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `vitest` (already installed) | Unit tests for SVG generators and EJS templates | Same test runner used across PDE. Snapshot tests for SVG string output are the verification pattern. |
| `node --experimental-vm-modules` | Not needed | EJS and markdown-it are CJS-native; no ESM workarounds required |

---

## Installation

New packages go into `bin/lib/presentation-pipeline/package.json` — a minimal isolated manifest, same pattern as `bin/lib/image-pipeline/` (which also uses packages from root `package.json` by require paths).

```bash
# Create isolated sub-package (do NOT npm install at plugin root)
mkdir -p bin/lib/presentation-pipeline
cd bin/lib/presentation-pipeline

# Core deps for the presentation engine
npm install ejs@5.0.1 markdown-it@14.1.1

# No other packages needed:
# - SVG charts: hand-coded (zero dep)
# - PDF: uses already-installed playwright at root
# - Cross-project walk: Node.js built-in fs.readdirSync (recursive, Node 18.17+)
```

Note: require paths from `bin/lib/presentation-pipeline/*.cjs` back to root packages (`satori`, `@resvg/resvg-js`, `playwright`) use relative paths: `require('../../../node_modules/satori')`. This is the same pattern used by `bin/lib/image-pipeline/og.cjs`.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hand-coded SVG for charts | `@observablehq/plot` v0.6.17 + `jsdom` v29.0.1 | If chart complexity grows to 10+ chart types requiring statistical transforms (regression, density). Plot + jsdom works server-side but adds ~8MB of deps and jsdom has known SVG API gaps. For 4–6 simple chart types, hand-coded is faster, smaller, and fully controllable. |
| Hand-coded SVG for charts | `d3` v7.9.0 + `linkedom` v0.18.12 | If charts need geographic projections, force-directed graphs, or complex scales. linkedom is faster and lighter than jsdom for server-side SVG. d3 v7 works with linkedom via `d3.select(linkedomElement)`. But d3 is 500KB+ for simple burndown/velocity charts. |
| `playwright` (already installed) for PDF | `pdfkit` v0.18.0 | If PDFs need programmatic construction (invoices, tables from structured data) rather than rendering styled HTML. PDFKit does NOT render HTML — it constructs PDFs imperatively. Only use if HTML-based export is explicitly not wanted. |
| `ejs` for templates | `handlebars` | If template authors need sandbox security (Handlebars escapes by default, EJS does not). EJS is recommended here because template authors are PDE internals, not user-supplied templates. |
| `markdown-it` for Markdown parsing | `marked` | `marked` is faster but has looser spec compliance. `markdown-it` correctly handles edge cases in `.planning/` Markdown (nested lists, frontmatter adjacency) that `marked` mishandles. |
| Node.js `fs.readdirSync(recursive)` for directory walk | `fast-glob` | If portfolio synthesis needs glob patterns like `**/.planning/STATE.md` across arbitrary roots. `fast-glob` is faster for deep trees. At expected scale (10–50 projects), built-in fs is sufficient and adds zero deps. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `puppeteer` | Installs a separate 200–400MB Chromium binary. PDE already has `playwright` which ships its own Chromium. Two headless browsers is wasteful. | `playwright` (already installed) |
| `vega` / `vega-lite` | Requires `canvas` (node-canvas), which is a native binary requiring system-level build tools (cairo, pango). Fails in clean CI environments. SVG output from Vega still needs canvas even when format is SVG. | Hand-coded SVG or `d3` + `linkedom` if complexity demands it |
| `jsdom` standalone | 28MB package. Heavy for what is essentially a DOM shim for SVG generation. Only needed if `@observablehq/plot` is used. | `linkedom` (5x faster, ~3MB) if a DOM shim becomes necessary |
| `html-pdf` / `html-pdf-node` | Uses `phantomjs` (archived 2018). Broken on Node 20+. | `playwright` |
| `wkhtmltopdf` | System binary dependency, not npm-installable. Breaks in containerized/serverless environments. | `playwright` |
| Nunjucks | 3x the binary size of EJS for the same functionality. Template syntax is identical in practice. | `ejs` |
| `chart.js` | Browser-canvas dependent. No headless SVG output path without registering a custom canvas. | Hand-coded SVG |

---

## Stack Patterns by Variant

**For HTML output (primary):**
- EJS template per persona → populated with PDE artifact data → inline SVG charts → self-contained HTML file (CSS embedded in `<style>` block, charts inline, no external assets)
- Output: `.planning/presentations/{slug}-{persona}-{timestamp}.html`

**For Markdown output (secondary):**
- EJS template per persona → Markdown string output
- Output: `.planning/presentations/{slug}-{persona}-{timestamp}.md`

**For PDF export (on-demand):**
- Generate HTML first (above) → load with playwright `page.goto('file://' + absPath)` → `page.pdf({ format: 'A4', printBackground: true })` → save `.pdf` alongside `.html`
- Gate behind `--pdf` flag; not auto-generated at phase/milestone boundaries (too slow)

**For velocity/burndown charts:**
- Pure function signature: `generateBurndownSvg({ planned: number[], actual: number[], labels: string[], width?: number, height?: number }) → string`
- Output is inline SVG: viewBox="0 0 800 400", no external CSS, no JS
- Embed as `<figure>{svgString}</figure>` in EJS template

**For cross-project portfolio synthesis:**
- `portfolioWalk(rootDir: string, options: { maxDepth?: number }) → ProjectSummary[]`
- Uses `fs.readdirSync(rootDir, { recursive: false })` to list project dirs, then checks for `.planning/STATE.md` to confirm PDE projects
- Reads `STATE.md`, `MILESTONES.md`, `PROJECT.md` from each confirmed project
- No glob library; pure `fs` + `path`

**If chart complexity grows beyond 6 types:**
- Add `linkedom` + `d3` to `bin/lib/presentation-pipeline/package.json`
- Do NOT add `jsdom` (too heavy) or `vega` (canvas dependency)

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `ejs@5.0.1` | Node.js 14+ | No breaking changes from v3 in CJS usage; only ESM-related additions in v4/v5 |
| `markdown-it@14.1.1` | Node.js 12+ | CJS-native; plugin ecosystem (e.g., `markdown-it-anchor`) is compatible |
| `playwright@1.58.2` (existing) | Node.js 18+ | Already installed; PDF generation via `page.pdf()` is Chromium-only (not Firefox/WebKit) |
| Hand-coded SVG | Any Node version | Pure string operations; no compatibility concerns |
| `fs.readdirSync(path, { recursive: true })` | Node.js 18.17+ | Added in Node 18.17.0 LTS. Required for portfolio directory walk without `fast-glob`. |

---

## Architecture Note: Presentation Pipeline Module Layout

Following the `image-pipeline`, `video-pipeline`, `3d-pipeline` pattern established in v0.20:

```
bin/lib/presentation-pipeline/
  package.json          ← installs ejs, markdown-it only
  assets.cjs            ← output directory management (.planning/presentations/)
  renderer.cjs          ← EJS template loader + render orchestrator
  markdown.cjs          ← markdown-it wrapper, .planning/ state → HTML sections
  charts.cjs            ← hand-coded SVG generators (burndown, velocity, timeline, effort)
  pdf.cjs               ← playwright-based PDF export (optional, gated)
  portfolio.cjs         ← cross-project directory walker and data aggregator
  personas/
    executive.cjs       ← executive summary template data shaper
    investor.cjs        ← investor update template data shaper
    sprint-review.cjs   ← sprint review template data shaper
    ... (7 more)
  templates/
    executive.html.ejs
    executive.md.ejs
    investor.html.ejs
    investor.md.ejs
    ... (8 more pairs)
```

pde-tools.cjs adds commands: `present generate`, `present portfolio`, `present pdf` (same lazy-require pattern used for `image *`, `video *`, `3d *` commands).

---

## Sources

- npm registry (direct query via `npm show <pkg> version`) — `ejs@5.0.1`, `markdown-it@14.1.1`, `@observablehq/plot@0.6.17`, `jsdom@29.0.1`, `linkedom@0.18.12`, `pdfkit@0.18.0`, `playwright@1.58.2`, `d3@7.9.0` — HIGH confidence
- PDE codebase review (`bin/lib/image-pipeline/og.cjs`, `bin/lib/session-artifacts.cjs`, `bin/pde-tools.cjs`) — integration pattern verification — HIGH confidence
- `root/package.json` review — confirmed already-installed packages — HIGH confidence
- Node.js 18.17 release notes — `fs.readdirSync` recursive option — MEDIUM confidence (verified via known release history; recommend running `node --version` check at runtime)
- WebSearch: Playwright PDF generation (2025–2026 articles), EJS CJS support, markdown-it CommonMark compliance, d3 + linkedom server-side SVG, SVG hand-coding patterns — MEDIUM confidence (verified against npm registry versions)
- Observable Plot GitHub discussion #847, #1759 — jsdom compatibility details for server-side rendering — MEDIUM confidence

---
*Stack research for: PDE Stakeholder Presentation Synthesis Engine*
*Researched: 2026-03-29*
