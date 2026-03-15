# Roadmap: Platform Development Engine (PDE)

## Overview

PDE v1 is a disciplined fork-and-rebrand of GSD (Get Shit Done) into a publicly distributable Claude Code plugin. The rename sequence is order-dependent: plugin identity first, then binary and config infrastructure, then the 29 workflow commands, then the workflow engine state layer, then the agent system, then templates and references, then brand completeness verification. Each phase delivers one clean, verifiable layer — nothing proceeds until the prior layer is confirmed clean.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Plugin Identity** - Establish PDE as a valid, installable Claude Code plugin with correct manifest (completed 2026-03-15)
- [x] **Phase 2: Tooling & Binary Rebrand** - Rebrand pde-tools.cjs, bin scripts, and config directory paths (completed 2026-03-15)
- [x] **Phase 3: Workflow Commands** - Rename all 29 /gsd: slash commands to /pde: equivalents (completed 2026-03-15)
- [x] **Phase 4: Workflow Engine** - Validate .planning/ state persistence, ROADMAP.md, STATE.md, and git integration (completed 2026-03-15)
- [x] **Phase 5: Agent System** - Rebrand all agent types and validate parallel orchestration with PDE paths (completed 2026-03-15)
- [x] **Phase 6: Templates & References** - Migrate all templates and references to PDE branding (completed 2026-03-15)
- [x] **Phase 7: Rebranding Completeness** - Grep-clean verification and elimination of all remaining GSD strings (completed 2026-03-15)
- [x] **Phase 8: Onboarding & Distribution** - Getting Started guide, install validation, README, and public readiness (completed 2026-03-15)

## Phase Details

### Phase 1: Plugin Identity
**Goal**: PDE is a valid, installable Claude Code plugin with a correct manifest that does not reference GSD
**Depends on**: Nothing (first phase)
**Requirements**: PLUG-01, PLUG-02, PLUG-03
**Success Criteria** (what must be TRUE):
  1. User can run `claude plugin install` with the PDE plugin and it installs without errors
  2. plugin.json contains name "platform-development-engine" (kebab-case machine ID), description, and version 0.1.0 (per user decision — bumps to 1.0.0 after Phase 7 or 8)
  3. Claude Code validation passes — no missing required fields, no structural errors
  4. Plugin loads in a Claude Code session without throwing errors or warnings
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Create PDE plugin manifest, VERSION file, and validate plugin loads in Claude Code
- [ ] 01-02-PLAN.md — Gap closure: fix ROADMAP spec conflict and push to GitHub for PLUG-01 verification

### Phase 2: Tooling & Binary Rebrand
**Goal**: All binary scripts and config infrastructure use PDE naming and paths with no GSD references
**Depends on**: Phase 1
**Requirements**: TOOL-01, TOOL-02, TOOL-05, TOOL-06
**Success Criteria** (what must be TRUE):
  1. `bin/pde-tools.cjs` exists and all tool invocations call it by the correct name
  2. All bin scripts reference `~/.pde/` for global config, not `~/.gsd/`
  3. Config system reads from and writes to `~/.pde/defaults.json` — two installs (GSD and PDE) do not share config state
  4. Git branch templates use `pde/` prefix — no branches are created with `gsd/` prefix
**Plans**: 1 plan

Plans:
- [ ] 02-01-PLAN.md — Copy rebranded bin files from reference installation and verify all TOOL requirements

### Phase 3: Workflow Commands
**Goal**: All 29 /pde: slash commands are operational and accept user invocations in Claude Code
**Depends on**: Phase 2
**Requirements**: CMD-01, CMD-02, CMD-03, CMD-04, CMD-05, CMD-06, CMD-07, CMD-08, CMD-09, CMD-10, CMD-11, CMD-12, CMD-13
**Success Criteria** (what must be TRUE):
  1. `/pde:new-project` initializes a project with questioning, research, requirements, and roadmap
  2. `/pde:plan-phase`, `/pde:execute-phase`, and `/pde:verify-work` form a complete end-to-end phase cycle
  3. `/pde:progress` shows current project state and next recommended action
  4. `/pde:help` lists all available PDE commands with accurate descriptions
  5. All 29 /pde: commands appear in Claude Code's command palette and are invokable without errors
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Copy workflows, lib/ui, references, and templates from PDE reference; fix all hardcoded paths to use CLAUDE_PLUGIN_ROOT
- [ ] 03-02-PLAN.md — Create 34 command stubs in commands/ with pde: prefix and validate plugin structure
- [ ] 03-03-PLAN.md — Smoke test /pde:progress and /pde:help; user verifies commands in palette

