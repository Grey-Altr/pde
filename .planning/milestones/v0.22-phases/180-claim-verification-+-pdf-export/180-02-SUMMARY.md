---
phase: 180-claim-verification-+-pdf-export
plan: "02"
subsystem: pdf-export
tags: [pdf, playwright, presentation, export]

dependency_graph:
  requires:
    - 178-01 (render-presentation.cjs renderHTML — HTML structure exported as PDF source)
    - 179-01 (charts.cjs — SVG charts embedded in HTML, confirmed in PDF output)
  provides:
    - bin/lib/export-pdf.cjs (Playwright PDF export module)
    - pde-tools presentation pdf subcommand
    - present.md --pdf workflow flag
  affects:
    - bin/pde-tools.cjs (new subcommand routing)
    - workflows/present.md (new flag, path computation, Step 6 PDF call, Step 7 output)

tech_stack:
  added: []
  patterns:
    - Playwright chromium.launch({ headless: true }) + page.pdf() for PDF generation
    - file:// protocol via page.goto() for local HTML (matches screenshot.cjs pattern)
    - printBackground: true to preserve PDE dark GitHub-inspired theme in PDF output
    - TDD: RED (failing test) → GREEN (implementation) → all 8 tests passing

key_files:
  created:
    - bin/lib/export-pdf.cjs
    - tests/phase-180/export-pdf.test.mjs
  modified:
    - bin/pde-tools.cjs
    - workflows/present.md

decisions:
  - "exportPdf uses page.goto('file://' + path.resolve(htmlPath)) not page.setContent() — matches screenshot.cjs established pattern and ensures relative resources resolve"
  - "cmdPresentationPdf throws Error (not calls error()) so tests can catch without process.exit — CLI callers handle the promise rejection"
  - "PDF failure in present.md Step 6 is non-blocking — HTML and MD are already written before PDF export is attempted"
  - "printBackground: true is defaulted in exportPdf — PDE dark theme requires background preservation (Pitfall 3 from research)"

metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_changed: 4
---

# Phase 180 Plan 02: PDF Export Summary

**One-liner:** Playwright page.pdf() PDF export from HTML presentations via pde-tools subcommand and --pdf workflow flag, with printBackground:true for PDE dark theme preservation.

## What Was Built

### Task 1: export-pdf.cjs + smoke tests (TDD)

`bin/lib/export-pdf.cjs` exports two functions:

- `exportPdf({ htmlPath, pdfPath, format, printBackground })` — Launches headless Chromium, navigates to `file://` + resolved HTML path with `waitUntil: 'networkidle'`, calls `page.pdf()`, closes browser in finally block, returns `{ pdfPath, bytes }`.
- `cmdPresentationPdf(cwd, htmlPath, pdfPath)` — CLI handler that validates inputs, creates output directory if needed, calls `exportPdf()`, outputs JSON result. Throws on missing/invalid inputs so callers can handle promise rejection.

`tests/phase-180/export-pdf.test.mjs` provides 8 tests covering:
- PDF file is created with `%PDF` magic bytes
- PDF size > 5000 bytes with SVG + base64 image content (proxy for content preservation)
- Default options (A4, printBackground true) work without explicit specification
- Explicit options pass through correctly
- Missing htmlPath, missing pdfPath, non-existent HTML file all throw

### Task 2: pde-tools subcommand + workflow --pdf flag

`bin/pde-tools.cjs` — added `else if (subcommand === 'pdf')` branch in the `presentation` case, routing to `cmdPresentationPdf(cwd, args[2], args[3])`. Updated error message to include 'pdf' in available subcommands.

`workflows/present.md`:
- **Step 0**: Added `--pdf` to flag detection list
- **Step 5**: Added `PDF_PATH=".planning/presentations/${PERSONA_SLUG}-${DATE}.pdf"` computation when `--pdf` is set; added PDF to dry-run output
- **Step 6**: After render succeeds, runs `pde-tools presentation pdf "${HTML_PATH}" "${PDF_PATH}"` if `--pdf` is set. PDF failure shows error but does NOT halt (HTML and MD already written)
- **Step 7**: Includes `PDF: {PDF_PATH}` in completion banner when `--pdf` was set

## Verification Results

```
npx vitest run tests/phase-180/export-pdf.test.mjs
Test Files  1 passed (1)
Tests       8 passed (8)
```

All acceptance criteria confirmed:
- `grep -q "exportPdf" bin/lib/export-pdf.cjs` — PASS
- `grep -q "cmdPresentationPdf" bin/lib/export-pdf.cjs` — PASS
- `grep -q "chromium" bin/lib/export-pdf.cjs` — PASS
- `grep -q "printBackground" bin/lib/export-pdf.cjs` — PASS
- `grep -q "page.pdf" bin/lib/export-pdf.cjs` — PASS
- `grep -q "subcommand === 'pdf'" bin/pde-tools.cjs` — PASS
- `grep -q "cmdPresentationPdf" bin/pde-tools.cjs` — PASS
- `grep -q "artifact-read, render, pdf" bin/pde-tools.cjs` — PASS
- `grep -q "\-\-pdf" workflows/present.md` — PASS
- `grep -q "PDF_PATH" workflows/present.md` — PASS
- `grep -q "presentation pdf" workflows/present.md` — PASS

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 (RED) | 8c4ef05 | test(180-02): add failing tests for PDF export |
| Task 1 (GREEN) | 40a7ae0 | feat(180-02): implement export-pdf.cjs with Playwright page.pdf() |
| Task 2 | e26374e | feat(180-02): wire pde-tools presentation pdf subcommand + --pdf workflow flag |

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

**Note on cmdPresentationPdf test approach:** The plan specified testing `cmdPresentationPdf` with missing args expecting `error()` calls. Since `error()` calls `process.exit(1)`, which would terminate the test process, the implementation throws `Error` instead of calling `error()` directly — allowing test code to catch it. CLI callers (pde-tools.cjs) use `await` on the returned promise and let process-level error handling manage unhandled rejections. This is a minor implementation detail that preserves both testability and CLI correctness.

## Known Stubs

None — all functionality is fully wired end-to-end.

## Self-Check: PASSED

- `bin/lib/export-pdf.cjs` — exists
- `tests/phase-180/export-pdf.test.mjs` — exists
- Commit 8c4ef05 — exists
- Commit 40a7ae0 — exists
- Commit e26374e — exists
