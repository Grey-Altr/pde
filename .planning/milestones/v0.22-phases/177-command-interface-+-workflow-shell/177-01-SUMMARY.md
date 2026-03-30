---
phase: 177-command-interface-+-workflow-shell
plan: "01"
subsystem: tooling
tags: [pde-skills, workflow, command-routing, persona-registry, ir-pipeline]

# Dependency graph
requires:
  - phase: 176-data-extraction-ir-foundation
    provides: bin/lib/presentation.cjs with buildPresentationIR() and cmdPresentationArtifactRead(); pde-tools presentation artifact-read CLI; @file: redirect pattern
provides:
  - /pde:present command file at commands/present.md with YAML frontmatter delegating to workflow
  - workflows/present.md with 15-persona registry, three-branch dispatch (LIST/GENERATE/ERROR), IR acquisition from pde-tools with @file: redirect handling, and Phase 178 generation stub
  - PRS skill code registered in skill-registry.md with tooling domain
  - 32 integration tests in tests/phase-177/present-cmd.test.mjs covering command structure, XML lint sections, all 15 persona slugs, and dispatch logic
affects:
  - 178-reference-personas: depends on workflows/present.md dispatch routing and persona slug definitions
  - 179-svg-charts: may reference persona registry
  - 183-auto-generation: depends on /pde:present command structure

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD workflow: RED tests first (32 failing), then GREEN implementation (32 passing)"
    - "PDE two-file command pattern: thin commands/X.md delegates to workflows/X.md"
    - "Five LINT-required XML sections: purpose, skill_code, skill_domain, context_routing, process"
    - "IR acquisition pattern: node pde-tools.cjs presentation artifact-read with @file: redirect handling"
    - "Three-branch dispatch in workflow: LIST MODE / GENERATE MODE / ERROR MODE"

key-files:
  created:
    - commands/present.md
    - workflows/present.md
    - tests/phase-177/present-cmd.test.mjs
  modified:
    - skill-registry.md

key-decisions:
  - "PRS skill code chosen — 3 uppercase letters, unique across all 17 existing skill codes (BRF, FLW, SYS, WFR, MCK, CRT, HIG, ITR, HND, HDW, CMP, OPP, REC, IDT, AUD, IMP, PRT)"
  - "tooling domain used for presentation skill — presentations are infrastructure/reporting capability of the platform, not strategy/visual/ux/review/system/hardware/handoff"
  - "Persona registry embedded inline in workflow as static markdown table — 15 static entries, no runtime I/O overhead, no separate JSON file dependency"
  - "Phase 177 produces placeholder HTML+MD output stub for Phase 178 to replace — dispatch routing and IR hand-off are delivered, not full rendering"

patterns-established:
  - "Present command file pattern: YAML frontmatter with name/description/argument-hint/allowed-tools, then objective + process delegation"
  - "Workflow three-branch dispatch: empty arg -> LIST MODE, valid slug -> GENERATE MODE, unknown slug -> ERROR MODE"
  - "What/Why/What-to-do error format for invalid persona slug with full valid list"
  - "@file: redirect handling in workflow bash blocks: if [[ \"$IR\" == @file:* ]]; then IR=$(cat \"${IR#@file:}\"); fi"

requirements-completed: [CMD-01, CMD-02]

# Metrics
duration: 4min
completed: 2026-03-30
---

# Phase 177 Plan 01: Command Interface + Workflow Shell Summary

**`/pde:present` command wired with 15-persona registry, three-branch dispatch (LIST/GENERATE/ERROR), IR acquisition from pde-tools, and Phase 178 generation stub — 32 integration tests all green**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-30T01:10:14Z
- **Completed:** 2026-03-30T01:13:21Z
- **Tasks:** 2 (TDD Task 1 + validation Task 2)
- **Files modified:** 4

## Accomplishments
- Created `commands/present.md` with correct YAML frontmatter (name, description, argument-hint, allowed-tools) delegating to `@workflows/present.md`
- Created `workflows/present.md` with all 5 LINT-required XML sections, inline 15-persona registry, three-branch dispatch (LIST MODE / GENERATE MODE / ERROR MODE), IR acquisition with `@file:` redirect handling, and placeholder generation stub for Phase 178
- Registered PRS skill code in `skill-registry.md` with tooling domain — unique across all 17 existing skill codes
- 32 integration tests written and passing green covering command file structure, workflow XML lint compliance, all 15 persona slugs, IR acquisition pattern, and dispatch logic
- IR pipeline (Phase 176) smoke-tested and confirmed working end-to-end during validation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create command file, workflow file, update skill-registry (TDD RED+GREEN)** - `7692938` (feat)
2. **Task 2: Validate lint compliance and smoke test** - no file changes required (validation only)

**Plan metadata:** see final metadata commit

## Files Created/Modified
- `commands/present.md` — Thin command file with YAML frontmatter delegating to `@workflows/present.md`
- `workflows/present.md` — Full workflow with 15-persona registry, three-branch dispatch, IR acquisition, Phase 178 stub
- `skill-registry.md` — Added `| PRS | /pde:present | workflows/present.md | tooling | active |` row
- `tests/phase-177/present-cmd.test.mjs` — 32 integration tests covering all lint-required sections, persona slugs, and dispatch logic

## Decisions Made
- PRS skill code: 3 uppercase letters, confirmed unique against all 17 existing codes in registry
- tooling domain: closest valid LINT-003 domain for presentations-as-infrastructure; "presentation" and "reporting" are not valid domains
- Inline persona registry: 15 static entries embedded in workflow markdown table — simpler than separate JSON/JS module, no I/O overhead
- Generation stub in Step 6: Phase 177 produces placeholder HTML+MD files to prove routing works; full HTML rendering deferred to Phase 178

## Deviations from Plan

None — plan executed exactly as written.

The `node "${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs" test --lint` command referenced in Task 2 does not exist as a standalone CLI (pde-tools has: state, resolve-model, find-phase, commit, verify-summary, verify, frontmatter, template, generate-slug, current-timestamp, list-todos, verify-path-exists, config-ensure-section, init). `/pde:test --lint` is a Claude Code skill, not a CLI. Lint compliance was verified manually against LINT-001 through LINT-012 rules from `references/tooling-patterns.md`. All error-level rules pass.

## Issues Encountered
- `pde-tools test --lint` is not a CLI command — `/pde:test --lint` is a Claude Code slash command. Lint validation was performed by manual inspection against the LINT rules in `references/tooling-patterns.md`. All 5 required sections, skill code format, and registry registration pass all error-level lint rules.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `commands/present.md` ready as entry point for `/pde:present` slash command
- `workflows/present.md` provides routing skeleton Phase 178 will fill with rendering logic — Step 6 is the designated replacement point
- All 15 persona slugs locked and confirmed in workflow registry
- `pde-tools presentation artifact-read` confirmed working (returns @file: redirect with valid JSON, schema_version 1.0)
- Phase 178 can implement actual HTML+Markdown rendering by replacing the Step 6 generation stub

---
*Phase: 177-command-interface-+-workflow-shell*
*Completed: 2026-03-30*
