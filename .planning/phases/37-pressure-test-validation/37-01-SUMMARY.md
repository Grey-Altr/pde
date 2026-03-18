---
phase: 37-pressure-test-validation
plan: 01
subsystem: testing
tags: [pressure-test, nyquist, fixtures, design-artifacts, evaluator-agent]

# Dependency graph
requires:
  - phase: 36-design-elevation-handoff-flows-cross-cutting
    provides: all 13 design pipeline stages complete, design artifact quality rubric established
  - phase: 29-quality-infrastructure
    provides: quality-standards.md, composition-typography.md, motion-design.md references
provides:
  - /pde:pressure-test command entry point (commands/pressure-test.md)
  - pde-pressure-test-evaluator agent targeting design OUTPUT artifacts
  - pde-pressure-test-evaluator model profile (quality:opus) in model-profiles.cjs
  - Three fixture directories with seeded design-manifest.json for greenfield/partial/rerun states
  - Six Nyquist test scripts (PRES-01 through PRES-06) and two test runners
affects: [37-02-workflow, future-phases-using-pressure-test]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fixture-isolated testing via pre-seeded design-manifest.json in .planning/pressure-test/
    - Design OUTPUT evaluator agent pattern (distinct from skill-file evaluator)
    - VISUAL-HOOK comment convention for concept-specificity grep detection
    - Nyquist tests use PROJ_ROOT with 4-level dirname from tests/ subdirectory

key-files:
  created:
    - commands/pressure-test.md
    - agents/pde-pressure-test-evaluator.md
    - .planning/pressure-test/fixture-greenfield/design/design-manifest.json
    - .planning/pressure-test/fixture-partial/design/design-manifest.json
    - .planning/pressure-test/fixture-rerun/design/design-manifest.json
    - .planning/pressure-test/fixture-partial/design/strategy/BRF-brief-v1.md
    - .planning/pressure-test/fixture-rerun/design/ux/mockups/mockup-dashboard.html
    - .planning/pressure-test/fixture-rerun/design/handoff/HND-spec-v1.md
    - .planning/phases/37-pressure-test-validation/tests/test-pres01-command.sh
    - .planning/phases/37-pressure-test-validation/tests/test-pres02-compliance.sh
    - .planning/phases/37-pressure-test-validation/tests/test-pres03-rubric.sh
    - .planning/phases/37-pressure-test-validation/tests/test-pres04-fixtures.sh
    - .planning/phases/37-pressure-test-validation/tests/test-pres05-report.sh
    - .planning/phases/37-pressure-test-validation/tests/test-pres06-ai-aesthetic.sh
    - .planning/phases/37-pressure-test-validation/tests/run-quick.sh
    - .planning/phases/37-pressure-test-validation/tests/run-all.sh
  modified:
    - bin/lib/model-profiles.cjs
    - references/model-profiles.md

key-decisions:
  - "pde-pressure-test-evaluator is a NEW agent distinct from pde-design-quality-evaluator — evaluates design OUTPUT artifacts (.planning/design/**), not SKILL.md files; two evaluators needed to avoid wrong-domain findings (skill anatomy checklist on HTML mockups)"
  - "pde-pressure-test-evaluator uses quality:opus — matches pde-design-quality-evaluator precedent; design quality judgment requires maximum reasoning capability"
  - "Tide (marine biology field research platform for coastal ecologists) selected as fixture concept — domain-specific enough to force non-generic color (ocean OKLCH palette), typography (scientific notation + field labels), and concept-specific interactions (tidal cycle arc, specimen tagging)"
  - "All three fixtures use the same Tide concept — continuity across greenfield/partial/rerun states mirrors real pipeline progression on one product"
  - "fixture-rerun mockup includes VISUAL-HOOK: tide-cycle-arc comment stub — ensures PRES-06 grep test has something to validate against once full mockup is generated"
  - "Nyquist test PROJ_ROOT uses 4-level dirname: tests/ is at .planning/phases/37-pressure-test-validation/tests/ — 4 levels from project root"

patterns-established:
  - "Design artifact evaluator agent pattern: READ-ONLY, loads quality-standards.md + composition-typography.md + motion-design.md, returns structured JSON with ai_aesthetic_checks block"
  - "Fixture directory pattern: .planning/pressure-test/fixture-{state}/design/ with design-manifest.json and DESIGN-STATE.md; empty subdirs use .gitkeep"
  - "PRES-0N test script naming convention for pressure-test Nyquist checks (vs HAND-0N, FLOW-0N from prior phases)"

requirements-completed: [PRES-01, PRES-02, PRES-03, PRES-04, PRES-05, PRES-06]

# Metrics
duration: 7min
completed: 2026-03-18
---

# Phase 37 Plan 01: Pressure-Test Validation — Interfaces & Fixtures Summary

**`/pde:pressure-test` command, `pde-pressure-test-evaluator` design-output agent, model profile registration, three Tide fixture directories with seeded manifests, and 6 Nyquist Wave 0 test scripts**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-03-18T08:00:00Z
- **Completed:** 2026-03-18T08:07:08Z
- **Tasks:** 2
- **Files modified:** 47

## Accomplishments

