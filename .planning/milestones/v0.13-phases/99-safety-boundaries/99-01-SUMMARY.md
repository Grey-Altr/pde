---
phase: 99-safety-boundaries
plan: "01"
subsystem: infra
tags: [experiment-boundaries, protected-files, safety, SAFE-01, SAFE-03, SAFE-04]

requires: []
provides:
  - "references/experiment-boundaries.md — machine-readable boundary spec with YAML protected_files, protected_directories, and infrastructure_workflows arrays"
  - "protected-files.json extended with experiment-boundaries.md, agents/, and tests/ entries"
  - "Canonical locked/optimizable zone taxonomy for experiment runner consumption"
affects:
  - "100-experiment-schema (consumes references/experiment-boundaries.md for SAFE-04 validation)"
  - "103-experiment-runner (reads boundaries at startup)"
  - "All fleet agents (new protected_directories entries)"

tech-stack:
  added: []
  patterns:
    - "Two-layer protection model: protected-files.json (prompt-enforcement) + experiment-boundaries.md (experiment-enforcement)"
    - "Default-locked policy: unannotated files treated as LOCKED, not OPTIMIZABLE"
    - "LOCKED/OPTIMIZABLE paired HTML comment markers for section-level workflow annotation"

key-files:
  created:
    - references/experiment-boundaries.md
  modified:
    - protected-files.json

key-decisions:
  - "experiment-boundaries.md is self-protecting — listed in its own protected_files array so no agent or experiment can remove itself from the boundary definition"
  - "Default policy is LOCKED (not OPTIMIZABLE) for unannotated files — prevents silent full-optimization"
  - "protected_files in experiment-boundaries.md is a superset of protected-files.json — all prompt-enforcement files plus eval harness additions"
  - "tests/ and agents/ added to protected_directories in protected-files.json alongside existing bin/ and .claude/"
  - "14 design skill workflows are the only experiment-eligible files — all other workflow files are in infrastructure_workflows lock list"

patterns-established:
  - "Pattern 1: Superset relationship — experiment-boundaries.md protected_files must always include all entries from protected-files.json"
  - "Pattern 2: Two independent protection layers — prompt layer (fleet agents) and experiment layer (runner) apply independently"

requirements-completed: [SAFE-01, SAFE-03, SAFE-04]

duration: 8min
completed: "2026-03-23"
---

# Phase 99 Plan 01: Safety Boundaries Summary

**Machine-readable experiment boundary specification with YAML protected_files/protected_directories arrays and 61-entry infrastructure_workflows lock list, plus extended protected-files.json with eval harness and agent directory protections**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-23T00:00:00Z
- **Completed:** 2026-03-23T00:08:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `references/experiment-boundaries.md` — canonical boundary spec with YAML frontmatter (protected_files: 20 entries, protected_directories: 6, infrastructure_workflows: 61 entries) and prose documentation of locked/optimizable zones
- Extended `protected-files.json` with `references/experiment-boundaries.md` in protected array, plus `agents/` and `tests/` in protected_directories (previously only `bin/` and `.claude/`)
- Established default-locked policy and LOCKED/OPTIMIZABLE marker syntax documentation for workflow annotation (SAFE-02 prep)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create references/experiment-boundaries.md** - `5848fd5` (feat)
2. **Task 2: Update protected-files.json with experiment-boundaries.md** - `b754769` (feat)

## Files Created/Modified

- `references/experiment-boundaries.md` — canonical experiment boundary reference with machine-parseable YAML frontmatter and prose sections (285 lines)
- `protected-files.json` — extended with experiment-boundaries.md, agents/, and tests/ entries

## Decisions Made

- experiment-boundaries.md is self-protecting (appears in its own protected_files array) — ensures no agent or experiment can rewrite the boundary definition to unprotect itself
- Default policy is explicitly LOCKED for unannotated files — prevents the anti-pattern where absence of annotation = permission to mutate
- The protected_files list in experiment-boundaries.md is a strict superset of protected-files.json — both layers protect the same files so agents consulting either layer get consistent enforcement
- 14 design skill workflows identified as the only experiment-eligible files for v0.13 — boundary-case integration workflows (sync, connect, ui-phase) treated as locked pending future safety review

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `references/experiment-boundaries.md` is ready for Phase 100 experiment.cjs to consume via SAFE-04 validation
- YAML frontmatter structure confirmed parseable by Node.js (validated in Task 1 verify step)
- Phase 99 Plan 02 (workflow marker annotation) can proceed — boundary document is the prerequisite that Plan 02's `<!-- LOCKED -->` / `<!-- OPTIMIZABLE -->` markers depend on

---
*Phase: 99-safety-boundaries*
*Completed: 2026-03-23*
