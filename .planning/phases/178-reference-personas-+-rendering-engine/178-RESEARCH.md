# Phase 178: Reference Personas + Rendering Engine - Research

**Researched:** 2026-03-30
**Domain:** HTML/Markdown document rendering, Node.js CJS template strings, base64 image embedding
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Self-contained HTML file under 500KB
- Embedded CSS using PDE design tokens
- Auto-generated table of contents with anchor links
- No external URLs or JavaScript
- Design artifact screenshots from .planning/design/ embedded as inline base64
- Files written to .planning/presentations/
- Naming: [persona]-[date].html and [persona]-[date].md
- Regenerating overwrites prior output with current state
- Executive Summary (CLU-01): high-level project overview for C-suite, key metrics, progress, timeline, decisions, visual evidence from design artifacts
- Case Study (CLR-01): problem-approach-outcome-lessons narrative (locked by ROADMAP), deeper technical detail for peer audience, includes methodology and technical decisions

### Claude's Discretion
- HTML template structure and CSS design
- How to structure EJS templates or inline template strings
- Markdown formatting choices
- Which IR fields to highlight per persona
- Base64 image selection logic
- TOC generation approach

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLU-01 | User can generate an executive summary (progress, blockers, timeline confidence, 1-page format) | IR fields: project, phases, requirements, blockers, risks, decisions, cost_timing, verification; executive-summary persona persona; dual HTML+MD output |
| CLR-01 | User can generate a case study / portfolio piece (problem, approach, outcome, lessons) | IR fields: project, decisions, verification, research, phases, blockers; case-study persona; dual HTML+MD output |
| RND-01 | Each persona generates self-contained HTML output (embedded CSS, no external URLs, no JavaScript, <500KB) | Pure Node.js CJS template strings with inline CSS; no npm dependencies; size guard via Buffer.byteLength |
| RND-02 | Each persona generates Markdown output as secondary format (portable, diffable, git-friendly) | Template string renderer writing .md companion alongside .html |
| RND-03 | HTML output includes auto-generated table of contents with anchor navigation | Heading scan + anchor slug generation; TOC injected into <nav> section with <a href="#slug"> links |
| RND-04 | HTML output embeds design artifact screenshots as inline base64 images where relevant | fs.readFileSync(path, 'base64') + data:image/TYPE;base64,DATA pattern; graceful fallback when no assets exist |
| RND-05 | HTML output uses PDE design tokens (colors, typography, spacing from DESIGN.md) for consistent branding | No design system defined yet in project; use a hardcoded PDE token set in renderer CSS; discoverable via design-manifest.json |
| RND-06 | Presentations persist to .planning/presentations/ with [persona]-[date].html and .md naming | Output dir already created by buildPresentationIR(); naming pattern defined in workflows/present.md Step 5 |
| RND-07 | User can regenerate/refresh a presentation (re-run overwrites with current project state) | fs.writeFileSync with no existence check = natural overwrite behavior |
</phase_requirements>

---

## Summary

Phase 178 builds two concrete persona renderers — executive-summary (CLU-01) and case-study (CLR-01) — plus a shared dual-format rendering engine that all future personas will use. The renderers are written in the project's native Node.js CJS style, added to `bin/lib/presentation.cjs`, and wired into `workflows/present.md` Step 6 to replace the current generation stub.

The IR is already fully operational from Phase 176. The workflow dispatch shell is already in place from Phase 177. This phase's job is entirely about rendering: consuming the IR JSON and producing self-contained HTML plus a Markdown companion. No new npm dependencies are required or permitted — the project has zero npm runtime dependencies and all rendering must use Node.js built-ins only.

The design system for this project has no populated artifacts (design-manifest.json shows `hasDesignSystem: false`, no tokens, no wireframes, no mockups). Therefore "PDE design tokens" means a hardcoded set of sensible brand tokens defined in the renderer itself. The renderer must check for design artifacts and embed base64 images gracefully when they exist, or skip silently when they do not.