### Phase 4: Workflow Engine
**Goal**: The .planning/ state layer persists correctly across context resets and all state files use PDE conventions
**Depends on**: Phase 3
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06
**Success Criteria** (what must be TRUE):
  1. User completes a full discuss → plan → execute → verify cycle without state loss across context resets
  2. ROADMAP.md serves as editable source of truth — edits made by user are reflected in subsequent workflow steps
  3. STATE.md accurately tracks current phase, plan, and last activity after each workflow step
  4. Requirements traceability table in REQUIREMENTS.md maps every requirement to a phase after roadmap creation
  5. Atomic git commits are created per completed task with PDE co-author attribution
**Plans**: 4 plans

Plans:
- [ ] 04-01-PLAN.md — Verify .planning/ state persistence, STATE.md frontmatter sync, and ROADMAP.md round-trip editing
- [ ] 04-02-PLAN.md — Verify STATE.md CRUD lifecycle and requirements traceability auto-population
- [ ] 04-03-PLAN.md — Fix Co-Authored-By attribution gap in cmdCommit and verify atomic git commit protocol
- [ ] 04-04-PLAN.md — Gap closure: fix stale STATE.md body narrative and align field format with cmdStateAdvancePlan

### Phase 5: Agent System
**Goal**: All PDE agent types are functional with correct naming and paths, and parallel orchestration works
**Depends on**: Phase 4
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05
**Success Criteria** (what must be TRUE):
  1. pde-project-researcher, pde-planner, pde-executor, pde-verifier, pde-roadmapper, pde-plan-checker agents all spawn and complete tasks correctly
  2. Parallel agent waves execute concurrently and results are assembled without collision
  3. Research agents spawn before planning when config.json has `"research": true`
  4. Model selection resolves correctly for `pde-planner` and other PDE agent types via model_profile config
  5. No agent spawning calls reference GSD paths — all use PDE plugin paths
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Audit agent type registry, verify zero GSD references, and smoke test model selection across all profiles
- [ ] 05-02-PLAN.md — Smoke test research agent gating via config toggle and verify parallel wave orchestration

### Phase 6: Templates & References
**Goal**: All templates and references carry PDE branding with no GSD banners, stage names, or path references
**Depends on**: Phase 5
**Requirements**: TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. Every template displays "PDE" in banners and stage names — no GSD strings appear in any generated artifact
  2. Reference documents use PDE naming throughout — any guide that mentions a command uses /pde: prefix
  3. A fresh project initialized via /pde:new-project produces .planning/ files with zero GSD strings
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Audit templates/ for zero GSD strings and verify template-to-output chain is PDE-branded
- [ ] 06-02-PLAN.md — Audit references/ for zero GSD strings and verify /pde: command references are correct

### Phase 7: Rebranding Completeness
**Goal**: Zero GSD strings exist anywhere in the codebase — grep clean across all file types
**Depends on**: Phase 6
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05, BRAND-06, PLUG-04
**Success Criteria** (what must be TRUE):
  1. `grep -rni "gsd\|get-shit-done" .` returns zero results across all source files
  2. `grep -rn "/gsd:" .` returns zero results — no user-visible error messages reference the old command prefix
  3. `grep -rn "\.gsd\|/\.gsd" .` returns zero results — no hardcoded config paths remain
  4. No hardcoded absolute paths containing specific usernames appear in any file
  5. All UI banners display "PDE ►" and all stage/status displays use PDE branding
**Plans**: 2 plans

Plans:
- [ ] 07-01-PLAN.md — Fix STATE.md frontmatter key and run comprehensive grep audit for BRAND-01, BRAND-02, BRAND-03, PLUG-04
- [ ] 07-02-PLAN.md — Verify UI banners, stage names, and splash screen use PDE branding (BRAND-04, BRAND-05, BRAND-06)

