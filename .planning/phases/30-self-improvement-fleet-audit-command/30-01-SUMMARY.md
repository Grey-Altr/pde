---
phase: 30-self-improvement-fleet-audit-command
plan: "01"
subsystem: tooling
tags: [cli, lint, skill-validation, agent-prompts, model-profiles, audit-fleet]

requires:
  - phase: 29-quality-infrastructure
    provides: protected-files.json, model-profiles baseline, skill-registry.md, tooling-patterns.md with LINT rules

provides:
  - validate-skill CLI command with LINT-001 through LINT-024 rule checks
  - agents/pde-quality-auditor.md — READ-ONLY auditor returning structured JSON findings with score_pct
  - agents/pde-skill-improver.md — generates improvement proposals to .planning/improvements/ with diff output
  - agents/pde-skill-validator.md — validates proposals for PASS/FAIL with no_regressions check
  - pde-skill-improver and pde-skill-validator registered in MODEL_PROFILES and model-profiles.md

affects: [31-skill-builder, 32-design-elevation-system-skill, 30-02-audit-workflow, 30-03-health-report]

tech-stack:
  added: []
  patterns:
    - "validate-skill follows same module export pattern as other bin/lib/*.cjs modules"
    - "Agent definition files in agents/ use @${CLAUDE_PLUGIN_ROOT} reference syntax for required reading"
    - "Fleet agents have explicit protected-files constraint clause before any write operation"

key-files:
  created:
    - bin/lib/validate-skill.cjs
    - agents/pde-quality-auditor.md
    - agents/pde-skill-improver.md
    - agents/pde-skill-validator.md
  modified:
    - bin/pde-tools.cjs
    - bin/lib/model-profiles.cjs
    - references/model-profiles.md

key-decisions:
  - "validate-skill skips workflow files lacking <skill_code> using path+content heuristic — prevents false LINT errors on non-skill files"
  - "pde-skill-improver uses sonnet/sonnet/haiku — balanced tier needs solid reasoning for code change proposals"
  - "pde-skill-validator uses sonnet/haiku/haiku — validation is more mechanical, haiku sufficient for balanced tier"
  - "pde-quality-auditor skips self-evaluation (pde-quality-auditor.md) to prevent circular findings"

patterns-established:
  - "Fleet agent prompts: always include explicit protected-files guard clause before any write tool call"
  - "Fleet agent prompts: always include Return Format section with concrete JSON schema"
  - "Non-skill file guard: if no <skill_code> section AND path contains workflows/ — return skipped:true, skip all lint checks"

requirements-completed: [AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-08, AUDIT-12]

duration: 4min
completed: 2026-03-17
---

# Phase 30 Plan 01: Self-Improvement Fleet Foundation Summary

**validate-skill CLI with LINT-001 through LINT-024 checks, three fleet agent definitions (auditor/improver/validator), and two new model profile entries enabling the Phase 30 audit workflow**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-17T02:02:01Z
- **Completed:** 2026-03-17T02:05:45Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- `validate-skill` CLI command validates skill files against LINT-001–LINT-005 (required XML sections), LINT-010/LINT-011 (skill code uniqueness), LINT-024 (allowed-tools), and workflow path existence
- Three fleet agent definition files created in `agents/` with complete role descriptions, constraint clauses, protected-files guards, and structured JSON return formats
- `pde-skill-improver` and `pde-skill-validator` registered in MODEL_PROFILES and `references/model-profiles.md` — both resolvable via `pde-tools resolve-model`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create validate-skill CLI command** - `63aa293` (feat)
2. **Task 2: Create three fleet agent definition files in agents/** - `32cc7d9` (feat)
3. **Task 3: Register pde-skill-improver and pde-skill-validator in model-profiles** - `4ce25a1` (feat)

## Files Created/Modified

- `bin/lib/validate-skill.cjs` — validate-skill logic with LINT rule checks; exports cmdValidateSkill
- `bin/pde-tools.cjs` — added require for validate-skill.cjs and case 'validate-skill' in CLI router
- `agents/pde-quality-auditor.md` — READ-ONLY auditor; AUDIT-07 tool effectiveness, AUDIT-12 agent prompt quality; score_pct + missing_references in return format
- `agents/pde-skill-improver.md` — improvement proposal generator; writes only to .planning/improvements/; diff -u generation; protected-files guard
- `agents/pde-skill-validator.md` — proposal validator; PASS/FAIL verdict; no_regressions check; can append Validator Result section to proposals
- `bin/lib/model-profiles.cjs` — added pde-skill-improver and pde-skill-validator entries
- `references/model-profiles.md` — added matching table rows for both new agent types

## Decisions Made

- validate-skill skips workflow files lacking `<skill_code>` using path+content heuristic to prevent false LINT errors on non-skill files
- pde-skill-improver uses sonnet/sonnet/haiku — balanced tier needs solid reasoning for code change proposals
- pde-skill-validator uses sonnet/haiku/haiku — validation is mechanical; haiku is sufficient at balanced tier
- pde-quality-auditor skips self-evaluation (pde-quality-auditor.md) explicitly to prevent circular findings loop

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 30-02 (audit workflow) can now reference agents/pde-quality-auditor.md and invoke validate-skill
- Plan 30-03 (health report) has the score_pct return format from pde-quality-auditor ready to aggregate
- Phase 31 (Skill Builder) depends on validate-skill CLI — now available

---
*Phase: 30-self-improvement-fleet-audit-command*
*Completed: 2026-03-17*
