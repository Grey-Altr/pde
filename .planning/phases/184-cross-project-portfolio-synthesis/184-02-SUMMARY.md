---
phase: 184-cross-project-portfolio-synthesis
plan: 02
subsystem: portfolio-render-and-command
tags: [portfolio, rendering, cross-project, command, workflow, tdd, PORT-03, PORT-06]
dependency_graph:
  requires: [184-01]
  provides: [portfolio-render, pde-portfolio-command, portfolio-workflow]
  affects: []
tech_stack:
  added: []
  patterns: [section-based-document-model, sentinel-pattern, direct-renderer-bypass, PORT-05-compliance]
key_files:
  created:
    - tests/phase-184/portfolio-render.test.mjs
    - tests/phase-184/portfolio-cmd.test.mjs
    - commands/portfolio.md
    - workflows/portfolio.md
  modified:
    - bin/lib/render-presentation.cjs
    - bin/pde-tools.cjs
decisions:
  - "cmdPortfolioRender calls renderHTML/renderMarkdown directly — bypasses render() persona switch to avoid mixing single-project and multi-project IR shapes"
  - "portfolio-synthesis persona never registered in render() switch — intentional to prevent misuse with single-project IR"
  - "Workflow reuses presentation pdf subcommand for PDF export — no new Playwright code needed"
  - "buildCrossProjectPortfolio returns exactly 5 sections: header, projects, patterns, outcomes, timeline"
  - "cmdPortfolioRender test intercepts process.exit(0) — output() always exits but files are written before exit"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 184 Plan 02: Portfolio Rendering Layer and Command Interface Summary

Cross-project portfolio rendering with `buildCrossProjectPortfolio()`, `cmdPortfolioRender()`, `pde-tools portfolio` subcommand routing, and `/pde:portfolio` command with workflow — completing the full portfolio synthesis pipeline.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add buildCrossProjectPortfolio + cmdPortfolioRender to render-presentation.cjs | 613c0c8 | bin/lib/render-presentation.cjs, tests/phase-184/portfolio-render.test.mjs |
| 2 | Wire pde-tools portfolio subcommand + command + workflow files | f169c84 | bin/pde-tools.cjs, commands/portfolio.md, workflows/portfolio.md, tests/phase-184/portfolio-cmd.test.mjs |

## What Was Built

**bin/lib/render-presentation.cjs** additions:

- `buildPortfolioHeader(portfolioIR)` — project count, available count, extraction time; "no projects could be extracted" guard for 0-available case
- `buildProjectList(portfolioIR)` — available projects with phases/requirements stats; unavailable projects with "data unavailable" warning badge (PORT-05)
- `buildCrossPatterns(portfolioIR)` — aggregates decisions and research findings across all available projects (up to 8 decisions, 6 findings)
- `buildCumulativeOutcomes(portfolioIR)` — sums phases.total/completed and requirements.total/completed across available projects; shows percentages
- `buildMilestoneTimeline(portfolioIR)` — collects milestones from all available projects, sorts chronologically by shipped date
- `buildCrossProjectPortfolio(portfolioIR)` — returns 5-section array: header, projects, patterns, outcomes, timeline
- `cmdPortfolioRender(cwd, portfolioIRPath, htmlPath, mdPath)` — reads portfolioIR JSON, calls renderHTML/renderMarkdown directly with synthetic meta object, writes files

**bin/pde-tools.cjs** addition:

```javascript
case 'portfolio': {
  // subcommand 'build' -> cmdPortfolioBuild
  // subcommand 'render' -> cmdPortfolioRender
  // default -> error with available subcommands
}
```

**commands/portfolio.md** — `/pde:portfolio` command shell following present.md pattern exactly.

**workflows/portfolio.md** — 7-step portfolio synthesis pipeline:
1. Parse $ARGUMENTS (paths + flags)
2. Validate paths (absolute, .planning/ exists, skip invalid with warning)
3. Build portfolioIR via `pde-tools portfolio build [paths...]`
4. Compute output paths (portfolio-synthesis-YYYY-MM-DD)
5. Render via `pde-tools portfolio render`
6. Optional PDF via `pde-tools presentation pdf` (reuses existing export)
7. Completion banner with project counts and file paths

## Decisions Made

- **Direct renderer bypass**: `cmdPortfolioRender` calls `renderHTML`/`renderMarkdown` directly with a synthetic meta object (`{ project: { name: 'Cross-Project Portfolio' }, extracted_at, source_hash: '' }`), bypassing the `render()` persona switch. This keeps single-project and multi-project IR shapes cleanly separated.
- **No verification footer for portfolio**: The verification step in `render()` compares IR fields against rendered content. Portfolio sections don't have the same field structure as single-project IR, so bypassing `render()` also avoids spurious verification warnings.
- **process.exit interception in test**: `cmdPortfolioRender` calls `output()` which calls `process.exit(0)`. The test intercepts `process.exit` to allow assertions after the call completes without vitest treating it as a crash.
- **Workflow uses CLAUDE_PLUGIN_ROOT convention**: All `node` invocations in the workflow use `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs` — consistent with present.md convention.

## Deviations from Plan

**[Rule 1 - Bug] Plan 01 not executed before Plan 02 was initiated**

- Found during: pre-execution check
- Issue: bin/lib/portfolio.cjs was missing — Plan 01 was never executed
- Fix: Executed Plan 01 inline (TDD RED→GREEN), created portfolio.cjs with all 4 exports, 11 tests passing
- Files modified: bin/lib/portfolio.cjs (created), tests/phase-184/portfolio.test.mjs (created)
- Commit: 92d887a

**[Rule 1 - Bug] cmdPortfolioRender test needed process.exit interception**

- Found during: Task 1 GREEN phase
- Issue: `output()` in core.cjs always calls `process.exit(0)`, causing Vitest to treat it as unexpected exit
- Fix: Updated test to intercept `process.exit` in a try/finally block, then verify files were written and exitCode was 0
- Impact: Test pattern now correctly validates files are written before exit

## Test Results

- Phase 184 tests: 23 passing (11 portfolio extraction + 8 portfolio render + 4 portfolio cmd)
- Phase 182 regression tests: 66 passing (no regressions)
- Total: 89 tests passing

## Known Stubs

None — all sections render real data from portfolioIR. The `buildCrossPatterns` function caps at 8 decisions and 6 findings for output length control, but this is an intentional design choice, not a stub.

## Self-Check: PASSED

- bin/lib/render-presentation.cjs: FOUND (buildCrossProjectPortfolio + cmdPortfolioRender added)
- bin/pde-tools.cjs: FOUND (case 'portfolio' added)
- commands/portfolio.md: FOUND
- workflows/portfolio.md: FOUND
- tests/phase-184/portfolio-render.test.mjs: FOUND
- tests/phase-184/portfolio-cmd.test.mjs: FOUND
- Commit 613c0c8: FOUND
- Commit f169c84: FOUND
- 23 phase-184 tests passing: VERIFIED
- 89 total tests (including phase-182 regression): VERIFIED