**Primary recommendation:** Implement renderHTML(ir, persona) and renderMarkdown(ir, persona) as exported functions in a new `bin/lib/render-presentation.cjs` module, called from workflows/present.md Step 6 via a new `pde-tools presentation render` CLI subcommand. Both persona handlers (executiveSummary, caseStudy) live in the same module. The workflow step is updated from stub to: run `pde-tools presentation render [persona] [html-path] [md-path]`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fs` | built-in | Read design assets, write HTML/MD files | Project uses zero npm deps; already imported in presentation.cjs |
| Node.js built-in `path` | built-in | Path resolution for output files | Already in use throughout bin/lib |
| Node.js built-in `crypto` | built-in | Already imported in buildPresentationIR for source_hash | Consistent with existing code |

### No External Dependencies
The project deliberately has zero npm runtime dependencies. This is a hard project constraint. All HTML rendering uses Node.js native template literals. No EJS, Handlebars, mustache, or marked are used.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Template literals (chosen) | EJS / Handlebars | EJS/Handlebars require npm install; template literals have no dep, match project constraint |
| Inline CSS in template literal | Linked stylesheet | Linked stylesheet violates RND-01 self-contained constraint |
| fs.readFileSync base64 | Canvas / sharp | Canvas requires native deps; fs.readFileSync already in core.cjs pattern |

**Installation:** No new packages. Zero deps.

---

## Architecture Patterns

### Recommended Project Structure

The new renderer module lives alongside the existing IR extractor:

```
bin/lib/
├── presentation.cjs          # Existing: IR extraction (Phase 176)
├── render-presentation.cjs   # NEW: HTML+MD rendering engine (Phase 178)
```

`workflows/present.md` Step 6 is updated to call:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation render \
  "${PERSONA_SLUG}" "${HTML_PATH}" "${MD_PATH}" "${IR_FILE}"
```

`bin/pde-tools.cjs` case `'presentation'` gains a second subcommand `render` that calls `renderPresentation.cmdPresentationRender(...)`.

### Pattern 1: Shared Render Dispatcher

**What:** A single `render(ir, persona, htmlPath, mdPath)` entry point that dispatches to persona-specific builder functions.

**When to use:** All current and future persona rendering passes through here.

```javascript
// bin/lib/render-presentation.cjs
function render(ir, persona, htmlPath, mdPath) {
  let sections;
  switch (persona) {
    case 'executive-summary': sections = buildExecutiveSummary(ir); break;
    case 'case-study':        sections = buildCaseStudy(ir); break;
    default: throw new Error(`Unknown persona: ${persona}`);
  }
  const html = renderHTML(ir, persona, sections);
  const md   = renderMarkdown(ir, persona, sections);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  fs.writeFileSync(mdPath,   md,   'utf-8');
  return { htmlPath, mdPath, htmlBytes: Buffer.byteLength(html, 'utf-8') };
}
```

### Pattern 2: Section-Based Document Model

**What:** Each persona builder returns an array of `Section` objects. Both HTML and Markdown renderers consume the same section array, ensuring content parity.

**When to use:** Ensures one content definition drives both formats.

```javascript
// Section schema:
// { id: string, title: string, content: string, level: 1|2|3 }
// content is plain text / safe escaped HTML — renderer handles wrapping

function buildExecutiveSummary(ir) {
  return [
    { id: 'overview',   title: 'Project Overview',    level: 1, content: buildOverview(ir) },
    { id: 'progress',   title: 'Progress',             level: 2, content: buildProgress(ir) },
    { id: 'requirements', title: 'Requirements',       level: 2, content: buildRequirements(ir) },
    { id: 'blockers',   title: 'Blockers & Risks',     level: 2, content: buildBlockers(ir) },
    { id: 'decisions',  title: 'Key Decisions',        level: 2, content: buildDecisions(ir) },
    { id: 'timeline',   title: 'Timeline & Velocity',  level: 2, content: buildTimeline(ir) },
    { id: 'artifacts',  title: 'Design Artifacts',     level: 2, content: buildArtifacts(ir) },
  ];
}

function buildCaseStudy(ir) {
  return [
    { id: 'problem',    title: 'The Problem',          level: 1, content: buildProblem(ir) },
    { id: 'approach',   title: 'Our Approach',         level: 2, content: buildApproach(ir) },
    { id: 'outcome',    title: 'Outcome',              level: 2, content: buildOutcome(ir) },
    { id: 'lessons',    title: 'Lessons Learned',      level: 2, content: buildLessons(ir) },
    { id: 'technical',  title: 'Technical Decisions',  level: 2, content: buildTechnical(ir) },
    { id: 'artifacts',  title: 'Design Evidence',      level: 2, content: buildArtifacts(ir) },
  ];
}
```

