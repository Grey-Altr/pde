# Phase 180: Claim Verification + PDF Export - Research

**Researched:** 2026-03-30
**Domain:** Node.js CJS text processing (claim verification), Playwright page.pdf() (PDF export)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
All implementation choices are at Claude's discretion — infrastructure phase. Use ROADMAP success criteria and codebase conventions to guide decisions.

### Claude's Discretion
All implementation details.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VER-01 | Post-generation verification compares LLM narrative claims against the structured IR | Verify: compare numeric strings extracted from rendered section HTML against IR field values |
| VER-02 | Factual mismatches (wrong counts, dates, status) are flagged before output is finalized | Flag: inject into sections array before renderHTML() / renderMarkdown() write |
| VER-03 | Verification result is appended as metadata footer in generated presentations | Append: adds a verification summary section to HTML + a blockquote to MD footer |
| PDF-01 | User can export any HTML presentation to PDF via `--pdf` flag | Add `--pdf` flag handling to present.md workflow Step 5–6 |
| PDF-02 | PDF export uses Playwright page.pdf() (already installed, no new deps) | Playwright 1.58.2 is in package.json devDependencies, confirmed working |
| PDF-03 | PDF preserves chart SVGs, embedded images, and table formatting | `printBackground: true` + `page.setContent()` with raw HTML string preserves inline SVGs and base64 images |
</phase_requirements>

---

## Summary

Phase 180 adds two independent capabilities to the presentation pipeline: a claim verification pass (VER-01–03) and PDF export (PDF-01–03). Both are pure additions to `render-presentation.cjs` and the `present.md` workflow — no changes to the IR extraction layer (presentation.cjs) or chart engine (charts.cjs).

**Claim verification** is a post-build, pre-write pass. The section builders in `render-presentation.cjs` already produce deterministic HTML from the IR — there is no separate LLM narration step in phases 178–179 (sections are built from the IR entirely in code). The verification pass must therefore extract numeric tokens from the rendered HTML content strings in the sections array, then compare them against the canonical source values in the IR object. Any mismatch is recorded; the result is appended as a new verification footer section before files are written.

**PDF export** is a post-write operation. Playwright 1.58.2 is already installed as a dev dependency (confirmed: `node_modules/playwright` + `node_modules/playwright-core`). The `chromium.launch()` pattern is already used in `bin/lib/image-pipeline/screenshot.cjs` — same require path, same headless launch pattern. `page.pdf()` accepts `{ path, format, printBackground }` and works correctly (smoke-tested: 7239-byte PDF generated from inline HTML in < 5s).

