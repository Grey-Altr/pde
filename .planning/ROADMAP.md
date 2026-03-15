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
- [ ] **Phase 3: Workflow Commands** - Rename all 29 /gsd: slash commands to /pde: equivalents
- [ ] **Phase 4: Workflow Engine** - Validate .planning/ state persistence, ROADMAP.md, STATE.md, and git integration
- [ ] **Phase 5: Agent System** - Rebrand all agent types and validate parallel orchestration with PDE paths
- [ ] **Phase 6: Templates & References** - Migrate all templates and references to PDE branding
- [ ] **Phase 7: Rebranding Completeness** - Grep-clean verification and elimination of all remaining GSD strings
- [ ] **Phase 8: Onboarding & Distribution** - Getting Started guide, install validation, README, and public readiness

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
**Plans**: TBD

Plans:
- [ ] 04-01: Verify .planning/ directory state persistence and ROADMAP.md round-trip editing
- [ ] 04-02: Verify STATE.md update lifecycle (create, read, write, restore on resume)
- [ ] 04-03: Verify requirements traceability population during roadmap creation
- [ ] 04-04: Verify atomic git commit creation per completed task

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
**Plans**: TBD

Plans:
- [ ] 05-01: Rename all agent definition files and update agent-type identifiers throughout workflows
- [ ] 05-02: Update core.cjs agent registry and model-profiles reference to use PDE agent names
- [ ] 05-03: Validate parallel wave orchestration with a multi-agent execute-phase run
- [ ] 05-04: Validate model selection smoke test for pde-planner agent type

### Phase 6: Templates & References
**Goal**: All templates and references carry PDE branding with no GSD banners, stage names, or path references
**Depends on**: Phase 5
**Requirements**: TOOL-03, TOOL-04
**Success Criteria** (what must be TRUE):
  1. Every template displays "PDE" in banners and stage names — no GSD strings appear in any generated artifact
  2. Reference documents use PDE naming throughout — any guide that mentions a command uses /pde: prefix
  3. A fresh project initialized via /pde:new-project produces .planning/ files with zero GSD strings
**Plans**: TBD

Plans:
- [ ] 06-01: Update all template files with PDE branding (banners, stage names, status symbols)
- [ ] 06-02: Update all reference and guide files with PDE naming and /pde: command references

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
**Plans**: TBD

Plans:
- [ ] 07-01: Run comprehensive grep audit and fix any surviving gsd/GSD/get-shit-done occurrences
- [ ] 07-02: Fix all hardcoded absolute paths containing usernames
- [ ] 07-03: Verify all UI banners and stage name displays are PDE-branded

### Phase 8: Onboarding & Distribution
**Goal**: PDE is publicly distributable with documentation that enables a naive user to succeed on first session
**Depends on**: Phase 7
**Requirements**: BRAND-06
**Success Criteria** (what must be TRUE):
  1. README clearly describes PDE, how to install it, and how to start a first project — no GSD references
  2. Getting Started guide walks a new user from install to first project completion without requiring prior GSD knowledge
  3. Plugin installs successfully on a machine with a different username than the developer — no path errors
  4. VERSION and plugin.json both show 1.0.0 and Claude Code's plugin cache delivers the correct version on install
**Plans**: TBD

Plans:
- [ ] 08-01: Write Getting Started guide for naive users
- [ ] 08-02: Update README with PDE identity, install instructions, and quickstart
- [ ] 08-03: Perform fresh install validation on a clean machine (different username)
- [ ] 08-04: Confirm version 1.0.0 in all version-bearing files and validate plugin cache behavior

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Plugin Identity | 2/2 | Complete   | 2026-03-15 |
| 2. Tooling & Binary Rebrand | 1/1 | Complete   | 2026-03-15 |
| 3. Workflow Commands | 1/3 | In Progress|  |
| 4. Workflow Engine | 0/4 | Not started | - |
| 5. Agent System | 0/4 | Not started | - |
| 6. Templates & References | 0/2 | Not started | - |
| 7. Rebranding Completeness | 0/3 | Not started | - |
| 8. Onboarding & Distribution | 0/4 | Not started | - |