### Pattern 3: TOC Generation (RND-03)

**What:** Scan sections array for all non-level-1 entries; generate slugified anchor IDs; prepend a `<nav>` block.

**When to use:** Every HTML render.

```javascript
function buildTOC(sections) {
  const entries = sections.filter(s => s.level <= 2);
  const links = entries.map(s =>
    `  <li><a href="#${s.id}">${escHtml(s.title)}</a></li>`
  ).join('\n');
  return `<nav class="toc"><h2>Contents</h2><ul>\n${links}\n</ul></nav>`;
}
```

### Pattern 4: Base64 Image Embedding (RND-04)

**What:** Read image files from `.planning/design/assets/` or design artifact paths, encode to base64, inline as `data:image/TYPE;base64,...`.

**When to use:** Called from `buildArtifacts(ir)` when `ir.design_artifacts.available` is true and artifact files exist on disk.

```javascript
function embedImage(absolutePath) {
  if (!fs.existsSync(absolutePath)) return null;
  const ext = path.extname(absolutePath).toLowerCase().replace('.', '');
  const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
                    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  const mime = mimeMap[ext] || 'image/png';
  const data = fs.readFileSync(absolutePath).toString('base64');
  return `data:${mime};base64,${data}`;
}
```

Graceful fallback: if no images exist (the current project state), `buildArtifacts(ir)` returns a short prose note — no broken `<img>` tags.

### Pattern 5: HTML Renderer (RND-01, RND-05)

**What:** Template literal that produces a fully self-contained HTML document. CSS uses PDE token variables defined in a `<style>` block.

**When to use:** Every HTML output.

