---
phase: 16-wireframing-pde-wireframe
plan: "01"
subsystem: design-pipeline
tags: [html-wireframes, css-custom-properties, design-tokens, pde-workflow, fidelity-enum, state-variants, accessibility]

# Dependency graph
requires:
  - phase: 15-user-flow-mapping-pde-flows
    provides: FLW-screen-inventory.json schema and workflow pattern to mirror
  - phase: 14-design-system-pde-system
    provides: assets/tokens.css consumed via <link> in wireframe HTML; workflow manifest/lock pattern
  - phase: 12-design-infra
    provides: pde-tools.cjs design subcommands (ensure-dirs, lock-acquire/release, manifest-update, manifest-set-top-level, coverage-check)
provides:
  - workflows/wireframe.md — complete 7-step /pde:wireframe skill workflow (704 lines)
  - commands/wireframe.md — delegation stub updated to reference @workflows/wireframe.md
affects: [17-critique-pde-critique, 18-iterate-pde-iterate, 19-handoff-pde-handoff, 20-build-pde-build]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fidelity enum validation at Step 2: lofi|midfi|hifi validated before any generation; halt on unrecognized value"
    - "Per-fidelity prescriptive content rules: non-overlapping exclusive rule sets prevent fidelity drift between runs (WFR-03)"
    - "State variant HTML pattern: pde-state--default (visible) + pde-state--loading (hidden) + pde-state--error (hidden) with mandatory ANNOTATION: comments"
    - "Coverage flag read-before-set: coverage-check before manifest-set-top-level designCoverage to prevent clobber"
    - "WFR is single manifest entry for entire wireframes/ directory — never one entry per screen"
    - "index.html always generated even for single-screen batches"

key-files:
  created:
    - workflows/wireframe.md
  modified:
    - commands/wireframe.md

key-decisions:
  - "Wireframes directory is fixed path (wireframes/) not versioned — mirrors screen inventory pattern; Phase 17 (critique) needs a stable path"
  - "Inter-page navigation links include all known screens from inventory including not-yet-generated screens (comment placeholder for missing screens)"
  - "Playwright MCP included as optional enhancement at Step 3 with graceful degradation — skill functions without it"
  - "ANNOTATION: comments are mandatory at every state variant block — Phase 19 handoff reads these to generate TypeScript component APIs"
  - "Lo-fi complex screen rules explicitly specified: data tables (header + 3 rows), dashboards (labeled gray boxes), charts (bounding box + type label) — prevents incomprehensibly sparse output"

patterns-established:
  - "Wireframe fidelity rule sets are prescriptive and non-overlapping — running same command twice produces structurally identical output"
  - "Self-contained HTML via inline <style> for screen-specific overrides + <link> for shared tokens — works at file:// without server"
  - "Fallback palette inline when tokens absent — product-type-aware defaults, never halts"

requirements-completed: [WFR-01, WFR-02, WFR-03]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 16 Plan 01: Wireframing Summary

**7-step /pde:wireframe workflow generating browser-viewable HTML/CSS wireframes at lofi/midfi/hifi fidelity from screen inventory, with state variants, mandatory ANNOTATION: comments, and token consumption from assets/tokens.css**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T02:16:38Z
- **Completed:** 2026-03-16T02:20:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- 704-line `workflows/wireframe.md` with full 7-step pipeline: dirs init, prerequisites + fidelity validation, MCP probe, per-screen HTML generation, file write + index.html, ux DESIGN-STATE update, root DESIGN-STATE + manifest + coverage flag
- Prescriptive per-fidelity content rules (lofi/midfi/hifi) with non-overlapping specifications enforcing WFR-03 (deterministic output on re-run)
- Mandatory `<!-- ANNOTATION: -->` comments on all state variants and interactive elements for Phase 19 handoff consumption
- `commands/wireframe.md` stub replaced with `@workflows/wireframe.md` delegation matching established commands/flows.md pattern
- All 20 infrastructure self-tests continue to pass — no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create workflows/wireframe.md** - `4c5d152` (feat)
2. **Task 2: Update commands/wireframe.md** - `204699a` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `workflows/wireframe.md` — complete 7-step /pde:wireframe skill workflow (704 lines); mirrors flows.md structure with wireframe-specific fidelity enum validation, HTML scaffold generation, and WFR manifest registration
- `commands/wireframe.md` — stub replaced with `@workflows/wireframe.md` delegation; argument-hint updated to include `lofi|midfi|hifi` fidelity enum; stub text "Planned -- available in PDE v2" removed

## Decisions Made

- **Fixed wireframes/ directory path:** `wireframes/` not versioned (unlike `FLW-flows-v{N}.md`). Mirrors Phase 15 screen inventory pattern. Phase 17 (critique) needs stable path; overwrite on re-run is correct behavior. Matches open question resolution in research.
- **All-screens inter-page navigation:** Links to all inventory screens generated in nav section, including not-yet-generated ones (comment placeholder). Avoids 404s after subsequent partial runs.
- **Playwright MCP optional at Step 3:** Included probe with `--no-playwright` flag for explicit skip. Skill fully functional without it — validation is enhancement-only.
- **ANNOTATION: comments mandatory:** Every state variant block and non-obvious interactive element requires annotation. Phase 19 handoff reads these to infer TypeScript prop shapes and event handlers.
- **Lo-fi complex screen rules specified explicitly:** Data tables (header + 3 placeholder rows), dashboards (labeled dimension boxes), charts (bounding box + type label). Addresses research flag from STATE.md about information-heavy screen reliability.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — macOS grep treated `--lofi` etc. as flags during verification; resolved by using Python for flag string checks. No code changes required.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `/pde:wireframe` is now a complete, executable skill — runs on any project with a screen inventory from `/pde:flows`
- Phase 17 (`/pde:critique`) can consume wireframes from `.planning/design/ux/wireframes/`
- Phase 19 (`/pde:handoff`) depends on `<!-- ANNOTATION: -->` comments in generated wireframes — annotation requirements are now enforced in the workflow
- Research flag from STATE.md (annotation completeness for Phase 19) addressed via mandatory annotation requirement at every state variant and interactive element

---
*Phase: 16-wireframing-pde-wireframe*
*Completed: 2026-03-16*
