---
phase: 29-quality-infrastructure
plan: "03"
subsystem: quality-infrastructure
tags: [protected-files, model-profiles, skill-registry, fleet-agents, configuration]
dependency_graph:
  requires: []
  provides:
    - protected-files.json (fleet agent write protection list)
    - 4 new model profile entries (pde-output-quality-auditor, pde-skill-linter, pde-design-quality-evaluator, pde-template-auditor)
    - 3 new skill codes in skill-registry.md (AUD, IMP, PRT)
  affects:
    - Phase 30 fleet agents (must check protected-files.json before every Write/Edit)
    - bin/lib/init.cjs (model resolution for 4 new agent types)
    - LINT-010 (skill code uniqueness validation)
tech_stack:
  added: []
  patterns:
    - Prompt-level enforcement (not OS-level) for file protection — bwrap does not apply to Write/Edit tools
    - pending status for skill codes whose workflow files don't exist yet
key_files:
  created:
    - protected-files.json
  modified:
    - bin/lib/model-profiles.cjs
    - references/model-profiles.md
    - skill-registry.md
decisions:
  - "Enforcement for protected-files.json is prompt-level only — bwrap sandbox does not prevent Claude Code Write/Edit tool calls; the note field documents this limitation explicitly"
  - "pde-design-quality-evaluator uses quality: opus because design judgment requires maximum reasoning capability"
  - "AUD/IMP/PRT registered with status: pending (not active) so LINT-010 can enforce uniqueness now without triggering workflow-path-existence validation"
  - "references/model-profiles.md was missing 3 rows (pde-ui-researcher, pde-ui-checker, pde-ui-auditor) — all 7 missing rows added to bring table fully in sync with .cjs"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-17"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 4
requirements_fulfilled:
  - QUAL-04
  - QUAL-05
  - QUAL-06
---

# Phase 29 Plan 03: Infrastructure Wiring Summary

**One-liner:** Prompt-enforced file protection list, 4 new quality-fleet agent model profiles, and 3 pending skill codes registered as pre-Phase-30 infrastructure wiring.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create protected-files.json at repo root | e42bd4f | protected-files.json (created) |
| 2 | Register 4 new agent types in model-profiles | e4d64f9 | bin/lib/model-profiles.cjs, references/model-profiles.md |
| 3 | Register AUD, IMP, PRT skill codes | d0e22d6 | skill-registry.md |

## What Was Built

### protected-files.json (QUAL-04)

Created at repo root. Contains 16 protected file paths, 2 protected directories (`bin/`, `.claude/`), and 6 allowed write directories for fleet agents. The `enforcement: "prompt"` field and `note` field explicitly document that enforcement is via agent system prompts only — not OS-level protection — because Claude Code's Write/Edit tools use `fs.writeFileSync` and bypass bwrap.

Key protected entries:
- All `references/quality-*.md` and `references/skill-style-guide.md` files (circular evaluation prevention)
- All `bin/` scripts (runtime infrastructure stability)
- `protected-files.json` itself (meta-protection — agents cannot weaken their own constraints)
- `skill-registry.md` (uniqueness invariant for LINT-010)
- `CLAUDE.md` and `.claude/settings.json` (project configuration stability)

### model-profiles.cjs + references/model-profiles.md (QUAL-05)

Added 4 new agent entries to `MODEL_PROFILES`:
- `pde-output-quality-auditor`: sonnet/sonnet/haiku — output quality analysis
- `pde-skill-linter`: sonnet/haiku/haiku — skill file linting (low-cost, high-volume)
- `pde-design-quality-evaluator`: opus/sonnet/sonnet — design judgment (most expensive tier)
- `pde-template-auditor`: sonnet/haiku/haiku — template conformance checks

Total agent count: 19 (was 15). Node.js `require` verified — no syntax errors.

Also synced `references/model-profiles.md` which was missing 3 rows (`pde-ui-researcher`, `pde-ui-checker`, `pde-ui-auditor`). Added all 7 rows (3 missing + 4 new) so the documentation table is fully in sync with the .cjs source.

### skill-registry.md (QUAL-06)

Appended 3 rows after `IDT`:
- `AUD | /pde:audit | workflows/audit.md | tooling | pending`
- `IMP | /pde:improve | workflows/improve.md | tooling | pending`
- `PRT | /pde:pressure-test | workflows/pressure-test.md | tooling | pending`

Status is `pending` because the workflow files will be created in Phases 30/31/37 respectively. Registration now allows LINT-010 to enforce uniqueness from Phase 29 onward. Registry now has 17 data rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Synced 3 missing rows in references/model-profiles.md**
- **Found during:** Task 2
- **Issue:** The plan noted `references/model-profiles.md` was missing pde-ui-researcher, pde-ui-checker, pde-ui-auditor rows that exist in the .cjs file. The task action explicitly called for adding all missing rows to bring the table in sync.
- **Fix:** Added all 3 missing rows alongside the 4 new rows — 7 total rows added.
- **Files modified:** references/model-profiles.md
- **Commit:** e4d64f9

## Verification Results

```
enforcement: prompt | protected count: 16       # PASS (>= 10 required)
total agents: 19                                 # PASS (expected 19)
pde-design-quality-evaluator: opus/sonnet/sonnet # PASS
AUD row present with pending status              # PASS
IMP row present with pending status              # PASS
PRT row present with pending status              # PASS
```

## Self-Check

### Files Created/Modified

- [x] protected-files.json — exists at repo root
- [x] bin/lib/model-profiles.cjs — modified with 4 new entries
- [x] references/model-profiles.md — modified with 7 new rows
- [x] skill-registry.md — modified with 3 new rows

### Commits

- [x] e42bd4f — feat(29-03): create protected-files.json at repo root
- [x] e4d64f9 — feat(29-03): register 4 new agent types in model-profiles
- [x] d0e22d6 — feat(29-03): register AUD, IMP, PRT skill codes in skill-registry.md

## Self-Check: PASSED