```javascript
function renderHTML(ir, persona, sections) {
  const toc = buildTOC(sections);
  const body = sections.map(s =>
    `<section id="${s.id}">\n` +
    `<h${s.level}>${escHtml(s.title)}</h${s.level}>\n` +
    s.content + '\n</section>'
  ).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(ir.project.name)} — ${personaDisplayName(persona)}</title>
  <style>
    /* PDE Design Tokens */
    :root {
      --pde-bg:          #0d1117;
      --pde-surface:     #161b22;
      --pde-border:      #30363d;
      --pde-text:        #e6edf3;
      --pde-text-muted:  #8b949e;
      --pde-accent:      #58a6ff;
      --pde-success:     #3fb950;
      --pde-warning:     #d29922;
      --pde-danger:      #f85149;
      --pde-font:        -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      --pde-mono:        ui-monospace, "Cascadia Mono", monospace;
      --pde-radius:      6px;
      --pde-space-sm:    0.5rem;
      --pde-space-md:    1rem;
      --pde-space-lg:    2rem;
    }
    /* ... layout, typography, table, nav etc ... */
  </style>
</head>
<body>
  <header class="doc-header">
    <h1 class="doc-title">${escHtml(ir.project.name)}</h1>
    <p class="doc-meta">${personaDisplayName(persona)} · Generated ${new Date().toLocaleDateString()}</p>
  </header>
  ${toc}
  <main>${body}</main>
  <footer class="doc-footer">
    <p>Generated by PDE · IR extracted at ${ir.extracted_at} · Source hash: ${ir.source_hash.slice(0,8)}</p>
  </footer>
</body>
</html>`;
}
```

### Pattern 6: Size Guard (RND-01)

**What:** After rendering, check `Buffer.byteLength(html, 'utf-8') < 500 * 1024`. If exceeded, truncate verbose sections (decisions list, research details) and re-render.

**When to use:** After every HTML render; log a warning if truncation occurs.

### Pattern 7: Markdown Renderer (RND-02)

**What:** Iterate sections array, emit ATX headings and content as plain text blocks.

```javascript
function renderMarkdown(ir, persona, sections) {
  const lines = [
    `# ${ir.project.name} — ${personaDisplayName(persona)}`,
    ``,
    `> Generated ${new Date().toISOString()} · IR source hash: ${ir.source_hash.slice(0,8)}`,
    ``,
  ];
  for (const s of sections) {
    lines.push(`${'#'.repeat(s.level)} ${s.title}`);
    lines.push('');
    lines.push(s.content);  // plain text from builder
    lines.push('');
  }
  return lines.join('\n');
}
```

### Anti-Patterns to Avoid

- **External URL in HTML:** No `<link href="https://...">`, no `<script src="https://...">`, no `url(https://...)` in CSS. All locked by RND-01.
- **JavaScript in HTML:** No `<script>` blocks of any kind. The TOC uses plain `<a href="#anchor">` — no JS scroll.
- **Conditional render skip:** Never skip writing the MD companion. Both files are always written together (RND-02).
- **Silent sentinel bypass:** If `ir.project.unavailable`, the renderer must display a `data unavailable` notice — never silently zeros or empty strings.
- **Broken img tags:** If an artifact path doesn't exist on disk, omit the `<img>` entirely rather than leaving a broken `src`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | Custom regex | A 4-character `escHtml()` function covering `&<>"'` | The only characters that need escaping in HTML attribute/body context; a full sanitizer library is not needed since content comes from trusted IR |
| Slug generation for TOC | Complex unicode slugify | Simple `s.toLowerCase().replace(/[^a-z0-9]+/g, '-')` | Section IDs are controlled strings from the section builder, not user input |
| File size measurement | External library | `Buffer.byteLength(str, 'utf-8')` | Built-in, exact, zero deps |
| Date formatting | moment.js / date-fns | `new Date().toISOString().slice(0, 10)` | ISO date slice is sufficient for the `[persona]-[date]` naming requirement |
| Image MIME detection | file-type package | Extension map lookup (5 lines) | Only PNG/JPG/WebP/SVG/GIF needed for design screenshots |

**Key insight:** This is document rendering from a trusted data source. The complexity is in data transformation (IR → sections), not in rendering mechanics. Over-engineering the template layer creates maintenance burden for future persona phases (179–182).

---

## Runtime State Inventory

> Not applicable — this is a greenfield rendering module, not a rename/refactor phase.

None — verified: no existing runtime state, stored data, or OS-registered configuration carries the name `render-presentation` or is affected by adding this module.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|---------|
| Node.js | HTML/MD rendering | Yes | v22+ (darwin) | — |
| `fs` (built-in) | File write | Yes | built-in | — |
| `path` (built-in) | Path resolution | Yes | built-in | — |
| `.planning/presentations/` | Output dir | Yes | Created by Phase 176 IR | — |
| Design assets in `.planning/design/assets/` | Base64 embed (RND-04) | Partial — dir exists, no image files yet | n/a | Renderer skips embed silently; section shows "No design artifacts available" |
| `vitest` | Test suite | Yes | ^4.1.1 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Design artifact images: no PNG/JPG/SVG files exist in `.planning/design/assets/` currently. The renderer must handle this gracefully — `buildArtifacts(ir)` checks `ir.design_artifacts.available` and whether any artifact paths resolve on disk before embedding.

---

## Common Pitfalls

### Pitfall 1: 500KB Limit with Long IR Data

**What goes wrong:** The IR `project.goal` field is ~2500 characters of dense feature prose. The IR `project.summary` field repeats it. Naive inclusion in every section bloats output beyond 500KB when combined with base64-encoded screenshots.

**Why it happens:** `buildPresentationIR()` returns the full goal text verbatim. The executive summary persona in particular would include this field multiple times.

**How to avoid:** Each persona builder explicitly selects which IR sub-fields to use. Use `ir.project.name` and `ir.project.core_value` (short) for headers; use the first 300 characters of `ir.project.summary` for prose. Never dump the full `goal` string as-is.

**Warning signs:** Buffer.byteLength check returns > 400KB during development — add truncation logic before shipping.

### Pitfall 2: Unavailable Sentinel Rendering as Empty

**What goes wrong:** Several IR extractors return `{ unavailable: true, reason: '...' }` when source files are missing (e.g. `ir.design_artifacts` returns unavailable if design-manifest.json is absent). If builder functions don't check the sentinel, they'll render empty tables or NaN percentages.

**Why it happens:** JavaScript's property access on `{ unavailable: true }` doesn't throw — `ir.design_artifacts.artifact_count` returns `undefined`, `undefined + 0 = NaN`, etc.

**How to avoid:** Every builder function starts with a sentinel check:
```javascript
function buildProgress(ir) {
  if (ir.phases && ir.phases.unavailable) {
    return '<p class="unavailable">Phase data unavailable: ' + escHtml(ir.phases.reason) + '</p>';
  }
  // ... normal render
}
```

### Pitfall 3: Anchor ID Collisions in TOC

**What goes wrong:** Two sections with the same title (e.g., if a persona has two "Overview" headings) produce duplicate `id` attributes in HTML, breaking anchor navigation.

**Why it happens:** Simple `title.toLowerCase().replace(...)` slugification doesn't deduplicate.

**How to avoid:** Use the `id` field from the section object (set by the builder) rather than deriving slugs from titles. The builder ensures unique IDs per persona. Never auto-generate IDs from titles at render time.

### Pitfall 4: Workflow Step 6 Replacement Scope Creep

**What goes wrong:** Modifying `workflows/present.md` to add rendering logic inline (bash template strings inside the workflow markdown) rather than delegating to a CLI subcommand.

**Why it happens:** The stub in Step 6 is already writing a placeholder HTML file inline. It's tempting to expand that inline approach.

**How to avoid:** Replace Step 6 with a single `pde-tools presentation render` call. All rendering logic lives in `bin/lib/render-presentation.cjs`. The workflow file stays thin. This is consistent with the existing project pattern: workflows call `pde-tools`, they do not contain rendering logic.

### Pitfall 5: Test File for Wrong Phase Directory

**What goes wrong:** Tests for Phase 178 written in `tests/phase-176/` or `tests/phase-177/` by mistake.

**Why it happens:** Copying test file patterns from previous phases without updating directory.

**How to avoid:** New tests go in `tests/phase-178/render-presentation.test.mjs`. The vitest config glob `tests/**/*.test.mjs` covers all phase directories automatically.

---

## Code Examples

Verified patterns from existing project source:

### Reading and Writing Files (from bin/lib/core.cjs pattern)
```javascript
// Source: bin/lib/presentation.cjs (Phase 176)
const fs = require('fs');
const path = require('path');
const { safeReadFile } = require('./core.cjs');

// Write output
fs.writeFileSync(outputPath, content, 'utf-8');
```

### IR Acquisition in Workflow (from workflows/present.md Step 4)
```bash
# Source: workflows/present.md (Phase 177) - Step 4
IR=$(node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" presentation artifact-read)
if [[ "$IR" == @file:* ]]; then IR=$(cat "${IR#@file:}"); fi
```

### New pde-tools render subcommand (pattern from existing case 'presentation')
```javascript
// Source: bin/pde-tools.cjs lines 1676-1685 (existing pattern)
case 'presentation': {
  const subcommand = args[1];
  const presentation = require('./lib/presentation.cjs');
  if (subcommand === 'artifact-read') {
    presentation.cmdPresentationArtifactRead(cwd, raw);
  } else if (subcommand === 'render') {
    // Phase 178: add this branch
    const renderPresentation = require('./lib/render-presentation.cjs');
    renderPresentation.cmdPresentationRender(cwd, args[2], args[3], args[4], args[5]);
  } else {
    error('Unknown presentation subcommand. Available: artifact-read, render');
  }
  break;
}
```

### Test Pattern (from tests/phase-176/presentation-cmd.test.mjs)
```javascript
// Source: tests/phase-176/presentation-cmd.test.mjs
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

function runCmd(subArgs) {
  const stdout = execFileSync('node', [bin, ...subArgs.split(' ')], {
    cwd, encoding: 'utf-8', timeout: 30000,
  });
  if (stdout.startsWith('@file:')) {
    return readFileSync(stdout.slice(6).trim(), 'utf-8');
  }
  return stdout;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 177 Step 6: placeholder stub output | Phase 178 Step 6: real rendering via pde-tools presentation render | Phase 178 | Replaces stub with actual HTML+MD generation |
| pde-tools presentation: single subcommand (artifact-read) | pde-tools presentation: two subcommands (artifact-read, render) | Phase 178 | render subcommand added |

**Deprecated/outdated:**
- Step 6 placeholder HTML template in workflows/present.md: replaced by real rendering call.

---

## Open Questions

1. **PDE design tokens source**
   - What we know: `design-manifest.json` shows `hasDesignSystem: false` and no tokens object. `DESIGN-STATE.md` is a template with no populated values.
   - What's unclear: Are there any design token definitions elsewhere in the project (e.g. a DESIGN.md referenced in the CONTEXT but not found in `.planning/`)?
   - Recommendation: Use a hardcoded PDE token palette in the renderer CSS (dark GitHub-inspired: `#0d1117` bg, `#58a6ff` accent). The renderer checks `ir.design_artifacts` for tokens at runtime and can incorporate them if populated in the future. This is safe — the CONTEXT.md explicitly lists "CSS design" as Claude's discretion.

2. **Workflow Step 6 replacement: inline bash vs CLI delegation**
   - What we know: The current stub writes files inline in the workflow step. The IR is already in memory as `$IR` in the workflow.
   - What's unclear: Should the workflow pass IR via stdin/file to the render command, or should the render command re-run the IR extractor itself?
   - Recommendation: The render command accepts an optional `--ir-file` argument (path to the @file: temp JSON). If omitted, it re-runs `buildPresentationIR(cwd)`. This avoids piping the large IR JSON as an argument and is consistent with the @file: redirect pattern already used.

3. **Size budget with future SVG charts (Phase 179)**
   - What we know: Phase 179 adds inline SVG charts. This phase's HTML must stay under 500KB without charts.
   - What's unclear: How much of the 500KB budget should Phase 178 consume?
   - Recommendation: Target under 200KB for Phase 178 renders (no charts, no screenshots). This leaves 300KB headroom for Phase 179 chart SVGs. Log actual byte size in the render output.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.1 |
| Config file | vitest.config.ts (project root) |
| Quick run command | `npx vitest run tests/phase-178/ --reporter=verbose` |
| Full suite command | `npx vitest run tests/ --reporter=verbose` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CLU-01 | executive-summary render produces HTML+MD files | integration | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| CLR-01 | case-study render produces HTML+MD files | integration | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-01 | HTML is self-contained (<500KB, no external URLs, no JS) | unit | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-02 | Markdown companion written alongside HTML | integration | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-03 | HTML contains TOC nav with anchor links | unit | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-04 | Artifacts embedded as base64 when images exist; graceful skip when absent | unit | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-05 | HTML contains PDE CSS token variables | unit | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-06 | Files written to .planning/presentations/ with correct naming | integration | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |
| RND-07 | Re-running render overwrites existing file | integration | `npx vitest run tests/phase-178/ --reporter=verbose` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-178/ --reporter=verbose`
- **Per wave merge:** `npx vitest run tests/ --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-178/render-presentation.test.mjs` — covers all 9 requirements above
- [ ] `bin/lib/render-presentation.cjs` — the module under test (created in Task 1)

*(No shared fixtures needed — tests create temp dirs following the pattern established in `tests/phase-176/presentation-ir.test.mjs`)*

---

## Sources

### Primary (HIGH confidence)
- Direct inspection of `bin/lib/presentation.cjs` — confirmed IR schema, extractor function signatures, buildPresentationIR() output structure
- Direct inspection of `workflows/present.md` — confirmed Step 6 stub, persona registry, IR acquisition pattern
- Direct inspection of `bin/pde-tools.cjs` lines 1676-1685 — confirmed presentation subcommand routing pattern
- Live execution of `pde-tools presentation artifact-read` — confirmed IR JSON output, all 17 top-level keys, real field values
- Direct inspection of `design-manifest.json` — confirmed no design tokens or artifacts exist
- Direct inspection of `vitest.config.ts` — confirmed test runner configuration, glob patterns
- Direct inspection of `tests/phase-176/presentation-cmd.test.mjs` — confirmed test pattern (execFileSync + @file: handling)
- Direct inspection of `tests/phase-177/present-cmd.test.mjs` — confirmed 32 tests pass, test style for workflow file validation

### Secondary (MEDIUM confidence)
- Node.js built-in `fs.readFileSync(path).toString('base64')` for base64 encoding — standard Node.js API, no verification needed

### Tertiary (LOW confidence)
- None — all findings verified against project source code directly.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified zero-dep constraint from package.json, confirmed built-in-only pattern throughout bin/lib
- Architecture: HIGH — patterns derived directly from existing Phase 176 code and Phase 177 workflow
- Pitfalls: HIGH — sentinel pattern observed in live IR output (real project has no design artifacts, confirming the fallback path is immediately exercised)

**Research date:** 2026-03-30
**Valid until:** 2026-05-30 (stable domain — Node.js built-ins, no external APIs)