**Primary recommendation:** Implement claim verification as a new `verify-presentation.cjs` module under `bin/lib/`, called from `render()` in `render-presentation.cjs` between section building and file writing. Implement PDF export as a new `export-pdf.cjs` module under `bin/lib/`, wired into `pde-tools.cjs` as `presentation pdf` subcommand and the `present.md` workflow `--pdf` flag branch.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| playwright | 1.58.2 | Headless Chromium for page.pdf() | Already in package.json devDeps; confirmed working |
| Node.js crypto | built-in | None needed for this phase | — |
| Node.js fs/path | built-in | File I/O for PDF write | Already pattern in all bin/lib/*.cjs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | — | Zero new npm dependencies required | Both features use existing deps |

**Zero new npm dependencies.** Playwright is already installed. Claim verification is pure string/regex processing using built-in Node.js.

**Version verification:** `playwright@1.58.2` confirmed installed (2026-03-30). `page.pdf()` smoke test passed.

---

## Architecture Patterns

### Recommended Project Structure
```
bin/lib/
├── verify-presentation.cjs    # NEW — VER-01/02/03: claim verification pass
├── export-pdf.cjs             # NEW — PDF-01/02/03: Playwright PDF export
├── render-presentation.cjs    # MODIFIED — call verifyPresentation() before render
└── (all other existing files unchanged)

tests/phase-180/
├── verify-presentation.test.mjs   # Unit tests for claim verification
└── export-pdf.test.mjs            # Smoke test for PDF export (headless)

workflows/present.md               # MODIFIED — add --pdf flag to Step 1, 5, 6, 7
bin/pde-tools.cjs                  # MODIFIED — add `presentation pdf` subcommand
```

### Pattern 1: Claim Verification — Numeric Token Extraction

**What:** Extract all numeric values (integers and decimals) from rendered HTML content strings, then compare each against known IR field values.

**When to use:** After `buildExecutiveSummary(ir)` / `buildCaseStudy(ir)` returns sections array, before `renderHTML()` is called.

**How it works in this codebase:**
The sections array contains HTML strings like:
```
"<p><strong>Completion:</strong> 22% (2 of 9 phases done)</p>"
"<p>12 of 58 requirements complete (21%) · 2 blocked</p>"
```
These strings are built from IR fields such as `ir.phases.completion_pct`, `ir.phases.completed`, `ir.phases.total`, `ir.requirements.total`, `ir.requirements.completed`, `ir.requirements.blocked`, `ir.git_velocity.total_commits`, `ir.cost_timing.total_duration_min`.

The verification pass:
1. Collects "expected claims" — a flat map of `{ label, irValue }` for all numeric IR fields
2. Scans each section's `.content` HTML string for numeric tokens using a regex like `/\b(\d+(?:\.\d+)?)\b/g`
3. For each IR value that appears as a number, checks whether the token found in HTML matches the IR value exactly
4. The inverse approach (claim-first) works better: for each claimed numeric in HTML, determine what IR field it should correspond to and verify it matches

**Practical approach — IR-anchored forward scan:**
Build a canonical claims map from IR first:

```javascript
// Source: analysis of render-presentation.cjs section builders
function buildClaimsMap(ir) {
  const claims = [];
  if (ir.phases && !ir.phases.unavailable) {
    claims.push({ label: 'phases.total', value: ir.phases.total });
    claims.push({ label: 'phases.completed', value: ir.phases.completed });
    claims.push({ label: 'phases.completion_pct', value: ir.phases.completion_pct });
  }
  if (ir.requirements && !ir.requirements.unavailable) {
    claims.push({ label: 'requirements.total', value: ir.requirements.total });
    claims.push({ label: 'requirements.completed', value: ir.requirements.completed });
    claims.push({ label: 'requirements.blocked', value: ir.requirements.blocked });
  }
  if (ir.git_velocity && !ir.git_velocity.unavailable) {
    claims.push({ label: 'git_velocity.total_commits', value: ir.git_velocity.total_commits });
  }
  if (ir.cost_timing && !ir.cost_timing.unavailable) {
    claims.push({ label: 'cost_timing.total_duration_min', value: ir.cost_timing.total_duration_min });
  }
  return claims;
}
```

Then scan all section content HTML for each claim value. If an IR value is present in some section but the numeric in the HTML differs, flag it as a mismatch. Note: percentage values derived from division (e.g., `Math.round(completed/total * 100)`) should also be validated.

**Critical design constraint:** The claim checker must ONLY verify values that are explicitly injected from IR into HTML by the section builders. It must NOT flag coincidental matches (e.g., `16px` in CSS, `h2` headings). Use `stripHtml()` (already exported) before scanning content.

**Mismatch format:**
```javascript
{ label: 'phases.total', irValue: 9, foundValues: [10], section: 'progress' }
```

### Pattern 2: Verification Footer Injection

**What:** Append a verification result section to the sections array before renderHTML()/renderMarkdown().

**When to use:** After verifyPresentation() runs, always — even if no mismatches (shows "0 mismatches" as a green signal).

**Section shape (matches existing sections array schema):**
```javascript
{
  id: 'verification',
  title: 'Verification',
  level: 2,
  content: buildVerificationFooterHtml(verificationResult)
}
```

The `render()` function in `render-presentation.cjs` passes sections to both `renderHTML()` and `renderMarkdown()` — appending a section here means both output formats get the footer automatically. No changes to renderHTML() or renderMarkdown() required.

**HTML content for footer:**
```html
<p class="verification-status pass|fail">
  Verification: <strong>N claims checked · M mismatches · PASS/FAIL</strong>
</p>
<p class="verification-meta">Checked at {iso timestamp}</p>
<!-- if mismatches: -->
<ul>
  <li><strong>{label}:</strong> IR value {irValue}, found {foundValues} in section "{section}"</li>
</ul>
```

CSS classes `verification-status`, `.pass`, `.fail` need adding to `PDE_CSS` in `render-presentation.cjs`.

**Markdown footer (stripHtml handles this automatically** — no special handling needed).

### Pattern 3: Playwright PDF Export

**What:** Launch headless Chromium, load HTML from file path or inline content, call page.pdf(), write PDF to `.planning/presentations/`.

**When to use:** After HTML file is written. The present.md workflow calls `presentation render` to write HTML, then calls `presentation pdf` if `--pdf` flag is set.

**Established pattern in codebase (screenshot.cjs):**
```javascript
// Source: bin/lib/image-pipeline/screenshot.cjs
const { chromium } = require('playwright');

async function exportPdf({ htmlPath, pdfPath, format = 'A4', printBackground = true }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Load from file:// URL to preserve relative paths (none exist — all inline)
    const fileUrl = 'file://' + htmlPath;
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.pdf({
      path: pdfPath,
      format,
      printBackground,
    });
  } finally {
    await browser.close();
  }
}
```

**Critical: SVG and base64 image preservation.** The HTML output is fully self-contained — all SVGs are inline text, all images are base64 data URIs. Since there are no external requests, `waitUntil: 'networkidle'` is safe and all assets are present when page.pdf() fires. `printBackground: true` is required to preserve background colors in PDE dark theme.

**`page.goto()` vs `page.setContent()`:** Either works for self-contained HTML. `page.goto(file://)` is preferred because it sets the correct base URL, which matters if the HTML ever references local fonts. `page.setContent()` is faster but strips base URL. Use `goto(file://)` to match the screenshot.cjs pattern.

**PDF output path convention:** Mirror the HTML naming convention:
```
.planning/presentations/{persona}-{date}.pdf
```

### Pattern 4: pde-tools presentation pdf subcommand

**What:** Wire `export-pdf.cjs` into `pde-tools.cjs` as `presentation pdf <html-path> <pdf-path>`.

**When to use:** Called by the `present.md` workflow after `presentation render` when `--pdf` flag is set.

```javascript
// In pde-tools.cjs case 'presentation':
} else if (subcommand === 'pdf') {
  const exportPdf = require('./lib/export-pdf.cjs');
  exportPdf.cmdPresentationPdf(cwd, args[2], args[3]);
}
```

### Pattern 5: present.md workflow --pdf flag

**What:** Add `--pdf` flag detection and a PDF export step to the present.md workflow.

**Changes to present.md:**
- Step 1: Detect `--pdf` flag alongside `--dry-run`, `--verbose`
- Step 5: Add `PDF_PATH` computation if `--pdf` is set
- Step 6: After render succeeds, if `--pdf`, call `presentation pdf "${HTML_PATH}" "${PDF_PATH}"`
- Step 7: Include `PDF: ${PDF_PATH}` in completion output if `--pdf` was set

### Anti-Patterns to Avoid

- **Scanning CSS for numeric values:** The `PDE_CSS` constant in render-presentation.cjs contains many numerics (font sizes, colors, breakpoints). Always call `stripHtml()` on section content before scanning, and only scan section `.content` fields, never the full HTML document string.
- **Failing render on mismatch:** VER-02 says mismatches are "flagged" — they must never throw or abort rendering. The verification result is informational metadata, not a gate.
- **Using page.setContent() with a relative file path for SVGs:** All SVGs in this codebase are inline strings — no external file references. Not an issue here, but document the reason for the `file://` URL approach.
- **Launching a new browser per export:** The PDF export is a one-shot CLI operation; launching and closing one browser instance per call is correct and matches the screenshot.cjs pattern.
- **Adding PDF generation inside render():** PDF is post-write. render() writes HTML and MD; PDF is a separate step invoked by the caller. Keeps render() synchronous and testable.
- **Checking LLM-generated freeform text:** In phases 178–179, section content is deterministically built from IR by code, not by LLM. The verifier checks IR values match the numeric tokens in the built HTML — it is not a semantic NLP verifier of free-form prose.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF from HTML | Custom HTML-to-PDF via canvas/SVG | Playwright page.pdf() | Already installed, SVG-native, handles print CSS, tested |
| HTML entity parsing in verification | Custom entity decoder | stripHtml() from render-presentation.cjs | Already exported, handles all entities used in output |
| Async PDF in sync render() | Callback hell in render() | Separate async export-pdf.cjs called post-render | Keeps render() synchronous; PDF is independent of HTML/MD |

**Key insight:** The verification and PDF modules are isolated utilities. They consume the outputs of render-presentation.cjs without modifying its core logic, making them testable in isolation.

---

## Common Pitfalls

### Pitfall 1: Numeric Collision in stripHtml'd Content
**What goes wrong:** After stripping HTML tags, numbers from section titles (e.g., "Phase 2" repeated in a header), list indices, or data table cells may falsely appear to be claims.
**Why it happens:** The IR might contain `phases.completed = 2`, and the phrase "Phase 2" in a section title would match `2` coincidentally.
**How to avoid:** Scan for each IR value using word-boundary context — prefer matching patterns like `\b{irValue}\b` after stripping HTML. Additionally, only scan section `content` fields (not `title` fields), since titles are short and unlikely to contain numeric claims.
**Warning signs:** Spurious mismatches on small integers (1, 2, 3) that appear in many places.

### Pitfall 2: Percentage Rounding Discrepancy
**What goes wrong:** `ir.requirements.completion_pct` might be `20.69`, but the renderer computes `Math.round(completed/total * 100) = 21`. The verifier flags a mismatch.
**Why it happens:** The renderer recalculates percentages from raw counts using `Math.round()` rather than using the stored `completion_pct` field.
**How to avoid:** When checking percentage claims, compute the expected rendered percentage the same way the renderer does: `Math.round((completed / total) * 100)`. Use this computed value for verification, not the raw `completion_pct` field.
**Warning signs:** Mismatch flagged on percentage values that are off by 1.

### Pitfall 3: SVG Data Lost in PDF Dark Background
**What goes wrong:** PDF renders with white background and dark text invisible.
**Why it happens:** Playwright PDF by default uses `printBackground: false`, stripping background CSS. The PDE theme is dark (bg: `#0d1117`).
**How to avoid:** Always pass `printBackground: true` to `page.pdf()`.
**Warning signs:** PDF looks blank or text on dark backgrounds invisible.

### Pitfall 4: Browser Not Installed
**What goes wrong:** `chromium.launch()` throws "Executable doesn't exist" because Playwright browsers were never installed via `npx playwright install`.
**Why it happens:** `npm install playwright` installs the API but not the browser binaries on all environments.
**How to avoid:** The screenshot.cjs module already uses this pattern and works — so browsers ARE installed in this project. Smoke test confirmed (7239-byte PDF generated). Document this as an environment assumption in the plan.
**Warning signs:** Error: `browserType.launch: Executable doesn't exist` — fix with `npx playwright install chromium`.

### Pitfall 5: Verification Footer Appears in TOC
**What goes wrong:** The verification section (level: 2) gets added to the TOC nav since `buildTOC()` filters `level <= 2`.
**Why it happens:** The verification section is appended to sections before `renderHTML()` calls `buildTOC()`.
**How to avoid:** This is actually the correct behavior — the verification footer should appear in the TOC so readers know it exists. No action needed. If it becomes unwanted, set `level: 3` for the verification section or add a `hideToc: true` property to sections and filter in buildTOC.
**Warning signs:** Only if the TOC becomes too crowded — not a correctness issue.

---

## Code Examples

### Claim Verification — Core Logic
```javascript
// Source: analysis of render-presentation.cjs section builders
function verifyPresentation(ir, sections) {
  const claims = buildClaimsMap(ir); // extract numeric IR fields
  const mismatches = [];

  for (const { label, value } of claims) {
    if (value === null || value === undefined) continue;
    const numStr = String(value);

    // Check each section's content
    let foundInAnySection = false;
    for (const section of sections) {
      const text = stripHtml(section.content);
      const regex = new RegExp(`\\b${numStr}\\b`);
      if (regex.test(text)) {
        foundInAnySection = true;
        // Check: is the number surrounded by a different value in context?
        // Simple check: just confirm presence for now
      }
    }
    // Mismatches surface when IR numeric is absent from rendered output
    // (i.e., a different number was rendered instead of the correct one)
  }

  return { claimsChecked: claims.length, mismatches, pass: mismatches.length === 0, checkedAt: new Date().toISOString() };
}
```

**Note:** The primary mismatch pattern in this codebase is incorrect math in section builders (e.g., `buildRequirements` computing `pct` using `Math.round` — if that ever uses the wrong numerator). The verifier provides a runtime sanity check, not a comprehensive NLP fact extractor.

### PDF Export — Minimal Correct Pattern
```javascript
// Source: established pattern from bin/lib/image-pipeline/screenshot.cjs + page.pdf() API
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function exportPdf({ htmlPath, pdfPath, format = 'A4', printBackground = true }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const fileUrl = 'file://' + path.resolve(htmlPath);
    await page.goto(fileUrl, { waitUntil: 'networkidle' });
    await page.pdf({ path: pdfPath, format, printBackground });
  } finally {
    await browser.close();
  }
}
```

### CSS additions to PDE_CSS for verification footer
```css
/* Verification footer */
.verification-status {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  border: 1px solid;
}
.verification-status.pass {
  background: rgba(63, 185, 80, 0.1);
  border-color: rgba(63, 185, 80, 0.3);
  color: #3fb950;
}
.verification-status.fail {
  background: rgba(248, 81, 73, 0.1);
  border-color: rgba(248, 81, 73, 0.3);
  color: #f85149;
}
.verification-meta {
  color: #8b949e;
  font-size: 0.8rem;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| page.pdf() only on Chromium | Playwright page.pdf() in playwright 1.x | Stable since Playwright 1.0 | Reliable across all versions |
| HTML-to-PDF via wkhtmltopdf | Playwright headless Chromium | ~2019+ | Better SVG support, modern CSS |

**Deprecated/outdated:**
- `wkhtmltopdf`: Poor SVG support, not maintained, not applicable here (Playwright is already installed).
- `puppeteer` for PDF: Functionally identical to Playwright's API but a separate package. Not applicable — Playwright is already installed.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| playwright | PDF-01/02/03 | ✓ | 1.58.2 | — |
| playwright Chromium binary | PDF-02 | ✓ | Confirmed (smoke test passed, 7239-byte PDF generated) | `npx playwright install chromium` |
| Node.js (built-in crypto, fs, path) | VER-01/02/03 | ✓ | Built-in | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — all required tools confirmed available.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.1 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/phase-180/ --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VER-01 | buildClaimsMap extracts numeric IR fields correctly | unit | `npx vitest run tests/phase-180/verify-presentation.test.mjs -t "buildClaimsMap"` | ❌ Wave 0 |
| VER-01 | verifyPresentation finds no mismatches when sections match IR | unit | `npx vitest run tests/phase-180/verify-presentation.test.mjs -t "no mismatches"` | ❌ Wave 0 |
| VER-02 | verifyPresentation detects mismatch when section shows wrong count | unit | `npx vitest run tests/phase-180/verify-presentation.test.mjs -t "mismatch detected"` | ❌ Wave 0 |
| VER-03 | buildVerificationFooterHtml returns pass/fail HTML with correct counts | unit | `npx vitest run tests/phase-180/verify-presentation.test.mjs -t "footer HTML"` | ❌ Wave 0 |
| VER-03 | render() result HTML includes verification section | integration | `npx vitest run tests/phase-180/verify-presentation.test.mjs -t "render integration"` | ❌ Wave 0 |
| PDF-01 | present.md --pdf flag triggers PDF export step | manual | Manual workflow invocation | N/A |
| PDF-02 | exportPdf generates a non-empty PDF buffer | smoke | `npx vitest run tests/phase-180/export-pdf.test.mjs -t "pdf smoke"` | ❌ Wave 0 |
| PDF-03 | PDF output preserves SVG and table content (size check proxy) | smoke | `npx vitest run tests/phase-180/export-pdf.test.mjs -t "pdf size"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/phase-180/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/phase-180/verify-presentation.test.mjs` — covers VER-01, VER-02, VER-03
- [ ] `tests/phase-180/export-pdf.test.mjs` — covers PDF-02, PDF-03 (smoke only; uses real Playwright)

*(No framework install needed — vitest already configured and running for phase-178, phase-179.)*

---

## Open Questions

1. **Does "LLM narration" mean something specific in Phase 180's context?**
   - What we know: Phases 178–179 built sections entirely from IR with no LLM calls. The present.md workflow step says "dispatches to persona-specific generation prompts" but the actual render step just calls `pde-tools presentation render` which calls deterministic builders.
   - What's unclear: The additional_context says "claim verification should run AFTER LLM narration but BEFORE file write." This implies a future state where the sections array content is LLM-generated prose. Currently sections are deterministic.
   - Recommendation: Implement the verifier as-if sections are already final HTML content (the injection point is correct regardless of whether content came from LLM or deterministic builders). The insertion point between `buildExecutiveSummary(ir)`/`buildCaseStudy(ir)` returning sections and `renderHTML()` + `fs.writeFileSync()` being called is correct for both current and future state.

2. **Should mismatches abort generation or only warn?**
   - What we know: VER-02 says "flagged before output is finalized." VER-03 says "appended as metadata footer." The Phase 176 decision for `crossRefValidate` is explicit: "non-blocking — warnings array only, never prevents IR output."
   - What's unclear: Whether the same non-blocking convention applies to claim mismatches at the render layer.
   - Recommendation: Non-blocking by default (consistent with Phase 176 decision). Mismatches appear in the verification footer; render completes. stderr warning message for mismatches.

---

## Sources

### Primary (HIGH confidence)
- `bin/lib/render-presentation.cjs` — direct source code read: render() injection points, sections array schema, exported stripHtml(), PDE_CSS location
- `bin/lib/image-pipeline/screenshot.cjs` — direct source code read: established chromium.launch() + headless Chromium pattern for this codebase
- `node_modules/playwright-core/lib/client/page.js` line 658–678 — page.pdf() signature and path option confirmed
- `node_modules/playwright-core/types/types.d.ts` — page.pdf() option types: format, printBackground, margin, path
- `node_modules/playwright/package.json` — version 1.58.2 confirmed
- Playwright page.pdf() smoke test — 7239-byte PDF generated from inline HTML, confirmed working in < 5s

### Secondary (MEDIUM confidence)
- `bin/lib/presentation.cjs` — IR schema (buildPresentationIR fields: phases, requirements, git_velocity, cost_timing, decisions, blockers, verification)
- `bin/lib/charts.cjs` — SVG output pattern (inline SVG, no external deps) confirming PDF-03 feasibility
- `tests/phase-178/render-presentation.test.mjs` — test convention (vitest, .mjs, createRequire for CJS, MOCK_IR fixture)
- `tests/phase-179/charts.test.mjs` — test convention corroboration

### Tertiary (LOW confidence)
- None — all claims verified against source code or running processes.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Playwright version confirmed installed and working; all other tools are built-in Node.js
- Architecture: HIGH — All injection points verified by reading actual source of render-presentation.cjs; render() → sections → renderHTML/renderMarkdown pipeline fully understood
- Pitfalls: HIGH — Derived from direct source analysis of section builders and PDE_CSS; PDF dark background pitfall confirmed via Playwright API defaults

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable — no fast-moving dependencies; Playwright 1.x API is stable)
