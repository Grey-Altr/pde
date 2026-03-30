---
phase: 189-technical-debt-cleanup
plan: 01
subsystem: infra
tags: [knip, jscpd, dead-code, duplication, static-analysis, pde-tools, workflow-paths]

requires:
  - phase: 186-test-infrastructure
    provides: Clean test signal for static analysis tooling runs

provides:
  - Corrected pde-tools.cjs path references in workflow files (CLAUDE_PLUGIN_ROOT pattern)
  - knip.json dead-code config scoped to bin/lib/packages
  - Knip triage report with 44 unused files + 4 dep findings classified
  - .jscpd.json duplication config for source-only scan
  - jscpd raw JSON report (5 clones, 0.47% duplication rate)
  - jscpd triage report with all 5 clones classified

affects: [technical-debt-cleanup, eslint-config, workflow-execution]

tech-stack:
  added: [knip 6.1.0 (npx), jscpd 4.0.8 (npx)]
  patterns:
    - knip.json at project root with entry/project/ignore/ignoreDependencies/ignoreExportsUsedInFile
    - .jscpd.json at project root scoped to bin/lib/packages with threshold 0 / minLines 10 / minTokens 100
    - Static analysis triage artifacts committed to .planning/phases/ for tracking

key-files:
  created:
    - knip.json
    - .jscpd.json
    - .planning/phases/189-technical-debt-cleanup/189-knip-report.md
    - .planning/phases/189-technical-debt-cleanup/jscpd-report/jscpd-report.json
    - .planning/phases/189-technical-debt-cleanup/189-jscpd-triage.md
  modified:
    - workflows/execute-phase.md
    - workflows/complete-milestone.md

key-decisions:
  - "knip pde-mcp-server sub-package (32 TS/dist files): all deferred — separate compiled sub-package with own build pipeline not traced from pde-tools.cjs CJS entry points"
  - "lib/ui/ files classified defer — loaded via dynamic require paths not traceable by knip static analysis"
  - "jscpd found 5 clones (0.47% rate): 4 classified accept (expected metric CLI boilerplate), 1 refactor-candidate (same-file duplication in commands.cjs)"
  - "jscpd threshold set to 0 to capture all findings above minLines 10; process.exit(1) from threshold reporter is expected behavior when any clones exist"

patterns-established:
  - "Static analysis triage: always commit raw tool output + separate triage .md with keep/remove/defer or accept/refactor-candidate/defer classifications"
  - "knip ignoreExportsUsedInFile: true for CLI plugin boundary where exports are consumed by external callers"

requirements-completed: [DEB-01, DEB-02, DEB-03]

duration: 4min
completed: 2026-03-30
---

# Phase 189 Plan 01: Technical Debt Cleanup — Path Fix + Dead-Code + Duplication Reports Summary

**4 stale pde-tools.cjs paths corrected to CLAUDE_PLUGIN_ROOT, knip and jscpd first-run reports produced with full triage (44 findings, 5 clones, 0.47% duplication rate)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T09:07:23Z
- **Completed:** 2026-03-30T09:11:24Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Fixed 4 stale `$HOME/.claude/pde-os/engines/gsd/bin/pde-tools.cjs` references in `execute-phase.md` and `complete-milestone.md` — replaced with `${CLAUDE_PLUGIN_ROOT}/bin/pde-tools.cjs`. All 18+ `gsd-tools.cjs` references remain intact.
- Created `knip.json` config and ran knip dead-code analysis: 44 unused files, 1 unused devDep, 3 unlisted deps. All findings triaged in `189-knip-report.md` — pde-mcp-server sub-package (32 files) and lib/ui/ files classified defer; `ai` devDep classified keep; unlisted deps deferred.
- Created `.jscpd.json` config and ran jscpd duplication scan: 5 clones found across 168 files (0.47% duplication rate). All clones triaged — 4 classified `accept` (expected metric CLI boilerplate), 1 `refactor-candidate` (same-file duplication in `commands.cjs`).

## Task Commits

1. **Task 1: Fix stale pde-tools.cjs paths (DEB-01)** - `7168dba` (fix)
2. **Task 2: knip dead-code analysis and triage (DEB-02)** - `4329fcf` (docs)
3. **Task 3: jscpd duplication scan and triage (DEB-03)** - `096c433` (docs)

## Files Created/Modified

- `workflows/execute-phase.md` — Lines 760, 769: pde-tools.cjs path corrected to CLAUDE_PLUGIN_ROOT
- `workflows/complete-milestone.md` — Lines 694, 703: pde-tools.cjs path corrected to CLAUDE_PLUGIN_ROOT
- `knip.json` — Dead-code analysis config (entry, project, ignore, ignoreDependencies, ignoreExportsUsedInFile)
- `.planning/phases/189-technical-debt-cleanup/189-knip-report.md` — Full triage table: 44 files + 4 deps
- `.jscpd.json` — Duplication scan config (minLines 10, minTokens 100, path: bin/lib/packages)
- `.planning/phases/189-technical-debt-cleanup/jscpd-report/jscpd-report.json` — Raw jscpd JSON output
- `.planning/phases/189-technical-debt-cleanup/189-jscpd-triage.md` — 5 clone blocks triaged

## Decisions Made

- **pde-mcp-server knip findings:** All 32 TypeScript source and declaration files in `pde-mcp-server/src/` and `pde-mcp-server/dist/` classified `defer`. The MCP server is a separately compiled sub-package; its entry point is not a CJS file traceable from `pde-tools.cjs`. Adding `packages/pde-mcp-server/src/index.ts` as a knip entry would require TypeScript project references support.
- **jscpd threshold 0:** Setting threshold to 0 means jscpd exits with error code when any clones are found above minLines threshold. This is expected behavior — the JSON report is still written before exit. The plan goal was to capture all findings, not to have a clean exit.
- **lib/ui/ files:** 5 `lib/ui/*.cjs` files classified `defer`. These are loaded via dynamic require in the CLI rendering layer; knip's static analysis cannot trace dynamic require paths.

## Deviations from Plan

None — plan executed exactly as written. The actual knip output differed from the research pre-classification (no `BrandedVideo.tsx`, no `event-bus.cjs`, no `commands.cjs` as unused files — these were from an unconfigured run with different scope). The triage table was updated to reflect actual knip output.

## Issues Encountered

- jscpd exits with non-zero when threshold is exceeded (threshold 0 means any clone triggers this). The JSON report was still written before exit — report file present and valid. This is expected jscpd behavior documented in the research.
- Pre-existing test failures in `tests/phase-177/present-cmd.test.mjs` (3 tests) and `tests/phase-134/test-relay-e2e.cjs` (1 test) are unrelated to this plan's changes. These were failing before plan execution and are out of scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DEB-01, DEB-02, DEB-03 complete — ready for Plan 02 (ESLint configuration, DEB-04)
- knip and jscpd configs are committed; future runs can use `npx knip` and `npx jscpd` without additional setup
- Triage artifacts establish baseline for future dead-code removal milestones

---
*Phase: 189-technical-debt-cleanup*
*Completed: 2026-03-30*