### Phase 8: Onboarding & Distribution
**Goal**: PDE is publicly distributable with documentation that enables a naive user to succeed on first session
**Depends on**: Phase 7
**Requirements**: BRAND-06
**Success Criteria** (what must be TRUE):
  1. README clearly describes PDE, how to install it, and how to start a first project — no GSD references
  2. Getting Started guide walks a new user from install to first project completion without requiring prior GSD knowledge
  3. Plugin installs successfully on a machine with a different username than the developer — no path errors
  4. VERSION and plugin.json both show 1.0.0 and Claude Code's plugin cache delivers the correct version on install
**Plans**: 4 plans

Plans:
- [ ] 08-01-PLAN.md — Create marketplace.json for distribution and install validation script
- [ ] 08-02-PLAN.md — Write GETTING-STARTED.md walk-through tutorial for naive users
- [ ] 08-03-PLAN.md — Write README.md, bump version to 1.0.0, and tag v1.0.0 release
- [ ] 08-04-PLAN.md — Gap closure: expand README.md to meet 50-line minimum threshold

### Phase 9: Fix Critical Runtime Crash (telemetry.cjs)
**Goal:** Restore UI rendering chain by creating the missing telemetry.cjs module that render.cjs depends on
**Depends on:** Phase 8
**Requirements:** BRAND-04, BRAND-05
**Gap Closure:** Closes gaps from v1.0 audit — CRITICAL integration break (render.cjs → telemetry.cjs MODULE_NOT_FOUND)
**Success Criteria** (what must be TRUE):
  1. `lib/telemetry.cjs` exists and `require('../telemetry.cjs')` in render.cjs resolves without error
  2. All ~60 banner() and panel() calls across 14 workflow files execute without MODULE_NOT_FOUND
  3. UI banners display "PDE ►" and stage/progress displays render correctly
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Create lib/telemetry.cjs and verify all render.cjs commands execute without crash

### Phase 10: Fix STATE.md Regressions
**Goal:** Eliminate gsd_state_version regression and fix stale body/progress fields in STATE.md
**Depends on:** Phase 9
**Requirements:** PLUG-04, BRAND-01, WORK-04
**Gap Closure:** Closes gaps from v1.0 audit — STATE.md frontmatter regression and stale body
**Success Criteria** (what must be TRUE):
  1. STATE.md frontmatter contains no `gsd_state_version` key — uses `pde_state_version` or equivalent
  2. STATE.md body narrative reflects current project state (not stale "Phase 4" text)
  3. progress.percent shows 100% (all 20/20 plans complete)
  4. State-writing code (cmdStateAdvancePlan and related) preserves the corrected key on subsequent writes
**Plans**: 1 plan

Plans:
- [ ] 10-01-PLAN.md — Fix gsd_state_version regression, update stale body narrative, and patch GSD layer

### Phase 11: Command Reference Cleanup
**Goal:** Remove or stub dangling command references that break user expectations
**Depends on:** Phase 10
**Requirements:** CMD-01
**Gap Closure:** Closes gaps from v1.0 audit — unregistered command references
**Success Criteria** (what must be TRUE):
  1. `/pde:recommend` either has a command stub or is removed from new-project.md output
  2. All /pde: commands referenced in reference docs are either registered or clearly marked as v2/future
  3. No user-facing workflow output suggests a command that doesn't exist
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Create lib/telemetry.cjs and verify all render.cjs commands execute without crash

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Identity | 2/2 | Complete   | 2026-03-15 |
| 2. Tooling & Binary Rebrand | 1/1 | Complete   | 2026-03-15 |
| 3. Workflow Commands | 3/3 | Complete   | 2026-03-15 |
| 4. Workflow Engine | 4/4 | Complete   | 2026-03-15 |
| 5. Agent System | 2/2 | Complete   | 2026-03-15 |
| 6. Templates & References | 2/2 | Complete   | 2026-03-15 |
| 7. Rebranding Completeness | 2/2 | Complete   | 2026-03-15 |
| 8. Onboarding & Distribution | 4/4 | Complete   | 2026-03-15 |
| 9. Fix Critical Runtime Crash | 1/1 | Complete   | 2026-03-15 |
| 10. Fix STATE.md Regressions | 1/1 | Complete    | 2026-03-15 |
| 11. Command Reference Cleanup | 0/0 | Not Started | — |
