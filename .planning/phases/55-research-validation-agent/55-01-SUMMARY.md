---
phase: 55-research-validation-agent
plan: 01
subsystem: agents
tags: [research-validation, read-only-agent, claim-extraction, tier-classification, three-state-output]

# Dependency graph
requires:
  - phase: 54-tech-debt-closure
    provides: established PDE read-only agent patterns (pde-quality-auditor constraint clause, JSON return format)
provides:
  - pde-research-validator agent definition with 7-step claim extraction and verification process
  - RESEARCH-VALIDATION.md output template with validated_at_phase frontmatter field
  - artifact_content return pattern for orchestrator-side file writing (new PDE convention)
affects: [plan-phase, check-readiness, phase-56, phase-57]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "artifact_content return pattern: agent returns full file content as string in JSON block; orchestrator writes to disk — solves write-constraint conflict for read-only agents that produce file artifacts"
    - "Three-tier claim classification: T1 (structural/Glob+Bash), T2 (content/Grep+Read), T3 (behavioral/Read+inference)"
    - "validated_at_phase frontmatter field for research staleness tracking"

key-files:
  created:
    - agents/pde-research-validator.md
    - templates/research-validation.md
  modified: []

key-decisions:
  - "Read-only agent returns artifact_content string field containing full RESEARCH-VALIDATION.md markdown; orchestrator writes — standard RVAL-05 write-constraint resolution"
  - "CONTRADICTED requires positive evidence of conflict; absence of evidence is UNVERIFIABLE — prevents false FAIL results on external-system claims"
  - "Zero-claims edge case returns NO_VERIFIABLE_CLAIMS status (PASS) rather than failure — handles research files with no codebase references"

patterns-established:
  - "artifact_content pattern: new PDE convention for read-only agents that must produce file artifacts without Write tool"
  - "Tier-matched verification: claim tier determines tool strategy (T1=Glob/Bash, T2=Grep/Read, T3=Read+inference)"

requirements-completed: [RVAL-01, RVAL-02, RVAL-04, RVAL-05]

# Metrics
duration: 2min
completed: 2026-03-20
---

# Phase 55 Plan 01: Agent Definition + Output Template Summary

**Read-only research validator agent with 7-step LLM claim extraction, three-tier classification (T1/T2/T3), and artifact_content return pattern for orchestrator-side RESEARCH-VALIDATION.md file writing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T03:43:52Z
- **Completed:** 2026-03-20T03:46:25Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `agents/pde-research-validator.md` — 199-line read-only agent with complete 7-step verification process, three-tier claim classification, VERIFIED/UNVERIFIABLE/CONTRADICTED three-state output, and anti-patterns section
- Created `templates/research-validation.md` — output template following verification-report.md convention with YAML frontmatter including `validated_at_phase`, claims table, detail section, and usage notes
- Established `artifact_content` as a new PDE pattern: agents return full file content as a string; orchestrators handle writes — resolves RVAL-03 vs RVAL-05 write-constraint conflict

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pde-research-validator agent definition** - `db1e9dc` (feat)
2. **Task 2: Create RESEARCH-VALIDATION.md output template** - `f447024` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `agents/pde-research-validator.md` — Read-only research validation agent with 7-step process, tier-based verification, three-state output, and anti-patterns
- `templates/research-validation.md` — RESEARCH-VALIDATION.md output template with validated_at_phase frontmatter, claims table, detail section, summary table, and usage notes

## Decisions Made

- `artifact_content` return field pattern: agent constructs full RESEARCH-VALIDATION.md markdown as a string in the JSON return block; the invoking orchestrator extracts and writes it via `jq -r '.artifact_content'`. This resolves RVAL-03 ("produces file") vs RVAL-05 ("no Write in allowed-tools") without any workarounds.
- CONTRADICTED classification requires positive evidence of conflict — "I checked and found nothing" is UNVERIFIABLE, not CONTRADICTED. This distinction is critical because CONTRADICTED triggers FAIL at the readiness gate while UNVERIFIABLE only triggers CONCERNS.
- `NO_VERIFIABLE_CLAIMS` status added as a named edge case for research files with zero codebase references — treated as PASS, not an error condition.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `pde-research-validator` agent definition is complete and ready for integration into the plan-phase orchestration workflow (Phase 57 scope)
- `templates/research-validation.md` provides the output format for the orchestrator to assemble RESEARCH-VALIDATION.md artifacts
- RVAL-06 (validated_at_phase staleness tracking) is addressed by the validated_at_phase frontmatter field in both the agent and template
- Plan 02 (smoke test run) can now invoke the agent against an existing RESEARCH.md to verify end-to-end behavior

---
*Phase: 55-research-validation-agent*
*Completed: 2026-03-20*
