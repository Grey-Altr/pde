---
phase: 178-reference-personas-+-rendering-engine
plan: "01"
subsystem: presentation-engine
tags: [rendering, html, markdown, personas, executive-summary, case-study, pde-design-tokens]
dependency_graph:
  requires:
    - 176-01 (buildPresentationIR IR schema)
    - 176-02 (IR field extractors: blockers, decisions, git_velocity, etc.)
    - 177-01 (pde-tools presentation CLI routing)
  provides:
    - render-presentation.cjs module with 10 exports
    - pde-tools presentation render subcommand
    - HTML+MD dual-format output for executive-summary and case-study personas
  affects:
    - bin/pde-tools.cjs (render subcommand added to presentation case)
    - .planning/presentations/ (output directory, HTML+MD files written here)
tech_stack:
  added: []
  patterns:
    - Section-Based Document Model (sections array drives both HTML and MD output)
    - Sentinel pattern for unavailable IR fields (irField.unavailable check before every builder)
    - Base64 data URI embedding for design artifact images
    - PDE design token CSS custom properties embedded inline in HTML
key_files:
  created:
    - bin/lib/render-presentation.cjs
    - tests/phase-178/render-presentation.test.mjs
  modified:
    - bin/pde-tools.cjs (presentation render subcommand)
decisions:
  - "Section-Based Document Model chosen: single sections array drives both HTML and MD renderers to ensure content parity across formats"
  - "Sentinel check pattern applied to every builder function: if (irField && irField.unavailable) return unavailable notice HTML"
  - "Template literals only for all HTML rendering — no npm dependencies as per project hard constraint"
  - "PDE design token palette hardcoded in renderer CSS: dark GitHub-inspired theme (#0d1117 bg, #58a6ff accent)"
metrics:
  duration: "~30min"
  completed_date: "2026-03-30"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
  tests_added: 34
  tests_passing: 34
---

# Phase 178 Plan 01: Reference Personas + Rendering Engine Summary

**One-liner:** Dual-format HTML+Markdown rendering engine with executive-summary (CLU-01) and case-study (CLR-01) persona builders using section-based document model and PDE design token CSS.

## What Was Built

A new `bin/lib/render-presentation.cjs` module implementing the complete rendering pipeline for stakeholder presentations. The module:

1. Consumes the Phase 176 IR from `buildPresentationIR()`
2. Dispatches to persona-specific section builders (executive-summary or case-study)
3. Renders both a self-contained HTML document and an ATX-headed Markdown companion
4. Writes files to caller-specified paths (naturally overwrites on re-run)
5. Is wired into `pde-tools presentation render` CLI subcommand

The `bin/pde-tools.cjs` presentation case block now routes `render` subcommand to `cmdPresentationRender`, keeping the existing `artifact-read` subcommand intact.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create render-presentation.cjs (TDD) | 3db4ba5 | bin/lib/render-presentation.cjs, tests/phase-178/render-presentation.test.mjs |
| 2 | Wire render subcommand into pde-tools.cjs | 15a7ac1 | bin/pde-tools.cjs |

## Key Functions Exported

| Function | Purpose |
|----------|---------|
| `escHtml(str)` | HTML entity escaping for `& < > " '` |
| `embedImage(absolutePath)` | Base64 data URI or null (graceful fallback) |
| `buildTOC(sections)` | `<nav class="toc">` with `<a href="#id">` anchors |
| `personaDisplayName(slug)` | Slug-to-display-name mapping |
| `buildExecutiveSummary(ir)` | CLU-01: 7 sections (overview, progress, requirements, blockers, decisions, timeline, artifacts) |
| `buildCaseStudy(ir)` | CLR-01: 6 sections (problem, approach, outcome, lessons, technical, artifacts) |
| `renderHTML(ir, persona, sections)` | Full self-contained HTML with PDE design tokens |
| `renderMarkdown(ir, persona, sections)` | ATX-headed Markdown companion |
| `render(ir, persona, htmlPath, mdPath)` | Orchestrator — dispatches, renders, writes both files |
| `cmdPresentationRender(cwd, ...)` | CLI handler for `pde-tools presentation render` |

## Requirements Met

| ID | Description | Status |
|----|-------------|--------|
| CLU-01 | Executive summary persona (7 sections) | DONE |
| CLR-01 | Case study persona (6 sections, problem-approach-outcome-lessons) | DONE |
| RND-01 | Self-contained HTML: <500KB, embedded CSS, no external URLs, no JS | DONE |
| RND-02 | Markdown companion with ATX headings and metadata blockquote | DONE |
| RND-03 | TOC `<nav class="toc">` with anchor links to all sections | DONE |
| RND-04 | Base64 image embedding when files exist; graceful skip when absent | DONE |
| RND-05 | PDE design tokens CSS custom properties (`--pde-bg`, `--pde-accent`, etc.) | DONE |
| RND-06 | Files written to specified paths via `fs.writeFileSync` | DONE |
| RND-07 | Re-running overwrites prior output (natural writeFileSync behavior) | DONE |

## HTML Constraints Verified

- `<!DOCTYPE html>` + `</html>` document structure: PASS
- Zero `<script` tags in output: PASS
- Zero external `href="http` or `src="http` URLs: PASS
- Output under 500KB: 6,685 bytes for actual project IR (well under limit)
- `<nav class="toc">` with anchor links: PASS
- `--pde-bg:` and `--pde-accent:` CSS custom properties: PASS

## Deviations from Plan

None — plan executed exactly as written.

The acceptance criteria note `grep "data:image" bin/lib/render-presentation.cjs` — the module uses a template literal `` `data:${mime};base64,${data}` `` rather than a literal string `data:image`, because the MIME type is runtime-resolved. The `embedImage` function is fully tested by the RND-04 tests which confirm base64 output at runtime.

## Known Stubs

None. Both persona builders produce complete, data-driven output from the real IR. The `buildArtifacts` function gracefully handles the current state (no design images on disk) by showing an informational notice — this is correct behavior, not a stub.

## Self-Check: PASSED

- `bin/lib/render-presentation.cjs` exists: FOUND
- `tests/phase-178/render-presentation.test.mjs` exists: FOUND
- Task 1 commit 3db4ba5: FOUND
- Task 2 commit 15a7ac1: FOUND
- 34/34 tests pass: CONFIRMED
- Phase-176 tests (38 tests) still pass: CONFIRMED