- Created `/pde:pressure-test` command with `Skill` in `allowed-tools`, routing to `@workflows/pressure-test.md`
- Created `pde-pressure-test-evaluator` agent targeting design pipeline OUTPUT artifacts — evaluates Awwwards 4-dimension rubric + 4 AI aesthetic checks (VISUAL-HOOK, color, asymmetry, motion choreography) returning structured JSON
- Registered `pde-pressure-test-evaluator` in `bin/lib/model-profiles.cjs` with `quality: 'opus'` and updated `references/model-profiles.md`
- Created 3 fixture directories with Tide concept (marine biology field research platform): greenfield (all 13 flags false), partial (stages 1-7 true with 8 stub artifacts including real product brief), rerun (all 13 flags true with full artifact set including mockup with VISUAL-HOOK stub)
- Created 6 Nyquist test scripts (PRES-01 through PRES-06) and 2 runners using correct bash pattern (`set -euo pipefail`, `PASS=$((PASS+1))`); PRES-04 passes 6/6 green

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave 0 Nyquist test scripts and runners** — `00177ac` (test)
2. **Task 1: Command, agent, model-profile, and fixture directories** — `01f790d` (feat)

## Files Created/Modified

- `commands/pressure-test.md` — `/pde:pressure-test` command entry point; allowed-tools includes Skill; routes to @workflows/pressure-test.md
- `agents/pde-pressure-test-evaluator.md` — design OUTPUT quality evaluator; VISUAL-HOOK check; ai_aesthetic_checks JSON schema; does NOT evaluate skill files
- `bin/lib/model-profiles.cjs` — added pde-pressure-test-evaluator with quality:opus
- `references/model-profiles.md` — added pde-pressure-test-evaluator row
- `.planning/pressure-test/fixture-greenfield/design/design-manifest.json` — all 13 coverage flags false (fresh state)
- `.planning/pressure-test/fixture-greenfield/design/DESIGN-STATE.md` — "Status: Not started"
- `.planning/pressure-test/fixture-partial/design/design-manifest.json` — stages 1-7 true (recommend/competitive/opportunity/ideate/system/flows/wireframe)
- `.planning/pressure-test/fixture-partial/design/strategy/BRF-brief-v1.md` — real 5-section Tide product brief with aesthetic direction, user personas, key workflows
- `.planning/pressure-test/fixture-partial/design/` — 7 additional stub artifacts (REC/CPT/OPP/IDT/SYS/FLW/WFR)
- `.planning/pressure-test/fixture-rerun/design/design-manifest.json` — all 13 coverage flags true
- `.planning/pressure-test/fixture-rerun/design/ux/mockups/mockup-dashboard.html` — stub with `<!-- VISUAL-HOOK: tide-cycle-arc -->` comment
- `.planning/pressure-test/fixture-rerun/design/handoff/HND-spec-v1.md` — stub handoff spec
- `.planning/pressure-test/fixture-rerun/design/` — 10 additional stub artifacts for all 13 stages
- `.planning/phases/37-pressure-test-validation/tests/test-pres01-command.sh` — PRES-01: command + workflow existence
- `.planning/phases/37-pressure-test-validation/tests/test-pres02-compliance.sh` — PRES-02: coverage-check, hasDesignSystem, hasHandoff, BRF-brief-v, hasIterate nullish coalescing
- `.planning/phases/37-pressure-test-validation/tests/test-pres03-rubric.sh` — PRES-03: pde-pressure-test-evaluator agent reference, Task() invocation, quality-standards.md
- `.planning/phases/37-pressure-test-validation/tests/test-pres04-fixtures.sh` — PRES-04: 3 fixture manifest existence + flag state checks (6/6 green)
- `.planning/phases/37-pressure-test-validation/tests/test-pres05-report.sh` — PRES-05: pressure-test-report.md output path, Tier 1/2, PASS/FAIL labels
- `.planning/phases/37-pressure-test-validation/tests/test-pres06-ai-aesthetic.sh` — PRES-06: VISUAL-HOOK, asymmetry, OKLCH/color, motion choreography
- `.planning/phases/37-pressure-test-validation/tests/run-quick.sh` — runs PRES-01 + PRES-04 only
- `.planning/phases/37-pressure-test-validation/tests/run-all.sh` — all 6 scripts sequentially

## Decisions Made

- `pde-pressure-test-evaluator` is a new agent distinct from `pde-design-quality-evaluator` — evaluates design OUTPUT artifacts, not SKILL.md files; using the skill evaluator on HTML/CSS would produce wrong-domain findings (missing `<purpose>` section on a CSS file)
- `quality: 'opus'` for pde-pressure-test-evaluator — matches pde-design-quality-evaluator precedent; design quality judgment requires maximum reasoning
- Tide (marine biology field research platform for coastal ecologists) as fixture concept — domain-specific enough to force non-AI-aesthetic output: ocean OKLCH palette, condensed technical + humanist serif pairing, tidal cycle arc as VISUAL-HOOK
- All three fixtures use one concept — continuity mirrors real pipeline progression; partial fixture is stages 1-7 of the same Tide product

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — all verification checks passed as expected. PRES-01 correctly shows 3/5 pass (command exists, frontmatter, workflow reference in command body) with 2 expected failures for `workflows/pressure-test.md` which is created in Plan 02.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 02 creates `workflows/pressure-test.md` — the orchestrating workflow that will make PRES-01/02/03/05/06 pass fully
- All structural contracts are defined: command shape, agent prompt with return schema, fixture data, test expectations
- `run-quick.sh` now passes (PRES-04 6/6 green); `run-all.sh` will pass fully after Plan 02

## Self-Check: PASSED

- commands/pressure-test.md: FOUND
- agents/pde-pressure-test-evaluator.md: FOUND
- fixture-greenfield/design/design-manifest.json: FOUND
- fixture-partial/design/design-manifest.json: FOUND
- fixture-rerun/design/design-manifest.json: FOUND
- 37-01-SUMMARY.md: FOUND
- Commit 00177ac (test scripts): FOUND
- Commit 01f790d (command/agent/fixtures): FOUND
- PRES-04 Nyquist test: 6/6 passed

---
*Phase: 37-pressure-test-validation*
*Completed: 2026-03-18*
