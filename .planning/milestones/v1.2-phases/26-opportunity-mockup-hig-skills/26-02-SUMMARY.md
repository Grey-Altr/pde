---
phase: 26-opportunity-mockup-hig-skills
plan: 02
subsystem: ui
tags: [mockup, hi-fi, html, css, design-tokens, wireframe-traceability, css-only-interactions]

# Dependency graph
requires:
  - phase: 26-opportunity-mockup-hig-skills-01
    provides: wireframe skill that MCK workflow consumes as soft dependency
provides:
  - commands/mockup.md delegating to @workflows/mockup.md
  - workflows/mockup.md with full MCK hi-fi mockup generation workflow
  - CSS-only interactive state generation (hover/focus-visible/active/checked)
  - WIREFRAME-SOURCE and WIREFRAME-ANNOTATION traceability patterns
  - 13-field coverage write with hasMockup flag
affects:
  - phase-26-hig: critique and HIG consume mockup output
  - phase-27-ideation: mockup skill is part of the full design pipeline

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MCK skill code for hi-fi mockup generation"
    - "Self-contained HTML/CSS per screen with only tokens.css as external dependency"
    - "CSS-only interactive states via pseudo-classes (no JavaScript in mockup output)"
    - "WIREFRAME-SOURCE comment in <head> for version traceability"
    - "WIREFRAME-ANNOTATION preservation at corresponding DOM locations"
    - "7-call manifest-update pattern for MCK artifact registration"
    - "13-field pass-through-all coverage check before hasMockup write"

key-files:
  created:
    - workflows/mockup.md
  modified:
    - commands/mockup.md

key-decisions:
  - "Mockup HTML is self-contained per screen -- no shared mockup.js or mockup.css bundle (MOCK-01)"
  - "All interactive states use CSS pseudo-classes only -- no JavaScript in generated output except single theme toggle (MOCK-02)"
  - "Wireframes are a soft dependency -- skill warns and continues if absent, generating from brief/flows context"
  - "Body class pde-layout--hifi distinguishes mockups from wireframes"
  - "Theme toggle JS is the single permitted script in mockup output -- all other interactivity is CSS-only"

patterns-established:
  - "WIREFRAME-SOURCE: comment pattern links mockup to originating wireframe version"
  - "WIREFRAME-ANNOTATION: preservation maps wireframe annotations to mockup HTML locations"
  - "CSS-only disclosure via details/summary with [open] pseudo-class"
  - "CSS-only validation states via :invalid/:valid on form inputs"

requirements-completed: [MOCK-01, MOCK-02, MOCK-03]

# Metrics
duration: 4min
completed: 2026-03-16
---

# Phase 26 Plan 02: Mockup Skill Summary

**MCK hi-fi mockup workflow with CSS-only interactions, tokens.css integration, wireframe annotation traceability, and 7-step generation pipeline producing self-contained HTML/CSS per screen**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-16T21:59:05Z
- **Completed:** 2026-03-16T22:03:48Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Created `workflows/mockup.md` -- full v1.2 lint-compliant workflow with all required sections (purpose, skill_code MCK, skill_domain ux, context_routing, required_reading, flags, process, output)
- Updated `commands/mockup.md` -- replaced stub process body with `@workflows/mockup.md` delegation, YAML frontmatter preserved exactly
- Defined 7-step generation pipeline: init dirs, discover wireframes, probe Playwright MCP, generate hi-fi HTML/CSS per screen, write MCK spec, update ux DESIGN-STATE, update root DESIGN-STATE and manifest
- Established MOCK-01 (self-contained HTML), MOCK-02 (CSS-only interactions), MOCK-03 (wireframe traceability) compliance patterns

## Task Commits

1. **Task 1: Build /pde:mockup command and workflow** - `77b4aa5` (feat)

## Files Created/Modified

- `commands/mockup.md` -- stub `<process>` body replaced with `@workflows/mockup.md` delegation
- `workflows/mockup.md` -- full hi-fi mockup generation workflow (MCK, ux domain, 7-step pipeline)

## Decisions Made

- Mockup HTML is self-contained per screen: no shared CSS/JS bundle. `mockup.css` and `mockup.js` do not exist. Only external dependency is `../../assets/tokens.css` (same relative path as wireframes).
- All interactive states are CSS-only via `:hover`, `:focus-visible`, `:active`, `:checked`, `:disabled`, `[open]`, `:invalid`, `:valid` pseudo-classes. The only JavaScript permitted is the single theme toggle function.
- Wireframes are a soft dependency -- the workflow warns when absent and continues generating from brief/flows context. This follows the soft-dependency pattern established in other PDE skills.
- `pde-layout--hifi` body class distinguishes mockup HTML from wireframe HTML which uses `pde-layout--{fidelity}`.
- WIREFRAME-SOURCE comment is placed as first comment in `<head>` to establish the wireframe version link for handoff traceability.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- MCK skill is complete and lint-compliant with all v1.2 required sections
- Ready for Phase 26 Plan 03 (HIG audit skill) which consumes mockup output
- `/pde:critique` and `/pde:handoff` can now consume MCK mockup artifacts
- Playwright MCP integration documented for post-generation visual validation

---
*Phase: 26-opportunity-mockup-hig-skills*
*Completed: 2026-03-16*
