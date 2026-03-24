---
phase: 116-pressure-test-meta-optimization-ideation-brief-reference
plan: "02"
subsystem: design-skills
tags: [ideation, brief, visual-diversity, reference-screenshot, playwright, nyquist]
dependency_graph:
  requires:
    - bin/lib/visual-regression.cjs (hashScreenshot)
    - bin/lib/mcp-bridge.cjs (Playwright tool resolution)
    - bin/pde-tools.cjs (mcp-probe subcommand)
  provides:
    - bin/visual-diversity-metric.cjs (computeVisualDiversity)
    - workflows/ideate.md Step 7b (visual diversity scoring)
    - workflows/brief.md Step 3b (reference screenshot capture)
  affects:
    - workflows/ideate.md (step count 7->8, new Step 7b/8)
    - workflows/brief.md (new flag, new step, new artifact section)
tech_stack:
  added:
    - bin/visual-diversity-metric.cjs (CJS metric script, SHA-256 hash diversity)
  patterns:
    - require.main === module guard for safe module export + CLI dual-mode
    - Playwright availability probe via pde-tools mcp-probe subcommand
    - Opt-in flag pattern (--reference-url absent = silent skip)
    - _evalMetric contract (exit 0 always, last stdout line = numeric score)
key_files:
  created:
    - bin/visual-diversity-metric.cjs
    - tests/phase-116/ideation-visual.test.mjs
    - tests/phase-116/brief-reference.test.mjs
  modified:
    - workflows/ideate.md
    - workflows/brief.md
decisions:
  - "require.main === module guard prevents process.exit(0) from firing when module is required by tests — critical for CJS scripts that export functions AND run as CLI tools"
  - "computeVisualDiversity moves hashScreenshot require inside function body to avoid module-load errors when library missing"
  - "PLAYWRIGHT_AVAILABLE probe added to brief.md only when REFERENCE_URL is not empty — avoids unnecessary Playwright probe overhead for users not using --reference-url"
  - "Reference Material section placed before Footer in BRF artifact — downstream skills can parse it by ## heading; only written when reference captured"
metrics:
  duration: "~6 minutes"
  completed: "2026-03-23"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 116 Plan 02: Visual Diversity Metric + Brief Reference Screenshot Summary

**One-liner:** SHA-256 hash-variance diversity metric for Stitch PNGs in ideate.md Step 7b, plus opt-in competitor/reference screenshot capture via --reference-url flag in brief.md Step 3b.

## Tasks Completed

| Task | Description | Commit | Key Files |
|------|-------------|--------|-----------|
| 1 | Create visual-diversity-metric.cjs + ideate.md Step 7b + IDT Nyquist tests | 5f5c48d | bin/visual-diversity-metric.cjs, workflows/ideate.md, tests/phase-116/ideation-visual.test.mjs |
| 2 | Add brief.md Step 3b reference screenshot capture + BREF Nyquist tests | aaaaae4 | workflows/brief.md, tests/phase-116/brief-reference.test.mjs |

## What Was Built

### bin/visual-diversity-metric.cjs

New CJS metric script under 80 lines. Follows `_evalMetric` contract: exit 0 always, stdout last line = numeric score (0-100). Computes diversity as `Math.round((unique_hashes / total_screenshots) * 100)` using `hashScreenshot` from `bin/lib/visual-regression.cjs`.

Key design decision: uses `require.main === module` guard so `process.exit(0)` only fires in CLI mode — safe for `require()` in Nyquist tests. `computeVisualDiversity` function exported for direct test invocation.

### workflows/ideate.md — Step 7b/8

Added Step 7b/8 (Visual Diversity Scoring) after Step 7/8 (DESIGN-STATE update). Updated all step denominators from /7 to /8 to reflect the new 8-step pipeline.

Step 7b:
- Probes Playwright availability via `node bin/pde-tools.cjs mcp-probe --tool playwright:screenshot`
- Degrades gracefully when Playwright unavailable: logs message, skips
- Determines source directory from Stitch PNGs (STH-ideate-direction-*.png)
- Computes score via `node bin/visual-diversity-metric.cjs "$DIVERSITY_DIR"`
- Appends Visual Diversity table to IDT artifact

### workflows/brief.md — Step 3b + --reference-url flag

Added `--reference-url` flag to flags table and process header with REFERENCE_URL parsing.

Step 3b (Reference Screenshot Capture):
- Playwright probe gated on REFERENCE_URL not empty (avoids overhead for non-reference runs)
- Silent skip when REFERENCE_URL is empty (opt-in behavior)
- Derives REF slug from URL hostname for deterministic path: `REF-{slug}.png`
- Saves to `.planning/design/references/REF-{slug}.png`
- 30-second timeout guard, non-fatal on failure
- Appends `## Reference Material` table to BRF artifact when captured

## Nyquist Test Results

### IDT tests (8/8 passing)
- IDT-01: ideate.md contains Step 7b, references visual-diversity-metric.cjs
- IDT-02: visual-diversity-metric.cjs exists, exports computeVisualDiversity
- IDT-03: all-unique returns 100, all-identical returns 33 (1/3 unique)
- IDT-04: PLAYWRIGHT_AVAILABLE check present, degradation message present

### BREF tests (10/10 passing)
- BREF-01: Step 3b present, reference screenshot prose present
- BREF-02: --reference-url flag, playwright:navigate, references/ path, REF- prefix
- BREF-03: Reference Material section, REFERENCE_SCREENSHOT_PATH variable
- BREF-04: silent skip, REFERENCE_URL empty check

## Deviations from Plan

**1. [Rule 1 - Bug] Added require.main === module guard to visual-diversity-metric.cjs**
- **Found during:** Task 1 verification
- **Issue:** The plan's reference code had module-level script execution (process.exit(0)) that would terminate the test process when the module was required by Nyquist tests
- **Fix:** Moved all CLI execution into `if (require.main === module)` block; moved `computeVisualDiversity` definition outside the guard so it is always exported
- **Files modified:** bin/visual-diversity-metric.cjs
- **Commit:** 5f5c48d

## Known Stubs

None — all functionality is wired. Playwright-dependent paths degrade gracefully when Playwright MCP is unavailable.

## Self-Check: PASSED
